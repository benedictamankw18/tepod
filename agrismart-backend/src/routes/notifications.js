const express = require("express");
const notificationsRepo = require("../repositories/notifications");
const { requireAuth, requireRole } = require("../middleware/auth");

const router = express.Router();

/**
 * @openapi
 * /api/notifications:
 *   get:
 *     tags: [Notifications]
 *     summary: List the SMS/USSD outbox (admin only)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Array of raw notification rows (snake_case DB fields)
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Notification'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */
// GET /api/notifications - the SMS/USSD outbox (admin)
router.get("/", requireAuth, requireRole("admin"), async (_req, res) => {
  res.json(await notificationsRepo.listNotifications());
});

module.exports = router;
