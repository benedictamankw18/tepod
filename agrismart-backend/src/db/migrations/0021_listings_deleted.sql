-- 0021_listings_deleted.sql
-- Farmers soft-delete listings. Instead of removing the row, the status flips to
-- 'deleted': hidden from buyer feeds, detail views, and management lists, while the
-- listing (and its commitments/transactions/history) stay intact in the database.
ALTER TYPE listing_status ADD VALUE IF NOT EXISTS 'deleted';