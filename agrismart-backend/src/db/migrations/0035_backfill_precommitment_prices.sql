-- 0035_backfill_precommitment_prices.sql
-- Pre-commitments accepted before 0032 added agreed_price/transaction_id lack both:
-- fulfilment notifications would render "GHS null" and there is no payment record to
-- complete against. Backfill the agreed price from the negotiation and, for every
-- commitment whose deal has formed (accepted -> completed), create + link the missing
-- transaction - the same shape services/precommitments.js#ensureTransaction produces at
-- accept time (commission 0 / net = price, matching 0028's backfill behaviour).

-- 1) Agreed price. Accept paths already store a real value (COALESCE never overwrites)
--    and pending/countered/rejected rows are left alone - no deal has formed yet.
UPDATE pre_commitments pc
SET agreed_price = COALESCE(pc.agreed_price, pc.counter_price, pc.offered_price)
WHERE pc.agreed_price IS NULL
  AND pc.status IN ('accepted', 'preparing', 'ready', 'delivered', 'completed');

-- 2) Open the payment record for commitments missing one. gen_random_uuid() is core in
--    PG 13+; created id is captured so the link is exact even with two commitments from
--    the same buyer on the same listing.
DO $$
DECLARE
  rec     RECORD;
  new_id  TEXT;
BEGIN
  FOR rec IN
    SELECT pc.id, pc.listing_id, pc.buyer_id, pc.agreed_price
    FROM pre_commitments pc
    WHERE pc.transaction_id IS NULL
      AND pc.status IN ('accepted', 'preparing', 'ready', 'delivered', 'completed')
  LOOP
    INSERT INTO transactions (id, listing_id, buyer_id, farmer_id, agreed_price,
                              due_date, commission_amount, net_amount)
    SELECT gen_random_uuid()::text, rec.listing_id, rec.buyer_id, l.farmer_id,
           rec.agreed_price, (now() + INTERVAL '14 days')::date, 0, rec.agreed_price
    FROM listings l
    WHERE l.id = rec.listing_id
    RETURNING id INTO new_id;

    UPDATE pre_commitments
    SET transaction_id = new_id
    WHERE id = rec.id;
  END LOOP;
END $$;