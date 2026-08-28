-- 0004_user_phone_nullable.sql
-- Allow phone to be NULL. Google and email-only accounts have no phone; storing a
-- shared "" placeholder used to collide on the UNIQUE index, so every account after
-- the first could never sign up (409 "a record with that unique value already exists").
ALTER TABLE users ALTER COLUMN phone DROP NOT NULL;
