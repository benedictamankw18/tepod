const express = require("express");
const transactionsRepo = require("../repositories/transactions");
const usersRepo = require("../repositories/users");
const listingsRepo = require("../repositories/listings");
const notificationsRepo = require("../repositories/notifications");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

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
  const tx = await transactionsRepo.createTransaction({
    listingId, buyerId, farmerId: listing.farmerId, agreedPrice: price,
    dueDate: dueDate || new Date(Date.now() + 14 * 864e5),
  });
  const buyer = await usersRepo.getUser(buyerId);
  await notificationsRepo.logNotification({
    toPhone: buyer.phone,
    channel: "sms",
    messageKey: "sale_confirmed",
    language: buyer.language,
    params: { cropType: listing.cropType, price, dueDate: tx.dueDate },
  });
  res.status(201).json(tx);
});

// All these literal routes must precede the /:id catch-all.
router.get("/user/:userId", requireAuth, async (req, res) => {
  res.json(await transactionsRepo.transactionsForUser(req.params.userId));
});

router.get("/overdue", requireAuth, async (_req, res) => {
  res.json(await transactionsRepo.overdueTransactions());
});

router.post("/reminders/run", requireAuth, async (_req, res) => {
  const overdue = await transactionsRepo.refreshOverdue();
  for (const tx of overdue) {
    const buyer = await usersRepo.getUser(tx.buyerId);
    await notificationsRepo.logNotification({
      toPhone: buyer.phone,
      channel: "sms",
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
// POST /api/transactions/:id/pay - mark paid (MVP manual; real MoMo is Phase 3)
router.post("/:id/pay", requireAuth, async (req, res) => {
  const tx = await transactionsRepo.markTransactionPaid(req.params.id);
  if (!tx) return res.status(404).json({ error: "transaction not found" });
  const farmer = await usersRepo.getUser(tx.farmerId);
  await notificationsRepo.logNotification({
    toPhone: farmer.phone,
    channel: "sms",
    messageKey: "payment_received",
    language: farmer.language,
    params: { price: tx.agreedPrice },
  });
  res.json(tx);
});

router.post("/:id/dispute", requireAuth, async (req, res) => {
  const tx = await transactionsRepo.markTransactionDisputed(req.params.id);
  if (!tx) return res.status(404).json({ error: "transaction not found" });
  res.json(tx);
});

module.exports = router;
