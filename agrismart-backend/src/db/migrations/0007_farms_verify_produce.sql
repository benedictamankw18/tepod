-- 0007_farms_verify_produce.sql
-- Role-dashboard data model: farms (pre/post-harvest) with status + image,
-- produce maturity on listings, geo-coordinates + region fields on users,
-- and buyer verification records (ID + live photo).

-- Users: add geolocation and administrative address fields (both roles).
ALTER TABLE users ADD COLUMN IF NOT EXISTS lat        NUMERIC(10, 7);
ALTER TABLE users ADD COLUMN IF NOT EXISTS lng        NUMERIC(10, 7);
ALTER TABLE users ADD COLUMN IF NOT EXISTS region     TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS district   TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS gps_address TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS address    TEXT;

-- Listings: produce image + maturity ("matural") for the buyer feed.
ALTER TABLE listings ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS maturity  TEXT;

-- Farms: a farmer's plots split into pre-harvest / post-harvest stages.
CREATE TABLE IF NOT EXISTS farms (
  id         TEXT PRIMARY KEY,
  farmer_id  TEXT NOT NULL REFERENCES users(id),
  name       TEXT NOT NULL DEFAULT 'My farm',
  crop_type  TEXT NOT NULL,
  stage      TEXT NOT NULL DEFAULT 'pre_harvest',   -- 'pre_harvest' | 'post_harvest'
  status     TEXT NOT NULL DEFAULT 'growing',        -- e.g. growing / ready / harvested
  image_url  TEXT,
  location   TEXT,
  lat        NUMERIC(10, 7),
  lng        NUMERIC(10, 7),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_farm_stage CHECK (stage IN ('pre_harvest', 'post_harvest'))
);
CREATE INDEX IF NOT EXISTS idx_farms_farmer ON farms (farmer_id);
CREATE INDEX IF NOT EXISTS idx_farms_stage  ON farms (stage);

-- Buyer verification: identification type + (redacted) number + live photo.
CREATE TABLE IF NOT EXISTS buyer_verifications (
  id            TEXT PRIMARY KEY,
  user_id       TEXT NOT NULL REFERENCES users(id),
  id_type       TEXT NOT NULL,                        -- 'ghana_card' | 'voter_card' | 'passport'
  id_number     TEXT NOT NULL,                        -- stored redacted (last 4 visible)
  photo_url     TEXT NOT NULL,
  submitted_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_id_type CHECK (id_type IN ('ghana_card', 'voter_card', 'passport'))
);
CREATE INDEX IF NOT EXISTS idx_buyer_verify_user ON buyer_verifications (user_id);
