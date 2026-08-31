const express = require("express");
const listingsRepo = require("../repositories/listings");
const farmsRepo = require("../repositories/farms");
const usersRepo = require("../repositories/users");
const audit = require("../repositories/adminAudit");
const { requireAuth, requireRole } = require("../middleware/auth");

const router = express.Router();

// Normalize a free-text moderation reason (trimmed, collapse whitespace, capped).
const cleanReason = (v) => String(v || "").trim().replace(/\s+/g, " ").slice(0, 500) || null;

// Resolves an optional farm link, ensuring the farm belongs to the given farmer.
// Returns null when no farm is supplied; throws an error sentinel otherwise via
// { error }, so callers can bail with a 400.
async function resolveFarmId(farmId, farmerId) {
  const value = typeof farmId === "string" ? farmId.trim() : "";
  if (!value) return null;
  const farm = await farmsRepo.getFarmerFarm(value, farmerId);
  return farm ? farm.id : { error: "farm does not belong to you" };
}

/**
 * @openapi
 * /api/listings:
 *   post:
 *     tags: [Listings]
 *     summary: Farmer lists produce for sale (FR-1.1)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [cropType, quantity, askingPrice]
 *             properties:
 *               cropType: { type: string, example: tomato }
 *               quantity: { type: number, minimum: 1 }
 *               unit: { type: string, example: crates }
 *               harvestDate: { type: string, format: date }
 *               askingPrice: { type: number, minimum: 0 }
 *               location: { type: string }
 *               region: { type: string }
 *               district: { type: string }
 *               gpsAddress: { type: string }
 *               details: { type: string }
 *               maturity: { type: string, example: mature }
 *               farmId: { type: string, description: Optional farm plot this produce was grown on }
 *     responses:
 *       201:
 *         description: Created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Listing'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         description: Only farmers can list produce
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *   get:
 *     tags: [Listings]
 *     summary: Search listings (public) (FR-1.2, FR-1.6)
 *     parameters:
 *       - in: query
 *         name: cropType
 *         schema: { type: string }
 *       - in: query
 *         name: location
 *         schema: { type: string }
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [open, pre_committed, sold, expired, spoiled_withdrawn] }
 *     responses:
 *       200:
 *         description: Array of listings
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Listing'
 */
// POST /api/listings - farmer lists produce (FR-1.1); admins may list for a farmer
router.post("/", requireAuth, async (req, res) => {
  const { cropType, quantity, unit, harvestDate, askingPrice, minimumPrice, location, region, district, gpsAddress, details, maturity, farmId, imageUrls, farmerId } = req.body;
  if (!cropType) return res.status(400).json({ error: "cropType is required" });
  const q = Number(quantity);
  const p = Number(askingPrice);
  if (!q || q <= 0) return res.status(400).json({ error: "quantity must be a positive number" });
  if (Number.isNaN(p) || p < 0) return res.status(400).json({ error: "askingPrice must be a valid amount" });
  if (minimumPrice != null && (Number.isNaN(Number(minimumPrice)) || Number(minimumPrice) < 0)) {
    return res.status(400).json({ error: "minimumPrice must be a valid amount" });
  }
  if (Array.isArray(imageUrls) && imageUrls.length > 5) {
    return res.status(400).json({ error: "a listing can have at most 5 images" });
  }
  if (req.user.role === "admin") {
    // Admins may list produce for any farmer (they pick the owner).
    if (!farmerId || !String(farmerId).trim()) {
      return res.status(400).json({ error: "farmerId is required when an admin creates a listing" });
    }
    const owner = await usersRepo.getUser(String(farmerId).trim());
    if (!owner || owner.role !== "farmer") {
      return res.status(400).json({ error: "farmerId must reference an existing farmer" });
    }
    // Admins may relink to any live farm; owners must pick one of their own.
    let farmCheck;
    const rawFarm = typeof farmId === "string" ? farmId.trim() : "";
    if (rawFarm) {
      const farm = await farmsRepo.getFarm(rawFarm);
      if (!farm) return res.status(400).json({ error: "farm does not exist" });
      farmCheck = farm.id;
    }
    const listing = await listingsRepo.createListing({
      farmerId: owner.id,
      cropType,
      quantity: q,
      unit,
      harvestDate,
      askingPrice: p,
      minimumPrice: minimumPrice == null ? null : Number(minimumPrice),
      location: location || owner.location,
      region: region || owner.region,
      district: district || owner.district,
      gpsAddress: gpsAddress || owner.gpsAddress,
      details,
      maturity,
      farmId: farmCheck,
      imageUrls,
    });
    await audit.logAction({ admin: req.user, entityType: "listing", entityId: listing.id, action: "create", reason: null, after: listing });
    return res.status(201).json(listing);
  }
  if (req.user.role !== "farmer") {
    return res.status(403).json({ error: "only farmers can list produce" });
  }
  if (!req.user.verified) {
    return res.status(403).json({ error: "verify your farmer profile before listing produce" });
  }
  const farmCheck = await resolveFarmId(farmId, req.user.id);
  if (farmCheck && farmCheck.error) return res.status(400).json({ error: farmCheck.error });
  const listing = await listingsRepo.createListing({
    farmerId: req.user.id,
    cropType,
    quantity: q,
    unit,
    harvestDate,
    askingPrice: p,
    minimumPrice: minimumPrice == null ? null : Number(minimumPrice),
    location: location || req.user.location,
    region: region || req.user.region,
    district: district || req.user.district,
    gpsAddress: gpsAddress || req.user.gpsAddress,
    details,
    maturity,
    farmId: farmCheck,
    imageUrls,
  });
  res.status(201).json(listing);
});

