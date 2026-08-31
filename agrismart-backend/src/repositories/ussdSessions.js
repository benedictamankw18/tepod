const { query } = require("../db/pool");

async function getSession(sessionId) {
  const r = await query(
    `SELECT session_id, step, data FROM ussd_sessions WHERE session_id = $1`,
    [sessionId]
  );
  if (r.rowCount === 0) return null;
  return { sessionId: r.rows[0].session_id, step: r.rows[0].step, data: r.rows[0].data || {} };
}

async function setSession(sessionId, data) {
  await query(
    `INSERT INTO ussd_sessions (session_id, step, data)
     VALUES ($1,$2,$3)
     ON CONFLICT (session_id) DO UPDATE SET step = $2, data = $3, updated_at = now()`,
    [sessionId, data.step, JSON.stringify(data.data || {})]
  );
}

async function clearSession(sessionId) {
  await query("DELETE FROM ussd_sessions WHERE session_id = $1", [sessionId]);
}

module.exports = { getSession, setSession, clearSession };
