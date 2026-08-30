-- 0025_notifications_inapp_delivered.sql
-- In-app notifications are "delivered" the moment they are stored in the user's
-- inbox (bell), but the delivered column has no default so they showed NULL (rendered
-- as "Failed" in the admin outbox). Backfill existing rows; new rows are already
-- written with delivered = true by logNotification.
UPDATE notifications SET delivered = true WHERE channel = 'in_app' AND delivered IS DISTINCT FROM true;