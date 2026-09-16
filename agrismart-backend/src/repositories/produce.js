const { query } = require("../db/pool");

const ROW_TO_PRODUCE = (r) => ({
  id: r.id,
  status: r.status,
  farmerId: r.farmer_id,
  farmerName: r.farmer_name,
  cropType: r.crop_type,
  quantity: Number(r.quantity),
  unit: r.unit,
  harvestDate: r.harvest_date && new Date(r.harvest_date).toISOString().slice(0, 10),
  askingPrice: Number(r.asking_price),
  minimumPrice: r.minimum_price == null ? null : Number(r.minimum_price),
  maturity: r.maturity,
  location: r.location,
  region: r.region || null,
  district: r.district || null,
  gpsAddress: r.gps_address || null,
  details: r.details || null,
  farmId: r.farm_id || null,
  farmName: r.farm_name || null,
  imageUrl: r.image_url,
  imageUrls: Array.isArray(r.image_urls)
    ? r.image_urls
    : (r.image_url ? [r.image_url] : []),
  distanceKm: r.distance_km === null ? null : Number(r.distance_km),
  matchesPrefs: r.matches_prefs === true || r.matches_prefs === "true",
  committedByMe: r.committed_by_me === true || r.committed_by_me === "true",
  rating: r.rating === null ? null : Number(r.rating),
  reviewCount: r.review_count === null || r.review_count === undefined ? 0 : Number(r.review_count),
});

// Aggregate buyer rating + count for a listing, as scalar expressions safe to select
// alongside the listing row (used by the feed and the detail query).
const reviewAggExprs =
  `(SELECT ROUND(AVG(rv.rating)::numeric, 1) FROM reviews rv WHERE rv.listing_id = l.id) AS rating, ` +
  `(SELECT COUNT(*) FROM reviews rv WHERE rv.listing_id = l.id) AS review_count`;

// Buyer-facing produce feed. Ordering: produce matching the buyer's purchase_crops
// (case-insensitive) first, then by great-circle (haversine) distance from the buyer's
// coordinates. Produce missing coordinates sorts by preference match, then newest.
// Includes listings that are 'open' or 'pre_committed' (still purchasable).
async function produceFeed({ purchaseCrops = [], nearLat, nearLng, cropType, excludeId, buyerId } = {}) {
  const cropped = (Array.isArray(purchaseCrops) ? purchaseCrops : [])
    .map((c) => String(c).toLowerCase()).filter(Boolean);
  const hasCoords = Number.isFinite(Number(nearLat)) && Number.isFinite(Number(nearLng));
  const cropFilter = cropType ? String(cropType).toLowerCase().trim() : "";
  const excludeFilter = excludeId ? String(excludeId) : "";
  const params = [];
  const conds = [];
  if (cropFilter) {
    conds.push(`LOWER(l.crop_type) = LOWER($${params.length + 1})`);
    params.push(cropFilter);
  }
  if (excludeFilter) {
    conds.push(`l.id <> $${params.length + 1}`);
    params.push(excludeFilter);
  }
  const standaloneConds = conds.length ? ` AND ${conds.join(" AND ")}` : "";

  const commitExpr = buyerId
    ? `EXISTS (SELECT 1 FROM pre_commitments pc WHERE pc.listing_id = l.id AND pc.buyer_id = $${params.length + 1}) AS committed_by_me`
    : "false AS committed_by_me";
  if (buyerId) params.push(buyerId);

  if (cropped.length === 0 && !hasCoords) {
    const r = await query(
      `SELECT l.*, u.name AS farmer_name, f.name AS farm_name, ${reviewAggExprs}, ${commitExpr} FROM listings l
       JOIN users u ON u.id = l.farmer_id
       LEFT JOIN farms f ON f.id = l.farm_id
       WHERE l.status IN ('open', 'pre_committed')${standaloneConds} ORDER BY l.created_at DESC`,
      params
    );
    return r.rows.map((row) => ROW_TO_PRODUCE(row));
  }

  const order = [];
  const expressions = [];

  let distanceExpr = "NULL AS distance_km";
  if (hasCoords) {
    const lat = params.length + 1;
    const lng = params.length + 2;
    params.push(Number(nearLat), Number(nearLng));
    distanceExpr =
      `(6371 * acos(least(1, cos(radians($${lat})) * cos(radians(u.lat)) * ` +
      `cos(radians(u.lng) - radians($${lng})) + sin(radians($${lat})) * sin(radians(u.lat))))) AS distance_km`;
    order.push("distance_km ASC NULLS LAST");
  }

  let matchExpr = "false AS matches_prefs";
  if (cropped.length > 0) {
    const idx = params.length + 1;
    params.push(cropped.map((c) => `%${c}%`));
    matchExpr = `(LOWER(l.crop_type) LIKE ANY($${idx})) AS matches_prefs`;
    // Ranking: purchase-crop match wins, then proximity, then newest.
    order.unshift("matches_prefs DESC");
  }
  expressions.push("l.*", "u.name AS farmer_name", "f.name AS farm_name", distanceExpr, matchExpr, commitExpr, reviewAggExprs);
  order.push("l.created_at DESC");

  const r = await query(
    `SELECT ${expressions.join(", ")}
     FROM listings l
     JOIN users u ON u.id = l.farmer_id
     LEFT JOIN farms f ON f.id = l.farm_id
     WHERE l.status IN ('open', 'pre_committed')${standaloneConds}
     ORDER BY ${order.join(", ")}`,
    params
  );
  return r.rows.map(ROW_TO_PRODUCE);
}

