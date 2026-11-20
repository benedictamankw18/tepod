-- 0039_backfill_sold_listing_quantity.sql
-- Legacy sales only flipped listings.status to 'sold' and never reduced quantity.
-- The new recordSale() path reduces quantity to 0 before marking a listing sold,
-- so any sold row that still has quantity > 0 is legacy and can be corrected from
-- its completed pre-commitments (using the quantity actually handed over).
-- The history note makes this safe to re-run: corrected rows are skipped.
UPDATE listings l
SET quantity = GREATEST(l.quantity - LEAST(s.sold_qty, l.quantity), 0),
    status_history = l.status_history || jsonb_build_array(jsonb_build_object(
      'note', 'quantity_backfilled_from_precommitments',
      'at', to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')))
FROM (
  SELECT listing_id, SUM(COALESCE(actual_quantity, quantity)) AS sold_qty
  FROM pre_commitments
  WHERE status = 'completed'
  GROUP BY listing_id
) s
WHERE l.id = s.listing_id
  AND l.status = 'sold'
  AND l.quantity > 0
  AND s.sold_qty > 0
  AND NOT l.status_history @> '[{"note":"quantity_backfilled_from_precommitments"}]'::jsonb;
