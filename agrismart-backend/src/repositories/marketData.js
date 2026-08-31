const { query, pool } = require("../db/pool");

// Access layer for the two market-data tables that power the AI crop-demand guide
// (migration 0037): `market_prices` (regional retail survey quotes, GHS/kg) and
// `crop_area` (national cultivated-hectares statistics). These are import-only
// tables — nothing in the normal product flows writes to them.

const MARKET_COLUMNS = ["region", "district", "market", "commodity_key", "commodity_name", "price", "date", "source"];
const AREA_COLUMNS = ["commodity_key", "commodity_name", "year", "hectares"];

// Chunked multi-row insert so the CSV import (10k+ rows) stays one round trip set.
async function bulkInsert(q, table, columns, rows) {
  if (!rows.length) return 0;
  let inserted = 0;
  for (let i = 0; i < rows.length; i += 500) {
    const chunk = rows.slice(i, i + 500);
    const params = [];
    const tuples = chunk.map((row) => {
      const base = params.length;
      for (const c of columns) params.push(row[c] === undefined ? null : row[c]);
      return `(${columns.map((_, k) => `$${base + k + 1}`).join(",")})`;
    });
    const r = await q(`INSERT INTO ${table} (${columns.join(",")}) VALUES ${tuples.join(",")}`, params);
    inserted += r.rowCount;
  }
  return inserted;
}

async function insertMarketPrices(rows) {
  return bulkInsert(query, "market_prices", MARKET_COLUMNS, rows);
}

async function insertCropAreaRows(rows) {
  return bulkInsert(query, "crop_area", AREA_COLUMNS, rows);
}

// Full replace used by the import script; runs in one transaction so a failed
// import never leaves a half-populated table.
async function replaceMarketPrices(rows) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("DELETE FROM market_prices");
    const inserted = await bulkInsert(client.query.bind(client), "market_prices", MARKET_COLUMNS, rows);
    await client.query("COMMIT");
    return inserted;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

async function replaceCropArea(rows) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("DELETE FROM crop_area");
    const inserted = await bulkInsert(client.query.bind(client), "crop_area", AREA_COLUMNS, rows);
    await client.query("COMMIT");
    return inserted;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

const ROW_TO_REGION = (r) => ({
  region: r.region,
  samples: r.samples,
  window: `${r.from_label} – ${r.to_label}`,
});

// Regions present in the survey data, with how many rows + the date span each has.
async function distinctRegions() {
  const r = await query(
    `SELECT region,
            count(*)::int AS samples,
            to_char(min(date), 'Mon YYYY') AS from_label,
            to_char(max(date), 'Mon YYYY') AS to_label
     FROM market_prices
     GROUP BY region
     ORDER BY region`
  );
  return r.rows.map(ROW_TO_REGION);
}

// Overall survey window across all rows (for attribution/labels).
async function observedWindow() {
  const r = await query(`SELECT min(date) AS lo, max(date) AS hi FROM market_prices`);
  const row = r.rows[0];
  if (!row || !row.lo) return null;
  return {
    from: new Date(row.lo).toISOString().slice(0, 10),
    to: new Date(row.hi).toISOString().slice(0, 10),
  };
}

const ROW_TO_MARKET = (r) => ({
  commodityKey: r.commodity_key,
  commodityName: r.commodity_name,
  region: r.region,
  market: r.market,
  price: Number(r.price),
  date: new Date(r.date).toISOString().slice(0, 10),
});

// Survey rows for every commodity (optionally one region), ascending by date.
// ~a few thousand rows max, so loading them all and scoring in JS is fine.
async function marketRows({ region } = {}) {
  const r = await query(
    `SELECT commodity_key, commodity_name, region, market, price, date
     FROM market_prices
     WHERE ($1::text IS NULL OR region = $1)
     ORDER BY commodity_key ASC, date ASC, id ASC`,
    [region || null]
  );
  return r.rows.map(ROW_TO_MARKET);
}

const ROW_TO_AREA = (r) => ({
  commodityKey: r.commodity_key,
  commodityName: r.commodity_name,
  year: r.year,
  hectares: Number(r.hectares),
});

async function cropAreaRows() {
  const r = await query(
    `SELECT commodity_key, commodity_name, year, hectares
     FROM crop_area
     ORDER BY commodity_key ASC, year ASC`
  );
  return r.rows.map(ROW_TO_AREA);
}

module.exports = {
  insertMarketPrices,
  insertCropAreaRows,
  replaceMarketPrices,
  replaceCropArea,
  distinctRegions,
  observedWindow,
  marketRows,
  cropAreaRows,
};