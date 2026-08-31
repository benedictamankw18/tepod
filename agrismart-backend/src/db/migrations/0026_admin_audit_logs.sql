-- 0026_admin_audit_logs.sql
-- Audit trail for admin actions on moderated entities (farms, listings). Admin
-- create/edit/delete of a farm or listing records WHO did WHAT and WHY (reason is
-- required for edit/delete), with before/after snapshots so changes can be reviewed.

CREATE TABLE IF NOT EXISTS admin_audit_logs (
  id          TEXT PRIMARY KEY,
  admin_id    TEXT NOT NULL REFERENCES users(id),
  admin_name  TEXT,
  entity_type TEXT NOT NULL,              -- 'farm' | 'listing'
  entity_id   TEXT NOT NULL,              -- the affected farm/listing id
  action      TEXT NOT NULL,              -- 'create' | 'edit' | 'delete' | 'restore'
  reason      TEXT,                       -- required for edit/delete
  before      JSONB,
  after       JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_entity ON admin_audit_logs (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_admin ON admin_audit_logs (admin_id);
CREATE INDEX IF NOT EXISTS idx_audit_action ON admin_audit_logs (action);