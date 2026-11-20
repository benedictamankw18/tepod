-- NKABOM AGRILINK - PostgreSQL schema
-- Mirrors the relational data model from Phase 1 (Design & Planning §2.3).
-- Idempotent: safe to run repeatedly.

BEGIN;

-- ---------- Enumerated types ----------
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('farmer', 'buyer', 'market_seller', 'transporter', 'admin');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE buyer_type AS ENUM ('wholesale', 'retail', 'processor');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE language_code AS ENUM ('en', 'tw');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE mobile_money_provider AS ENUM ('mtn', 'vodafone_cash', 'airteltigo');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE listing_status AS ENUM ('open', 'pre_committed', 'sold', 'expired', 'spoiled_withdrawn');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE precommitment_status AS ENUM ('pending', 'accepted', 'rejected', 'countered');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE payment_status AS ENUM ('pending', 'paid', 'overdue', 'disputed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE transport_status AS ENUM ('requested', 'assigned', 'confirmed', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------- Users (FR-7.x) ----------
CREATE TABLE IF NOT EXISTS users (
  id             TEXT PRIMARY KEY,
  name           TEXT NOT NULL,
  phone          TEXT UNIQUE,                    -- stored in +233... E.164 form; NULL for Google/email-only accounts
  email          TEXT UNIQUE,
  username       TEXT UNIQUE,                    -- optional login handle (lower-case)
  password_hash  TEXT,                            -- null when using OTP / Google only
  role           user_role NOT NULL,
  location       TEXT,
  crop_types     TEXT[] NOT NULL DEFAULT '{}',
  primary_crops  TEXT[] NOT NULL DEFAULT '{}',
  purchase_crops TEXT[] NOT NULL DEFAULT '{}',
  buyer_type     buyer_type,
  mobile_money_provider mobile_money_provider,
  language       language_code NOT NULL DEFAULT 'en',  -- NFR-6.2
  farm_size      NUMERIC(8,2),                  -- acres (FR-9.2)
  community      TEXT,                          -- FR-4.1
  verified       BOOLEAN NOT NULL DEFAULT FALSE,
  rating         NUMERIC(3,2),
  rating_count   INTEGER NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- buyer_type required for role='buyer' (FR-1.4), absent otherwise
  CONSTRAINT chk_buyer_type CHECK (
    (role = 'buyer' AND buyer_type IS NOT NULL) OR
    (role <> 'buyer')
  ),
  CONSTRAINT chk_email_or_phone CHECK (email IS NOT NULL OR phone IS NOT NULL),
  CONSTRAINT chk_rating CHECK (rating >= 0 AND rating <= 5)
);

CREATE INDEX IF NOT EXISTS idx_users_phone ON users (phone);
CREATE INDEX IF NOT EXISTS idx_users_role ON users (role);

-- ---------- Listings (FR-1.1, FR-1.2, FR-1.6) ----------
CREATE TABLE IF NOT EXISTS listings (
  id            TEXT PRIMARY KEY,
  farmer_id     TEXT NOT NULL REFERENCES users(id),
  crop_type     TEXT NOT NULL,
  quantity      NUMERIC(12,2) NOT NULL CHECK (quantity >= 0),
  unit          TEXT NOT NULL DEFAULT 'bags',
  harvest_date  DATE,
  asking_price  NUMERIC(12,2) NOT NULL CHECK (asking_price >= 0),
  location      TEXT,
  status        listing_status NOT NULL DEFAULT 'open',
  status_history JSONB NOT NULL DEFAULT '[]',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_listings_farmer ON listings (farmer_id);
CREATE INDEX IF NOT EXISTS idx_listings_crop ON listings (crop_type);
CREATE INDEX IF NOT EXISTS idx_listings_status ON listings (status);

-- ---------- Pre-commitments (FR-1.3, FR-1.4, FR-1.5) ----------
CREATE TABLE IF NOT EXISTS pre_commitments (
  id            TEXT PRIMARY KEY,
  listing_id    TEXT NOT NULL REFERENCES listings(id),
  buyer_id      TEXT NOT NULL REFERENCES users(id),
  quantity      NUMERIC(12,2) NOT NULL CHECK (quantity > 0),
  offered_price NUMERIC(12,2) NOT NULL CHECK (offered_price >= 0),
  counter_price NUMERIC(12,2) CHECK (counter_price IS NULL OR counter_price >= 0),
  status        precommitment_status NOT NULL DEFAULT 'pending',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pc_listing ON pre_commitments (listing_id);
CREATE INDEX IF NOT EXISTS idx_pc_buyer ON pre_commitments (buyer_id);

-- ---------- Transactions / Payments (FR-5.x) ----------
CREATE TABLE IF NOT EXISTS transactions (
  id             TEXT PRIMARY KEY,
  listing_id     TEXT NOT NULL REFERENCES listings(id),
  buyer_id       TEXT NOT NULL REFERENCES users(id),
  farmer_id      TEXT NOT NULL REFERENCES users(id),
  agreed_price   NUMERIC(12,2) NOT NULL CHECK (agreed_price >= 0),
  payment_status payment_status NOT NULL DEFAULT 'pending',
  due_date       DATE NOT NULL,
  paid_at        TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tx_buyer ON transactions (buyer_id);
CREATE INDEX IF NOT EXISTS idx_tx_farmer ON transactions (farmer_id);
CREATE INDEX IF NOT EXISTS idx_tx_status ON transactions (payment_status);

-- ---------- Transport requests (FR-4.x) ----------
CREATE TABLE IF NOT EXISTS transport_requests (
  id              TEXT PRIMARY KEY,
  farmer_ids      TEXT[] NOT NULL,
  pickup_location TEXT NOT NULL,
  requested_date  DATE,
  status          transport_status NOT NULL DEFAULT 'requested',
  transporter_id  TEXT REFERENCES users(id),
  estimated_cost  NUMERIC(12,2) CHECK (estimated_cost IS NULL OR estimated_cost >= 0),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tr_status ON transport_requests (status);

-- ---------- Prices (FR-2.1, FR-2.2) ----------
CREATE TABLE IF NOT EXISTS prices (
  id        SERIAL PRIMARY KEY,
  crop_type TEXT NOT NULL,
  market    TEXT NOT NULL,
  price     NUMERIC(10,2) NOT NULL CHECK (price >= 0),
  date      DATE NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_prices_crop_market ON prices (crop_type, market, date);

-- ---------- Notifications (FR-1.4, FR-8.1) ----------
CREATE TABLE IF NOT EXISTS notifications (
  id           TEXT PRIMARY KEY,
  to_phone     TEXT NOT NULL,
  channel      TEXT NOT NULL,             -- 'sms' | 'ussd'
  message_key  TEXT,
  language     language_code,
  params       JSONB,
  message      TEXT NOT NULL,
  delivered    BOOLEAN,
  agoo_id      TEXT,
  error        TEXT,
  sent_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------- USSD sessions (NFR-1.1) ----------
CREATE TABLE IF NOT EXISTS ussd_sessions (
  session_id TEXT PRIMARY KEY,
  step       TEXT NOT NULL DEFAULT 'main',
  data       JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------- Authentication ----------
-- One-time password (phone OTP) and account-activation tokens.
CREATE TABLE IF NOT EXISTS otp_codes (
  id         TEXT PRIMARY KEY,
  phone      TEXT NOT NULL,
  code_hash  TEXT NOT NULL,
  purpose    TEXT NOT NULL DEFAULT 'login',  -- 'login' | 'verify'
  expires_at TIMESTAMPTZ NOT NULL,
  used       BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_otp_phone ON otp_codes (phone, purpose);

CREATE TABLE IF NOT EXISTS oauth_accounts (
  id            TEXT PRIMARY KEY,
  user_id       TEXT NOT NULL REFERENCES users(id),
  provider      TEXT NOT NULL,             -- 'google'
  provider_uid  TEXT NOT NULL,
  UNIQUE (provider, provider_uid)
);

COMMIT;
