const { query } = require("../db/pool");

// Column choices are whitelisted by role so the SQL stays parameterized-safe.
const COLUMNS = {
  farmer: { amount: "t.net_amount", own: "t.farmer_id", counterpart: "t.buyer_id" },
  buyer: { amount: "t.agreed_price", own: "t.buyer_id", counterpart: "t.farmer_id" },
};
// market_seller / transporter / admin have no marketplace transactions; buyer-ish
// columns are a harmless default (they simply return an empty report).
const DEFAULT_COLUMNS = COLUMNS.buyer;

const BUCKETS = new Set(["week", "month", "year"]);

const STATUS_ORDER = ["paid", "deposited", "pending", "overdue", "disputed"];

const BUCKET_LABEL = {
  week: (d) => `Wk of ${d.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`,
  month: (d) => d.toLocaleDateString("en-GB", { month: "short", year: "numeric" }),
  year: (d) => String(d.getFullYear()),
};

// Farmers report on net (post-commission) earnings, buyers on the full agreed
// price they owe. Quantities come from the linked pre-commitment (delivered when
// present, else the committed amount); manual transactions without one count 0.
async function myReport({ userId, role, bucket = "month" }) {
  const cols = COLUMNS[role] || DEFAULT_COLUMNS;
  const period = BUCKETS.has(bucket) ? bucket : "month";

  const base = `
    WITH base AS (
      SELECT t.id,
             t.payment_status AS status,
             ${cols.amount}        AS amount,
             ${cols.counterpart}   AS counterpart_id,
             COALESCE(pc.actual_quantity, pc.quantity, 0) AS quantity,
             COALESCE(t.paid_at, t.created_at) AS happened_at,
             COALESCE(l.crop_type, 'other') AS crop_type
      FROM transactions t
      LEFT JOIN pre_commitments pc ON pc.transaction_id = t.id
      LEFT JOIN listings l ON l.id = t.listing_id
      WHERE ${cols.own} = $1
    )`;

  const [ov, st, cr, tr] = await Promise.all([
    query(
      `${base}
       SELECT count(*) AS items,
              count(*) FILTER (WHERE status = 'paid') AS paid_items,
              count(DISTINCT counterpart_id) AS counterparties,
              COALESCE(sum(amount), 0) AS total_amount,
              COALESCE(sum(amount) FILTER (WHERE status = 'paid'), 0) AS paid_amount,
              COALESCE(sum(quantity), 0) AS total_quantity,
              COALESCE(sum(quantity) FILTER (WHERE status = 'paid'), 0) AS paid_quantity
       FROM base`,
      [userId]
    ),
    query(
      `${base} SELECT status, count(*) AS n, sum(amount) AS amount FROM base GROUP BY status`,
      [userId]
    ),
    query(
      `${base} SELECT crop_type, sum(quantity) AS quantity, sum(amount) AS amount
              FROM base GROUP BY crop_type ORDER BY quantity DESC NULLS LAST LIMIT 5`,
      [userId]
    ),
    query(
      `${base} SELECT date_trunc($2, happened_at) AS bucket,
                      sum(amount) AS amount,
                      sum(quantity) AS quantity,
                      sum(amount) FILTER (WHERE status = 'paid') AS paid_amount
               FROM base GROUP BY bucket ORDER BY bucket ASC`,
      [userId, period]
    ),
  ]);

  const o = ov.rows[0];
  const totalQuantity = Number(o.total_quantity);
  const paidQuantity = Number(o.paid_quantity);
  const paidAmount = Number(o.paid_amount);
  const paidItems = Number(o.paid_items);

  const byStatus = new Map(st.rows.map((r) => [r.status, { count: Number(r.n), amount: Number(r.amount) }]));
  const statuses = STATUS_ORDER.map((s) => ({ status: s, ...(byStatus.get(s) || { count: 0, amount: 0 }) }));

  const topCrops = cr.rows.map((r) => ({
    cropType: r.crop_type,
    quantity: Number(r.quantity),
    amount: Number(r.amount),
    sharePct: totalQuantity > 0 ? Math.round((Number(r.quantity) / totalQuantity) * 100) : 0,
  }));

  const trend = tr.rows.map((r) => ({
    label: BUCKET_LABEL[period](new Date(r.bucket)),
    amount: Number(r.amount),
    quantity: Number(r.quantity),
    paidAmount: Number(r.paid_amount),
  }));

  return {
    role: role === "farmer" ? "farmer" : "buyer",
    bucket: period,
    overview: {
      totalAmount: Number(o.total_amount),
      paidAmount,
      outstandingAmount: Number(o.total_amount) - paidAmount,
      totalQuantity,
      paidQuantity,
      items: Number(o.items),
      paidItems,
      counterparties: Number(o.counterparties),
      avgPrice: paidQuantity > 0 ? Math.round((paidAmount / paidQuantity) * 100) / 100 : 0,
      avgOrder: paidItems > 0 ? Math.round((paidAmount / paidItems) * 100) / 100 : 0,
    },
    statuses,
    topCrops,
    trend,
  };
}

module.exports = { myReport };