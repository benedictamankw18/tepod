-- 0033_payments_escrow.sql
-- Real-payment groundwork: a per-charge / per-payout payment ledger and escrow
-- tracking on transactions (buyer money collected by the platform and held until
-- the sale completes, then auto-released to the farmer).

-- Per-payment ledger. One row per deposit/balance charge or farmer payout, so the
-- audit trail and Paystack webhook handling stay idempotent.
CREATE TABLE IF NOT EXISTS payments (
  id           TEXT PRIMARY KEY,
  transaction_id TEXT REFERENCES transactions(id),
  kind         TEXT NOT NULL CHECK (kind IN ('deposit', 'balance', 'payout')),
  provider     TEXT NOT NULL DEFAULT 'paystack' CHECK (provider IN ('paystack', 'manual')),
  reference    TEXT,
  status       TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'failed', 'refunded')),
  amount       NUMERIC(12,2) NOT NULL DEFAULT 0,
  channel      TEXT,
  metadata     JSONB,
  error        TEXT,
  charged_at   TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payments_tx        ON payments (transaction_id);
CREATE INDEX IF NOT EXISTS idx_payments_reference ON payments (reference);

-- Escrow state on the transaction record.
ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS escrow_status     TEXT NOT NULL DEFAULT 'none'
    CHECK (escrow_status IN ('none', 'funds_collected', 'held', 'released', 'refunded')),
  ADD COLUMN IF NOT EXISTS escrow_amount     NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS payment_method    TEXT,
  ADD COLUMN IF NOT EXISTS payment_provider  TEXT,
  ADD COLUMN IF NOT EXISTS payout_reference  TEXT;