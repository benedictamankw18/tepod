-- 0009_banners.sql
-- Promotional banners: admin-managed hero content shown on the buyer storefront.
-- The storefront renders the first ACTIVE banner ordered by sort_order (ascending).
CREATE TABLE IF NOT EXISTS banners (
  id         TEXT PRIMARY KEY,
  title      TEXT NOT NULL,
  eyebrow    TEXT,
  subtitle   TEXT,
  image_url  TEXT,
  link_url   TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  active     BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_banners_active ON banners (active, sort_order);
