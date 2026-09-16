-- Optional floor price a farmer sets on a listing: buyer offers below this are
-- rejected at submission. Null means no floor (any non-negative offer accepted).
ALTER TABLE listings ADD COLUMN IF NOT EXISTS minimum_price NUMERIC(12,2)
  CHECK (minimum_price IS NULL OR minimum_price >= 0);