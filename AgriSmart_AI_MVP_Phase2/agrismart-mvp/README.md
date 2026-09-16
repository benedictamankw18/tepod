# AgriSmart AI — Phase 2 MVP

A working prototype of the core marketplace covered in Phase 2 of the project plan: produce
listing, buyer discovery, pre-commitments, price information, payment tracking, transport
coordination, USSD/SMS access, and a basic admin dashboard.

This is the base every later phase builds on — Phase 3 adds the AI forecasting module and
wires the SMS/USSD and mobile money stubs below to real providers; Phase 4 hardens and tests
what's here.

## What's implemented (and what's stubbed)

| Area | Status | SRS requirements covered |
|---|---|---|
| Data model (users, listings, pre-commitments, transactions, transport requests) | Real, in-memory | Foundation for FR-1.x–FR-9.x |
| Produce listing & buyer discovery | Real | FR-1.1, FR-1.2, FR-1.6 |
| Pre-commitments (submit / accept / reject / counter) | Real | FR-1.3, FR-1.5 |
| Price information (current + historical) | Real, seeded demo data | FR-2.1, FR-2.2, FR-2.4 |
| Payment tracking, reminders, reliability score | Real | FR-5.1, FR-5.2, FR-5.4, FR-5.5 |
| Transport coordination | Real | FR-4.1–FR-4.4 |
| User registration & ratings | Real | FR-7.1, FR-7.3 |
| USSD menu (register / list produce / check price / check status) | Real, simulated gateway contract; farmer registration adds optional crop + language follow-ups | FR-8.2, NFR-6.2 |
| SMS notifications | Real via Agoo SMS when `AGOOSMS_API_KEY` is set; otherwise logged to `/api/notifications` and the console | FR-1.4, FR-8.1 |
| Mobile money payment | **Not yet built** — `POST /api/transactions/:id/pay` marks paid manually; real MoMo integration is a Phase 3 task | FR-5.3 |
| AI forecasting module | **Not yet built** — Phase 3 | FR-3.x |
| Admin dashboard | Real, read-only | FR-9.1 |

