const express = require("express");
const precommitmentsRepo = require("../repositories/precommitments");
const transactionsRepo = require("../repositories/transactions");
const listingsRepo = require("../repositories/listings");
const usersRepo = require("../repositories/users");
const notificationsRepo = require("../repositories/notifications");
const { buyerTypeLabel } = require("../services/messages");
const { ensureTransaction, attemptComplete } = require("../services/precommitments");
const { requireAuth, requireRole } = require("../middleware/auth");

const router = express.Router();

/**
 * @openapi
 * /api/precommitments:
 *   post:
 *     tags: [Precommitments]
 *     summary: Buyer submits a pre-commitment (FR-1.3)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [listingId, quantity, offeredPrice]
 *             properties:
 *               listingId: { type: string, format: uuid }
 *               quantity: { type: number, minimum: 1 }
 *               offeredPrice: { type: number, minimum: 0 }
 *     responses:
 *       201:
 *         description: Created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Precommitment'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         description: Only buyers and market sellers can submit pre-commitments
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       409:
 *         description: Listing is not open
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// POST /api/precommitments - buyer submits a pre-commitment (FR-1.3), farmer notified (FR-1.4)
router.post("/", requireAuth, async (req, res) => {
  const { listingId, quantity, offeredPrice } = req.body;
  const q = Number(quantity);
  const p = Number(offeredPrice);
  if (!listingId) return res.status(400).json({ error: "listingId is required" });
  if (!q || !Number.isFinite(q) || q <= 0) return res.status(400).json({ error: "quantity must be a positive number" });
  if (Number.isNaN(p) || p < 0) return res.status(400).json({ error: "offeredPrice must be a valid amount" });
  if (!["buyer", "market_seller"].includes(req.user.role)) {
    return res.status(403).json({ error: "only buyers and market sellers can submit pre-commitments" });
  }
  if (!req.user.verified) {
    return res.status(403).json({ error: "verify your buyer profile before making a commitment" });
  }

  const listing = await listingsRepo.getListing(listingId);
  if (!listing) return res.status(404).json({ error: "listing not found" });
  if (!["open", "pre_committed"].includes(listing.status)) {
    return res.status(409).json({ error: `listing is not purchasable (status: ${listing.status})` });
  }
  if (q > listing.quantity) {
    return res.status(400).json({
      error: `quantity cannot exceed the listed amount of ${listing.quantity} ${listing.unit}`,
    });
  }
  if (listing.minimumPrice != null && p < listing.minimumPrice) {
    return res.status(400).json({
      error: `your offer of GHS ${p} is below the farmer's minimum of GHS ${listing.minimumPrice}`,
    });
  }

  const pc = await precommitmentsRepo.createPreCommitment({
    listingId, buyerId: req.user.id, quantity: q, offeredPrice: p,
  });

  const farmer = await usersRepo.getUser(listing.farmerId);
  const offerParams = {
    buyerName: req.user.name,
    buyerLabel: buyerTypeLabel(req.user.buyerType, farmer.language),
    quantity: q,
    unit: listing.unit,
    cropType: listing.cropType,
    price: p,
  };
  await notificationsRepo.notify({
    userId: farmer.id,
    phone: farmer.phone,
    email: farmer.email,
    title: "New pre-commitment offer",
    messageKey: "precommit_offer",
    language: farmer.language,
    params: offerParams,
  });

  res.status(201).json(pc);
});

// GET /api/precommitments/all - every pre-commitment across all users (admin), with
// optional status filter. Registered before the /:id-scoped getters.
router.get("/all", requireAuth, requireRole("admin"), async (req, res) => {
  res.json(await precommitmentsRepo.listAllPreCommitments({ status: req.query.status }));
});

/**
 * @openapi
 * /api/precommitments/listing/{listingId}:
 *   get:
 *     tags: [Precommitments]
 *     summary: List pre-commitments for a listing (public)
 *     parameters:
 *       - in: path
 *         name: listingId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Array of pre-commitments
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Precommitment'
 * /api/precommitments/buyer/{buyerId}:
 *   get:
 *     tags: [Precommitments]
 *     summary: List pre-commitments made by a buyer (public)
 *     parameters:
 *       - in: path
 *         name: buyerId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Array of pre-commitments
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Precommitment'
 */
// GET /api/precommitments/listing/:listingId
router.get("/listing/:listingId", async (req, res) => {
  res.json(await precommitmentsRepo.preCommitmentsForListing(req.params.listingId));
});

