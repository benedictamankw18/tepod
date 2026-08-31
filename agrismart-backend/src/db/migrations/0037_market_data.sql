-- 0037_market_data.sql
-- Regional retail market-price surveys + national cropped-area statistics, imported
-- from the CSV files in the repo's csv/ folder (weekly regional commodity surveys,
-- Apr-Oct 2025, and national production statistics 2019-2023). This data powers the
-- AI crop-demand guide.
--
-- Kept separate from the app-level `prices` table on purpose: prices holds the
-- GHS-per-unit signals shown to farmers/buyers (price guide, listings), while
-- market_prices holds survey GHS-per-kg retail quotes with an explicit region on
-- every row so the demand guide can rank crops by region and season honestly.

CREATE TABLE IF NOT EXISTS market_prices (
  id             SERIAL PRIMARY KEY,
  region         TEXT NOT NULL,                        -- Ghana region the survey came from
  district       TEXT NOT NULL DEFAULT '',
  market         TEXT NOT NULL,                        -- survey market name (e.g. 'Mankessim')
  commodity_key  TEXT NOT NULL,                        -- normalized crop_types key (e.g. 'tomato')
  commodity_name TEXT NOT NULL,                        -- source name (e.g. 'Tomato Local')
  price          NUMERIC(10,2) NOT NULL,               -- retail survey price GHS / kg
  date           DATE NOT NULL,                        -- survey day (ISO)
  source         TEXT NOT NULL DEFAULT 'retail',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_market_prices_crop_region
  ON market_prices (commodity_key, region, date);
CREATE INDEX IF NOT EXISTS idx_market_prices_crop
  ON market_prices (commodity_key, date);

CREATE TABLE IF NOT EXISTS crop_area (
  commodity_key  TEXT NOT NULL,                        -- normalized crop_types key (e.g. 'maize')
  commodity_name TEXT NOT NULL,                        -- source name (e.g. 'Maize')
  year           INTEGER NOT NULL,
  hectares       NUMERIC(12,0) NOT NULL,
  PRIMARY KEY (commodity_key, year)
);