// GET /api/listings - browse/search (FR-1.2, FR-1.6)
router.get("/", async (req, res) => {
  const { cropType, location, status } = req.query;
  res.json(await listingsRepo.searchListings({ cropType, location, status }));
});

// GET /api/listings/all - every listing incl. soft-deleted ones (admin). Registered
// before /:id so "all" isn't swallowed as an id.
router.get("/all", requireAuth, requireRole("admin"), async (req, res) => {
  const { cropType, location, status, farmerId } = req.query;
  res.json(await listingsRepo.searchListings({ cropType, location, status, farmerId, includeDeleted: true }));
});

/**
 * @openapi
 * /api/listings/{id}:
 *   get:
 *     tags: [Listings]
 *     summary: Get a single listing by id (public)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: The listing
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Listing'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
// GET /api/listings/:id
router.get("/:id", async (req, res) => {
  const listing = await listingsRepo.getListing(req.params.id);
  if (!listing) return res.status(404).json({ error: "listing not found" });
  res.json(listing);
});

/**
 * @openapi
 * /api/listings/{id}/images:
 *   put:
 *     tags: [Listings]
 *     summary: Replace a listing's photo gallery (max 5). Only the owning farmer.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               imageUrls:
 *                 type: array
 *                 maxItems: 5
 *                 items: { type: string }
 *     responses:
 *       200:
 *         $ref: '#/components/schemas/Listing'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         description: Not the listing owner
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.put("/:id/images", requireAuth, async (req, res) => {
  const { imageUrls } = req.body;
  if (Array.isArray(imageUrls) && imageUrls.length > 5) {
    return res.status(400).json({ error: "a listing can have at most 5 images" });
  }
  const listing = await listingsRepo.getListing(req.params.id);
  if (!listing) return res.status(404).json({ error: "listing not found" });
  if (listing.farmerId !== req.user.id) {
    return res.status(403).json({ error: "only the listing owner can update images" });
  }
  const updated = await listingsRepo.updateListingImages(req.params.id, imageUrls);
  res.json(updated);
});

// PUT /api/listings/:id - owner edits listing fields; admins may edit any listing but
// a reason is required (audited).
router.put("/:id", requireAuth, async (req, res) => {
  const { cropType, quantity, unit, harvestDate, askingPrice, minimumPrice, location, region, district, gpsAddress, details, maturity, farmId, reason } = req.body;
  if (cropType && !String(cropType).trim()) {
    return res.status(400).json({ error: "cropType cannot be empty" });
  }
  if (quantity != null && (!Number(quantity) || Number(quantity) <= 0)) {
    return res.status(400).json({ error: "quantity must be a positive number" });
  }
  if (askingPrice != null && (Number.isNaN(Number(askingPrice)) || Number(askingPrice) < 0)) {
    return res.status(400).json({ error: "askingPrice must be a valid amount" });
  }
  if (minimumPrice != null && (Number.isNaN(Number(minimumPrice)) || Number(minimumPrice) < 0)) {
    return res.status(400).json({ error: "minimumPrice must be a valid amount" });
  }
  const listing = await listingsRepo.getListing(req.params.id);
  if (!listing) return res.status(404).json({ error: "listing not found" });
  const isAdmin = req.user.role === "admin";
  if (isAdmin) {
    const why = cleanReason(reason);
    if (!why) return res.status(400).json({ error: "a reason is required when an admin edits a listing" });
    // Admins may relink to any live farm.
    let farmCheck;
    const raw = typeof farmId === "string" ? farmId.trim() : "";
    if (raw) {
      const farm = await farmsRepo.getFarm(raw);
      if (!farm) return res.status(400).json({ error: "farm does not exist" });
      farmCheck = farm.id;
    }
    const updated = await listingsRepo.updateListing(req.params.id, {
      cropType, quantity, unit, harvestDate, askingPrice, minimumPrice: minimumPrice == null ? null : Number(minimumPrice), location, region, district, gpsAddress, details, maturity, farmId: farmCheck,
    });
    await audit.logAction({ admin: req.user, entityType: "listing", entityId: listing.id, action: "edit", reason: why, before: listing, after: updated });
    return res.json(updated);
  }
  if (listing.farmerId !== req.user.id) {
    return res.status(403).json({ error: "only the listing owner can edit this listing" });
  }
  if (!req.user.verified) {
    return res.status(403).json({ error: "verify your farmer profile before editing a listing" });
  }
  const farmCheck = await resolveFarmId(farmId, req.user.id);
  if (farmCheck && farmCheck.error) return res.status(400).json({ error: farmCheck.error });
  const updated = await listingsRepo.updateListing(req.params.id, {
    cropType, quantity, unit, harvestDate, askingPrice, minimumPrice: minimumPrice == null ? null : Number(minimumPrice), location, region, district, gpsAddress, details, maturity, farmId: farmCheck,
  });
  res.json(updated);
});

// DELETE /api/listings/:id - owner soft-deletes a listing (keeps the row + history,
// hides it from the market). Works even when the listing has offers or transactions.
// Admins may delete any listing but must supply a reason (audited).
router.delete("/:id", requireAuth, async (req, res) => {
  const listing = await listingsRepo.getListing(req.params.id);
  if (!listing) return res.status(404).json({ error: "listing not found" });
  const isAdmin = req.user.role === "admin";
  if (isAdmin) {
    const why = cleanReason(req.body?.reason);
    if (!why) return res.status(400).json({ error: "a reason is required when an admin deletes a listing" });
    const deleted = await listingsRepo.deleteListing(req.params.id);
    await audit.logAction({ admin: req.user, entityType: "listing", entityId: listing.id, action: "delete", reason: why, before: listing, after: deleted });
    return res.json(deleted);
  }
  if (listing.farmerId !== req.user.id) {
    return res.status(403).json({ error: "only the listing owner can delete this listing" });
  }
  if (!req.user.verified) {
    return res.status(403).json({ error: "verify your farmer profile before deleting a listing" });
  }
  const deleted = await listingsRepo.deleteListing(req.params.id);
  res.json(deleted);
});

// PATCH /api/listings/:id/status - owner activates/deactivates a listing; admins may
// set any status (sold, expired, deactivated, deleted, ...).
router.patch("/:id/status", requireAuth, async (req, res) => {
  const { status } = req.body;
  const allowed = req.user.role === "admin" ? listingsRepo.LISTING_STATUSES : ["open", "deactivated"];
  if (!allowed.includes(status)) {
    return res.status(400).json({ error: `status must be one of: ${allowed.join(", ")}` });
  }
  const listing = await listingsRepo.getListing(req.params.id);
  if (!listing) return res.status(404).json({ error: "listing not found" });
  if (listing.farmerId !== req.user.id && req.user.role !== "admin") {
    return res.status(403).json({ error: "only the listing owner can change this listing" });
  }
  if (listing.farmerId === req.user.id && !req.user.verified) {
    return res.status(403).json({ error: "verify your farmer profile before changing a listing" });
  }
  const updated = await listingsRepo.setListingStatus(req.params.id, status);
  res.json(updated);
});

module.exports = router;
