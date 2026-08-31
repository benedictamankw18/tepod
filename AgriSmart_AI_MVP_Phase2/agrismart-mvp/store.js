// store.js
// In-memory data store for the AgriSmart AI MVP.
// Mirrors the core data model from Phase 1 (Design & Planning §2.3):
// User, Listing, PreCommitment, Transaction, TransportRequest, ForecastRecommendation.
// A real build swaps this module for a Postgres/MySQL-backed data layer;
// every function signature here is what that layer needs to implement.

const { randomUUID } = require("crypto");

const db = {
  users: new Map(),
  listings: new Map(),
  preCommitments: new Map(),
  transactions: new Map(),
  transportRequests: new Map(),
  notifications: [], // SMS/USSD notification log (stub for the real SMS gateway - FR-8.1)
  prices: [], // { cropType, market, price, date } - stub for Esoko/MoFA price feed - FR-2.1/2.2
  ussdSessions: new Map(),
};

function nowIso() {
  return new Date().toISOString();
}

// ---------- Users (FR-7.x) ----------
function createUser({ name, phone, role, location, cropTypes, primaryCrops, language, farmSize, community, buyerType, purchaseCrops, mobileMoneyProvider }) {
  const id = randomUUID();
  const isBuyer = role === "buyer" || role === "market_seller";
  const user = {
    id,
    name,
    phone,
    role, // 'farmer' | 'buyer' | 'market_seller' | 'transporter' | 'admin'
    location,
    cropTypes: Array.isArray(cropTypes) ? cropTypes : [],
    // Farmer-specific fields (FR-7.1 follow-ups). All optional so the required
    // USSD registration stays at 3 steps; captured so forecasts/price alerts can
    // pre-filter to what the farmer actually grows (FR-3.1) and language works.
    primaryCrops: Array.isArray(primaryCrops) ? primaryCrops : [],
    language: ["en", "tw"].includes(language) ? language : "en", // NFR-6.2
    farmSize: typeof farmSize === "number" && farmSize > 0 ? farmSize : null, // FR-9.2 segmentation (acres)
    community: community || null, // fine-grain locality vs. town/market (FR-4.1)
    // Buyer-specific fields (FR-1.4 trust signal, FR-2.1 alerts, FR-5.3 payment).
    // buyerType is required for role='buyer' (validated in the route); it stays null for
    // everyone else. mobileMoneyProvider is a preference only - NO account numbers stored (NFR-4.3).
    buyerType: isBuyer && ["wholesale", "retail", "processor"].includes(buyerType) ? buyerType : (isBuyer && role === "market_seller" ? "retail" : null),
    purchaseCrops: Array.isArray(purchaseCrops) ? purchaseCrops : [],
    mobileMoneyProvider: ["mtn", "vodafone_cash", "airteltigo"].includes(mobileMoneyProvider) ? mobileMoneyProvider : null,
    verified: true, // MVP: phone-based verification auto-passes (FR-7.2 stub)
    rating: null,
    ratingCount: 0,
    createdAt: nowIso(),
  };
  db.users.set(id, user);
  return user;
}

function findUserByPhone(phone) {
  return [...db.users.values()].find((u) => u.phone === phone);
}

function getUser(id) {
  return db.users.get(id) || null;
}

function listUsers() {
  return [...db.users.values()];
}

function rateUser(id, score) {
  const u = db.users.get(id);
  if (!u) return null;
  const total = (u.rating || 0) * u.ratingCount + score;
  u.ratingCount += 1;
  u.rating = Number((total / u.ratingCount).toFixed(2));
  return u;
}

// ---------- Listings (FR-1.1, FR-1.2, FR-1.6) ----------
function createListing({ farmerId, cropType, quantity, unit, harvestDate, askingPrice, location }) {
  const id = randomUUID();
  const listing = {
    id,
    farmerId,
    cropType,
    quantity,
    unit: unit || "bags",
    harvestDate,
    askingPrice,
    location,
    status: "open", // open | pre_committed | sold | expired | spoiled_withdrawn
    createdAt: nowIso(),
    statusHistory: [{ status: "open", at: nowIso() }],
  };
  db.listings.set(id, listing);
  return listing;
}

function setListingStatus(id, status) {
  const l = db.listings.get(id);
  if (!l) return null;
  l.status = status;
  l.statusHistory.push({ status, at: nowIso() });
  return l;
}

