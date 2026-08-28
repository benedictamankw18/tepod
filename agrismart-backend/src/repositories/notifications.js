const { randomUUID } = require("crypto");
const { query } = require("../db/pool");
const messages = require("../services/messages");
const config = require("../config");

const AGOO_URL = "https://api.agoosms.com/v1/sms/send";

// Ghanaian local formats ("024 123 4567") -> E.164 (+233...).
function normalizeE164(phone) {
  let digits = String(phone || "").replace(/[^\d+]/g, "");
  if (digits.startsWith("+")) return digits;
  if (digits.startsWith("0")) return "+233" + digits.slice(1);
  return digits;
}

async function sendViaAgooSms(entryRecord, message) {
  const to = normalizeE164(entryRecord.to_phone);
  try {
    const res = await fetch(AGOO_URL, {
      method: "POST",
      headers: { "X-API-Key": config.agooSmsApiKey, "Content-Type": "application/json" },
      body: JSON.stringify({ to, message, senderId: config.agooSmsSenderId }),
    });
    const text = await res.text();
    let body = null;
    try { body = text ? JSON.parse(text) : null; } catch (_) { body = text; }
    if (!res.ok) {
      await query("UPDATE notifications SET delivered = false, error = $2 WHERE id = $1", [entryRecord.id, `Agoo HTTP ${res.status}: ${text}`]);
      console.error(`[AGOOSMS FAILED] to ${to}: ${text}`);
      return;
    }
    const agooId = body && body.id ? body.id : null;
    await query("UPDATE notifications SET delivered = true, agoo_id = $2 WHERE id = $1", [entryRecord.id, agooId || null]);
    console.log(`[AGOOSMS SENT] to ${to}`);
  } catch (err) {
    await query("UPDATE notifications SET delivered = false, error = $2 WHERE id = $1", [entryRecord.id, err.message]);
    console.error(`[AGOOSMS ERROR] to ${to}: ${err.message}`);
  }
}

async function logNotification({ toPhone, channel, message, messageKey, language, params }) {
  const localized = messageKey
    ? messages.render({ key: messageKey, language, params })
    : null;
  const finalMessage = localized || message;
  const id = randomUUID();
  const r = await query(
    `INSERT INTO notifications (id, to_phone, channel, message_key, language, params, message)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [id, toPhone, channel, messageKey || null, language || null, params ? JSON.stringify(params) : null, finalMessage]
  );
  const row = r.rows[0];
  console.log(`[LOG ${String(channel).toUpperCase()}] to ${toPhone}: ${finalMessage}`);
  if (channel === "sms" && config.agooSmsApiKey && config.agooSmsSenderId) {
    // Fire-and-forget; delivery status recorded async on the notification row.
    sendViaAgooSms(row, finalMessage);
  }
  return row;
}

async function listNotifications() {
  const r = await query("SELECT * FROM notifications ORDER BY sent_at DESC");
  return r.rows;
}

module.exports = { logNotification, listNotifications, normalizeE164 };
