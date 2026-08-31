// paystack.js
// Thin client around the Paystack REST API for buyer charges (card / bank / mobile
// money) and escrow payouts to farmers. When PAYSTACK_SECRET_KEY is unset the
// service runs in a deterministic simulated mode so the full flow works in dev and
// tests without touching real money.

const crypto = require("crypto");
const config = require("../config");

const BASE = config.paystackBaseUrl;
const CURRENCY = config.paystackCurrency;

// Live mode needs a secret key AND no explicit simulation flag. The env is read per
// call (not via the cached config) so tests can force PAYSTACK_SIMULATED=1 at runtime
// even when a real (sandbox) key sits in .env.
function isEnabled() {
  return Boolean(process.env.PAYSTACK_SECRET_KEY && process.env.PAYSTACK_SIMULATED !== "1");
}

// The secret used for API calls. Only ever touched when isEnabled() is true.
function secretKey() {
  return process.env.PAYSTACK_SECRET_KEY || config.paystackSecretKey;
}

async function api(path, { method = "GET", body } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${secretKey()}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.status === false) {
    const err = new Error((json.message && json.message[0] && json.message[0].message) || json.message || `Paystack HTTP ${res.status}`);
    err.status = res.status;
    err.paystack = json;
    throw err;
  }
  return json;
}

// Normalise an amount in pesewas (GHS * 100) for Paystack.
const toMinor = (amount) => Math.round(Number(amount) * 100);

// Start a checkout for a buyer charge. Returns { authorization_url, reference }.
async function initializeCharge({ amountGhs, email, reference, metadata }) {
  const r = await api("/transaction/initialize", {
    method: "POST",
    body: {
      amount: toMinor(amountGhs),
      email,
      currency: CURRENCY,
      reference,
      channels: ["card", "bank", "mobile_money"],
      metadata: metadata || {},
    },
  });
  return {
    authorizationUrl: r.data.authorization_url,
    reference: r.data.reference,
    accessCode: r.data.access_code,
  };
}

// Ask Paystack whether a charge reference actually succeeded (used by /confirm).
async function verifyTransaction(reference) {
  const r = await api(`/transaction/verify/${encodeURIComponent(reference)}`);
  return {
    reference: r.data.reference,
    amount: r.data.amount / 100,
    currency: r.data.currency,
    channel: r.data.channel,
    status: r.data.status,
    paidAt: r.data.paid_at || null,
    customer: r.data.customer,
  };
}

// Paystack mobile-money recipients need the phone as E.164 without a leading 0,
// while the app stores local formats like 0550030318. Normalise before sending.
function toE164(phone) {
  if (phone == null) return phone;
  const digits = String(phone).replace(/\D/g, "");
  if (/^0\d{9}$/.test(digits)) return `233${digits.slice(1)}`;
  if (/^\d{9}$/.test(digits)) return `233${digits}`;
  if (/^233\d{9}$/.test(digits)) return digits;
  return String(phone);
}

// Build (or return a cached) transfer recipient for a farmer payout.
async function createTransferRecipient({ name, type, bankCode, accountNumber, momoProvider, momoPhone }) {
  const body =
    type === "bank"
      ? { type: "bank", name, currency: CURRENCY, bank_code: bankCode, account_number: accountNumber }
      : { type: "mobile_money", name, currency: CURRENCY, mobile_money: { provider: momoProvider, phone: toE164(momoPhone) } };
  const r = await api("/transferrecipient", { method: "POST", body });
  return r.data.recipient_code;
}

// Pay the farmer their net amount once the sale completes (escrow release).
async function initiateTransfer({ amountGhs, recipientCode, reference, reason }) {
  const r = await api("/transfer", {
    method: "POST",
    body: {
      source: "balance",
      amount: toMinor(amountGhs),
      recipient: recipientCode,
      reference,
      reason: reason || "NKABOM AGRILINK escrow payout",
      currency: CURRENCY,
    },
  });
  return { transferCode: r.data.transfer_code, reference: r.data.reference || reference };
}

// Paystack signs webhooks with an HMAC-SHA512 of the raw request body.
function verifyWebhook(signature, rawBody) {
  if (!config.paystackWebhookSecret || !signature || !rawBody) return false;
  const expected = crypto.createHmac("sha512", config.paystackWebhookSecret).update(rawBody).digest("hex");
  const a = Buffer.from(expected, "hex");
  const b = Buffer.from(String(signature), "hex");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

// Deterministic simulated successes so the pipeline runs without keys.
function simulatedCharge({ amountGhs, reference, email }) {
  return {
    reference,
    amount: toMinor(amountGhs),
    currency: CURRENCY,
    channel: "mobile_money",
    status: "success",
    paidAt: new Date().toISOString(),
    customer: { email },
  };
}

module.exports = {
  isEnabled, initializeCharge, verifyTransaction,
  createTransferRecipient, initiateTransfer, verifyWebhook,
  simulatedCharge,
};