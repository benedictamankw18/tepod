-- Optional free-text detail/description for a listing (e.g. grade, freshness, notes).
-- IF NOT EXISTS keeps this re-runnable for tests, which re-apply migrations.
ALTER TABLE listings ADD COLUMN IF NOT EXISTS details TEXT;