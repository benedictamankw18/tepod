const { randomUUID } = require("crypto");
const { query } = require("../db/pool");

const LISTING_STATUSES = ["open", "pre_committed", "sold", "expired", "spoiled_withdrawn", "deactivated", "deleted"];

const ROW_TO_LISTING = (r) => ({
  id: r.id,
  farmerId: r.farmer_id,
  cropType: r.crop_type,
  quantity: Number(r.quantity),
  unit: r.unit,
  harvestDate: r.harvest_date && new Date(r.harvest_date).toISOString().slice(0, 10),
  askingPrice: Number(r.asking_price),
  minimumPrice: r.minimum_price == null ? null : Number(r.minimum_price),
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

async function createListing({ farmerId, cropType, quantity, unit, harvestDate, askingPrice, minimumPrice, location, region, district, gpsAddress, details, maturity, farmId, imageUrls }) {
  const imgs = normalizeImages(imageUrls);
  const primary = imgs[0] || null;
  const id = randomUUID();
  const r = await query(
    `INSERT INTO listings (id, farmer_id, crop_type, quantity, unit, harvest_date, asking_price, minimum_price, location, region, district, gps_address, details, maturity, farm_id, image_url, image_urls)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17) RETURNING *`,
    [id, farmerId, cropType, quantity, unit || "bags", harvestDate || null, askingPrice, minimumPrice == null ? null : Number(minimumPrice), location || null, region || null, district || null, gpsAddress || null, details || null, maturity || null, farmId || null, primary, imgs]
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

// Record a completed sale: reduce the listed quantity by the bags actually sold and
// close the listing only when stock is exhausted. A partially sold listing returns to
// 'open' so its remainder can still be bought. The whole update is one guarded
// statement so repeated completion callbacks cannot decrement twice.
async function recordSale(id, soldQuantity) {
  const sold = Number(soldQuantity);
  if (!Number.isFinite(sold) || sold <= 0) return null;
  const r = await query(
    `WITH calc AS (
       SELECT id,
              GREATEST(quantity - $2, 0) AS new_quantity,
              CASE WHEN quantity - $2 <= 0 THEN 'sold'::listing_status
                   WHEN status = 'pre_committed'::listing_status THEN 'open'::listing_status
                   ELSE status END AS new_status
       FROM listings
       WHERE id = $1 AND status <> 'sold'::listing_status
     )
     UPDATE listings l
     SET quantity = c.new_quantity,
         status = c.new_status,
         status_history = CASE
           WHEN c.new_status IS DISTINCT FROM l.status
           THEN l.status_history || jsonb_build_array(jsonb_build_object(
                  'status', c.new_status::text,
                  'at', to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')))
           ELSE l.status_history END
     FROM calc c
     WHERE l.id = c.id
     RETURNING l.*`,
    [id, sold]
  );
  return r.rowCount ? ROW_TO_LISTING(r.rows[0]) : null;
}

// Update the editable fields of a listing. Only the owning farmer is allowed
// (enforced in the route). Returns the updated listing or null if not found.
async function updateListing(id, { cropType, quantity, unit, harvestDate, askingPrice, minimumPrice, location, region, district, gpsAddress, details, maturity, farmId }) {
  const q = quantity == null ? null : Number(quantity);
  const p = askingPrice == null ? null : Number(askingPrice);
  const mp = minimumPrice == null ? null : Number(minimumPrice);
  const r = await query(
    `UPDATE listings SET
       crop_type    = COALESCE($2, crop_type),
       quantity     = COALESCE($3, quantity),
       unit         = COALESCE($4, unit),
       harvest_date = COALESCE($5, harvest_date),
       asking_price = COALESCE($6, asking_price),
       minimum_price = $7,
       location     = COALESCE($8, location),
       region       = COALESCE($9, region),
       district     = COALESCE($10, district),
       gps_address  = COALESCE($11, gps_address),
       details      = COALESCE($12, details),
       maturity     = COALESCE($13, maturity),
       farm_id      = COALESCE($14, farm_id)
     WHERE id = $1 RETURNING *`,
    [id, cropType, q, unit, harvestDate || null, p, mp, location, region, district, gpsAddress, details, maturity, farmId]
  );
  return r.rowCount ? ROW_TO_LISTING(r.rows[0]) : null;
}

// Soft delete: keep the row and its history, flip status to 'deleted' so it
// disappears from buyer feeds, detail views, and the farmer's management lists.
// Historical commitments/transactions remain intact (no referential breaks).
async function deleteListing(id) {
  return setListingStatus(id, "deleted");
}

async function getListing(id) {
  const r = await query("SELECT * FROM listings WHERE id = $1", [id]);
  return r.rowCount ? ROW_TO_LISTING(r.rows[0]) : null;
}

async function searchListings({ cropType, location, status, farmerId, includeDeleted } = {}) {
  const conds = [];
  const params = [];
  // Soft-deleted listings are buried: only an explicit status='deleted' query (or the
  // admin includeDeleted flag) sees them.
  if (status !== "deleted" && !includeDeleted) conds.push("status <> 'deleted'");
  if (cropType) {
    params.push(cropType.toLowerCase());
    conds.push(`LOWER(crop_type) = $${params.length}`);
  }
  if (location) {
    params.push(`%${location.toLowerCase()}%`);
    conds.push(`LOWER(location) LIKE $${params.length}`);
  }
  if (farmerId) {
    params.push(farmerId);
    conds.push(`farmer_id = $${params.length}`);
  }
  if (status) {
    params.push(status);
    conds.push(`status = $${params.length}`);
  }
  const where = conds.length ? `WHERE ${conds.join(" AND ")}` : "";
  const r = await query(
    `SELECT l.*, u.name AS farmer_name
     FROM listings l
     JOIN users u ON u.id = l.farmer_id
     ${where}
     ORDER BY l.created_at DESC`,
    params
  );
  return r.rows.map((row) => ({ ...ROW_TO_LISTING(row), farmerName: row.farmer_name || null }));
}

module.exports = {
  LISTING_STATUSES,
  createListing, updateListingImages, updateListing, setListingStatus, recordSale,
  deleteListing, getListing, searchListings,
};
