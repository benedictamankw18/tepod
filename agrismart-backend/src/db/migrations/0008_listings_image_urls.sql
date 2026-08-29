-- 0008_listings_image_urls.sql
-- Listing galleries: allow up to 5 uploaded photos per listing. Kept alongside the
-- existing image_url (first/primary image) for backward compatibility. The array is
-- TEXT[] so we can store multiple served /uploads/... URLs on one listing.
ALTER TABLE listings ADD COLUMN IF NOT EXISTS image_urls TEXT[] DEFAULT '{}';
