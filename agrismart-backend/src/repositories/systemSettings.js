const { query } = require("../db/pool");

// Generic key -> JSONB setting store. Settings are admin-tuned (e.g. the commission
// schedule); rows are upserted so only the latest value survives per key.
async function getSetting(key) {
  const r = await query("SELECT key, value, updated_at, updated_by FROM system_settings WHERE key = $1", [key]);
  if (!r.rowCount) return null;
  return {
    key: r.rows[0].key,
    value: r.rows[0].value,
    updatedAt: r.rows[0].updated_at,
    updatedBy: r.rows[0].updated_by,
  };
}

async function setSetting(key, value, byUserId) {
  const r = await query(
    `INSERT INTO system_settings (key, value, updated_at, updated_by)
     VALUES ($1, $2, now(), $3)
     ON CONFLICT (key) DO UPDATE
       SET value = EXCLUDED.value, updated_by = EXCLUDED.updated_by, updated_at = now()
     RETURNING key, value, updated_by`,
    [key, JSON.stringify(value), byUserId || null]
  );
  return { key: r.rows[0].key, value: r.rows[0].value, updatedBy: r.rows[0].updated_by };
}

const DEFAULT_COMMISSION = {
  enabled: false,
  mode: "percent",
  strategy: "flat",
  flatValue: 0,
  tiers: [],
};

async function getCommission() {
  const row = await getSetting("commission");
  return row ? { ...DEFAULT_COMMISSION, ...row.value } : { ...DEFAULT_COMMISSION };
}

async function setCommission(value, byUserId) {
  await setSetting("commission", value, byUserId);
  return value;
}

module.exports = { getSetting, setSetting, getCommission, setCommission, DEFAULT_COMMISSION };