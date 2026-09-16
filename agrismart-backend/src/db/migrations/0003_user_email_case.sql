-- 0003_user_email_case.sql
-- Emails are unique case-insensitively; storage and lookups are normalized to lowercase.
-- Without this, an existing user with a mixed-case email (e.g. from Google) is missed by
-- the lowercase lookup and sign-in incorrectly attempts to create a duplicate -> 409.
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_lower ON users (LOWER(email)) WHERE email IS NOT NULL;
