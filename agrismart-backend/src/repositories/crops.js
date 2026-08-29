const { query, pool } = require("../db/pool");

const ROW_TO_CROP = (r) => ({
  id: r.id,
  name: r.name,
  defaultUnit: r.default_unit,
  emoji: r.emoji,
  gradientFrom: r.gradient_from,
  gradientTo: r.gradient_to,
  displayOrder: r.display_order,
});

// Canonical, active crop list (display + storefront-art metadata). Used by the
// frontend to populate crop pickers instead of a hardcoded list.
async function listCropTypes() {
  const r = await query(
    `SELECT id, name, default_unit, emoji, gradient_from, gradient_to, display_order
     FROM crop_types
     WHERE active = true
     ORDER BY display_order ASC, id ASC`
  );
  return r.rows.map(ROW_TO_CROP);
}

const ROW_TO_UNIT = (r) => ({
  id: r.id,
  name: r.name,
  plural: r.plural,
  displayOrder: r.display_order,
});

// Canonical, active units of measure. Lists every distinct unit string in use
// (ListingForm + crop_types.default_unit) so unit pickers draw from the DB.
async function listUnits() {
  const r = await query(
    `SELECT id, name, plural, display_order
     FROM unit_of_measure
     WHERE active = true
     ORDER BY display_order ASC, id ASC`
  );
  return r.rows.map(ROW_TO_UNIT);
}

// Normalize a free-text crop label into the lowercase key convention used by
// crop_types.id (trim, collapse inner whitespace). Returns "" for invalid input.
function cropKey(value) {
  const key = String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
  // Require at least one letter and a sane length so random input can't pollute keys.
  if (!/[a-z]/.test(key) || key.length > 50) return "";
  return key;
}

// Sync the user_croptype registry from the users.primary_crops/purchase_crops
// arrays (the source of truth). Each entry becomes a row: canonical crops link to
// their crop_types.id, anything else is kept as a custom crop (custom = true).
// Runs in its own transaction so a half-written registry is never left behind.
async function syncUserCrops(userId, { primaryCrops = [], purchaseCrops = [] } = {}) {
  const includePrimary = Array.isArray(primaryCrops);
  const includePurchase = Array.isArray(purchaseCrops);
  if (!includePrimary && !includePurchase) return;

  const kinds = [];
  const provided = [];
  if (includePrimary) {
    provided.push("primary");
    for (const c of primaryCrops) {
      const key = cropKey(c);
      if (key) kinds.push({ name: key, kind: "primary" });
    }
  }
  if (includePurchase) {
    provided.push("purchase");
    for (const c of purchaseCrops) {
      const key = cropKey(c);
      if (key) kinds.push({ name: key, kind: "purchase" });
    }
  }

  // Distinct (user_id, name, kind) rows; the UNIQUE constraint mirrors this.
  const seen = new Set();
  const entries = kinds.filter((e) => {
    const sig = `${e.kind}:${e.name}`;
    if (seen.has(sig)) return false;
    seen.add(sig);
    return true;
  });

  const canonical = await query(
    `SELECT DISTINCT id FROM crop_types WHERE active = true AND id = ANY($1)`,
    [entries.map((e) => e.name).filter(Boolean)]
  );
  const canonicalSet = new Set(canonical.rows.map((r) => r.id));

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    // Drop only the kinds that were actually provided this call (mirrors COALESCE
    // semantics on the user columns) then re-insert the current set.
    for (const kind of provided) {
      await client.query(
        "DELETE FROM user_croptype WHERE user_id = $1 AND kind = $2",
        [userId, kind]
      );
    }
    for (const e of entries) {
      const isCustom = !canonicalSet.has(e.name);
      await client.query(
        `INSERT INTO user_croptype (user_id, crop_type_id, name, kind, custom)
         VALUES ($1, $2, $3, $4, $5)`,
        [userId, isCustom ? null : e.name, e.name, e.kind, isCustom]
      );
    }
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { listCropTypes, ROW_TO_CROP, listUnits, ROW_TO_UNIT, syncUserCrops, cropKey };