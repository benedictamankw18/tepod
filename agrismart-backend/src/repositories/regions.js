const { query } = require("../db/pool");

const ROW_TO_DISTRICT = (r) => ({
  id: r.id,
  name: r.name,
});

const ROW_TO_REGION = (r) => ({
  id: r.id,
  name: r.name,
  districts: [],
});

// Canonical, active region -> district list. Each region carries its districts
// so a single call drives the frontend cascading region/district pickers.
async function listRegions() {
  const r = await query(
    `SELECT r.id, r.name, d.id AS district_id, d.name AS district_name
     FROM regions r
     LEFT JOIN districts d
       ON d.region_id = r.id AND d.active = true
     WHERE r.active = true
     ORDER BY r.display_order ASC, r.id ASC, d.display_order ASC, d.id ASC`
  );

  const regions = new Map();
  for (const row of r.rows) {
    let region = regions.get(row.id);
    if (!region) {
      region = ROW_TO_REGION(row);
      regions.set(row.id, region);
    }
    if (row.district_id) {
      region.districts.push({ id: row.district_id, name: row.district_name });
    }
  }
  return [...regions.values()];
}

module.exports = { listRegions, ROW_TO_REGION, ROW_TO_DISTRICT };