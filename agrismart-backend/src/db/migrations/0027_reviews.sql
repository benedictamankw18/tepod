-- 0027_reviews.sql
-- Buyer reviews on produce listings. Only buyers who completed a PAID transaction
-- on a listing may review it (enforced in the route). One review per buyer per
-- listing; re-submitting updates the existing review.

CREATE TABLE IF NOT EXISTS reviews (
  id         TEXT PRIMARY KEY,
  listing_id TEXT NOT NULL REFERENCES listings(id),
  buyer_id   TEXT NOT NULL REFERENCES users(id),
  rating     INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment    TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (listing_id, buyer_id)
);

CREATE INDEX IF NOT EXISTS idx_reviews_listing ON reviews (listing_id);
CREATE INDEX IF NOT EXISTS idx_reviews_buyer ON reviews (buyer_id);