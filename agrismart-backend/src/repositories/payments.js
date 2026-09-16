const { randomUUID } = require("crypto");
const { query } = require("../db/pool");

const PAYMENT_STATUSES = ["pending", "success", "failed", "refunded"];
const KINDS = ["deposit", "balance", "payout"];

// Per-charge / per-payout ledger rows, one per reference so webhooks stay idempotent.
const ROW_TO_PAYMENT = (r) => ({
  id: r.id,
  transactionId: r.transaction_id,
  kind: r.kind,
  provider: r.provider,
  reference: r.reference,
  status: r.status,
  amount: Number(r.amount ?? 0),
  channel: r.channel,
  error: r.error,
  chargedAt: r.charged_at,
  createdAt: r.created_at,
});

async function createPayment({ transactionId, kind, provider = "paystack", reference = null, amount = 0, channel = null, metadata = null, status = "pending" }) {
  const id = randomUUID();
  const r = await query(
    `INSERT INTO payments (id, transaction_id, kind, provider, reference, status, amount, channel, metadata, charged_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9, now()) RETURNING *`,
    [id, transactionId, kind, provider, reference || null, status, amount, channel || null, metadata ? JSON.stringify(metadata) : null]
  );
  return ROW_TO_PAYMENT(r.rows[0]);
}

async function getPaymentById(id) {
  const r = await query("SELECT * FROM payments WHERE id = $1", [id]);
  return r.rowCount ? ROW_TO_PAYMENT(r.rows[0]) : null;
}

async function getPaymentByReference(reference) {
  const r = await query("SELECT * FROM payments WHERE reference = $1 ORDER BY created_at DESC LIMIT 1", [reference]);
  return r.rowCount ? ROW_TO_PAYMENT(r.rows[0]) : null;
}

// Marks success only if still pending (WHERE status = 'pending') so webhook + confirm
// racing each other can't double-apply. Returns null when already settled.
async function markPaymentSuccess(id, { channel, reference, chargedAt } = {}) {
  const sets = ["status = 'success'"];
  const params = [id];
  if (channel !== undefined) { params.push(channel); sets.push(`channel = $${params.length}`); }
  if (reference) { params.push(reference); sets.push(`reference = $${params.length}`); }
  if (chargedAt) { params.push(new Date(chargedAt)); sets.push(`charged_at = $${params.length}`); }
  const r = await query(
    `UPDATE payments SET ${sets.join(", ")} WHERE id = $1 AND status = 'pending' RETURNING *`,
    params
  );
  return r.rowCount ? ROW_TO_PAYMENT(r.rows[0]) : null;
}

async function markPaymentFailed(id, error) {
  const r = await query(
    "UPDATE payments SET status = 'failed', error = $2 WHERE id = $1 RETURNING *",
    [id, error || null]
  );
  return r.rowCount ? ROW_TO_PAYMENT(r.rows[0]) : null;
}

// Payments for a transaction, newest first (admin + webhook visibility).
async function paymentsForTransaction(transactionId) {
  const r = await query(
    "SELECT * FROM payments WHERE transaction_id = $1 ORDER BY created_at DESC",
    [transactionId]
  );
  return r.rows.map(ROW_TO_PAYMENT);
}

module.exports = {
  PAYMENT_STATUSES, KINDS,
  createPayment, getPaymentById, getPaymentByReference,
  markPaymentSuccess, markPaymentFailed, paymentsForTransaction,
};