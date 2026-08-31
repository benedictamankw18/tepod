const express = require("express");
const reviewsRepo = require("../repositories/reviews");
const listingsRepo = require("../repositories/listings");
const { requireAuth, optionalAuth } = require("../middleware/auth");

const router = express.Router();

const cleanComment = (v) => String(v || "").trim().replace(/\s+/g, " ").slice(0, 500) || null;

// Note: literal paths (/listing/:listingId, /mine, /received) are registered
// before any /:id catch-all so they are never swallowed.

// GET /api/reviews/listing/:listingId - public listing reviews + aggregate. With a
// valid token it also reports canReview (paid purchase) and myReview for the caller.
router.get("/listing/:listingId", optionalAuth, async (req, res) => {
  const listing = await listingsRepo.getListing(req.params.listingId);
  if (!listing) return res.status(404).json({ error: "listing not found" });
  const userId = req.user ? req.user.id : null;
  const role = req.user ? req.user.role : null;
  res.json(await reviewsRepo.serveListingReviews(listing.id, { userId, role }));
});

// GET /api/reviews/mine - the signed-in buyer's own reviews.
router.get("/mine", requireAuth, async (req, res) => {
  res.json(await reviewsRepo.myReviews(req.user.id));
});

// GET /api/reviews/received - reviews across the signed-in farmer's listings.
router.get("/received", requireAuth, async (req, res) => {
  if (req.user.role !== "farmer") return res.status(403).json({ error: "only farmers can view received reviews" });
  res.json(await reviewsRepo.receivedReviews(req.user.id));
});

// POST /api/reviews - leave (or update) a review. Buyers/market sellers who have a
// PAID transaction on the listing. One review per buyer per listing (upserts).
router.post("/", requireAuth, async (req, res) => {
  if (req.user.role === "farmer" || req.user.role === "admin") {
    return res.status(403).json({ error: "only verified buyers who purchased the product can review it" });
  }
  if (!req.user.verified) {
    return res.status(403).json({ error: "verify your profile before leaving a review" });
  }
  const { listingId, rating } = req.body;
  const score = Number(rating);
  if (!Number.isInteger(score) || score < 1 || score > 5) {
    return res.status(400).json({ error: "rating must be a whole number between 1 and 5" });
  }
  if (!listingId || !String(listingId).trim()) {
    return res.status(400).json({ error: "listingId is required" });
  }
  const listing = await listingsRepo.getListing(listingId);
  if (!listing) return res.status(404).json({ error: "listing not found" });
  const paid = await reviewsRepo.hasPaidPurchase(listing.id, req.user.id);
  if (!paid) {
    return res.status(403).json({ error: "only buyers who completed a paid purchase can review this listing" });
  }
  const comment = cleanComment(req.body.comment);
  const before = await reviewsRepo.serveListingReviews(listing.id, { userId: req.user.id, role: req.user.role });
  const review = await reviewsRepo.upsertReview({
    listingId: listing.id,
    buyerId: req.user.id,
    rating: score,
    comment,
  });
  const after = await reviewsRepo.serveListingReviews(listing.id, { userId: req.user.id, role: req.user.role });
  res.status(before.myReview ? 200 : 201).json({ review, ...after });
});

module.exports = router;