-- 0016_user_croptype_unit_of_measure.sql
-- Canonical units of measure reference table. Listing, farm, and price rows store
-- a free-text unit; this table catalogs every distinct unit string already in use
-- (the ListingForm list plus the crop_types.default_unit values) so the frontend
-- can source its unit pickers from the DB instead of a hardcoded list.
CREATE TABLE IF NOT EXISTS unit_of_measure (
  id            TEXT PRIMARY KEY,               -- normalized key/unit string, e.g. 'crates'
  name          TEXT NOT NULL,                  -- display label, e.g. 'Crates'
  plural        TEXT NOT NULL,                  -- plural label when the id is singular
  active        BOOLEAN NOT NULL DEFAULT TRUE,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO unit_of_measure (id, name, plural, display_order)
VALUES
  ('bag',     'Bag',     'bags',    1),
  ('bags',    'Bags',    'bags',    2),
  ('basket',  'Basket',  'baskets', 3),
  ('crate',   'Crate',   'crates',  4),
  ('crates',  'Crates',  'crates',  5),
  ('kg',      'Kilogram','kg',      6),
  ('box',     'Box',     'boxes',   7),
  ('bunch',   'Bunch',   'bunches', 8),
  ('tubers',  'Tubers',  'tubers',  9),
  ('heads',   'Heads',   'heads',   10),
  ('pieces',  'Pieces',  'pieces',  11)
ON CONFLICT (id) DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_unit_of_measure_active ON unit_of_measure (active, display_order);

-- Per-user crop registry. users.primary_crops/purchase_crops (TEXT[] arrays) remain
-- the source of truth; this table is a normalized mirror synced on every write so
-- custom crops a user types in (not present in crop_types) are recorded and canonical
-- selections are linked back to their crop_types row (name = normalized lowercase key,
-- following the crop_types.id convention).
CREATE TABLE IF NOT EXISTS user_croptype (
  id           TEXT PRIMARY KEY DEFAULT (gen_random_uuid())::text,
  user_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  crop_type_id TEXT REFERENCES crop_types(id) ON DELETE SET NULL,
  name         TEXT NOT NULL,                   -- normalized key, e.g. 'tiger nuts'
  kind         TEXT NOT NULL DEFAULT 'primary' CHECK (kind IN ('primary', 'purchase')),
  custom       BOOLEAN NOT NULL DEFAULT FALSE,  -- true when the name is not a canonical crop
  emoji        TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, name, kind)
);

CREATE INDEX IF NOT EXISTS idx_user_croptype_user ON user_croptype (user_id, kind);