-- Optional location detail for listings (region, district, and GPS address).
-- IF NOT EXISTS keeps this re-runnable for tests, which re-apply migrations.
ALTER TABLE listings ADD COLUMN IF NOT EXISTS region      TEXT;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS district    TEXT;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS gps_address TEXT;