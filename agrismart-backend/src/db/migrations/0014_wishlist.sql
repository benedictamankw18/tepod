-- 0014_wishlist.sql
-- Server-side wishlist: one row per (user, listing) favourite.
-- Replaces the client-side localStorage wishlist so favourites persist
-- across devices for any authenticated user.
CREATE TABLE IF NOT EXISTS wishlist_items (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  listing_id TEXT NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, listing_id)
);
CREATE INDEX IF NOT EXISTS idx_wishlist_user ON wishlist_items (user_id);
