const express = require("express");
const precommitmentsRepo = require("../repositories/precommitments");
const listingsRepo = require("../repositories/listings");
const usersRepo = require("../repositories/users");
const notificationsRepo = require("../repositories/notifications");
const { buyerTypeLabel } = require("../services/messages");
const { requireAuth } = require("../middleware/auth");

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
  if (listing.status !== "open") {
    return res.status(409).json({ error: `listing is not open (status: ${listing.status})` });
  }

  const pc = await precommitmentsRepo.createPreCommitment({
    listingId, buyerId: req.user.id, quantity: q, offeredPrice: p,
  });

  const farmer = await usersRepo.getUser(listing.farmerId);
  await notificationsRepo.logNotification({
    toPhone: farmer.phone,
    channel: "sms",
    messageKey: "precommit_offer",
    language: farmer.language,
    params: {
      buyerName: req.user.name,
      buyerLabel: buyerTypeLabel(req.user.buyerType, farmer.language),
      quantity: q,
      unit: listing.unit,
      cropType: listing.cropType,
      price: p,
    },
  });

  res.status(201).json(pc);
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
// POST /api/precommitments/:id/respond - farmer accept/reject/counter (FR-1.5)
router.post("/:id/respond", requireAuth, async (req, res) => {
  const { action, counterPrice } = req.body;
  if (!["accept", "reject", "counter"].includes(action)) {
    return res.status(400).json({ error: "action must be accept, reject, or counter" });
  }
  const pc = await precommitmentsRepo.getPreCommitment(req.params.id);
  if (!pc) return res.status(404).json({ error: "pre-commitment not found" });

  const listing = await listingsRepo.getListing(pc.listingId);
  if (listing.farmerId !== req.user.id) {
    return res.status(403).json({ error: "only the listing farmer can respond" });
  }

  const updated = await precommitmentsRepo.respondToPreCommitment(req.params.id, { action, counterPrice });
  const buyer = await usersRepo.getUser(pc.buyerId);
  const keyMap = {
    accept: "precommit_accepted",
    reject: "precommit_rejected",
    counter: "precommit_counter",
  };
  await notificationsRepo.logNotification({
    toPhone: buyer.phone,
    channel: "sms",
    messageKey: keyMap[action],
    language: buyer.language,
    params: { cropType: listing.cropType, price: counterPrice || pc.offeredPrice },
  });
  res.json(updated);
});

module.exports = router;
