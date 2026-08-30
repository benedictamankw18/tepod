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

// A deliverable Ghana mobile number: +233 followed by exactly 9 digits.
// Matches what AgoSMS accepts; "4244423" and "+2335544343434" fail here.
function validMobile(phone) {
  return /^\+233\d{9}$/.test(normalizeE164(phone));
}

// Mirrors routes/auth.js EMAIL_RE. Also rejects phone-shaped or junk values
// stored in the email column (no "@" / no TLD).
function validEmail(email) {
  return typeof email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
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

async function logNotification({ toPhone, toEmail, channel, message, messageKey, language, params, userId, title }) {
  const localized = messageKey
    ? messages.render({ key: messageKey, language, params })
    : null;
  const finalMessage = localized || message;
  const id = randomUUID();
  const inApp = channel === "in_app";
  // In-app rows are delivered the moment they are stored in the user's inbox, so
  // they are marked delivered=true; SMS/email stay NULL until the async sender
  // (sendViaAgooSms / sendViaEmail) reports the outcome.
  const r = await query(
    `INSERT INTO notifications (id, to_phone, to_email, user_id, title, channel, message_key, language, params, message, delivered)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
    [id, toPhone || null, toEmail || null, userId || null, title || null, channel, messageKey || null, language || null, params ? JSON.stringify(params) : null, finalMessage, inApp || null]
  );
  const row = r.rows[0];
  console.log(`[LOG ${String(channel).toUpperCase()}] to ${toPhone || toEmail || userId || "(none)"}: ${finalMessage}`);
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
    subject: row.title || "NKABOM AGRILINK notification",
    text: row.message,
  });
  if (result.skip) return;
  await query(
    "UPDATE notifications SET delivered = $2, error = $3 WHERE id = $1",
    [row.id, result.delivered || null, result.error || null]
  );
}

// Fan an event out to a single recipient across every channel we can reach them
// on: in-app (always stored, delivered-on-store), SMS (valid Ghana mobile), and
// email (valid address). Unusable channels are skipped silently, so callers make
// one call instead of three and delivery never breaks on a missing contact.
async function notify({ userId, phone, email, title, messageKey, params, message, language, include = ["in_app", "sms", "email"] }) {
  const made = [];
  if (include.includes("in_app")) {
    made.push(await logNotification({ userId, channel: "in_app", title, messageKey, params, message, language }));
  }
  if (include.includes("sms") && validMobile(phone)) {
    made.push(await logNotification({ toPhone: phone, channel: "sms", messageKey, params, message, language }));
  }
  if (include.includes("email") && validEmail(email)) {
    made.push(await logNotification({ toEmail: email, channel: "email", title, messageKey, params, message, language }));
  }
  return made;
}

async function listNotifications({ channel, delivered } = {}) {
  const conds = [];
  const params = [];
  if (channel) {
    params.push(channel);
    conds.push(`channel = $${params.length}`);
  }
  if (delivered !== undefined) {
    params.push(delivered);
    conds.push(`delivered = $${params.length}`);
  }
  const where = conds.length ? `WHERE ${conds.join(" AND ")}` : "";
  const r = await query(`SELECT * FROM notifications ${where} ORDER BY sent_at DESC`, params);
  return r.rows.map((row) => ({
    id: row.id,
    userId: row.user_id || null,
    title: row.title || null,
    readAt: row.read_at || null,
    toPhone: row.to_phone,
    toEmail: row.to_email,
    channel: row.channel,
    messageKey: row.message_key,
    language: row.language,
    params: row.params,
    message: row.message,
    delivered: row.delivered,
    error: row.error,
    sentAt: row.sent_at,
    agooId: row.agoo_id || null,
  }));
}

// In-app inbox for a single user (newest first), plus the count of unread rows.
async function listMyNotifications(userId, { limit = 20 } = {}) {
  if (!userId) return { notifications: [], unread: 0 };
  const count = await query(
    "SELECT count(*)::int AS n FROM notifications WHERE user_id = $1 AND read_at IS NULL AND channel = 'in_app'",
    [userId]
  );
  const r = await query(
    `SELECT * FROM notifications WHERE user_id = $1 AND channel = 'in_app'
     ORDER BY sent_at DESC LIMIT $2`,
    [userId, Math.min(Number(limit) || 20, 100)]
  );
  const notifications = r.rows.map((row) => ({
    id: row.id,
    title: row.title || null,
    message: row.message,
    sentAt: row.sent_at,
    read: row.read_at != null,
  }));
  return { notifications, unread: Number(count.rows[0].n) };
}

// Mark the user's in-app notifications as read. ids is optional; when omitted (or
// empty) every unread in-app row for the user is marked.
async function markNotificationsRead(userId, ids = []) {
  if (!userId) return 0;
  const params = [userId];
  let cond = "user_id = $1 AND read_at IS NULL AND channel = 'in_app'";
  if (Array.isArray(ids) && ids.length) {
    params.push(ids);
    cond += ` AND id = ANY($${params.length})`;
  }
  const r = await query(`UPDATE notifications SET read_at = now() WHERE ${cond}`, params);
  return r.rowCount;
}

// Admin broadcast to a set of roles/channels. "all" targets every non-admin role.
const AUDIENCE_ROLES = {
  buyers: ["buyer"],
  farmers: ["farmer"],
  all: ["buyer", "farmer", "market_seller", "transporter"],
};

async function broadcastNotification({ audience, channels, title, message }) {
  const roles = AUDIENCE_ROLES[audience];
  if (!roles) return { error: 'audience must be one of "buyers", "farmers", "all"' };
  const wanted = Array.isArray(channels) ? channels : [];
  if (!wanted.length) return { error: "at least one channel is required" };
  const text = String(message || "").trim();
  if (!text) return { error: "message is required" };
  if (text.length > 1600) return { error: "message is too long (max 1600 characters)" };

  const where = roles.length === 1 ? "u.role = $1" : `u.role = ANY($1)`;
  const params = roles.length === 1 ? roles : [roles];
  const r = await query(
    `SELECT u.id, u.phone, u.email FROM users u
     WHERE ${where} AND u.active = true AND u.deleted_at IS NULL
     ORDER BY u.created_at ASC`,
    params
  );
  const users = r.rows;

  const counts = { in_app: 0, sms: 0, email: 0, skipped: 0, invalidPhones: 0, invalidEmails: 0 };
  const targetChannels = wanted.filter((c) => ["in_app", "sms", "email"].includes(c));
  for (const user of users) {
    for (const channel of targetChannels) {
      if (channel === "sms") {
        if (!user.phone) {
          counts.skipped += 1;
          continue;
        }
        if (!validMobile(user.phone)) {
          counts.invalidPhones += 1;
          continue;
        }
      }
      if (channel === "email") {
        if (!user.email) {
          counts.skipped += 1;
          continue;
        }
        if (!validEmail(user.email)) {
          counts.invalidEmails += 1;
          continue;
        }
      }
      // Internal insert only — no external side effects for the in-app channel.
      await logNotification({
        toPhone: user.phone || null,
        toEmail: user.email || null,
        userId: user.id,
        title: channel === "in_app" ? title || null : null,
        channel,
        message: text,
      });
      counts[channel] += 1;
    }
  }

  return {
    audience,
    recipients: users.length,
    channels: targetChannels,
    counts,
    sentAt: new Date().toISOString(),
  };
}

module.exports = {
  logNotification,
  notify,
  listNotifications,
  listMyNotifications,
  markNotificationsRead,
  broadcastNotification,
  normalizeE164,
  validMobile,
  validEmail,
};
