const express = require("express");
const transportRepo = require("../repositories/transport");
const usersRepo = require("../repositories/users");
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
  const { farmerIds, pickupLocation, requestedDate } = req.body;
  if (!pickupLocation) return res.status(400).json({ error: "pickupLocation is required" });
  const req_ = await transportRepo.createTransportRequest({
    farmerIds: Array.isArray(farmerIds) && farmerIds.length ? farmerIds : [req.user.id],
    pickupLocation,
    requestedDate,
  });
  res.status(201).json(req_);
});

// GET /api/transport-requests?status=
router.get("/", requireAuth, async (req, res) => {
  res.json(await transportRepo.listTransportRequests(req.query.status));
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
// POST /api/transport-requests/:id/assign - transporter takes the request (FR-4.2)
router.post("/:id/assign", requireAuth, requireRole("transporter", "admin"), async (req, res) => {
  const { estimatedCost } = req.body;
  const updated = await transportRepo.assignTransport(req.params.id, {
    transporterId: req.user.id,
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

module.exports = router;
