-- 0036_backfill_transaction_totals.sql
-- Before this migration the payment record opened for an accepted pre-commitment
-- stored the PER-UNIT agreed price as the transaction amount (see 0035, which also
-- backfilled per-unit values). The reported amount, deposit floor, balance and
-- farmer payout were therefore all based on one unit, e.g. 14 bags @ GHS 23 showed
-- "Agreed GHS 23" instead of GHS 322.
--
-- services/precommitments.js#ensureTransaction now opens the record at the
-- basket TOTAL (per-unit price x quantity). This migration rewrites every
-- pre-commitment-linked transaction that predates the fix, scaling the stored
-- amounts by the commitment's quantity. Manual transactions (no pre_commitments
-- link) are untouched and rows with quantity 0/1 are no-ops.

UPDATE transactions t
SET agreed_price = ROUND(t.agreed_price * pc.quantity, 2),
    commission_amount = ROUND(t.commission_amount * pc.quantity, 2),
    net_amount = ROUND(t.net_amount * pc.quantity, 2)
FROM pre_commitments pc
WHERE pc.transaction_id = t.id
  AND pc.quantity IS NOT NULL
  AND pc.quantity > 0
  AND pc.quantity <> 1;