const { randomUUID } = require("crypto");
const { query } = require("../db/pool");
const { cropKey, syncUserCrops } = require("./crops");

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

// Normalize a crop array into canonical lowercase keys (deduped, invalid entries
// dropped). Mirrors how crop_types ids are stored so primary/purchase crops and the
// user_croptype registry stay consistent.
function normalizeCrops(arr) {
  if (!Array.isArray(arr)) return arr;
  const seen = new Set();
  const out = [];
  for (const c of arr) {
    const key = cropKey(c);
    if (key && !seen.has(key)) {
      seen.add(key);
      out.push(key);
    }
  }
  return out;
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
  lat: r.lat === null ? null : Number(r.lat),
  lng: r.lng === null ? null : Number(r.lng),
  region: r.region || null,
  district: r.district || null,
  gpsAddress: r.gps_address || null,
  address: r.address || null,
  photoUrl: r.photo_url || null,
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
  lat, lng, region, district, gpsAddress, address,
}) {
  const id = randomUUID();
  const isBuyer = role === "buyer" || role === "market_seller";
  const finalBuyerType = isBuyer && BUYER_TYPES.includes(buyerType)
    ? buyerType
    : (isBuyer && role === "market_seller" ? "retail" : null);
  // Emails are stored lower-cased so uniqueness and lookups are consistent regardless of case.
  const normEmail = String(email || "").toLowerCase() || null;
  const normPrimary = normalizeCrops(Array.isArray(primaryCrops) ? primaryCrops : []);
  const normPurchase = normalizeCrops(Array.isArray(purchaseCrops) ? purchaseCrops : []);
  const rows = await query(
    `INSERT INTO users (
       id, name, phone, email, username, password_hash, role, location, crop_types, primary_crops,
       purchase_crops, buyer_type, mobile_money_provider, language, farm_size, community, verified,
       lat, lng, region, district, gps_address, address
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23)
     RETURNING *`,
    [
      id, name, normalizeE164(phone) || null, normEmail, normalizeUsername(username), passwordHash || null, role, location || null,
      Array.isArray(cropTypes) ? cropTypes.map((c) => cropKey(c)).filter(Boolean) : [],
      normPrimary,
      normPurchase,
      finalBuyerType,
      MOBILE_MONEY.includes(mobileMoneyProvider) ? mobileMoneyProvider : null,
      LANGUAGES.includes(language) ? language : "en",
      typeof farmSize === "number" && farmSize > 0 ? farmSize : null,
      community || null,
      !!verified,
      lat == null ? null : Number(lat),
      lng == null ? null : Number(lng),
      region || null,
      district || null,
      gpsAddress || null,
      address || null,
    ]
  );
  await syncUserCrops(id, { primaryCrops: normPrimary, purchaseCrops: normPurchase });
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

// Update onboarding/verification profile fields (does not touch credentials).
async function updateProfile(id, {
  primaryCrops, purchaseCrops, community, lat, lng, region, district, gpsAddress, address,
}) {
  const hasPrimary = Array.isArray(primaryCrops);
  const hasPurchase = Array.isArray(purchaseCrops);
  const normPrimary = normalizeCrops(primaryCrops);
  const normPurchase = normalizeCrops(purchaseCrops);
  const rows = await query(
    `UPDATE users SET
       primary_crops    = COALESCE($2, primary_crops),
       purchase_crops   = COALESCE($3, purchase_crops),
       community        = COALESCE($4, community),
       lat              = COALESCE($5, lat),
       lng              = COALESCE($6, lng),
       region           = COALESCE($7, region),
       district         = COALESCE($8, district),
       gps_address      = COALESCE($9, gps_address),
       address          = COALESCE($10, address)
     WHERE id = $1 RETURNING *`,
    [
      id,
      hasPrimary ? normPrimary : undefined,
      hasPurchase ? normPurchase : undefined,
      community || undefined,
      lat == null ? undefined : Number(lat),
      lng == null ? undefined : Number(lng),
      region || undefined,
      district || undefined,
      gpsAddress || undefined,
      address || undefined,
    ]
  );
  await syncUserCrops(id, {
    primaryCrops: hasPrimary ? normPrimary : undefined,
    purchaseCrops: hasPurchase ? normPurchase : undefined,
  });
  return rows.rowCount ? ROW_TO_USER(rows.rows[0]) : null;
}

// Update a user's own editable account + profile fields (COALESCE keeps unspecified
// columns unchanged). Does not touch credentials (see setPassword).
async function updateAccount(id, {
  name, location, language, buyerType, mobileMoneyProvider, farmSize,
  primaryCrops, purchaseCrops, community, region, district, gpsAddress, address, lat, lng,
}) {
  const hasPrimary = Array.isArray(primaryCrops);
  const hasPurchase = Array.isArray(purchaseCrops);
  const normPrimary = normalizeCrops(primaryCrops);
  const normPurchase = normalizeCrops(purchaseCrops);
  const rows = await query(
    `UPDATE users SET
       name                = COALESCE($2, name),
       location            = COALESCE($3, location),
       language            = COALESCE($4, language),
       buyer_type          = COALESCE($5, buyer_type),
       mobile_money_provider = COALESCE($6, mobile_money_provider),
       farm_size           = COALESCE($7, farm_size),
       primary_crops       = COALESCE($8, primary_crops),
       purchase_crops      = COALESCE($9, purchase_crops),
       community           = COALESCE($10, community),
       region              = COALESCE($11, region),
       district            = COALESCE($12, district),
       gps_address         = COALESCE($13, gps_address),
       address             = COALESCE($14, address),
       lat                 = COALESCE($15, lat),
       lng                 = COALESCE($16, lng)
     WHERE id = $1 RETURNING *`,
    [
      id,
      (name || "").trim() || undefined,
      (location || "").trim() || undefined,
      LANGUAGES.includes(language) ? language : undefined,
      BUYER_TYPES.includes(buyerType) ? buyerType : undefined,
      MOBILE_MONEY.includes(mobileMoneyProvider) ? mobileMoneyProvider : undefined,
      farmSize == null || farmSize === "" ? undefined : Number(farmSize),
      hasPrimary ? normPrimary : undefined,
      hasPurchase ? normPurchase : undefined,
      (community || "").trim() || undefined,
      (region || "").trim() || undefined,
      (district || "").trim() || undefined,
      (gpsAddress || "").trim() || undefined,
      (address || "").trim() || undefined,
      lat == null ? undefined : Number(lat),
      lng == null ? undefined : Number(lng),
    ]
  );
  await syncUserCrops(id, {
    primaryCrops: hasPrimary ? normPrimary : undefined,
    purchaseCrops: hasPurchase ? normPurchase : undefined,
  });
  return rows.rowCount ? ROW_TO_USER(rows.rows[0]) : null;
}

async function updatePhotoUrl(id, photoUrl) {
  const rows = await query(
    "UPDATE users SET photo_url = $2 WHERE id = $1 RETURNING *",
    [id, photoUrl == null ? null : photoUrl]
  );
  return rows.rowCount ? ROW_TO_USER(rows.rows[0]) : null;
}

module.exports = {
  ROLES, SIGNUP_ROLES, BUYER_TYPES, MOBILE_MONEY, LANGUAGES, normalizeE164, normalizeUsername,
  createUser, getUser, findUserByPhone, findUserByEmail, findUserByUsername, findUserByIdentifier,
  listUsers, rateUser, updateUserVerified, updateProfile, updateAccount, updatePhotoUrl,
  setPassword, publicUser,
};