// Single visible listing, enriched the same way as the feed (farmer name, distance,
// preference match). Returns null if the listing doesn't exist. Open/pre_committed
// listings are visible to everyone; a buyer who completed a PAID transaction on a
// sold listing may still open it (to review their purchase).
async function getProduceById(id, { purchaseCrops = [], nearLat, nearLng, buyerId } = {}) {
  const cropped = (Array.isArray(purchaseCrops) ? purchaseCrops : [])
    .map((c) => String(c).toLowerCase()).filter(Boolean);
  const hasCoords = Number.isFinite(Number(nearLat)) && Number.isFinite(Number(nearLng));

  const expressions = [];
  const params = [id];

  let distanceExpr = "NULL AS distance_km";
  if (hasCoords) {
    const lat = params.length + 1;
    const lng = params.length + 2;
    params.push(Number(nearLat), Number(nearLng));
    distanceExpr =
      `(6371 * acos(least(1, cos(radians($${lat})) * cos(radians(u.lat)) * ` +
      `cos(radians(u.lng) - radians($${lng})) + sin(radians($${lat})) * sin(radians(u.lat))))) AS distance_km`;
  }

  let matchExpr = "false AS matches_prefs";
  if (cropped.length > 0) {
    const idx = params.length + 1;
    params.push(cropped.map((c) => `%${c}%`));
    matchExpr = `(LOWER(l.crop_type) LIKE ANY($${idx})) AS matches_prefs`;
  }

  const commitExpr = buyerId
    ? `EXISTS (SELECT 1 FROM pre_commitments pc WHERE pc.listing_id = l.id AND pc.buyer_id = $${params.length + 1}) AS committed_by_me`
    : "false AS committed_by_me";
  if (buyerId) params.push(buyerId);

  const buyerParam = buyerId ? params.length : null;
  const visibilityCond = buyerParam
    ? `l.status IN ('open', 'pre_committed') OR EXISTS (SELECT 1 FROM transactions t WHERE t.listing_id = l.id AND t.buyer_id = $${buyerParam} AND t.payment_status = 'paid')`
    : `l.status IN ('open', 'pre_committed')`;

  expressions.push("l.*", "u.name AS farmer_name", "f.name AS farm_name", distanceExpr, matchExpr, commitExpr, reviewAggExprs);
  const r = await query(
    `SELECT ${expressions.join(", ")}
     FROM listings l
     JOIN users u ON u.id = l.farmer_id
     LEFT JOIN farms f ON f.id = l.farm_id
     WHERE l.id = $1 AND (${visibilityCond})`,
    params
  );
  return r.rowCount ? ROW_TO_PRODUCE(r.rows[0]) : null;
}

module.exports = { produceFeed, getProduceById, ROW_TO_PRODUCE };