function searchListings({ cropType, location, status } = {}) {
  let results = [...db.listings.values()];
  if (cropType) results = results.filter((l) => l.cropType.toLowerCase() === cropType.toLowerCase());
  if (location) results = results.filter((l) => (l.location || "").toLowerCase().includes(location.toLowerCase()));
  if (status) results = results.filter((l) => l.status === status);
  return results.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

function getListing(id) {
  return db.listings.get(id) || null;
}

// ---------- Pre-commitments (FR-1.3, FR-1.4, FR-1.5) ----------
function createPreCommitment({ listingId, buyerId, quantity, offeredPrice }) {
  const id = randomUUID();
  const pc = {
    id,
    listingId,
    buyerId,
    quantity,
    offeredPrice,
    status: "pending", // pending | accepted | rejected | countered
    counterPrice: null,
    createdAt: nowIso(),
  };
  db.preCommitments.set(id, pc);
  setListingStatus(listingId, "pre_committed");
  return pc;
}

function respondToPreCommitment(id, { action, counterPrice }) {
  const pc = db.preCommitments.get(id);
  if (!pc) return null;
  if (action === "accept") {
    pc.status = "accepted";
  } else if (action === "reject") {
    pc.status = "rejected";
    setListingStatus(pc.listingId, "open");
  } else if (action === "counter") {
    pc.status = "countered";
    pc.counterPrice = counterPrice;
  }
  return pc;
}

function preCommitmentsForListing(listingId) {
  return [...db.preCommitments.values()].filter((pc) => pc.listingId === listingId);
}

function preCommitmentsForBuyer(buyerId) {
  return [...db.preCommitments.values()].filter((pc) => pc.buyerId === buyerId);
}

function getPreCommitment(id) {
  return db.preCommitments.get(id) || null;
}

// ---------- Transactions / Payments (FR-5.1, FR-5.2, FR-5.4) ----------
function createTransaction({ listingId, buyerId, farmerId, agreedPrice, dueDate }) {
  const id = randomUUID();
  const tx = {
    id,
    listingId,
    buyerId,
    farmerId,
    agreedPrice,
    paymentStatus: "pending", // pending | paid | overdue | disputed
    dueDate,
    createdAt: nowIso(),
    paidAt: null,
  };
  db.transactions.set(id, tx);
  setListingStatus(listingId, "sold");
  return tx;
}

function markTransactionPaid(id) {
  const tx = db.transactions.get(id);
  if (!tx) return null;
  tx.paymentStatus = "paid";
  tx.paidAt = nowIso();
  return tx;
}

function markTransactionDisputed(id) {
  const tx = db.transactions.get(id);
  if (!tx) return null;
  tx.paymentStatus = "disputed";
  return tx;
}

function overdueTransactions() {
  const today = new Date();
  return [...db.transactions.values()].filter(
    (tx) => tx.paymentStatus === "pending" && new Date(tx.dueDate) < today
  );
}

function transactionsForUser(userId) {
  return [...db.transactions.values()].filter((tx) => tx.buyerId === userId || tx.farmerId === userId);
}

// Buyer payment reliability indicator (FR-5.4): % of this buyer's transactions paid on time
function buyerReliability(buyerId) {
  const txs = [...db.transactions.values()].filter((t) => t.buyerId === buyerId);
  if (txs.length === 0) return null;
  const onTime = txs.filter((t) => t.paymentStatus === "paid" && new Date(t.paidAt) <= new Date(t.dueDate)).length;
  return Number(((onTime / txs.length) * 100).toFixed(0));
}

// ---------- Transport requests (FR-4.1 - FR-4.4) ----------
function createTransportRequest({ farmerIds, pickupLocation, requestedDate }) {
  const id = randomUUID();
  const req = {
    id,
    farmerIds,
    pickupLocation,
    requestedDate,
    status: "requested", // requested | assigned | confirmed | cancelled
    transporterId: null,
    estimatedCost: null,
    createdAt: nowIso(),
  };
  db.transportRequests.set(id, req);
  return req;
}

function assignTransport(id, { transporterId, estimatedCost }) {
  const req = db.transportRequests.get(id);
  if (!req) return null;
  req.transporterId = transporterId;
  req.estimatedCost = estimatedCost;
  req.status = "assigned";
  return req;
}

function listTransportRequests(status) {
  let reqs = [...db.transportRequests.values()];
  if (status) reqs = reqs.filter((r) => r.status === status);
  return reqs;
}

// ---------- Prices (FR-2.1, FR-2.2) - seeded to simulate the Esoko/MoFA feed ----------
function seedPrices() {
  const crops = ["tomato", "maize"];
  const markets = ["Kasoa", "Ashanti Market (Domenasi)", "Ada"];
  const base = { tomato: 140, maize: 190 }; // GHS per unit (bucket / bag), illustrative
  const today = new Date();
  for (let daysAgo = 56; daysAgo >= 0; daysAgo -= 7) {
    const date = new Date(today);
    date.setDate(date.getDate() - daysAgo);
    for (const crop of crops) {
      for (const market of markets) {
        const noise = Math.round((Math.random() - 0.5) * 30);
        db.prices.push({
          cropType: crop,
          market,
          price: Math.max(50, base[crop] + noise),
          date: date.toISOString().slice(0, 10),
        });
      }
    }
  }
}

function currentPrice({ cropType, market }) {
  let rows = db.prices.filter((p) => p.cropType.toLowerCase() === cropType.toLowerCase());
  if (market) rows = rows.filter((p) => p.market.toLowerCase().includes(market.toLowerCase()));
  if (rows.length === 0) return null;
  rows.sort((a, b) => new Date(b.date) - new Date(a.date));
  const latestDate = rows[0].date;
  const latest = rows.filter((r) => r.date === latestDate);
  const avg = Math.round(latest.reduce((s, r) => s + r.price, 0) / latest.length);
  return { cropType, market: market || "all markets", date: latestDate, averagePrice: avg };
}

function priceHistory({ cropType, market, weeks = 8 }) {
  let rows = db.prices.filter((p) => p.cropType.toLowerCase() === cropType.toLowerCase());
  if (market) rows = rows.filter((p) => p.market.toLowerCase().includes(market.toLowerCase()));
  rows.sort((a, b) => new Date(a.date) - new Date(b.date));
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - weeks * 7);
  return rows.filter((r) => new Date(r.date) >= cutoff);
}

