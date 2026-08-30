-- Snapshot of the device's live coordinates captured at the moment the buyer
-- completes verification, so the audit record keeps where verification happened
-- even if the user later updates the coords on their profile.
ALTER TABLE buyer_verifications ADD COLUMN IF NOT EXISTS lat NUMERIC(10, 7);
ALTER TABLE buyer_verifications ADD COLUMN IF NOT EXISTS lng NUMERIC(10, 7);