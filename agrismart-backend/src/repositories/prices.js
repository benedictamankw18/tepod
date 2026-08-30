const { query } = require("../db/pool");

const ROW_TO_PRICE = (r) => ({
  id: r.id,
  cropType: r.crop_type,
  market: r.market,
  price: Number(r.price),
  date: new Date(r.date).toISOString().slice(0, 10),
});

async function insertPrice({ cropType, market, price, date }) {
  const r = await query(
    `INSERT INTO prices (crop_type, market, price, date) VALUES ($1,$2,$3,$4) RETURNING *`,
    [cropType, market, price, date]
  );
  return ROW_TO_PRICE(r.rows[0]);
}

async function currentPrice({ cropType, market }) {
  const params = [cropType.toLowerCase()];
  let conds = ["LOWER(crop_type) = $1"];
  if (market) {
    params.push(`%${market.toLowerCase()}%`);
    conds.push(`LOWER(market) LIKE $${params.length}`);
  }
  const r = await query(
    `SELECT date, round(avg(price)::numeric, 2) AS avg_price
     FROM prices WHERE ${conds.join(" AND ")}
     GROUP BY date ORDER BY date DESC LIMIT 1`,
    params
  );
  if (r.rowCount === 0) return null;
  return {
    cropType,
    market: market || "all markets",
    date: new Date(r.rows[0].date).toISOString().slice(0, 10),
    averagePrice: Number(r.rows[0].avg_price),
  };
}

async function priceHistory({ cropType, market, weeks = 8 }) {
  const params = [cropType.toLowerCase(), weeks * 7];
  let conds = [`LOWER(crop_type) = $1`, `date >= CURRENT_DATE - ($2 || ' days')::interval`];
  if (market) {
    params.push(`%${market.toLowerCase()}%`);
    conds.push(`LOWER(market) LIKE $${params.length}`);
  }
  const r = await query(
    `SELECT * FROM prices WHERE ${conds.join(" AND ")} ORDER BY date ASC`,
    params
  );
  return r.rows.map(ROW_TO_PRICE);
}

// Admin: every price signal with optional crop/market filters (newest first).
async function listPrices({ cropType, market } = {}) {
  const conds = [];
  const params = [];
  if (cropType) {
    params.push(String(cropType).toLowerCase());
    conds.push(`LOWER(crop_type) = $${params.length}`);
  }
  if (market) {
    params.push(`%${String(market).toLowerCase()}%`);
    conds.push(`LOWER(market) LIKE $${params.length}`);
  }
  const where = conds.length ? `WHERE ${conds.join(" AND ")}` : "";
  const r = await query(`SELECT * FROM prices ${where} ORDER BY date DESC, id DESC`, params);
  return r.rows.map(ROW_TO_PRICE);
}

async function updatePrice(id, { cropType, market, price, date }) {
  const r = await query(
    `UPDATE prices SET
       crop_type = COALESCE($2, crop_type),
       market    = COALESCE($3, market),
       price     = COALESCE($4, price),
       date      = COALESCE($5, date)
     WHERE id = $1 RETURNING *`,
    [
      id,
      cropType ? String(cropType).toLowerCase() : undefined,
      market ? String(market).trim() : undefined,
      price == null || price === "" ? undefined : Number(price),
      date || undefined,
    ]
  );
  return r.rowCount ? ROW_TO_PRICE(r.rows[0]) : null;
}

async function deletePrice(id) {
  const r = await query("DELETE FROM prices WHERE id = $1 RETURNING id", [id]);
  return r.rowCount ? r.rows[0].id : null;
}

// Bulk-insert price signals from an admin import. Each row is validated by the
// route before it gets here; this layer only avoids duplicate (crop, market, date)
// rows, so re-importing a file is harmless. Returns a per-row summary.
async function importPrices(rows) {
  let inserted = 0;
  let skipped = 0;
  for (const row of rows) {
    const r = await query(
      `INSERT INTO prices (crop_type, market, price, date)
       SELECT $1, $2, $3, $4
       WHERE NOT EXISTS (
         SELECT 1 FROM prices p
         WHERE p.crop_type = $1 AND p.market = $2 AND p.date = $4
       )`,
      [row.cropType, row.market, row.price, row.date]
    );
    if (r.rowCount > 0) inserted += 1;
    else skipped += 1;
  }
  return { total: rows.length, inserted, skipped, failed: [] };
}

module.exports = { insertPrice, currentPrice, priceHistory, listPrices, updatePrice, deletePrice, importPrices };
