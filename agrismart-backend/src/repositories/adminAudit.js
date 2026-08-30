const { randomUUID } = require("crypto");
const { query } = require("../db/pool");

const ENTITY_TYPES = ["farm", "listing"];
const ACTIONS = ["create", "edit", "delete", "restore"];

// Persist one admin action on a moderated entity (farm/listing). `admin` is the
// req.user object; `reason` is expected to already be validated by the route for
// edit/delete. `before`/`after` are JSON-safe objects (row snapshots).
async function logAction({ admin, entityType, entityId, action, reason, before, after }) {
  if (!admin || !admin.id || !entityType || !entityId || !action) return null;
  const r = await query(
    `INSERT INTO admin_audit_logs (id, admin_id, admin_name, entity_type, entity_id, action, reason, before, after)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
    [
      randomUUID(),
      admin.id,
      admin.name || null,
      entityType,
      entityId,
      action,
      reason ? String(reason).trim() : null,
      before != null ? JSON.stringify(before) : null,
      after != null ? JSON.stringify(after) : null,
    ]
  );
  return r.rows[0];
}

// Admin activity feed, newest first, with filters: entityType ('farm'|'listing'),
// entityId, and action. The listing variant joins users to expose the owning
// farmer's name in the snapshot.
async function listAudits({ entityType, entityId, action } = {}) {
  const conds = [];
  const params = [];
  if (entityType) {
    params.push(entityType);
    conds.push(`a.entity_type = $${params.length}`);
  }
  if (entityId) {
    params.push(entityId);
    conds.push(`a.entity_id = $${params.length}`);
  }
  if (action) {
    params.push(action);
    conds.push(`a.action = $${params.length}`);
  }
  const where = conds.length ? `WHERE ${conds.join(" AND ")}` : "";
  const r = await query(
    `SELECT a.*, u.phone AS admin_phone
     FROM admin_audit_logs a
     LEFT JOIN users u ON u.id = a.admin_id
     ${where}
     ORDER BY a.created_at DESC
     LIMIT $${params.length + 1}`,
    [...params, 200]
  );
  return r.rows.map((row) => ({
    id: row.id,
    adminId: row.admin_id,
    adminName: row.admin_name || row.admin_phone || null,
    entityType: row.entity_type,
    entityId: row.entity_id,
    action: row.action,
    reason: row.reason || null,
    before: row.before,
    after: row.after,
    createdAt: row.created_at,
  }));
}

module.exports = { ENTITY_TYPES, ACTIONS, logAction, listAudits };