The USSD and SMS pieces are built against the request/response shape a real gateway (e.g.
Africa's Talking, Hubtel) uses, so swapping the stub for a live vendor in Phase 3 is a matter
of pointing the same webhook logic at real credentials — the menu/session code doesn't change.

## SMS via Agoo SMS

Transaction-relevant SMS notifications (pre-commitment offers, accept/reject/counter,
payment paid/dispute/reminder, transport pickup) are sent through the
[Agoo SMS developer REST API](https://developer.agoosms.com):

```
POST https://api.agoosms.com/v1/sms/send
X-API-Key: <your key>
{ "to": "+233241234567", "message": "..." }
```

To enable live sending, copy `.env.example` to `.env` and set `AGOOSMS_API_KEY` to a key from
your Agoo SMS dashboard. Phone numbers are normalized to `+233…` (E.164) automatically.

When `AGOOSMS_API_KEY` is **not** set, or a send fails, messages still fall back to the
in-memory log you can view at `GET /api/notifications` and in the admin dashboard — the app
never fails a request because of SMS. Delivery is fire-and-forget: the logged entry records
`delivered` / `error` asynchronously.

Outgoing SMS is rendered from localized templates (`messages.js`) in the **recipient's**
preferred language (English or Twi, NFR-6.2). The recipient's `language` field is used; any
unmatched language falls back to English.

## Registration fields

Beyond the required `name`, `phone`, `role`, `location` (FR-7.1), registration captures optional
fields per role so the platform can pre-filter forecasts/price alerts, localize SMS, and surface
trust signals automatically:

| Field | Type | Purpose |
|---|---|---|
| `primaryCrops` | array | Crops the farmer actually grows (FR-3.1 pre-filter) |
| `language` | string (`en`/`tw`) | Preferred language for SMS (NFR-6.2) — default `en` |
| `farmSize` | number (acres, optional) | Smallholder vs. larger-farm segmentation (FR-9.2) |
| `community` | string (optional) | Finer-grain locality than town/market (FR-4.1) |
| `buyerType` | string (`wholesale`/`retail`/`processor`) | **Required for `buyer`** — shapes the trust signal farmers see in the offer SMS (FR-1.4); implicit `retail` for `market_seller` |
| `purchaseCrops` | array (optional) | Crops the buyer typically purchases (FR-2.1 alerts / matching) |
| `mobileMoneyProvider` | string (`mtn`/`vodafone_cash`/`airteltigo`, optional) | Payment-delivery preference (FR-5.3). **Preference only — no account numbers are stored (NFR-4.3)** |

The required USSD registration flow stays at 3 steps (name → role → location) for all roles. For
**farmers** only, two optional, skippable follow-ups capture primary crops and preferred language.
For **buyers**, one required 4th step captures `buyerType` (menu: Wholesale/Retail/Processor),
followed by two optional, skippable follow-ups for purchase crops and language — a deliberate,
accepted tradeoff against the 5-step budget (NFR-2.1) so the FR-1.4 trust signal is guaranteed.
`market_seller` skips the buyer-type prompt (its type is implicit) and only gets the optional crop
+ language follow-ups. The REST API (`POST /api/users`) and the web sign-up form accept all fields,
with `buyerType` required whenever `role` is `buyer`.

## Running it

```bash
npm install
npm start
```

Then:
- API: `http://localhost:3000/api/...`
- Admin dashboard: `http://localhost:3000/admin`
- USSD webhook (for testing with curl or a gateway simulator): `POST http://localhost:3000/ussd`

## USSD contract

Mimics the common `sessionId` / `phoneNumber` / `text` webhook pattern:

```bash
curl -X POST localhost:3000/ussd -H "Content-Type: application/json" \
  -d '{"sessionId":"s1","phoneNumber":"+233241110000","text":""}'
# -> "CON Welcome to AgriSmart AI\n1. Register\n..."
```

Each reply is either `CON ...` (session continues, more input expected) or `END ...` (session
closes). `text` accumulates every input the user has typed so far, `*`-separated — the same
convention Africa's Talking and most Ghanaian aggregators use.

## Key API endpoints

| Method & Path | Purpose |
|---|---|
| `POST /api/users` | Register a user (farmer / buyer / market_seller / transporter) |
| `POST /api/listings` | Farmer creates a produce listing |
| `GET /api/listings?cropType=&location=&status=` | Browse/search listings |
| `POST /api/precommitments` | Buyer submits a pre-commitment |
| `POST /api/precommitments/:id/respond` | Farmer accepts/rejects/counters |
| `GET /api/prices/current?cropType=&market=` | Current average price |
| `GET /api/prices/history?cropType=&market=&weeks=` | Price trend |
| `POST /api/transactions` | Record a payment obligation |
| `POST /api/transactions/:id/pay` | Mark a transaction paid |
| `POST /api/transactions/reminders/run` | Trigger overdue-payment reminders |
| `POST /api/transport-requests` | Request shared transport |
| `POST /api/transport-requests/:id/assign` | Transporter accepts a request |
| `GET /api/notifications` | View the simulated SMS/USSD outbox |
| `GET /api/summary` | Aggregate counts for the admin dashboard |

## Data persistence

This MVP uses an in-memory store (`store.js`) so it runs with zero setup for demo/testing
purposes — **all data resets when the server restarts.** Swapping in a real database
(Postgres is the natural choice given the relational shape of the data) is Phase 4 work; the
function signatures in `store.js` are written so that swap doesn't require touching the route
files.

## Verified end-to-end

The full loop — register farmer, register buyer, create listing, browse/search, submit
pre-commitment, accept, create transaction, mark paid, request transport, assign transporter —
was run against this server and produced correct notifications and state transitions at every
step, both via the REST API and via the USSD simulator.

## Next steps (Phase 3)

1. Wire the AI forecasting module (FR-3.x) against real price/weather data sources.
2. Replace the manual "mark paid" endpoint with real MTN MoMo Collections/Disbursements calls.
3. Add storage/spoilage-mitigation endpoints (FR-6.x).