// GET /api/precommitments/buyer/:buyerId
router.get("/buyer/:buyerId", async (req, res) => {
  res.json(await precommitmentsRepo.preCommitmentsForBuyer(req.params.buyerId));
});

// GET /api/precommitments/me - a buyer's own pre-commitments (enriched), newest first
router.get("/me", requireAuth, async (req, res) => {
  res.json(await precommitmentsRepo.preCommitmentsForBuyer(req.user.id));
});

// GET /api/precommitments/farmer/:farmerId - commitments a farmer received (dashboard), newest first
router.get("/farmer/:farmerId", async (req, res) => {
  res.json(await precommitmentsRepo.preCommitmentsForFarmer(req.params.farmerId));
});

/**
 * @openapi
 * /api/precommitments/{id}/respond:
 *   post:
 *     tags: [Precommitments]
 *     summary: Farmer accepts, rejects, or counters a pre-commitment (FR-1.5)
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
 *             required: [action]
 *             properties:
 *               action:
 *                 type: string
 *                 enum: [accept, reject, counter]
 *               counterPrice:
 *                 type: number
 *                 description: Required when action is counter
 *     responses:
 *       200:
 *         description: Updated pre-commitment
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Precommitment'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         description: Only the listing farmer can respond
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
// POST /api/precommitments/:id/respond - farmer accept/reject/counter (FR-1.5), or the
// buyer accepts/declines a farmer's counter. Action is restricted by whoever holds the pc:
// - the listing farmer may accept/reject/counter a pending offer;
// - the submitting buyer may accept/decline once the farmer has countered.
router.post("/:id/respond", requireAuth, async (req, res) => {
  const { action, counterPrice } = req.body;
  const pc = await precommitmentsRepo.getPreCommitment(req.params.id);
  if (!pc) return res.status(404).json({ error: "pre-commitment not found" });

  const listing = await listingsRepo.getListing(pc.listingId);

  if (req.user.id === pc.buyerId) {
    if (pc.status !== "countered") {
      return res.status(400).json({ error: "only a countered pre-commitment can be accepted or declined by the buyer" });
    }
    if (!["accept", "decline"].includes(action)) {
      return res.status(400).json({ error: "as the buyer you may only accept or decline the counter" });
    }
    const updated = await precommitmentsRepo.buyerRespondToCounter(pc.id, { action });
    const farmer = await usersRepo.getUser(listing.farmerId);
    const counterAction = action === "accept" ? "counter_accepted" : "counter_declined";
    const responseParams = { cropType: listing.cropType, price: pc.counterPrice != null ? pc.counterPrice : pc.offeredPrice };
    await notificationsRepo.notify({
      userId: farmer.id,
      phone: farmer.phone,
      email: farmer.email,
      title: action === "accept" ? "Counter accepted" : "Counter declined",
      messageKey: counterAction,
      language: farmer.language,
      params: responseParams,
    });
    // Accepting closes the deal: open the payment record at the agreed price.
    if (action === "accept") {
      const { pc: linked } = await ensureTransaction(updated);
      return res.json(linked);
    }
    return res.json(updated);
  }

  if (listing.farmerId !== req.user.id) {
    return res.status(403).json({ error: "only the listing farmer or the submitting buyer can respond" });
  }

  if (!["accept", "reject", "counter"].includes(action)) {
    return res.status(400).json({ error: "action must be accept, reject, or counter" });
  }
  if (pc.status !== "pending") {
    return res.status(400).json({ error: "this pre-commitment is no longer pending" });
  }
  if (action === "counter" && (counterPrice == null || Number.isNaN(Number(counterPrice)) || Number(counterPrice) < 0)) {
    return res.status(400).json({ error: "counterPrice must be a valid amount" });
  }

  const updated = await precommitmentsRepo.respondToPreCommitment(pc.id, { action, counterPrice });
  const buyer = await usersRepo.getUser(pc.buyerId);
  const keyMap = {
    accept: "precommit_accepted",
    reject: "precommit_rejected",
    counter: "precommit_counter",
  };
  const titleMap = {
    accept: "Offer accepted",
    reject: "Offer declined",
    counter: "Counter-offer received",
  };
  const responseParams = { cropType: listing.cropType, price: counterPrice || pc.offeredPrice };
  await notificationsRepo.notify({
    userId: buyer.id,
    phone: buyer.phone,
    email: buyer.email,
    title: titleMap[action],
    messageKey: keyMap[action],
    language: buyer.language,
    params: responseParams,
  });
  // Accepting closes the deal: open the payment record at the agreed price.
  if (action === "accept") {
    const { pc: linked } = await ensureTransaction(updated);
    return res.json(linked);
  }
  res.json(updated);
});

// POST /api/precommitments/:id/fulfill - drive an accepted commitment through its
// fulfilment lifecycle. The farmer marks progress (prepare/ready); the buyer confirms
// the produce was received (delivered). Once delivered AND the linked transaction is
// paid, the commitment auto-completes.
router.post("/:id/fulfill", requireAuth, async (req, res) => {
  const { step } = req.body || {};
  const pc = await precommitmentsRepo.getPreCommitment(req.params.id);
  if (!pc) return res.status(404).json({ error: "pre-commitment not found" });
  if (!precommitmentsRepo.FULFILL_STEPS.includes(step)) {
    return res.status(400).json({ error: `step must be one of: ${precommitmentsRepo.FULFILL_STEPS.join(", ")}` });
  }

  const listing = await listingsRepo.getListing(pc.listingId);

  if (step === "prepare" || step === "ready") {
    if (req.user.id !== listing.farmerId && req.user.role !== "admin") {
      return res.status(403).json({ error: "only the listing farmer can mark the produce" });
    }
  }
  if (step === "delivered") {
    if (req.user.id !== pc.buyerId) {
      return res.status(403).json({ error: "only the committing buyer can confirm receipt" });
    }
  }

  let updated;
  if (step === "ready") {
    const { actualQuantity, condition, conditionPhotos } = req.body;
    const q = actualQuantity == null ? null : Number(actualQuantity);
    if (q != null && (!Number.isFinite(q) || q <= 0)) {
      return res.status(400).json({ error: "actualQuantity must be a positive number" });
    }
    if (q != null && q > pc.quantity) {
      return res.status(400).json({
        error: `actualQuantity cannot exceed the buyer's requested quantity of ${pc.quantity}`,
      });
    }
    updated = await precommitmentsRepo.fulfillStep(pc.id, step, {
      actualQuantity: q,
      condition: condition == null || String(condition).trim() === "" ? null : String(condition).trim().slice(0, 200),
      conditionPhotos: Array.isArray(conditionPhotos) ? conditionPhotos.slice(0, 6) : null,
    });
  } else {
    updated = await precommitmentsRepo.fulfillStep(pc.id, step);
  }
  if (!updated) {
    return res.status(409).json({ error: `this pre-commitment is not in a state that allows '${step}'` });
  }

  const buyer = await usersRepo.getUser(pc.buyerId);
  const fulfilFarmer = await usersRepo.getUser(listing.farmerId);
  const farmerName = fulfilFarmer?.name || null;

  if (step === "prepare") {
    await notificationsRepo.notify({
      userId: buyer.id,
      phone: buyer.phone,
      email: buyer.email,
      title: `${farmerName || "The farmer"} started preparing`,
      messageKey: "precommit_preparing",
      language: buyer.language,
      params: { cropType: listing.cropType, farmerName },
    });
  }

  if (step === "ready") {
    const qty = updated.actualQuantity != null ? updated.actualQuantity : pc.quantity;
    const params = {
      quantity: qty,
      unit: listing.unit,
      cropType: listing.cropType,
      location: listing.location || "your pickup point",
      farmerName,
    };
    await notificationsRepo.notify({
      userId: buyer.id,
      phone: buyer.phone,
      email: buyer.email,
      title: `Your ${listing.cropType} from ${farmerName || "the farmer"} is ready`,
      messageKey: "precommit_ready",
      language: buyer.language,
      params,
    });
  }

  if (step === "delivered") {
    const farmer = await usersRepo.getUser(listing.farmerId);
    // Legacy pre-commitments accepted before transaction linking existed may have no
    // payment record yet - open one (same as the accept path) so escrow/completion
    // works and the notification below always carries a real price.
    let tx = pc.transactionId ? await transactionsRepo.getTransaction(pc.transactionId) : null;
    if (!tx) {
      const linked = await ensureTransaction(updated);
      tx = linked.tx;
    }
    const params = {
      buyerName: buyer.name,
      cropType: listing.cropType,
      price: tx ? tx.agreedPrice : (pc.agreedPrice != null ? pc.agreedPrice : pc.offeredPrice),
    };
    await notificationsRepo.notify({
      userId: farmer.id,
      phone: farmer.phone,
      email: farmer.email,
      title: "Buyer confirmed receipt",
      messageKey: "precommit_received",
      language: farmer.language,
      params,
    });
    // If payment already cleared, closing delivery completes the sale.
    await attemptComplete(updated, tx);
  }

  res.json(updated);
});

module.exports = router;
