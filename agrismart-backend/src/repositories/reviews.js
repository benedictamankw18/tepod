const { randomUUID } = require("crypto");
const { query } = require("../db/pool");

const ROW_TO_REVIEW = (r) => ({
  id: r.id,
  listingId: r.listing_id,
  buyerId: r.buyer_id,
  buyerName: r.buyer_name || null,
  rating: Number(r.rating),
  comment: r.comment || null,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
  cropType: r.crop_type || null,
});

// 1–5 star review with an optional comment; one review per buyer per listing.
// Re-submitting updates the existing review instead of inserting a duplicate.
async function upsertReview({ listingId, buyerId, rating, comment }) {
  const id = randomUUID();
  const r = await query(
    `INSERT INTO reviews (id, listing_id, buyer_id, rating, comment)
     VALUES ($1,$2,$3,$4,$5)
     ON CONFLICT (listing_id, buyer_id)
     DO UPDATE SET rating = EXCLUDED.rating, comment = EXCLUDED.comment, updated_at = now()
     RETURNING *`,
    [id, listingId, buyerId, rating, comment || null]
  );
  return ROW_TO_REVIEW(r.rows[0]);
}

// Did this buyer complete a PAID transaction on this listing? Paid-only keeps
// reviews honest — a pending obligation hasn't been settled yet.
async function hasPaidPurchase(listingId, buyerId) {
  const r = await query(
    `SELECT 1 FROM transactions
     WHERE listing_id = $1 AND buyer_id = $2 AND payment_status = 'paid'`,
    [listingId, buyerId]
  );
  return r.rowCount > 0;
}

// Full review context for a listing page: aggregate rating, the review rows
// (newest first, with the buyer's name), whether the signed-in buyer may review,
// and that buyer's own review (so the form can prefill for editing).
async function serveListingReviews(listingId, { userId = null, role = null } = {}) {
  const [agg, reviews] = await Promise.all([
    query(
      `SELECT ROUND(AVG(rating)::numeric, 1) AS rating, COUNT(*) AS count
       FROM reviews WHERE listing_id = $1`,
      [listingId]
    ),
    query(
      `SELECT r.*, u.name AS buyer_name
       FROM reviews r
       JOIN users u ON u.id = r.buyer_id
       WHERE r.listing_id = $1
       ORDER BY r.created_at DESC`,
      [listingId]
    ),
  ]);

  let canReview = false;
  let myReview = null;
  if (userId && role && role !== "farmer") {
    canReview = await hasPaidPurchase(listingId, userId);
    const mine = reviews.rows.find((row) => row.buyer_id === userId);
    myReview = mine ? ROW_TO_REVIEW(mine) : null;
  }

  return {
    listingId,
    rating: agg.rows[0].rating === null ? null : Number(agg.rows[0].rating),
    reviewCount: Number(agg.rows[0].count),
    canReview,
    myReview,
    reviews: reviews.rows.map(ROW_TO_REVIEW),
  };
}

async function myReviews(buyerId) {
  const r = await query(
    `SELECT r.*, u.name AS buyer_name, l.crop_type
     FROM reviews r
     JOIN users u ON u.id = r.buyer_id
     JOIN listings l ON l.id = r.listing_id
     WHERE r.buyer_id = $1
     ORDER BY r.created_at DESC`,
    [buyerId]
  );
  return r.rows.map(ROW_TO_REVIEW);
}

// Reviews a farmer has received across all their listings (for the dashboard).
// Display is deduped per buyer — one review per buyer, the newest one — so a buyer
// who purchased through several of the farmer's listings still shows up once.
async function receivedReviews(farmerId) {
  const r = await query(
    `SELECT DISTINCT ON (r.buyer_id) r.*, u.name AS buyer_name, l.crop_type
     FROM reviews r
     JOIN users u ON u.id = r.buyer_id
     JOIN listings l ON l.id = r.listing_id
     WHERE l.farmer_id = $1
     ORDER BY r.buyer_id, r.created_at DESC`,
    [farmerId]
  );
  return r.rows.map(ROW_TO_REVIEW);
}

// Data for the star line on product cards / feeds: aggregated per listing id.
async function aggForListings(ids) {
  if (!Array.isArray(ids) || ids.length === 0) return {};
  const r = await query(
    `SELECT listing_id, ROUND(AVG(rating)::numeric, 1) AS rating, COUNT(*) AS count
     FROM reviews WHERE listing_id = ANY($1::text[]) GROUP BY listing_id`,
    [ids]
  );
  return Object.fromEntries(r.rows.map((row) => [row.listing_id, { rating: Number(row.rating), reviewCount: Number(row.count) }]));
}

module.exports = {
  upsertReview, hasPaidPurchase, serveListingReviews, myReviews, receivedReviews, aggForListings,
};