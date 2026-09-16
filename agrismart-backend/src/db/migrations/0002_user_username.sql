-- 0002_user_username.sql
-- Adds an optional unique username login handle to users (idempotent for existing DBs).
ALTER TABLE users ADD COLUMN IF NOT EXISTS username TEXT UNIQUE;
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username ON users (username) WHERE username IS NOT NULL;
