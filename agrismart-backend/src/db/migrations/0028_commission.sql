-- 0028_commission.sql
-- Admin-configurable commission on produce transactions. The admin tuning lives in
-- the generic key/value system_settings table (key 'commission', JSONB value), and
-- each transaction snapshots the commission + farmer net at creation time so later
-- setting changes never rewrite past transactions.

CREATE TABLE IF NOT EXISTS system_settings (
  key        TEXT PRIMARY KEY,
  value      JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by TEXT
);

ALTER TABLE transactions ADD COLUMN IF NOT EXISTS commission_amount NUMERIC(12,2) NOT NULL DEFAULT 0;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS net_amount NUMERIC(12,2) NOT NULL DEFAULT 0;

-- Existing transactions pre-date commission: keep the farmer's net at the full agreed
-- price (a 0 fee) rather than a misleading 0 payout.
UPDATE transactions
SET net_amount = agreed_price
WHERE commission_amount = 0 AND net_amount = 0 AND agreed_price > 0;