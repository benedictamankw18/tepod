const { randomUUID } = require("crypto");
const { query } = require("../db/pool");

const LISTING_STATUSES = ["open", "pre_committed", "sold", "expired", "spoiled_withdrawn"];

const ROW_TO_LISTING = (r) => ({
  id: r.id,
  farmerId: r.farmer_id,
  cropType: r.crop_type,
  quantity: Number(r.quantity),
  unit: r.unit,
  harvestDate: r.harvest_date && new Date(r.harvest_date).toISOString().slice(0, 10),
  askingPrice: Number(r.asking_price),
  location: r.location,
  status: r.status,
  statusHistory: r.status_history,
  createdAt: r.created_at,
});

async function createListing({ farmerId, cropType, quantity, unit, harvestDate, askingPrice, location }) {
  const id = randomUUID();
  const r = await query(
    `INSERT INTO listings (id, farmer_id, crop_type, quantity, unit, harvest_date, asking_price, location)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
    [id, farmerId, cropType, quantity, unit || "bags", harvestDate || null, askingPrice, location || null]
  );
  return ROW_TO_LISTING(r.rows[0]);
}

async function setListingStatus(id, status) {
  const r = await query(
    `UPDATE listings SET status = $2,
       status_history = status_history || jsonb_build_array(jsonb_build_object('status', $2, 'at', to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')))
     WHERE id = $1 AND status IS DISTINCT FROM $2 RETURNING *`,
    [id, status]
  );
  return r.rowCount ? ROW_TO_LISTING(r.rows[0]) : null;
}

async function getListing(id) {
  const r = await query("SELECT * FROM listings WHERE id = $1", [id]);
  return r.rowCount ? ROW_TO_LISTING(r.rows[0]) : null;
}

async function searchListings({ cropType, location, status } = {}) {
  const conds = [];
  const params = [];
  if (cropType) {
    params.push(cropType.toLowerCase());
    conds.push(`LOWER(crop_type) = $${params.length}`);
  }
  if (location) {
    params.push(`%${location.toLowerCase()}%`);
    conds.push(`LOWER(location) LIKE $${params.length}`);
  }
  if (status) {
    params.push(status);
    conds.push(`status = $${params.length}`);
  }
  const where = conds.length ? `WHERE ${conds.join(" AND ")}` : "";
  const r = await query(`SELECT * FROM listings ${where} ORDER BY created_at DESC`, params);
  return r.rows.map(ROW_TO_LISTING);
}

module.exports = {
  LISTING_STATUSES,
  createListing, setListingStatus, getListing, searchListings,
};
