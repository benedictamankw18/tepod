# Paystack + Escrow Payments — Design

NKABOM AGRILINK holds buyer money in escrow while a pre-commitment is fulfilled, then
releases the farmer's net payout when the sale completes. Charges and payouts go through
**Paystack (GHS)**; with no secret key configured the whole pipeline runs in a deterministic
**simulated mode** so the feature works and tests green before any keys exist.

## Escrow lifecycle

A transaction carries these escrow fields (see `0033_payments_escrow.sql`):

| Status | Meaning |
|---|---|
| `none` | Escrow not in use (legacy/manual flow). |
| `funds_collected` | Buyer paid a deposit with escrow enabled; money held. |
| `held` | Full payment collected on a delivered commitment. |
| `released` | Farmer payout initiated/complete. |
| `refunded` | Reserved for admin-initiated refunds. |

Flow:

1. Buyer charges a **deposit** (`POST /api/transactions/:id/charge`, `kind: deposit`). With
   escrow on, the deposit is floored at `depositPercent` of the agreed price.
   → `funds_collected`.
2. Farmer marks the commitment `ready`, buyer marks it `delivered`.
3. Buyer charges the **balance** (`kind: balance`) → `paid`, escrow `held`.
4. Completion (`delivered` + `paid`) triggers `attemptComplete`, which releases the farmer's
   **net amount** (agreed price minus platform commission) via `releaseToFarmer`
   → `released`.

With escrow **off**, charges behave like the legacy manual flow: money is recorded on the
transaction and completion is immediate; the deposit floor does not apply and explicit
amounts are optional.

## Endpoints

| Method & Path | Purpose | Auth |
|---|---|---|
| `GET /api/payments/config` | `{ escrowEnabled, depositPercent, currency, provider, payoutMode, publicKey, simulated }` | any token |
| `POST /api/transactions/:id/charge` | Buyer charges `{ kind: "deposit" \| "balance", amount? }` → `{ transaction, payment, simulated }` | that buyer |
| `POST /api/payments/:id/confirm` | Confirm a pending charge after customer returns from the Paystack popup / after webhook receipt | buyer or admin |
| `POST /api/payments/webhook` | Paystack event webhook (HMAC-SHA512 vs `req.rawBody`) | signature |
| `PUT /api/settings/payments` | Admin updates `{ escrowEnabled, depositPercent, payoutMode }` | admin |
| `GET /api/settings/payments` | Read the payment/escrow policy | admin |
| `POST /api/auth/payout` | Farmer saves payout bank **or** mobile-money details | farmer |

Defaults: `escrowEnabled: false`, `depositPercent: 30`, `payoutMode: auto`, `currency: GHS`.

## Charge rules (`services/payments.js#computeChargeAmount`)

- **Deposit**: when escrow is on, requires at least
  `ceil(agreedPrice * depositPercent / 100)`. Omit `amount` to be charged exactly the floor.
  A smaller explicit amount is rejected with `400` (`a deposit of at least GHS X is required`).
  With escrow off, an explicit positive `amount` is mandatory.
- **Balance**: the remaining amount (`agreedPrice - depositAmount - paidAmount`), or an
  explicit amount that must be positive and not exceed the remainder.

## Webhook idempotency

A charge can arrive both via the returned `authorization_url` redirect (client calls
`/confirm`) and again as a Paystack webhook. Both paths funnel into
`services/payments.js#applySuccessfulCharge`, and `markPaymentSuccess` is guarded with
`WHERE status = 'pending'` — the second signal returns the already-settled transaction
instead of double-counting or double-announcing. Payout transfers
(`transfer.success`) and failures (`transfer.failed/abandoned/reversed/revoked`) are also
accepted; the failed variants leave escrow untouched for admin resolution.

Verification: the Paystack webhook signature (`x-paystack-signature`, HMAC-SHA512 of the raw
body using `PAYSTACK_WEBHOOK_SECRET`) is verified against the **raw** request body, which is
captured in `app.js` via `express.json({ verify })`.

## Farmer payout (`services/payments.js#releaseToFarmer`)

Triggered in `services/precommitments.js#attemptComplete` when `payoutMode === "auto"` and
escrow is `held`/`funds_collected`. A failure never blocks the sale — it is logged and the
escrow stays held for admin follow-up.

- **Simulated** (no secret key): a `payout` ledger row is written `success` (+
  `metadata.simulated`) and escrow becomes `released`.
- **Live**: the farmer's bank or mobile-money details (from `POST /api/auth/payout`) are used
  to create/cache a Paystack transfer recipient (`users.paystack_recipient_code`), then
  `initiateTransfer` moves `net_amount`. No payout account → payout row `failed`, escrow
  released with an error for admin follow-up.

Payout and charge references are unique per attempt
(`payout-<txid12>-<ms>` / `AGL-<txid12>-<kind>-<ms>`), so repeated attempts are tractable in
the `payments` ledger.

## Simulated mode

`services/paystack.js#isEnabled()` returns live only when `PAYSTACK_SECRET_KEY` is set AND
`PAYSTACK_SIMULATED` is not `1`. Setting `PAYSTACK_SIMULATED=1` forces simulation even when
a sandbox key is present — the test suite does exactly that so runs are deterministic and
never touch the Paystack API. Simulated charges settle instantly; the frontend does not open
the Paystack popup. `GET /api/payments/config` reports `simulated` so clients can render the
right copy.

## Environment

```
PAYSTACK_SECRET_KEY=     # leave empty for simulated mode
PAYSTACK_PUBLIC_KEY=
PAYSTACK_WEBHOOK_SECRET=
PAYSTACK_CURRENCY=GHS
PAYSTACK_BASE_URL=https://api.paystack.co
# PAYSTACK_SIMULATED=1   # force simulation even with a key (tests/staging)
```

## Schema

- `0033_payments_escrow.sql` — `transactions.escrow_status`,
  `transactions.escrow_amount`, `transactions.payment_method`, `transactions.payment_provider`,
  `transactions.payout_reference`; `payments` ledger (kind `deposit|balance|payout`, charges
  keep `status: pending` until confirmed).
- `0034_user_payouts.sql` — `users.bank_account_*`, `users.momo_provider`,
  `users.momo_number`, `users.paystack_recipient_code`.
- `system_settings` key `payments` holds the admin policy (`escrowEnabled`, `depositPercent`,
  `provider`, `currency`, `payoutMode`).

Legacy `POST /api/transactions/:id/pay` and `/api/transactions/:id/deposit` remain as the
escrow-off admin fallback.

## Manual vs automated note

The legacy routes let a logged-in user (or admin) mark money paid without a provider. They
still work, but with escrow on the supported path is `charge` → Paystack (or simulated) →
`confirm`/webhook → automatic escrow release on completion.