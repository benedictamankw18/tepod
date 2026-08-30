-- 0034_user_payouts.sql
-- Farmer payout details for escrow releases: a bank account, a mobile-money
-- wallet, or one (cached) Paystack transfer-recipient code built from those.

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS bank_name             TEXT,
  ADD COLUMN IF NOT EXISTS bank_code             TEXT,
  ADD COLUMN IF NOT EXISTS bank_account_number   TEXT,
  ADD COLUMN IF NOT EXISTS bank_account_name     TEXT,
  ADD COLUMN IF NOT EXISTS momo_provider         TEXT,
  ADD COLUMN IF NOT EXISTS momo_number           TEXT,
  ADD COLUMN IF NOT EXISTS paystack_recipient_code TEXT;