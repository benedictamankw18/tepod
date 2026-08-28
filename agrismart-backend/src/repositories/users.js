const { randomUUID } = require("crypto");
const { query } = require("../db/pool");

const ROLES = ["farmer", "buyer", "market_seller", "transporter", "admin"];
const SIGNUP_ROLES = ["farmer", "buyer"];
const BUYER_TYPES = ["wholesale", "retail", "processor"];
const MOBILE_MONEY = ["mtn", "vodafone_cash", "airteltigo"];
const LANGUAGES = ["en", "tw"];

// Ghanaian numbers -> E.164 (+233...). "024 123 4567" -> "+233241234567".
function normalizeE164(phone) {
  let digits = String(phone || "").replace(/[^\d+]/g, "");
  if (digits.startsWith("+")) return digits;
  if (digits.startsWith("0")) return "+233" + digits.slice(1);
  return digits;
}

// Optional login handle: trimmed and lower-cased for case-insensitive uniqueness/lookup.
function normalizeUsername(username) {
  const u = String(username || "").trim().toLowerCase();
  return u || null;
}

const ROW_TO_USER = (r) => ({
  id: r.id,
  name: r.name,
  phone: r.phone,
  email: r.email,
  username: r.username || null,
  passwordHash: r.password_hash, // internal only - strip before returning to clients
  role: r.role,
  location: r.location,
  cropTypes: r.crop_types || [],
  primaryCrops: r.primary_crops || [],
  purchaseCrops: r.purchase_crops || [],
  buyerType: r.buyer_type || null,
  mobileMoneyProvider: r.mobile_money_provider || null,
  language: r.language,
  farmSize: r.farm_size === null ? null : Number(r.farm_size),
  community: r.community,
  verified: r.verified,
  rating: r.rating === null ? null : Number(r.rating),
  ratingCount: r.rating_count,
  createdAt: r.created_at,
});

// Public-safe view of a user - never exposes the password hash.
function publicUser(u) {
  if (!u) return null;
  const { passwordHash, ...rest } = u;
  return rest;
}

async function createUser({
  name, phone, email, username, passwordHash, role, location, cropTypes, primaryCrops,
  purchaseCrops, language, farmSize, community, buyerType, mobileMoneyProvider, verified,
}) {
  const id = randomUUID();
  const isBuyer = role === "buyer" || role === "market_seller";
  const finalBuyerType = isBuyer && BUYER_TYPES.includes(buyerType)
    ? buyerType
    : (isBuyer && role === "market_seller" ? "retail" : null);
  // Emails are stored lower-cased so uniqueness and lookups are consistent regardless of case.
  const normEmail = String(email || "").toLowerCase() || null;
  const rows = await query(
    `INSERT INTO users (
       id, name, phone, email, username, password_hash, role, location, crop_types, primary_crops,
       purchase_crops, buyer_type, mobile_money_provider, language, farm_size, community, verified
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
     RETURNING *`,
    [
      id, name, normalizeE164(phone) || null, normEmail, normalizeUsername(username), passwordHash || null, role, location || null,
      Array.isArray(cropTypes) ? cropTypes : [],
      Array.isArray(primaryCrops) ? primaryCrops : [],
      Array.isArray(purchaseCrops) ? purchaseCrops : [],
      finalBuyerType,
      MOBILE_MONEY.includes(mobileMoneyProvider) ? mobileMoneyProvider : null,
      LANGUAGES.includes(language) ? language : "en",
      typeof farmSize === "number" && farmSize > 0 ? farmSize : null,
      community || null,
      !!verified,
    ]
  );
  return ROW_TO_USER(rows.rows[0]);
}

async function getUser(id) {
  const r = await query("SELECT * FROM users WHERE id = $1", [id]);
  return r.rowCount ? ROW_TO_USER(r.rows[0]) : null;
}

async function findUserByPhone(phone) {
  const r = await query("SELECT * FROM users WHERE phone = $1", [normalizeE164(phone)]);
  return r.rowCount ? ROW_TO_USER(r.rows[0]) : null;
}

async function findUserByEmail(email) {
  const r = await query("SELECT * FROM users WHERE LOWER(email) = LOWER($1)", [String(email || "")]);
  return r.rowCount ? ROW_TO_USER(r.rows[0]) : null;
}

async function findUserByUsername(username) {
  const r = await query("SELECT * FROM users WHERE username = $1", [normalizeUsername(username)]);
  return r.rowCount ? ROW_TO_USER(r.rows[0]) : null;
}

async function findUserByIdentifier(identifier) {
  const value = String(identifier || "").trim();
  if (!value) return null;
  // Email contains "@", so try that first; then a username; phone last so a purely
  // numeric handle still matches the phone lookup when it is a real number.
  if (value.includes("@")) return findUserByEmail(value);
  const byUsername = await findUserByUsername(value);
  if (byUsername) return byUsername;
  return findUserByPhone(value);
}

async function listUsers() {
  const r = await query("SELECT * FROM users ORDER BY created_at ASC");
  return r.rows.map(ROW_TO_USER);
}

async function rateUser(id, score) {
  if (!Number.isFinite(score) || score < 0 || score > 5) return null;
  const r = await query(
    `UPDATE users SET
       rating_count = rating_count + 1,
       rating = round(((rating::float * rating_count) + $2) / (rating_count + 1), 2)
     WHERE id = $1 RETURNING *`,
    [id, score]
  );
  return r.rowCount ? ROW_TO_USER(r.rows[0]) : null;
}

async function updateUserVerified(id, verified = true) {
  const r = await query("UPDATE users SET verified = $2 WHERE id = $1 RETURNING *", [id, verified]);
  return r.rowCount ? ROW_TO_USER(r.rows[0]) : null;
}

async function setPassword(id, passwordHash) {
  await query("UPDATE users SET password_hash = $2 WHERE id = $1", [id, passwordHash]);
}

module.exports = {
  ROLES, SIGNUP_ROLES, BUYER_TYPES, MOBILE_MONEY, LANGUAGES, normalizeE164, normalizeUsername,
  createUser, getUser, findUserByPhone, findUserByEmail, findUserByUsername, findUserByIdentifier,
  listUsers, rateUser, updateUserVerified, setPassword, publicUser,
};
