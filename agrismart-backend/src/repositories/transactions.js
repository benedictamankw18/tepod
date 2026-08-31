const { randomUUID } = require("crypto");
const { query } = require("../db/pool");
const listings = require("./listings");

const TX_STATUSES = ["pending", "deposited", "paid", "overdue", "disputed"];

const ROW_TO_TX = (r) => ({
  id: r.id,
  listingId: r.listing_id,
  buyerId: r.buyer_id,
  farmerId: r.farmer_id,
  agreedPrice: Number(r.agreed_price),
  commissionAmount: Number(r.commission_amount ?? 0),
  netAmount: Number(r.net_amount ?? 0),
  depositAmount: Number(r.deposit_amount ?? 0),
  paidAmount: Number(r.paid_amount ?? 0),
  paymentStatus: r.payment_status,
  dueDate: new Date(r.due_date).toISOString().slice(0, 10),
  paidAt: r.paid_at,
  createdAt: r.created_at,
  escrowStatus: r.escrow_status || "none",
  escrowAmount: Number(r.escrow_amount ?? 0),
  paymentMethod: r.payment_method || null,
  paymentProvider: r.payment_provider || null,
  payoutReference: r.payout_reference || null,
});

async function createTransaction({ listingId, buyerId, farmerId, agreedPrice, dueDate, commissionAmount = 0, netAmount = 0, markSold = true }) {
  const id = randomUUID();
  const r = await query(
    `INSERT INTO transactions (id, listing_id, buyer_id, farmer_id, agreed_price, commission_amount, net_amount, due_date)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
    [id, listingId, buyerId, farmerId, agreedPrice, commissionAmount, netAmount, dueDate]
  );
  // For the pre-commitment lifecycle the listing stays 'pre_committed' until the
  // commitment completes; a manually confirmed sale (admin/farmer) marks it sold now.
  if (markSold) await listings.setListingStatus(listingId, "sold");
  return ROW_TO_TX(r.rows[0]);
}

// The transaction automatically created when a pre-commitment is accepted, so the
// manual record path is idempotent for the same listing+buyer.
async function getByListingAndBuyer(listingId, buyerId) {
  const r = await query(
    "SELECT * FROM transactions WHERE listing_id = $1 AND buyer_id = $2 LIMIT 1",
    [listingId, buyerId]
  );
  return r.rowCount ? ROW_TO_TX(r.rows[0]) : null;
}

// Apply money toward a transaction. kind 'deposit' adds to deposit_amount, kind
// 'payment' adds to paid_amount. amount=null pays the full balance (legacy full-pay).
// The transaction becomes 'paid' once deposit + paid reach the agreed price, otherwise
// it stays/steps to 'deposited' (a partial payment).
async function recordPayment(id, { amount, kind }) {
  const r = await query("SELECT * FROM transactions WHERE id = $1", [id]);
  if (r.rowCount === 0) return null;
  const row = r.rows[0];
  const deposit = Number(row.deposit_amount || 0);
  const paid = Number(row.paid_amount || 0);
  const agreed = Number(row.agreed_price);

  let newDeposit = kind === "deposit" ? Number(amount) : 0;
  let newPaid = kind === "payment" ? Number(amount) : 0;
  if (amount == null) {
    // Full-pay: clear the outstanding balance.
    newDeposit = deposit;
    newPaid = agreed - deposit;
  }
  const depositTotal = deposit + newDeposit;
  const paidTotal = paid + newPaid;
  const settle = depositTotal + paidTotal;
  const settled = settle + 1e-9 >= agreed;
  const status = settled ? "paid" : "deposited";
  const r2 = await query(
    `UPDATE transactions
     SET deposit_amount = $2, paid_amount = $3, payment_status = $4::payment_status,
         paid_at = CASE WHEN $5 THEN COALESCE(paid_at, now()) ELSE paid_at END
     WHERE id = $1 RETURNING *`,
    [id, depositTotal, paidTotal, status, settled]
  );
  return ROW_TO_TX(r2.rows[0]);
}

async function getTransaction(id) {
  const r = await query("SELECT * FROM transactions WHERE id = $1", [id]);
  return r.rowCount ? ROW_TO_TX(r.rows[0]) : null;
}

async function setPaymentStatus(id, status) {
  const extra = status === "paid" ? ", paid_at = now()" : "";
  const r = await query(
    `UPDATE transactions SET payment_status = $2 ${extra} WHERE id = $1 RETURNING *`,
    [id, status]
  );
  return r.rowCount ? ROW_TO_TX(r.rows[0]) : null;
}

// Escrow tracking. status in 'none'|'funds_collected'|'held'|'released'|'refunded'.
async function setEscrow(id, { status, amount, paymentMethod, paymentProvider }) {
  const sets = ["escrow_status = $2"];
  const params = [id, status];
  if (amount !== undefined) { params.push(Number(amount)); sets.push(`escrow_amount = $${params.length}`); }
  if (paymentMethod !== undefined) { params.push(paymentMethod); sets.push(`payment_method = $${params.length}`); }
  if (paymentProvider !== undefined) { params.push(paymentProvider); sets.push(`payment_provider = $${params.length}`); }
  const r = await query(
    `UPDATE transactions SET ${sets.join(", ")} WHERE id = $1 RETURNING *`,
    params
  );
  return r.rowCount ? ROW_TO_TX(r.rows[0]) : null;
}

async function setPayoutReference(id, reference) {
  const r = await query(
    "UPDATE transactions SET payout_reference = $2 WHERE id = $1 RETURNING *",
    [id, reference]
  );
  return r.rowCount ? ROW_TO_TX(r.rows[0]) : null;
}

async function markTransactionPaid(id) {
  return setPaymentStatus(id, "paid");
}

async function markTransactionDisputed(id) {
  return setPaymentStatus(id, "disputed");
}

async function overdueTransactions() {
  const r = await query(
    `SELECT * FROM transactions
     WHERE payment_status = 'pending' AND due_date < CURRENT_DATE`
  );
  return r.rows.map(ROW_TO_TX);
}

// Re-mark pending-but-past-due transactions as 'overdue' and return them.
async function refreshOverdue() {
  const r = await query(
    `UPDATE transactions SET payment_status = 'overdue'
     WHERE payment_status = 'pending' AND due_date < CURRENT_DATE
     RETURNING *`
  );
  return r.rows.map(ROW_TO_TX);
}

async function transactionsForUser(userId) {
  const r = await query(
    "SELECT * FROM transactions WHERE buyer_id = $1 OR farmer_id = $1 ORDER BY created_at ASC",
    [userId]
  );
  return r.rows.map(ROW_TO_TX);
}

// Buyer's own purchases (things they bought), enriched with listing crop/unit/image
// and the farmer's name so the "My purchases" list can render without extra calls.
async function purchasesForBuyer(buyerId) {
  const r = await query(
    `SELECT t.*, l.crop_type, l.unit, l.quantity, l.image_urls, l.location, f.name AS farmer_name
     FROM transactions t
     JOIN listings l ON l.id = t.listing_id
     JOIN users f ON f.id = t.farmer_id
     WHERE t.buyer_id = $1
     ORDER BY t.created_at DESC`,
    [buyerId]
  );
  return r.rows.map((row) => ({
    ...ROW_TO_TX(row),
    cropType: row.crop_type,
    unit: row.unit,
    quantity: Number(row.quantity),
    imageUrls: Array.isArray(row.image_urls) ? row.image_urls : (row.image_url ? [row.image_url] : []),
    location: row.location,
    farmerName: row.farmer_name,
  }));
}

// Buyer payment reliability indicator (FR-5.4): % paid on time.
async function buyerReliability(buyerId) {
  const r = await query(
    `SELECT count(*) AS total,
            count(*) FILTER (WHERE payment_status = 'paid' AND paid_at <= due_date) AS on_time
     FROM transactions WHERE buyer_id = $1`,
    [buyerId]
  );
  const total = Number(r.rows[0].total);
  return total === 0 ? null : Math.round((Number(r.rows[0].on_time) / total) * 100);
}

// Admin: every transaction across all users, enriched with the listing crop and the
// buyer/farmer names + phones. Optional paymentStatus filter.
async function listAllTransactions({ paymentStatus } = {}) {
  const conds = [];
  const params = [];
  if (paymentStatus) {
    params.push(paymentStatus);
    conds.push(`t.payment_status = $${params.length}`);
  }
  const where = conds.length ? `WHERE ${conds.join(" AND ")}` : "";
  const r = await query(
    `SELECT t.*, l.crop_type AS listing_crop,
            b.name AS buyer_name, b.phone AS buyer_phone,
            f.name AS farmer_name, f.phone AS farmer_phone
     FROM transactions t
     LEFT JOIN listings l ON l.id = t.listing_id
     LEFT JOIN users b ON b.id = t.buyer_id
     LEFT JOIN users f ON f.id = t.farmer_id
     ${where}
     ORDER BY t.created_at DESC`,
    params
  );
  return r.rows.map((row) => ({
    ...ROW_TO_TX(row),
    cropType: row.listing_crop,
    buyer: { id: row.buyer_id, name: row.buyer_name, phone: row.buyer_phone },
    farmer: { id: row.farmer_id, name: row.farmer_name, phone: row.farmer_phone },
  }));
}

module.exports = {
  TX_STATUSES,
  createTransaction, getTransaction, getByListingAndBuyer, recordPayment,
  markTransactionPaid, markTransactionDisputed,
  overdueTransactions, refreshOverdue, transactionsForUser, purchasesForBuyer,
  buyerReliability,
  listAllTransactions,
  setEscrow, setPayoutReference,
};
