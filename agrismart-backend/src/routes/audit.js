const express = require("express");
const audit = require("../repositories/adminAudit");
const { requireAuth, requireRole } = require("../middleware/auth");

const router = express.Router();

// GET /api/admin/audit - the admin moderation activity feed (admin only). Optional
// filters: entityType (farm|listing), entityId, action.
router.get("/audit", requireAuth, requireRole("admin"), async (req, res) => {
  const { entityType, entityId, action } = req.query;
  if (entityType && !audit.ENTITY_TYPES.includes(entityType)) {
    return res.status(400).json({ error: `entityType must be one of: ${audit.ENTITY_TYPES.join(", ")}` });
  }
  if (action && !audit.ACTIONS.includes(action)) {
    return res.status(400).json({ error: `action must be one of: ${audit.ACTIONS.join(", ")}` });
  }
  res.json(await audit.listAudits({ entityType, entityId, action }));
});

module.exports = router;