// ---------- Notifications (FR-1.4, FR-8.1) ----------
// SMS is delivered through the Agoo SMS developer REST API when AGOOSMS_API_KEY is set;
// otherwise (or on send failure) it falls back to the in-memory log only, so the app keeps
// working in dev/demo. Requests are fire-and-forget so route handlers are never blocked by
// SMS delivery - the entry is returned synchronously and delivery status is recorded async.

const AGOO_URL = "https://api.agoosms.com/v1/sms/send";
const AGOO_API_KEY = process.env.AGOOSMS_API_KEY;

// Agoo expects Ghanaian numbers in E.164 (+233...) form. Normalize common local formats,
// e.g. "024 123 4567" / "024-123-4567" / "0241234567" -> "+233241234567".
function normalizeE164(phone) {
  let digits = String(phone || "").replace(/[^\d+]/g, "");
  if (digits.startsWith("+")) return digits;
  if (digits.startsWith("0")) return "+233" + digits.slice(1);
  return digits;
}

async function sendViaAgooSms({ toPhone, message, entry }) {
  const to = normalizeE164(toPhone);
  try {
    const res = await fetch(AGOO_URL, {
      method: "POST",
      headers: { "X-API-Key": AGOO_API_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({ to, message }),
    });
    const text = await res.text();
    let body = null;
    try { body = text ? JSON.parse(text) : null; } catch (_) { body = text; }
    if (!res.ok) {
      entry.delivered = false;
      entry.error = `Agoo HTTP ${res.status}: ${text}`;
      console.error(`[AGOOSMS FAILED] to ${to}: ${text}`);
      return;
    }
    entry.delivered = true;
    entry.agooId = body && body.id ? body.id : null;
    console.log(`[AGOOSMS SENT] to ${to}: ${message}`);
  } catch (err) {
    entry.delivered = false;
    entry.error = err.message;
    console.error(`[AGOOSMS ERROR] to ${to}: ${err.message}`);
  }
}

function logNotification({ toPhone, channel, message, messageKey, language, params }) {
  // Localized templates win over an inline message when a key is provided (NFR-6.2).
  const localized = messageKey
    ? require("./messages").render({ key: messageKey, language, params })
    : null;
  const finalMessage = localized || message;
  const entry = { id: randomUUID(), toPhone, channel, message: finalMessage, sentAt: nowIso() };
  db.notifications.push(entry);
  console.log(`[LOG ${channel.toUpperCase()}] to ${toPhone}: ${finalMessage}`);
  if (channel === "sms" && AGOO_API_KEY) {
    // Fire-and-forget: record delivery status on the entry when the call resolves.
    sendViaAgooSms({ toPhone, message: finalMessage, entry });
  }
  return entry;
}

function listNotifications() {
  return [...db.notifications].reverse();
}

// ---------- USSD session state (supports NFR-1.1: stateless-friendly gateway pattern) ----------
function getSession(sessionId) {
  return db.ussdSessions.get(sessionId) || null;
}
function setSession(sessionId, data) {
  db.ussdSessions.set(sessionId, data);
}
function clearSession(sessionId) {
  db.ussdSessions.delete(sessionId);
}

module.exports = {
  createUser, findUserByPhone, getUser, listUsers, rateUser,
  createListing, setListingStatus, searchListings, getListing,
  createPreCommitment, respondToPreCommitment, preCommitmentsForListing, preCommitmentsForBuyer, getPreCommitment,
  createTransaction, markTransactionPaid, markTransactionDisputed, overdueTransactions, transactionsForUser, buyerReliability,
  createTransportRequest, assignTransport, listTransportRequests,
  seedPrices, currentPrice, priceHistory,
  logNotification, listNotifications,
  getSession, setSession, clearSession,
  _db: db, // exposed for the admin dashboard's read-only summary endpoint
};
