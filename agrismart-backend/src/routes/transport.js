const express = require("express");
const transportRepo = require("../repositories/transport");
const usersRepo = require("../repositories/users");
const precommitmentsRepo = require("../repositories/precommitments");
const listingsRepo = require("../repositories/listings");
const notificationsRepo = require("../repositories/notifications");
const { requireAuth, requireRole } = require("../middleware/auth");

const router = express.Router();

/**
 * @openapi
 * /api/transport-requests:
 *   post:
 *     tags: [Transport]
 *     summary: Farmer requests shared transport (FR-4.1)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [pickupLocation]
 *             properties:
 *               pickupLocation: { type: string }
 *               farmerIds:
 *                 type: array
 *                 items: { type: string, format: uuid }
 *                 description: Defaults to the requesting user
 *               requestedDate: { type: string, format: date }
 *     responses:
 *       201:
 *         description: Created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TransportRequest'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *   get:
 *     tags: [Transport]
 *     summary: List transport requests
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [requested, assigned, confirmed, cancelled] }
 *     responses:
 *       200:
 *         description: Array of transport requests
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/TransportRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
// POST /api/transport-requests - farmer requests shared transport (FR-4.1)
router.post("/", requireAuth, async (req, res) => {
  const { farmerIds, pickupLocation, requestedDate, precommitmentId } = req.body;

  let resolvedFarmerIds = (Array.isArray(farmerIds) && farmerIds.length) ? farmerIds : [req.user.id];
  let resolvedLocation = pickupLocation;

  if (precommitmentId) {
    const pc = await precommitmentsRepo.getPreCommitment(precommitmentId);
    if (!pc) return res.status(404).json({ error: "pre-commitment not found" });
    const listing = await listingsRepo.getListing(pc.listingId);
    const isFarmer = req.user.id === listing.farmerId;
    const isBuyer = req.user.id === pc.buyerId;
    if (!isFarmer && !isBuyer && req.user.role !== "admin") {
      return res.status(403).json({ error: "only the farmer or buyer on this pre-commitment can arrange transport" });
    }
    // Idempotent: a live request already serves this commitment.
    const active = await transportRepo.findActiveByPreCommitment(precommitmentId);
    if (active) return res.status(200).json(active);
    resolvedFarmerIds = [listing.farmerId];
    resolvedLocation = pickupLocation || listing.location || "pickup point";
  }

  if (!resolvedLocation) return res.status(400).json({ error: "pickupLocation is required" });

  const req_ = await transportRepo.createTransportRequest({
    farmerIds: resolvedFarmerIds,
    pickupLocation: resolvedLocation,
    requestedDate,
    precommitmentId,
  });
  res.status(201).json(req_);
});

// GET /api/transport-requests?status=&precommitmentId=
router.get("/", requireAuth, async (req, res) => {
  res.json(await transportRepo.listTransportRequests(req.query.status, req.query.precommitmentId));
});

/**
 * @openapi
 * /api/transport-requests/{id}/assign:
 *   post:
 *     tags: [Transport]
 *     summary: Transporter takes/assigns a transport request (FR-4.2)
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
 *               estimatedCost: { type: number }
 *     responses:
 *       200:
 *         description: Updated transport request
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TransportRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         description: Requires transporter or admin role
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
// POST /api/transport-requests/:id/assign - transporter takes the request (FR-4.2);
// admins may assign a specific transporter by supplying transporterId.
router.post("/:id/assign", requireAuth, requireRole("transporter", "admin"), async (req, res) => {
  const { transporterId, estimatedCost } = req.body;
  const { id } = req.params;
  const target = transporterId && req.user.role === "admin" ? String(transporterId) : req.user.id;
  const updated = await transportRepo.assignTransport(id, {
    transporterId: target,
    estimatedCost: Number(estimatedCost) || null,
  });
  if (!updated) return res.status(404).json({ error: "transport request not found" });

  for (const farmerId of updated.farmerIds) {
    const farmer = await usersRepo.getUser(farmerId);
    if (!farmer) continue;
    await notificationsRepo.logNotification({
      toPhone: farmer.phone,
      channel: "sms",
      messageKey: "transport_pickup",
      language: farmer.language,
      params: {
        date: updated.requestedDate || "soon",
        location: updated.pickupLocation,
        cost: updated.estimatedCost ?? "TBD",
      },
    });
  }
  res.json(updated);
});

// PATCH /api/transport-requests/:id/status - admin moves a request through its lifecycle
router.patch("/:id/status", requireAuth, requireRole("admin"), async (req, res) => {
  const { status } = req.body || {};
  if (!transportRepo.TRANSPORT_STATUSES.includes(status)) {
    return res.status(400).json({
      error: `status must be one of: ${transportRepo.TRANSPORT_STATUSES.join(", ")}`,
    });
  }
  const updated = await transportRepo.updateTransportStatus(req.params.id, status);
  if (!updated) return res.status(404).json({ error: "transport request not found" });
  res.json(updated);
});

module.exports = router;
