-- 0022_farms_deleted_at.sql
-- Verified farmers soft-delete farm plots. Instead of removing the row, we stamp
-- deleted_at so the farm (and any listing -> farm links) stay in the database for
-- history, while the farm disappears from the farmer's lists and public detail.
ALTER TABLE farms ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;