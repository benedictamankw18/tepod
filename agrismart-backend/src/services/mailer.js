// mailer.js
// SMTP email delivery via nodemailer. Config comes from the SMTP_* env vars.
// When SMTP isn't configured we skip sending and just log, so callers can treat
// this as fire-and-forget and never block on a missing or misconfigured gateway.

const nodemailer = require("nodemailer");
const config = require("../config");

// Jest sets this automatically, letting us skip real SMTP sends during tests while
// still logging the notification row. The dev/prod server sends for real.
const isTest = !!process.env.JEST_WORKER_ID;

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;
  if (!config.smtpHost || !config.smtpUser) return null;
  transporter = nodemailer.createTransport({
    host: config.smtpHost,
    port: config.smtpPort,
    secure: config.smtpPort === 465,
    auth: { user: config.smtpUser, pass: config.smtpPassword },
  });
  return transporter;
}

// Send a plain-text email. Resolves with { delivered, skipped, error } but never throws.
async function sendEmail({ to, subject, text }) {
  const t = getTransporter();
  if (!t) {
    console.log(`[EMAIL SKIPPED] to ${to}: SMTP not configured (subject: ${subject})`);
    return { delivered: false, skipped: true, error: null };
  }
  if (isTest) {
    console.log(`[EMAIL SKIPPED] to ${to}: test environment (subject: ${subject})`);
    return { delivered: false, skipped: true, error: null };
  }
  try {
    await t.sendMail({
      from: `"AgriSmart" <${config.smtpUser}>`,
      to,
      subject,
      text,
    });
    console.log(`[EMAIL SENT] to ${to}: ${subject}`);
    return { delivered: true, skipped: false, error: null };
  } catch (err) {
    console.error(`[EMAIL ERROR] to ${to}: ${err.message}`);
    return { delivered: false, skipped: false, error: err.message };
  }
}

module.exports = { sendEmail };
