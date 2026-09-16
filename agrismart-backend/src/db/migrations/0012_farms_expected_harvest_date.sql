-- 0012_farms_expected_harvest_date.sql
-- Farms carry an expected harvest date so pre/post-harvest grouping can be
-- derived from it (past => post-harvest, today/future => pre-harvest) instead
-- of relying solely on a manually-chosen stage.

ALTER TABLE farms ADD COLUMN IF NOT EXISTS expected_harvest_date DATE;
