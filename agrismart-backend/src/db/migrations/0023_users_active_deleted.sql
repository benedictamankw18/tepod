-- 0023_users_active_deleted.sql
-- Admins deactivate or soft-delete user accounts. Deactivated accounts keep their
-- row but can no longer log in or call authenticated endpoints; soft-deleted
-- accounts are hidden from public lookups/login but preserved (and restorable)
-- because listings, pre-commitments, transactions, transport requests and
-- verifications all reference users.
ALTER TABLE users ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE users ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;