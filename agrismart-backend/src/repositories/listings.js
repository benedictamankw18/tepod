const { randomUUID } = require("crypto");
const { query } = require("../db/pool");

const LISTING_STATUSES = ["open", "pre_committed", "sold", "expired", "spoiled_withdrawn", "deactivated"];

const ROW_TO_LISTING = (r) => ({
  id: r.id,
  farmerId: r.farmer_id,
  cropType: r.crop_type,
  quantity: Number(r.quantity),
  unit: r.unit,
  harvestDate: r.harvest_date && new Date(r.harvest_date).toISOString().slice(0, 10),
  askingPrice: Number(r.asking_price),
  location: r.location,
  region: r.region || null,
  district: r.district || null,
  gpsAddress: r.gps_address || null,
  details: r.details || null,
  maturity: r.maturity || null,
  farmId: r.farm_id || null,
  status: r.status,
  statusHistory: r.status_history,
  imageUrl: r.image_url,
  imageUrls: Array.isArray(r.image_urls) ? r.image_urls : (r.image_url ? [r.image_url] : []),
  createdAt: r.created_at,
});

const normalizeImages = (urls = []) =>
  (Array.isArray(urls) ? urls : []).map((u) => String(u)).filter(Boolean).slice(0, 5);

async function createListing({ farmerId, cropType, quantity, unit, harvestDate, askingPrice, location, region, district, gpsAddress, details, maturity, farmId, imageUrls }) {
  const imgs = normalizeImages(imageUrls);
  const primary = imgs[0] || null;
  const id = randomUUID();
  const r = await query(
    `INSERT INTO listings (id, farmer_id, crop_type, quantity, unit, harvest_date, asking_price, location, region, district, gps_address, details, maturity, farm_id, image_url, image_urls)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16) RETURNING *`,
    [id, farmerId, cropType, quantity, unit || "bags", harvestDate || null, askingPrice, location || null, region || null, district || null, gpsAddress || null, details || null, maturity || null, farmId || null, primary, imgs]
  );
  return ROW_TO_LISTING(r.rows[0]);
}

// Replace a listing's photo gallery entirely (max 5). image_url stays in sync with
// the first image so nothing that reads the old single-column field breaks.
async function updateListingImages(id, imageUrls) {
  const imgs = normalizeImages(imageUrls);
  const primary = imgs[0] || null;
  const r = await query(
    `UPDATE listings SET image_urls = $2, image_url = $3 WHERE id = $1 RETURNING *`,
    [id, imgs, primary]
  );
  return r.rowCount ? ROW_TO_LISTING(r.rows[0]) : null;
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

// Update the editable fields of a listing. Only the owning farmer is allowed
// (enforced in the route). Returns the updated listing or null if not found.
async function updateListing(id, { cropType, quantity, unit, harvestDate, askingPrice, location, region, district, gpsAddress, details, maturity, farmId }) {
  const q = quantity == null ? null : Number(quantity);
  const p = askingPrice == null ? null : Number(askingPrice);
  const r = await query(
    `UPDATE listings SET
       crop_type    = COALESCE($2, crop_type),
       quantity     = COALESCE($3, quantity),
       unit         = COALESCE($4, unit),
       harvest_date = COALESCE($5, harvest_date),
       asking_price = COALESCE($6, asking_price),
       location     = COALESCE($7, location),
       region       = COALESCE($8, region),
       district     = COALESCE($9, district),
       gps_address  = COALESCE($10, gps_address),
       details      = COALESCE($11, details),
       maturity     = COALESCE($12, maturity),
       farm_id      = COALESCE($13, farm_id)
     WHERE id = $1 RETURNING *`,
    [id, cropType, q, unit, harvestDate || null, p, location, region, district, gpsAddress, details, maturity, farmId]
  );
  return r.rowCount ? ROW_TO_LISTING(r.rows[0]) : null;
}

// Count records tied to a listing across pre_commitments and transactions so a
// delete that would violate referential integrity can be refused up front.
async function hasListingActivity(id) {
  const r = await query(
    `SELECT
       (SELECT count(*) FROM pre_commitments WHERE listing_id = $1) AS commitments,
       (SELECT count(*) FROM transactions WHERE listing_id = $1)    AS tx`,
    [id]
  );
  const row = r.rows[0];
  const commitments = Number(row.commitments);
  const tx = Number(row.tx);
  return { commitments, tx, active: commitments > 0 || tx > 0 };
}

async function deleteListing(id) {
  const r = await query("DELETE FROM listings WHERE id = $1 RETURNING *", [id]);
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
  createListing, updateListingImages, updateListing, setListingStatus,
  deleteListing, hasListingActivity, getListing, searchListings,
};
