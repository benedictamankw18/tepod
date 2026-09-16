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
// GET /api/notifications - the SMS/USSD outbox (admin), with optional channel/delivered filters
router.get("/", requireAuth, requireRole("admin"), async (req, res) => {
  res.json(
    await notificationsRepo.listNotifications({
      channel: req.query.channel || undefined,
      delivered: req.query.delivered === undefined ? undefined : req.query.delivered === "true",
    })
  );
});

/**
 * @openapi
 * /api/notifications/broadcast:
 *   post:
 *     tags: [Notifications]
 *     summary: Send a broadcast notification to buyers / farmers / all (admin only)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [audience, channels, message]
 *             properties:
 *               audience: { type: string, enum: [buyers, farmers, all] }
 *               channels: { type: array, items: { type: string, enum: [in_app, sms, email] } }
 *               title: { type: string, description: "Display title for in-app rows" }
 *               message: { type: string }
 *     responses:
 *       200:
 *         description: Rollout summary with per-channel counts
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */
// POST /api/notifications/broadcast - admin broadcast (in-app / sms / email)
router.post("/broadcast", requireAuth, requireRole("admin"), async (req, res) => {
  const { audience, channels, title, message } = req.body || {};
  const result = await notificationsRepo.broadcastNotification({
    audience,
    channels,
    title,
    message,
  });
  if (result.error) return res.status(400).json({ error: result.error });
  res.json(result);
});

/**
 * @openapi
 * /api/notifications/me:
 *   get:
 *     tags: [Notifications]
 *     summary: The authenticated user's in-app notifications (newest first)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: "{ notifications: [...], unread: n }"
 */
// GET /api/notifications/me - current user's in-app inbox (limit/offset optional)
router.get("/me", requireAuth, async (req, res) => {
  res.json(
    await notificationsRepo.listMyNotifications(req.user.id, {
      limit: req.query.limit,
      offset: req.query.offset,
    })
  );
});

/**
 * @openapi
 * /api/notifications/me/read:
 *   post:
 *     tags: [Notifications]
 *     summary: Mark the user's in-app notifications as read (all, or by id list)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               ids: { type: array, items: { type: string } }
 *     responses:
 *       200:
 *         description: "{ marked: n }"
 */
// POST /api/notifications/me/read - mark read (all or a specific set)
router.post("/me/read", requireAuth, async (req, res) => {
  const ids = Array.isArray(req.body?.ids) ? req.body.ids : [];
  const marked = await notificationsRepo.markNotificationsRead(req.user.id, ids);
  res.json({ marked });
});

module.exports = router;
