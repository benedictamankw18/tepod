-- Optional link from a listing (produce) to the farm plot it was grown on.
-- Deleting a farm leaves the listing intact with the link cleared.
-- IF NOT EXISTS keeps this re-runnable for tests, which re-apply migrations.
ALTER TABLE listings ADD COLUMN IF NOT EXISTS farm_id TEXT REFERENCES farms(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_listings_farm ON listings (farm_id);