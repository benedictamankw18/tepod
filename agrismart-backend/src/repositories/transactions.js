const { randomUUID } = require("crypto");
const { query } = require("../db/pool");
const listings = require("./listings");

const TX_STATUSES = ["pending", "paid", "overdue", "disputed"];

const ROW_TO_TX = (r) => ({
  id: r.id,
  listingId: r.listing_id,
  buyerId: r.buyer_id,
  farmerId: r.farmer_id,
  agreedPrice: Number(r.agreed_price),
  paymentStatus: r.payment_status,
  dueDate: new Date(r.due_date).toISOString().slice(0, 10),
  paidAt: r.paid_at,
  createdAt: r.created_at,
});

async function createTransaction({ listingId, buyerId, farmerId, agreedPrice, dueDate }) {
  const id = randomUUID();
  const r = await query(
    `INSERT INTO transactions (id, listing_id, buyer_id, farmer_id, agreed_price, due_date)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
    [id, listingId, buyerId, farmerId, agreedPrice, dueDate]
  );
  await listings.setListingStatus(listingId, "sold");
  return ROW_TO_TX(r.rows[0]);
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

module.exports = {
  TX_STATUSES,
  createTransaction, getTransaction, markTransactionPaid, markTransactionDisputed,
  overdueTransactions, refreshOverdue, transactionsForUser, buyerReliability,
};
