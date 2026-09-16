const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { randomUUID } = require("crypto");
const { OAuth2Client } = require("google-auth-library");
const { query } = require("../db/pool");
const config = require("../config");
const usersRepo = require("../repositories/users");
const notificationsRepo = require("../repositories/notifications");
const messages = require("./messages");

const OTP_KEY = "agrismart.otp.";

// Every account starts unverified and must complete the /api/auth/verify step
// (ID + live photo) before trading, listing produce, or managing farms.

function hashPassword(plain) {
  return bcrypt.hash(plain, 10);
}

function comparePassword(plain, hash) {
  return bcrypt.compare(plain, hash);
}

function signToken(user) {
  return jwt.sign(
    { sub: user.id, phone: user.phone, role: user.role },
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn }
  );
}

function verifyToken(token) {
  try {
    return jwt.verify(token, config.jwtSecret);
  } catch (_) {
    return null;
  }
}

// Generate a random 6-digit code, return the plaintext (to send/log) and its hash (to store).
function generateOtp() {
  const code = String(Math.floor(100000 + Math.random() * 900000));
  return { code, codeHash: crypto.createHash("sha256").update(OTP_KEY + code).digest("hex") };
}

function hashOtp(code) {
  return crypto.createHash("sha256").update(OTP_KEY + code).digest("hex");
}

async function issueOtp({ phone, purpose = "login", email }) {
  const normalizedPhone = usersRepo.normalizeE164(phone);
  // For password reset we only issue a code to an address that actually has an account
  // (fail fast). Login OTP is unaffected: it may auto-register brand-new users.
  if (purpose === "reset") {
    const account = email
      ? await usersRepo.findUserByEmail(email)
      : await usersRepo.findUserByPhone(normalizedPhone);
    if (!account) {
      return { error: "no account found for this phone or email" };
    }
  }
  const { code, codeHash } = generateOtp();
  const expiresAt = new Date(Date.now() + config.otpExpiryMin * 60 * 1000);
  await query(
    `INSERT INTO otp_codes (id, phone, code_hash, purpose, expires_at) VALUES ($1,$2,$3,$4,$5)`,
    [randomUUID(), normalizedPhone, codeHash, purpose, expiresAt.toISOString()]
  );
  const params = { code, expiresIn: config.otpExpiryMin };
  await notificationsRepo.logNotification({
    toPhone: normalizedPhone,
    channel: "sms",
    messageKey: "otp",
    language: "en",
    params,
  });
  // Also deliver the same code by email when a recipient address was provided.
  if (email) {
    await notificationsRepo.logNotification({
      toPhone: normalizedPhone,
      toEmail: email,
      channel: "email",
      messageKey: "otp",
      language: "en",
      params,
    });
  }
  // In dev (no real SMS gateway) surface the code so end-to-end flows are testable.
  const debugCode = config.env !== "production" && !config.agooSmsApiKey ? code : undefined;
  return { expiresInMin: config.otpExpiryMin, issued: true, debugCode };
}

// Validate an OTP code without consuming it. Returns the matching otp_codes row id,
// or null if no valid (non-expired, correct) code was found. Mark used=false stays false
// until the caller confirms the login/registration succeeded (markOtpUsed).
async function verifyOtp({ phone, code, purpose = "login" }) {
  const normalized = usersRepo.normalizeE164(phone);
  const result = await query(
    "SELECT * FROM otp_codes WHERE phone = $1 AND purpose = $2 AND used = false ORDER BY created_at DESC LIMIT 5",
    [normalized, purpose]
  );
  const now = Date.now();
  for (const row of result.rows) {
    if (new Date(row.expires_at).getTime() < now) continue; // expired
    if (row.code_hash !== hashOtp(code)) continue;
    return row.id;
  }
  return null;
}

// Consume a previously-verified OTP once the login/registration has succeeded.
async function markOtpUsed(otpCodeId) {
  return query("UPDATE otp_codes SET used = true WHERE id = $1", [otpCodeId]);
}

// Sign up (or log in) via phone + OTP. Creates the account if it doesn't exist.
// A role is required (farmer or buyer) when creating a NEW account; no default is assigned.
// Returning users log in with just their stored role.
async function loginOrRegisterWithOtp({ phone, name, role, buyerType, location }) {
  const normalized = usersRepo.normalizeE164(phone);
  let user = await usersRepo.findUserByPhone(normalized);
  if (!user) {
    if (!usersRepo.SIGNUP_ROLES.includes(role)) {
      return { error: "role is required and must be farmer or buyer" };
    }
    if (role === "buyer" && !usersRepo.BUYER_TYPES.includes(buyerType)) {
      return { error: "buyerType is required for buyers (wholesale, retail, processor)" };
    }
    user = await usersRepo.createUser({
      name: name || "User",
      phone: normalized,
      role,
      buyerType,
      location,
      verified: false,
    });
  }
  return { user, token: signToken(user) };
}

