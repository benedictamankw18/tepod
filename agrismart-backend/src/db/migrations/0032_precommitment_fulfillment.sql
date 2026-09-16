-- 0032_precommitment_fulfillment.sql
-- Post-acceptance pre-commitment lifecycle (deposits/prepare/ready/delivered/completed),
-- deposits & partial payments on transactions, transfer wiring to pre-commitments.

-- Extend precommitment_status so an accepted commitment can move through fulfilment.
DO $$ BEGIN
  CREATE TYPE precommitment_status AS ENUM
    ('pending', 'accepted', 'preparing', 'ready', 'delivered', 'completed', 'rejected', 'countered');
EXCEPTION WHEN duplicate_object THEN
  ALTER TYPE precommitment_status ADD VALUE IF NOT EXISTS 'preparing';
  ALTER TYPE precommitment_status ADD VALUE IF NOT EXISTS 'ready';
  ALTER TYPE precommitment_status ADD VALUE IF NOT EXISTS 'delivered';
  ALTER TYPE precommitment_status ADD VALUE IF NOT EXISTS 'completed';
END $$;

-- Deposit state before a transaction is fully paid.
DO $$ BEGIN
  ALTER TYPE payment_status ADD VALUE IF NOT EXISTS 'deposited';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Fulfilment fields + the auto-created transaction link on pre_commitments.
ALTER TABLE pre_commitments
  ADD COLUMN IF NOT EXISTS agreed_price     NUMERIC(12,2) CHECK (agreed_price IS NULL OR agreed_price >= 0),
  ADD COLUMN IF NOT EXISTS actual_quantity  NUMERIC(12,2) CHECK (actual_quantity IS NULL OR actual_quantity >= 0),
  ADD COLUMN IF NOT EXISTS condition        TEXT,
  ADD COLUMN IF NOT EXISTS condition_photos JSONB,
  ADD COLUMN IF NOT EXISTS ready_at         TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS delivered_at     TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS completed_at     TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS transaction_id   TEXT REFERENCES transactions(id);

-- Deposit/partial-payment tracking on transactions.
ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS deposit_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS paid_amount    NUMERIC(12,2) NOT NULL DEFAULT 0;

-- Tie a transport request back to the pre-commitment it serves.
ALTER TABLE transport_requests
  ADD COLUMN IF NOT EXISTS precommitment_id TEXT REFERENCES pre_commitments(id);

CREATE INDEX IF NOT EXISTS idx_tr_pc ON transport_requests (precommitment_id);
CREATE INDEX IF NOT EXISTS idx_pc_transaction ON pre_commitments (transaction_id);