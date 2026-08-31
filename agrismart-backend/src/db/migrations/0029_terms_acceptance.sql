-- Consent record for the user agreement. Null until the user has accepted the
-- Terms of Service and Privacy Policy at sign-up or verification.
ALTER TABLE users ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMPTZ;