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
  const r = await query("SELECT * FROM farms WHERE id = $1", [id]);
  return r.rowCount ? ROW_TO_FARM(r.rows[0]) : null;
}

// A farm owned by a specific farmer (used to validate listing <-> farm links).
async function getFarmerFarm(farmId, farmerId) {
  const r = await query(
    "SELECT * FROM farms WHERE id = $1 AND farmer_id = $2",
    [farmId, farmerId]
  );
  return r.rowCount ? ROW_TO_FARM(r.rows[0]) : null;
}

// All of a farmer's farms, grouped by pre/post harvest. Classification uses the
// expected harvest date when set (past => post-harvest, otherwise pre-harvest),
// falling back to the stored stage.
async function farmsForFarmer(farmerId) {
  const r = await query(
    "SELECT * FROM farms WHERE farmer_id = $1 ORDER BY created_at DESC",
    [farmerId]
  );
  const farms = r.rows.map(ROW_TO_FARM);
  return {
    preHarvest: farms.filter((f) => stageForFarm(f) === "pre_harvest"),
    postHarvest: farms.filter((f) => stageForFarm(f) === "post_harvest"),
  };
}

module.exports = { FARM_STAGES, createFarm, getFarm, getFarmerFarm, farmsForFarmer, stageForFarm };
