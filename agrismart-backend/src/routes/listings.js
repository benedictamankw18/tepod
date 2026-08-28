const express = require("express");
const listingsRepo = require("../repositories/listings");
const { requireAuth, requireRole } = require("../middleware/auth");

const router = express.Router();

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
// POST /api/listings - farmer lists produce (FR-1.1)
router.post("/", requireAuth, async (req, res) => {
  const { cropType, quantity, unit, harvestDate, askingPrice, location } = req.body;
  if (!cropType) return res.status(400).json({ error: "cropType is required" });
  const q = Number(quantity);
  const p = Number(askingPrice);
  if (!q || q <= 0) return res.status(400).json({ error: "quantity must be a positive number" });
  if (!p || p < 0) return res.status(400).json({ error: "askingPrice must be a valid amount" });
  if (req.user.role !== "farmer") {
    return res.status(403).json({ error: "only farmers can list produce" });
  }
  const listing = await listingsRepo.createListing({
    farmerId: req.user.id,
    cropType,
    quantity: q,
    unit,
    harvestDate,
    askingPrice: p,
    location: location || req.user.location,
  });
  res.status(201).json(listing);
});

// GET /api/listings - browse/search (FR-1.2, FR-1.6)
router.get("/", async (req, res) => {
  const { cropType, location, status } = req.query;
  res.json(await listingsRepo.searchListings({ cropType, location, status }));
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

module.exports = router;
