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

module.exports = { insertPrice, currentPrice, priceHistory };