// Verify a reset OTP for a phone and set a new password. Consumes the code only on success.
async function resetPassword({ phone, code, password }) {
  if (!password || password.length < 6) {
    return { error: "password must be at least 6 characters" };
  }
  const otpRow = await verifyOtp({ phone, code, purpose: "reset" });
  if (!otpRow) return { error: "invalid or expired code" };
  const user = await usersRepo.findUserByPhone(phone);
  if (!user) return { error: "no account found for this phone" };
  const passwordHash = await hashPassword(password);
  await markOtpUsed(otpRow);
  await usersRepo.setPassword(user.id, passwordHash);
  return { ok: true };
}

// Sign up with phone/email + password.
async function registerWithPassword(payload) {
  const passwordHash = await hashPassword(payload.password);
  const user = await usersRepo.createUser({
    ...payload,
    passwordHash,
    verified: false,
  });
  return { user, token: signToken(user) };
}

// Log in with phone, email, or username + password.
async function loginWithPassword({ identifier, password }) {
  const user = await usersRepo.findUserByIdentifier(identifier);
  if (!user || !user.passwordHash) return { error: "invalid_credentials" };
  const ok = await comparePassword(password, user.passwordHash);
  if (!ok) return { error: "invalid_credentials" };
  // Only after a successful password check, so account status is not leaked to
  // someone who doesn't know the password.
  if (!user.active || user.deletedAt) return { error: "account_deactivated" };
  return { user, token: signToken(user) };
}

// Admin-initiated account creation: any role, optional password (accounts without
// one rely on OTP/Google login), and an explicit verified flag instead of the
// signup default. Bypasses the SIGNUP_ROLES gate so transporters/admins can be seeded.
async function createUserByAdmin({ password, verified, ...profile }) {
  const passwordHash = password ? await hashPassword(password) : null;
  return usersRepo.createUser({
    ...profile,
    passwordHash,
    verified: verified !== undefined ? !!verified : true,
  });
}

// Google sign-in via a client-side Google ID token. Verifies the token server-side
// against GOOGLE_CLIENT_ID (config.googleClientId). New users must pick a role.
async function googleLogin({ idToken, name, role, buyerType, acceptedTerms }) {
  if (!config.googleClientId) {
    return { error: "google_signin_not_configured" };
  }
  if (!idToken) {
    return { error: "idToken is required" };
  }
  let payload;
  try {
    const client = new OAuth2Client(config.googleClientId);
    const ticket = await client.verifyIdToken({ idToken, audience: config.googleClientId });
    payload = ticket.getPayload();
  } catch (_) {
    return { error: "invalid_google_token" };
  }
  const providerUid = payload.sub;
  const email = payload.email || null;
  const googleName = payload.name || name || "User";

  const r = await query(
    `SELECT user_id FROM oauth_accounts WHERE provider = 'google' AND provider_uid = $1`,
    [providerUid]
  );
  if (r.rowCount > 0) {
    // Existing Google account -> log in (no role needed for returning users).
    const user = await usersRepo.getUser(r.rows[0].user_id);
    return { user, token: signToken(user), created: false };
  }

  // Link to an existing account with the same email if present, else create one.
  let user = email ? await usersRepo.findUserByEmail(email) : null;
  let created = false;
  if (!user) {
<<<<<<< HEAD
    if (acceptedTerms !== true) {
      return { error: "accepted_terms_required" };
    }
=======
>>>>>>> origin/development
    if (!usersRepo.SIGNUP_ROLES.includes(role)) {
      return { error: "role is required and must be farmer or buyer" };
    }
    if (role === "buyer" && !usersRepo.BUYER_TYPES.includes(buyerType)) {
      return { error: "buyerType is required for buyers (wholesale, retail, processor)" };
    }
    user = await usersRepo.createUser({
      name: googleName,
      email: email || null,
      role,
      buyerType,
      acceptedTerms: acceptedTerms === true,
      verified: false,
    });
    created = true;
  }
  await query(
    "INSERT INTO oauth_accounts (id, user_id, provider, provider_uid) VALUES ($1,$2,'google',$3)",
    [randomUUID(), user.id, providerUid]
  );
  return { user, token: signToken(user), created };
}

module.exports = {
  hashPassword, comparePassword, signToken, verifyToken,
  issueOtp, verifyOtp, markOtpUsed,   loginOrRegisterWithOtp,
  registerWithPassword, loginWithPassword, googleLogin, resetPassword,
  createUserByAdmin,
  // for templates / reuse
  render: messages.render,
};
