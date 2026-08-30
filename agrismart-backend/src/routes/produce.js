const express = require("express");
const produceRepo = require("../repositories/produce");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

/**
 * @openapi
 * /api/produce:
 *   get:
 *     tags: [Produce]
 *     summary: Buyer produce feed, ordered by purchase-crop match then nearest distance
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: nearLat
 *         schema: { type: number }
 *       - in: query
 *         name: nearLng
 *         schema: { type: number }
 *       - in: query
 *         name: cropType
 *         schema: { type: string }
 *         description: Filter the feed to one crop (e.g. 'tomato') — used for similar-produce rails
 *       - in: query
 *         name: exclude
 *         schema: { type: string, format: uuid }
 *         description: Listing id to exclude from the results (the listing currently being viewed)
 *     description: >
 *       Returns open and pre_committed listings for the signed-in buyer, with those whose
 *       crop_type matches the buyer's purchase_crops first, then by haversine distance to the
 *       buyer's (or supplied) coordinates. Optionally filtered to a single cropType and/or
 *       excluding one listing id.
 *     responses:
 *       200:
 *         description: Array of produce with distance + preference match
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.get("/", requireAuth, async (req, res) => {
  const nearLat = req.query.nearLat !== undefined ? Number(req.query.nearLat) : req.user.lat;
  const nearLng = req.query.nearLng !== undefined ? Number(req.query.nearLng) : req.user.lng;
  const feed = await produceRepo.produceFeed({
    purchaseCrops: req.user.purchaseCrops,
    nearLat,
    nearLng,
    cropType: req.query.cropType,
    excludeId: req.query.exclude,
    buyerId: req.user.id,
  });
  res.json(feed);
});

/**
 * @openapi
 * /api/produce/{id}:
 *   get:
 *     tags: [Produce]
 *     summary: Get a single open or pre_committed produce listing with full info (enriched)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: The enriched produce row
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id: { type: string }
 *                 farmerName: { type: string, nullable: true }
 *                 cropType: { type: string }
 *                 quantity: { type: number }
 *                 unit: { type: string }
 *                 harvestDate: { type: string, nullable: true }
 *                 askingPrice: { type: number }
 *                 maturity: { type: string, nullable: true }
 *                 location: { type: string, nullable: true }
 *                 imageUrl: { type: string, nullable: true }
 *                 imageUrls: { type: array, items: { type: string } }
 *                 farmId: { type: string, nullable: true, description: Farm plot this produce was grown on }
 *                 farmName: { type: string, nullable: true }
 *                 distanceKm: { type: number, nullable: true }
 *                 matchesPrefs: { type: boolean }
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.get("/:id", requireAuth, async (req, res) => {
  const nearLat = req.query.nearLat !== undefined ? Number(req.query.nearLat) : req.user.lat;
  const nearLng = req.query.nearLng !== undefined ? Number(req.query.nearLng) : req.user.lng;
  const item = await produceRepo.getProduceById(req.params.id, {
    purchaseCrops: req.user.purchaseCrops,
    nearLat,
    nearLng,
    buyerId: req.user.id,
  });
  if (!item) return res.status(404).json({ error: "produce not found" });
  res.json(item);
});

module.exports = router;
