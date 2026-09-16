-- 0024_notifications_user_id.sql
-- Tie notifications to a user row so "in-app" messages are deliverable through the
-- app (bell + inbox) rather than only via SMS/email. The to_phone NOT NULL constraint
-- is dropped because Google/email-only accounts have no phone and still need in-app
-- notifications.
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS user_id TEXT REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ;
ALTER TABLE notifications ALTER COLUMN to_phone DROP NOT NULL;
CREATE INDEX IF NOT EXISTS idx_notifications_user_sent ON notifications (user_id, sent_at DESC);