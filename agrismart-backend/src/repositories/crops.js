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

// Admin view: every crop including inactive ones (so admins can re-enable).
async function listAllCropTypes() {
  const r = await query(
    `SELECT id, name, default_unit, emoji, gradient_from, gradient_to, display_order, active
     FROM crop_types
     ORDER BY display_order ASC, id ASC`
  );
  return r.rows.map((row) => ({ ...ROW_TO_CROP(row), active: row.active }));
}

// Create a crop (id = normalized key). If the key already exists it is re-activated
// with the submitted display name so "create" doubles as "restore from archive".
async function createCropType({ name, defaultUnit, emoji, gradientFrom, gradientTo, displayOrder }) {
  const key = cropKey(name);
  if (!key) throw new Error("invalid crop name");
  const r = await query(
    `INSERT INTO crop_types (id, name, default_unit, emoji, gradient_from, gradient_to, display_order)
     VALUES ($1,$2,$3,$4,$5,$6,$7)
     ON CONFLICT (id) DO UPDATE SET active = true, name = EXCLUDED.name
     RETURNING *`,
    [key, (name || "").trim(), defaultUnit || "bags", emoji || null, gradientFrom || null, gradientTo || null, Number(displayOrder) || 0]
  );
  return { ...ROW_TO_CROP(r.rows[0]), active: r.rows[0].active };
}

// Update editable crop metadata (COALESCE: unspecified fields stay unchanged), including
// the active toggle so admins can deactivate/enable a crop.
async function updateCropType(id, { name, defaultUnit, emoji, gradientFrom, gradientTo, displayOrder, active }) {
  const r = await query(
    `UPDATE crop_types SET
       name          = COALESCE($2, name),
       default_unit  = COALESCE($3, default_unit),
       emoji         = COALESCE($4, emoji),
       gradient_from = COALESCE($5, gradient_from),
       gradient_to   = COALESCE($6, gradient_to),
       display_order = COALESCE($7, display_order),
       active        = CASE WHEN $8::boolean IS NULL THEN active ELSE $8::boolean END,
       updated_at    = now()
     WHERE id = $1 RETURNING *`,
    [
      id,
      name ? String(name).trim() : undefined,
      defaultUnit ? String(defaultUnit).trim() : undefined,
      emoji || undefined,
      gradientFrom || undefined,
      gradientTo || undefined,
      displayOrder == null || displayOrder === "" ? undefined : Number(displayOrder),
      active == null ? null : Boolean(active),
    ]
  );
  return r.rowCount ? { ...ROW_TO_CROP(r.rows[0]), active: r.rows[0].active } : null;
}

// Permanently remove a crop. Safe: no table references crop_types.id with an ON DELETE
// RESTRICT (user_croptype.crop_type_id is ON DELETE SET NULL).
async function deleteCropType(id) {
  const r = await query("DELETE FROM crop_types WHERE id = $1 RETURNING id", [id]);
  return r.rowCount ? r.rows[0].id : null;
}

