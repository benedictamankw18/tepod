-- 0011_cart.sql
-- Server-side shopping cart: one row per (user, listing) line item.
-- Replaces the client-side localStorage cart so the cart persists across
-- devices and only valid, open listings can be added.
CREATE TABLE IF NOT EXISTS cart_items (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  listing_id TEXT NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  quantity   NUMERIC(12,2) NOT NULL CHECK (quantity > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, listing_id)
);
CREATE INDEX IF NOT EXISTS idx_cart_user ON cart_items (user_id);
