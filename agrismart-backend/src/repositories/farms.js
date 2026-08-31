const { randomUUID } = require("crypto");
const { query } = require("../db/pool");

const FARM_STAGES = ["pre_harvest", "post_harvest"];

const ROW_TO_FARM = (r) => ({
  id: r.id,
  farmerId: r.farmer_id,
  name: r.name,
  cropType: r.crop_type,
  stage: r.stage,
  status: r.status,
  imageUrl: r.image_url,
  location: r.location,
  lat: r.lat === null ? null : Number(r.lat),
  lng: r.lng === null ? null : Number(r.lng),
  expectedHarvestDate: r.expected_harvest_date
    ? new Date(r.expected_harvest_date).toISOString().slice(0, 10)
    : null,
  deletedAt: r.deleted_at || null,
  createdAt: r.created_at,
});

// Derived from the expected harvest date when present: a date in the past means
// the crop has been harvested (post-harvest); today or a future date means it is
// still growing (pre-harvest). Falls back to the manually-chosen stage otherwise.
function stageForFarm(farm) {
  if (!farm.expectedHarvestDate) return farm.stage;
  const harvest = new Date(farm.expectedHarvestDate + "T00:00:00Z");
  const today = new Date().toISOString().slice(0, 10);
  return harvest.toISOString().slice(0, 10) > today ? "pre_harvest" : "post_harvest";
}

async function createFarm({ farmerId, name, cropType, stage, status, imageUrl, location, lat, lng, expectedHarvestDate }) {
  const id = randomUUID();
  const r = await query(
    `INSERT INTO farms (id, farmer_id, name, crop_type, stage, status, image_url, location, lat, lng, expected_harvest_date)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
    [
      id, farmerId, name || "My farm", cropType,
      FARM_STAGES.includes(stage) ? stage : "pre_harvest",
      status || "growing", imageUrl || null, location || null,
      lat == null ? null : Number(lat), lng == null ? null : Number(lng),
      expectedHarvestDate || null,
    ]
  );
  return ROW_TO_FARM(r.rows[0]);
}

async function getFarm(id) {
  const r = await query("SELECT * FROM farms WHERE id = $1 AND deleted_at IS NULL", [id]);
  return r.rowCount ? ROW_TO_FARM(r.rows[0]) : null;
}

// A farm owned by a specific farmer (used to validate listing <-> farm links).
// Soft-deleted farms can't be (re)linked to listings.
async function getFarmerFarm(farmId, farmerId) {
  const r = await query(
    "SELECT * FROM farms WHERE id = $1 AND farmer_id = $2 AND deleted_at IS NULL",
    [farmId, farmerId]
  );
  return r.rowCount ? ROW_TO_FARM(r.rows[0]) : null;
}

// Update editable farm fields. Only the owning farmer is allowed (enforced in the
// route). Returns the updated farm or null if not found / soft-deleted.
async function updateFarm(id, { name, cropType, stage, status, imageUrl, location, lat, lng, expectedHarvestDate }) {
  const r = await query(
    `UPDATE farms SET
       name                  = COALESCE($2, name),
       crop_type             = COALESCE($3, crop_type),
       stage                 = COALESCE($4, stage),
       status                = COALESCE($5, status),
       image_url             = COALESCE($6, image_url),
       location              = COALESCE($7, location),
       lat                   = CASE WHEN $8::numeric IS NULL THEN lat ELSE $8::numeric END,
       lng                   = CASE WHEN $9::numeric IS NULL THEN lng ELSE $9::numeric END,
       expected_harvest_date = COALESCE($10, expected_harvest_date)
     WHERE id = $1 AND deleted_at IS NULL RETURNING *`,
    [id, name, cropType, FARM_STAGES.includes(stage) ? stage : null, status, imageUrl, location, lat, lng, expectedHarvestDate]
  );
  return r.rowCount ? ROW_TO_FARM(r.rows[0]) : null;
}

// Soft delete: stamp deleted_at, keep the row (and any listing links) for history.
async function deleteFarm(id) {
  const r = await query(
    "UPDATE farms SET deleted_at = now() WHERE id = $1 AND deleted_at IS NULL RETURNING *",
    [id]
  );
  return r.rowCount ? ROW_TO_FARM(r.rows[0]) : null;
}

// Admin restore: clear the deleted_at stamp so the farm is visible/linkable again.
async function restoreFarm(id) {
  const r = await query(
    "UPDATE farms SET deleted_at = NULL WHERE id = $1 AND deleted_at IS NOT NULL RETURNING *",
    [id]
  );
  return r.rowCount ? ROW_TO_FARM(r.rows[0]) : null;
}

// All of a farmer's farms, grouped by pre/post harvest. Classification uses the
// expected harvest date when set (past => post-harvest, otherwise pre-harvest),
// falling back to the stored stage. Soft-deleted farms are excluded.
async function farmsForFarmer(farmerId) {
  const r = await query(
    "SELECT * FROM farms WHERE farmer_id = $1 AND deleted_at IS NULL ORDER BY created_at DESC",
    [farmerId]
  );
  const farms = r.rows.map(ROW_TO_FARM);
  return {
    preHarvest: farms.filter((f) => stageForFarm(f) === "pre_harvest"),
    postHarvest: farms.filter((f) => stageForFarm(f) === "post_harvest"),
  };
}

// Admin: every farm across all farmers (including soft-deleted ones) with the owner
// name attached, for the admin farms page.
async function listAllFarms() {
  const r = await query(
    `SELECT f.*, u.name AS farmer_name
     FROM farms f
     JOIN users u ON u.id = f.farmer_id
     ORDER BY f.created_at DESC`
  );
  return r.rows.map((row) => ({ ...ROW_TO_FARM(row), farmerName: row.farmer_name }));
}

module.exports = {
  FARM_STAGES, createFarm, getFarm, getFarmerFarm, updateFarm, deleteFarm, restoreFarm,
  farmsForFarmer, listAllFarms, stageForFarm,
};