// Bulk-insert crop types from an admin import. Rows are validated by the route
// before arriving; this layer only skips rows whose normalized key already exists,
// so re-importing a file never creates duplicates.
async function importCropTypes(rows) {
  let inserted = 0;
  let skipped = 0;
  for (const row of rows) {
    const r = await query(
      `INSERT INTO crop_types (id, name, default_unit, emoji, gradient_from, gradient_to, display_order)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       ON CONFLICT (id) DO NOTHING`,
      [
        cropKey(row.name),
        String(row.name).trim(),
        row.defaultUnit || "bags",
        row.emoji || null,
        row.gradientFrom || null,
        row.gradientTo || null,
        Number(row.displayOrder) || 0,
      ]
    );
    if (r.rowCount > 0) inserted += 1;
    else skipped += 1;
  }
  return { total: rows.length, inserted, skipped, failed: [] };
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

// Admin view: every unit including inactive ones.
async function listAllUnits() {
  const r = await query(
    `SELECT id, name, plural, display_order, active
     FROM unit_of_measure
     ORDER BY display_order ASC, id ASC`
  );
  return r.rows.map((row) => ({ ...ROW_TO_UNIT(row), active: row.active }));
}

// Create a unit (id = normalized key). Re-activates an existing key on conflict.
async function createUnit({ name, plural, displayOrder }) {
  const key = cropKey(name);
  if (!key) throw new Error("invalid unit name");
  const r = await query(
    `INSERT INTO unit_of_measure (id, name, plural, display_order)
     VALUES ($1,$2,$3,$4)
     ON CONFLICT (id) DO UPDATE SET active = true, name = EXCLUDED.name
     RETURNING *`,
    [key, (name || "").trim(), (plural || name || "").trim(), Number(displayOrder) || 0]
  );
  return { ...ROW_TO_UNIT(r.rows[0]), active: r.rows[0].active };
}

// Bulk-insert units of measure from an admin import. Skips rows whose normalized
// key already exists so re-importing a file never creates duplicates.
async function importUnits(rows) {
  let inserted = 0;
  let skipped = 0;
  for (const row of rows) {
    const r = await query(
      `INSERT INTO unit_of_measure (id, name, plural, display_order)
       VALUES ($1,$2,$3,$4)
       ON CONFLICT (id) DO NOTHING`,
      [cropKey(row.name), String(row.name).trim(), (row.plural || row.name || "").trim(), Number(row.displayOrder) || 0]
    );
    if (r.rowCount > 0) inserted += 1;
    else skipped += 1;
  }
  return { total: rows.length, inserted, skipped, failed: [] };
}

async function updateUnit(id, { name, plural, displayOrder, active }) {
  const r = await query(
    `UPDATE unit_of_measure SET
       name          = COALESCE($2, name),
       plural        = COALESCE($3, plural),
       display_order = COALESCE($4, display_order),
       active        = CASE WHEN $5::boolean IS NULL THEN active ELSE $5::boolean END,
       updated_at    = now()
     WHERE id = $1 RETURNING *`,
    [
      id,
      name ? String(name).trim() : undefined,
      plural ? String(plural).trim() : undefined,
      displayOrder == null || displayOrder === "" ? undefined : Number(displayOrder),
      active == null ? null : Boolean(active),
    ]
  );
  return r.rowCount ? { ...ROW_TO_UNIT(r.rows[0]), active: r.rows[0].active } : null;
}

async function deleteUnit(id) {
  const r = await query("DELETE FROM unit_of_measure WHERE id = $1 RETURNING id", [id]);
  return r.rowCount ? r.rows[0].id : null;
}

// Every row of the normalized user_croptype registry with the owning user, for the
// admin "user crop-type" page. Mirrors users.primary_crops/purchase_crops.
async function listUserCropTypes() {
  const r = await query(
    `SELECT uc.user_id, u.name AS user_name, u.phone AS user_phone, u.role AS user_role,
            uc.name AS crop, uc.kind, uc.custom, uc.crop_type_id
     FROM user_croptype uc
     JOIN users u ON u.id = uc.user_id
     ORDER BY u.name ASC, u.role ASC, uc.kind ASC, uc.name ASC`
  );
  return r.rows.map((row) => ({
    userId: row.user_id,
    userName: row.user_name,
    phone: row.user_phone,
    role: row.user_role,
    crop: row.crop,
    kind: row.kind,
    custom: row.custom,
    cropTypeId: row.crop_type_id,
  }));
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
async function syncUserCrops(userId, { primaryCrops = undefined, purchaseCrops = undefined } = {}) {
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

module.exports = {
  listCropTypes, ROW_TO_CROP, listAllCropTypes, createCropType, updateCropType, deleteCropType, importCropTypes,
  listUnits, ROW_TO_UNIT, listAllUnits, createUnit, updateUnit, deleteUnit, importUnits,
  syncUserCrops, cropKey, listUserCropTypes,
};