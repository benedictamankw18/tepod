-- 0013_listings_deactivate.sql
-- Farmers may pause (deactivate) a listing without deleting it. Adds a
-- 'deactivated' value to the listing_status enum; an 'open' status reappears in
-- the buyer feed, 'deactivated' hides it.
ALTER TYPE listing_status ADD VALUE IF NOT EXISTS 'deactivated';
