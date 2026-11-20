-- 0038_listings_quantity_nonnegative.sql
-- Completed sales decrement listings.quantity, so a fully sold listing must be
-- allowed to reach zero. The base schema declared CHECK (quantity > 0), which
-- would reject that update. Relax it to >= 0 without touching the cart or
-- pre-commitment quantity constraints.
DO $$
DECLARE
  cname TEXT;
BEGIN
  SELECT conname INTO cname
  FROM pg_constraint
  WHERE conrelid = 'listings'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid) ~* 'quantity.*>\s*0'
  LIMIT 1;

  IF cname IS NOT NULL THEN
    EXECUTE format('ALTER TABLE listings DROP CONSTRAINT %I', cname);
  END IF;
END $$;

ALTER TABLE listings DROP CONSTRAINT IF EXISTS listings_quantity_check;
ALTER TABLE listings ADD CONSTRAINT listings_quantity_check CHECK (quantity >= 0);
