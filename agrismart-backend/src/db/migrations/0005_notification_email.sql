-- 0005_notification_email.sql
-- Add a nullable recipient email to notifications so the system can deliver via
-- the SMTP/email channel in addition to SMS/USSD. The channel check constraint is
-- left open (free-form) so both 'sms'/'ussd'/'email' values are allowed.

ALTER TABLE notifications ADD COLUMN IF NOT EXISTS to_email TEXT;
