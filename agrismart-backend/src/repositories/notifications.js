const { randomUUID } = require("crypto");
const { query } = require("../db/pool");
const messages = require("../services/messages");
const config = require("../config");
const { sendEmail } = require("../services/mailer");

const AGOO_URL = "https://api.agoosms.com/v1/sms/send";

// Ghanaian local formats ("024 123 4567") -> E.164 (+233...).
function normalizeE164(phone) {
  let digits = String(phone || "").replace(/[^\d+]/g, "");
  if (digits.startsWith("+")) return digits;
  if (digits.startsWith("0")) return "+233" + digits.slice(1);
  return digits;
}

// Persist the full AgoSMS response (success or failure) into ago_sms_logs.
async function logAgoSms({ notificationId, toE164, response, success, error }) {
  const data = (response && response.data) || {};
  const meta = (response && response.meta) || {};
  await query(
    `INSERT INTO ago_sms_logs
       (id, notification_id, request_id, message_id, to_e164, segments, cost, balance,
        status, test_mode, success, raw_response, created_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12, now())
     ON CONFLICT (id) DO NOTHING`,
    [
      randomUUID(),
      notificationId || null,
      meta.requestId || null,
      data.messageId || null,
      toE164 || null,
      data.segments != null ? Number(data.segments) : null,
      data.cost != null ? Number(data.cost) : null,
      data.balance != null ? Number(data.balance) : null,
      data.status || null,
      data.testMode != null ? Boolean(data.testMode) : null,
      success != null ? Boolean(success) : null,
      JSON.stringify({ response, error: error || null }),
    ]
  );
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
      await logAgoSms({ notificationId: entryRecord.id, toE164: to, response: body, success: false, error: `Agoo HTTP ${res.status}: ${text}` });
      console.error(`[AGOOSMS FAILED] to ${to}: ${text}`);
      return;
    }
    const messageId = (body && body.data && body.data.messageId) || null;
    const success = body ? body.success !== false : true;
    await logAgoSms({ notificationId: entryRecord.id, toE164: to, response: body, success });
    await query("UPDATE notifications SET delivered = $2, agoo_id = $3 WHERE id = $1", [entryRecord.id, success, messageId]);
    console.log(`[AGOOSMS SENT] to ${to}`);
  } catch (err) {
    await query("UPDATE notifications SET delivered = false, error = $2 WHERE id = $1", [entryRecord.id, err.message]);
    await logAgoSms({ notificationId: entryRecord.id, toE164: to, response: null, success: false, error: err.message });
    console.error(`[AGOOSMS ERROR] to ${to}: ${err.message}`);
  }
}

async function logNotification({ toPhone, toEmail, channel, message, messageKey, language, params }) {
  const localized = messageKey
    ? messages.render({ key: messageKey, language, params })
    : null;
  const finalMessage = localized || message;
  const id = randomUUID();
  const r = await query(
    `INSERT INTO notifications (id, to_phone, to_email, channel, message_key, language, params, message)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
    [id, toPhone || null, toEmail || null, channel, messageKey || null, language || null, params ? JSON.stringify(params) : null, finalMessage]
  );
  const row = r.rows[0];
  console.log(`[LOG ${String(channel).toUpperCase()}] to ${toPhone || toEmail || "(none)"}: ${finalMessage}`);
  if (channel === "sms" && config.agooSmsApiKey && config.agooSmsSenderId) {
    // Fire-and-forget; delivery status recorded async on the notification row.
    sendViaAgooSms(row, finalMessage);
  }
  if (channel === "email" && toEmail && config.smtpHost && config.smtpUser) {
    sendViaEmail(row);
  }
  return row;
}

async function sendViaEmail(row) {
  const result = await sendEmail({
    to: row.to_email,
    subject: "AgriSmart notification",
    text: row.message,
  });
  if (result.skip) return;
  await query(
    "UPDATE notifications SET delivered = $2, error = $3 WHERE id = $1",
    [row.id, result.delivered || null, result.error || null]
  );
}

async function listNotifications() {
  const r = await query("SELECT * FROM notifications ORDER BY sent_at DESC");
  return r.rows;
}

module.exports = { logNotification, listNotifications, normalizeE164 };
