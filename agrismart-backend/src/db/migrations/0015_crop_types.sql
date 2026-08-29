-- 0015_crop_types.sql
-- Canonical crop reference table. Listings, farms, and prices store a free-text
-- crop_type; this table provides the normalized list (id = lowercase key) plus
-- display + storefront-art metadata so the frontend can source its crop pickers
-- from the DB instead of a hardcoded list.
CREATE TABLE IF NOT EXISTS crop_types (
  id            TEXT PRIMARY KEY,                  -- normalized key, e.g. 'garden eggs'
  name          TEXT NOT NULL,                     -- display name, e.g. 'Garden Eggs'
  default_unit  TEXT NOT NULL DEFAULT 'bags',      -- suggested unit for new listings
  emoji         TEXT,                              -- storefront art
  gradient_from TEXT,                              -- storefront art
  gradient_to   TEXT,                              -- storefront art
  active        BOOLEAN NOT NULL DEFAULT TRUE,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed the canonical crop list (kept in sync with the frontend DEFAULT_CROPS).
INSERT INTO crop_types (id, name, default_unit, emoji, gradient_from, gradient_to, display_order)
VALUES
  ('tomato',      'Tomato',      'crates', '🍅', '#f7c6a0', '#e97f63', 1),
  ('pepper',      'Pepper',      'bags',   '🌶️', '#f2b9a3', '#c94f3d', 2),
  ('maize',       'Maize',       'bags',   '🌽', '#f7e2a8', '#eab65e', 3),
  ('plantain',    'Plantain',    'bunch',  '🍌', '#efe4a8', '#c6d13f', 4),
  ('yam',         'Yam',         'tubers', '🍠', '#ecd9b5', '#b98d5a', 5),
  ('cassava',     'Cassava',     'bags',   '🥔', '#e9ddc6', '#bfa97e', 6),
  ('cocoa',       'Cocoa',       'bags',   '🍫', '#d9c09b', '#8a6a45', 7),
  ('rice',        'Rice',        'bags',   '🍚', '#f4efe0', '#d9cfae', 8),
  ('groundnut',   'Groundnut',   'bags',   '🥜', '#ecd9b5', '#b98d5a', 9),
  ('mango',       'Mango',       'crates', '🥭', '#f7d98a', '#eda63b', 10),
  ('banana',      'Banana',      'bunch',  '🍌', '#f2e59a', '#dbc23f', 11),
  ('cabbage',     'Cabbage',     'heads',  '🥬', '#d3ecb0', '#8fbf4f', 12),
  ('onion',       'Onion',       'bags',   '🧅', '#f4e6cf', '#d9b98c', 13),
  ('pineapple',   'Pineapple',   'pieces', '🍍', '#f5e2a0', '#e0b23e', 14),
  ('garden eggs', 'Garden Eggs', 'bags',   '🍆', '#e6d0c8', '#9d6b8c', 15),
  ('cocoyam',     'Cocoyam',     'tubers', '🍠', '#e9ddc6', '#ad9170', 16)
ON CONFLICT (id) DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_crop_types_active ON crop_types (active, display_order);