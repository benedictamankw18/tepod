const express = require("express");
const transactionsRepo = require("../repositories/transactions");
const usersRepo = require("../repositories/users");
const listingsRepo = require("../repositories/listings");
const notificationsRepo = require("../repositories/notifications");
const settingsRepo = require("../repositories/systemSettings");
const precommitmentsRepo = require("../repositories/precommitments");
const { computeCommission } = require("../services/commission");
const precommitmentsService = require("../services/precommitments");
const paymentService = require("../services/payments");
const paymentsRepo = require("../repositories/payments");
const paystack = require("../services/paystack");
const { requireAuth, requireRole } = require("../middleware/auth");

const router = express.Router();

const CHARGE_KINDS = ["deposit", "balance"];

function makeChargeReference(txId, kind) {
  return `AGL-${txId.replace(/-/g, "").slice(0, 12)}-${kind}-${Date.now()}`;
}

/**
 * @openapi
 * /api/transactions:
 *   post:
 *     tags: [Transactions]
 *     summary: Record a payment obligation from an accepted pre-commitment (FR-5.1)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [listingId, buyerId, agreedPrice]
 *             properties:
 *               listingId: { type: string, format: uuid }
 *               buyerId: { type: string, format: uuid }
 *               agreedPrice: { type: number, minimum: 0 }
 *               dueDate: { type: string, format: date, description: "Defaults to 14 days from now" }
 *     responses:
 *       201:
 *         description: Created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Transaction'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         description: Only the listing farmer or an admin can confirm a sale
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 * /api/transactions/user/{userId}:
 *   get:
 *     tags: [Transactions]
 *     summary: List transactions for a user (FR-5.2)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Array of transactions
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Transaction'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 * /api/transactions/overdue:
 *   get:
 *     tags: [Transactions]
 *     summary: List overdue transactions
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Array of overdue transactions
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Transaction'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 * /api/transactions/reminders/run:
 *   post:
 *     tags: [Transactions]
 *     summary: Run payment reminders for overdue transactions
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Number of reminders sent
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 sent:
 *                   type: number
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
// POST /api/transactions - record a payment obligation from an accepted pre-commitment (FR-5.1)
router.post("/", requireAuth, async (req, res) => {
  const { listingId, buyerId, agreedPrice, dueDate } = req.body;
  if (!listingId || !buyerId) return res.status(400).json({ error: "listingId and buyerId are required" });
  const price = Number(agreedPrice);
  if (!price || price < 0) return res.status(400).json({ error: "agreedPrice must be a valid amount" });
  const listing = await listingsRepo.getListing(listingId);
  if (!listing) return res.status(404).json({ error: "listing not found" });
  if (req.user.id !== listing.farmerId && req.user.role !== "admin") {
    return res.status(403).json({ error: "only the listing farmer can confirm a sale" });
  }
  // A pre-commitment acceptance already opened this record; stay idempotent.
  const existing = await transactionsRepo.getByListingAndBuyer(listingId, buyerId);
  if (existing) return res.status(200).json(existing);

  const commission = await settingsRepo.getCommission();
  const { commission: commissionAmount, net: netAmount } = computeCommission(commission, price);
  const tx = await transactionsRepo.createTransaction({
    listingId, buyerId, farmerId: listing.farmerId, agreedPrice: price,
    commissionAmount, netAmount,
    dueDate: dueDate || new Date(Date.now() + 14 * 864e5),
  });
  const buyer = await usersRepo.getUser(buyerId);
  const farmer = await usersRepo.getUser(listing.farmerId);
  await notificationsRepo.notify({
    userId: buyer.id,
    phone: buyer.phone,
    email: buyer.email,
    title: "Sale confirmed",
    messageKey: "sale_confirmed",
    language: buyer.language,
    params: { cropType: listing.cropType, price, dueDate: tx.dueDate, farmerName: farmer?.name || null },
  });
  res.status(201).json(tx);
});

// All these literal routes must precede the /:id catch-all.
router.get("/user/:userId", requireAuth, async (req, res) => {
  res.json(await transactionsRepo.transactionsForUser(req.params.userId));
});

// GET /api/transactions/mine - the signed-in buyer's own purchases, enriched for
// the "My purchases" list (child of the marketplace). Buyer-only.
router.get("/mine", requireAuth, async (req, res) => {
  if (req.user.role === "farmer") return res.status(403).json({ error: "farmer accounts have no purchases" });
  res.json(await transactionsRepo.purchasesForBuyer(req.user.id));
});

router.get("/overdue", requireAuth, async (_req, res) => {
  res.json(await transactionsRepo.overdueTransactions());
});

// GET /api/transactions/all - every transaction across all users (admin), with
// optional paymentStatus filter.
router.get("/all", requireAuth, requireRole("admin"), async (req, res) => {
  res.json(await transactionsRepo.listAllTransactions({ paymentStatus: req.query.paymentStatus }));
});

router.post("/reminders/run", requireAuth, async (_req, res) => {
  const overdue = await transactionsRepo.refreshOverdue();
  for (const tx of overdue) {
    const buyer = await usersRepo.getUser(tx.buyerId);
    await notificationsRepo.notify({
      userId: buyer.id,
      phone: buyer.phone,
      email: buyer.email,
      title: "Payment reminder",
      messageKey: "payment_reminder",
      language: buyer.language,
      params: { price: tx.agreedPrice, dueDate: tx.dueDate },
    });
  }
  res.json({ sent: overdue.length });
});

/**
 * @openapi
 * /api/transactions/{id}:
 *   get:
 *     tags: [Transactions]
 *     summary: Get a transaction by id
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: The transaction
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Transaction'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.get("/:id", requireAuth, async (req, res) => {
  const tx = await transactionsRepo.getTransaction(req.params.id);
  if (!tx) return res.status(404).json({ error: "transaction not found" });
  res.json(tx);
});

/**
 * @openapi
 * /api/transactions/{id}/pay:
 *   post:
 *     tags: [Transactions]
 *     summary: Mark a transaction as paid (manual MVP; real MoMo is Phase 3)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               amount:
 *                 type: number
 *                 description: Partial payment toward the balance (omitted = full payment)
 *     responses:
 *       200:
 *         description: Updated transaction
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Transaction'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 * /api/transactions/{id}/deposit:
 *   post:
 *     tags: [Transactions]
 *     summary: Record a deposit against an accepted pre-commitment
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [amount]
 *             properties:
 *               amount: { type: number, minimum: 0 }
 *     responses:
 *       200:
 *         description: Updated transaction
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Transaction'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 * /api/transactions/{id}/dispute:
 *   post:
 *     tags: [Transactions]
 *     summary: Mark a transaction as disputed
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Updated transaction
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Transaction'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
// POST /api/transactions/:id/pay - mark paid / partially pay (MVP manual; real MoMo is Phase 3)
router.post("/:id/pay", requireAuth, async (req, res) => {
  const { amount } = req.body || {};
  if (amount != null && (!Number.isFinite(Number(amount)) || Number(amount) <= 0)) {
    return res.status(400).json({ error: "amount must be a positive number" });
  }
  const tx = await transactionsRepo.recordPayment(req.params.id, {
    kind: "payment",
    amount: amount == null ? null : Number(amount),
  });
  if (!tx) return res.status(404).json({ error: "transaction not found" });
  const farmer = await usersRepo.getUser(tx.farmerId);
  // Paying in full: notify the farmer on every channel we can reach them on.
  if (tx.paymentStatus === "paid") {
    await notificationsRepo.notify({
      userId: farmer.id,
      phone: farmer.phone,
      email: farmer.email,
      title: "Payment received",
      messageKey: "payment_received",
      language: farmer.language,
      params: { price: tx.agreedPrice },
    });
  }
  // Completing payment on an already-delivered commitment closes the sale.
  if (tx.paymentStatus === "paid") {
    const pc = await precommitmentsRepo.getPreCommitmentByTransactionId(tx.id);
    await precommitmentsService.attemptComplete(pc, tx);
  }
  res.json(tx);
});

// POST /api/transactions/:id/deposit - put money down on an accepted commitment.
router.post("/:id/deposit", requireAuth, async (req, res) => {
  const { amount } = req.body || {};
  const a = Number(amount);
  if (!Number.isFinite(a) || a <= 0) return res.status(400).json({ error: "amount must be a positive number" });
  const tx = await transactionsRepo.recordPayment(req.params.id, { kind: "deposit", amount: a });
  if (!tx) return res.status(404).json({ error: "transaction not found" });

  const farmer = await usersRepo.getUser(tx.farmerId);
  const buyer = await usersRepo.getUser(tx.buyerId);
  await notificationsRepo.notify({
    userId: farmer.id,
    phone: farmer.phone,
    email: farmer.email,
    title: "Deposit received",
    messageKey: "deposit_received",
    language: farmer.language,
    params: { buyerName: buyer.name, amount: a, cropType: (await listingsRepo.getListing(tx.listingId)).cropType },
  });

  if (tx.paymentStatus === "paid") {
    const pc = await precommitmentsRepo.getPreCommitmentByTransactionId(tx.id);
    await precommitmentsService.attemptComplete(pc, tx);
  }
  res.json(tx);
});

router.post("/:id/dispute", requireAuth, async (req, res) => {
  const tx = await transactionsRepo.markTransactionDisputed(req.params.id);
  if (!tx) return res.status(404).json({ error: "transaction not found" });
  res.json(tx);
});

// POST /api/transactions/:id/charge - open a Paystack charge (or instantly settle in
// simulated mode) for a deposit or a balance payment. Deposit amount is floored at
// the configured escrow percentage when escrow is enabled.
router.post("/:id/charge", requireAuth, async (req, res) => {
  const tx = await transactionsRepo.getTransaction(req.params.id);
  if (!tx) return res.status(404).json({ error: "transaction not found" });
  if (tx.buyerId !== req.user.id) {
    return res.status(403).json({ error: "only the buyer can initiate a charge" });
  }
  if (tx.paymentStatus === "paid") {
    return res.status(400).json({ error: "transaction already paid" });
  }

  const { kind, amount } = req.body || {};
  if (!CHARGE_KINDS.includes(kind)) {
    return res.status(400).json({ error: "kind must be 'deposit' or 'balance'" });
  }

  const settings = await settingsRepo.getPayments();
  const charge = paymentService.computeChargeAmount({ tx, kind, amount, escrowEnabled: settings.escrowEnabled, depositPercent: settings.depositPercent });
  if (charge.error) return res.status(400).json({ error: charge.error });

  const reference = makeChargeReference(tx.id, kind);

  // Live charges need a real buyer email on file. Check it before creating any
  // payment record so a 400 can't leave behind an orphan pending row.
  const buyer = await usersRepo.getUser(tx.buyerId);
  if (paystack.isEnabled() && !buyer?.email) {
    return res.status(400).json({ error: "a valid email is required to start a Paystack payment" });
  }

  const payment = await paymentsRepo.createPayment({
    transactionId: tx.id,
    kind,
    provider: "paystack",
    reference,
    amount: charge.amount,
  });

  if (!paystack.isEnabled()) {
    const updated = await paymentService.applySuccessfulCharge(payment, { channel: "mobile_money" });
    return res.json({ transaction: updated, payment: { ...payment, status: "success", channel: "mobile_money" }, simulated: true });
  }

  const init = await paystack.initializeCharge({
    amountGhs: charge.amount,
    email: buyer.email,
    reference,
    metadata: { transactionId: tx.id, kind, buyerId: tx.buyerId },
  });
  res.json({ transaction: tx, payment: { ...payment, authorizationUrl: init.authorizationUrl }, simulated: false });
});

module.exports = router;
