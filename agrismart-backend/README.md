# AgriSmart AI — Backend

Production backend for AgriSmart AI: a marketplace connecting smallholder farmers with
wholesale/retail/processor buyers in Ghana, plus price info, payment tracking, transport
coordination, and USSD/SMS access.

Built on **Node.js + Express + PostgreSQL**. This replaces the in-memory Phase 2 MVP store with
a persistent relational database, so **data survives restarts**.

## Tech

| Layer | Technology |
|---|---|
| Runtime | Node.js 18+ (developed on 22) |
| API | Express (REST/JSON) |
| Database | PostgreSQL (raw `pg` driver, no ORM by design — SQL stays transparent) |
| Auth | Phone/email + password (bcryptjs), phone OTP, Google-adapter stub; JWT bearer tokens |
| SMS | Agoo SMS REST API with a logged fallback when no key is set |
| Tests | Jest + Supertest against a real Postgres test DB |

## Requirements

- Node.js 18+
- A running PostgreSQL server (local Postgres 18 on port 5432 is assumed)

## Setup

```bash
npm install
```

Create a database and a limited role (one-time, as a Postgres superuser):

```sql
CREATE ROLE agrismart_app LOGIN PASSWORD 'change-me';
CREATE DATABASE agrismart OWNER agrismart_app;
```

Copy the env template and set `DATABASE_URL`:

```bash
cp .env.example .env
# edit .env : fill in DATABASE_URL and JWT_SECRET
```

Apply the schema and load demo data:

```bash
npm run migrate
npm run seed
```

## Run

```bash
npm start          # http://localhost:3000
npm run dev        # auto-restart on change
```

- Health: `GET /api/health`
- USSD webhook: `POST /ussd`
- Admin summary: `GET /api/summary` (needs an `admin` bearer token)

## Test

Tests hit a Postgres database. Point the suite at one (separate from dev is recommended):

```bash
# set TEST_DATABASE_URL in .env, or export it:
#   export TEST_DATABASE_URL=postgres://agrismart_app:change-me@localhost:5432/agrismart_test
npm test
```

## Key API endpoints

| Method & Path | Purpose | Auth |
|---|---|---|
| `POST /api/auth/register` | Sign up with phone/email + password | public |
| `POST /api/auth/login` | Log in with phone-or-email + password | public |
| `POST /api/auth/otp/issue` | Request a phone OTP | public |
| `POST /api/auth/otp/verify` | Verify OTP → token (auto-register) | public |
| `GET /api/auth/me` | Current user | token |
| `POST /api/users` | Register a user (also a bootstrap path) | public |
| `GET /api/users` | List users | admin |
| `POST /api/users/:id/rate` | Rate a user | token |
| `POST /api/listings` | Farmer lists produce | token (farmer) |
| `GET /api/listings?cropType=&location=&status=` | Browse/search | public |
| `POST /api/precommitments` | Buyer submits a pre-commitment | token (buyer) |
| `POST /api/precommitments/:id/respond` | Accept/reject/counter | token (farmer) |
| `POST /api/transactions` | Record a sale obligation | token (farmer) |
| `POST /api/transactions/:id/pay` | Mark paid | token |
| `POST /api/transactions/reminders/run` | Send overdue reminders | token |
| `POST /api/transport-requests` | Request shared transport | token |
| `POST /api/transport-requests/:id/assign` | Transporter assigns | token (transporter) |
| `GET /api/prices/current?cropType=&market=` | Current average price | public |
| `GET /api/prices/history?cropType=&market=&weeks=` | Price trend | public |
| `GET /api/notifications` | SMS/USSD outbox | admin |

## Project layout

```
src/
  config/        env + config
  db/            pool, schema.sql, migrate.js, seed.js
  repositories/  SQL data access (users, listings, precommitments, transactions, transport, prices, notifications, ussd sessions)
  services/      ussd engine, auth, localized message templates
  routes/        express routers (auth, users, listings, precommitments, transactions, transport, prices, notifications, summary, health, ussd)
  middleware/    auth guards, error handler
  app.js         app assembly (no listen)
  server.js      entrypoint
tests/           jest integration tests
```

## Data model

`users` (roles: farmer/buyer/market_seller/transporter/admin; `buyer_type` required for `buyer`),
`listings`, `pre_commitments`, `transactions` (payment tracking), `transport_requests`, `prices`,
`notifications`, `ussd_sessions`, `otp_codes`, `oauth_accounts`. The schema lives in
`src/db/schema.sql` and is applied by `npm run migrate`.

Notable domain rules enforced in the schema / repositories:

- **buyerType** is required for `role='buyer'` (FR-1.4 trust signal), implicit `retail` for
  `market_seller` (CHECK constraint + repo logic).
- **Mobile money** is captured as a *preference only* — no account numbers stored (NFR-4.3).
- Phone numbers are normalized to E.164 (`+233…`) on write.
- Listing `status` transitions open → pre_committed → sold (with an evolving `status_history`).
