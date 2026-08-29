const express = require("express");
const farmsRepo = require("../repositories/farms");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

/**
 * @openapi
 * /api/farms:
 *   post:
 *     tags: [Farms]
 *     summary: Farmer creates a farm plot (pre/post harvest) (dashboard)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [cropType]
 *             properties:
 *               name: { type: string }
 *               cropType: { type: string, example: maize }
 *               stage: { type: string, enum: [pre_harvest, post_harvest] }
 *               status: { type: string, example: growing }
 *               expectedHarvestDate: { type: string, format: date, example: 2026-09-15 }
 *               imageUrl: { type: string }
 *               location: { type: string }
 *               lat: { type: number }
 *               lng: { type: number }
 *     responses:
 *       201:
 *         description: Created
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         description: Only farmers can create farms
 */
router.post("/", requireAuth, async (req, res) => {
  if (req.user.role !== "farmer") {
    return res.status(403).json({ error: "only farmers can create farms" });
  }
  const { name, cropType, stage, status, imageUrl, location, lat, lng, expectedHarvestDate } = req.body;
  if (!cropType) return res.status(400).json({ error: "cropType is required" });
  const farm = await farmsRepo.createFarm({
    farmerId: req.user.id, name, cropType, stage, status, imageUrl,
    location: location || req.user.location,
    lat, lng, expectedHarvestDate,
  });
  res.status(201).json(farm);
});

/**
 * @openapi
 * /api/farms/mine:
 *   get:
 *     tags: [Farms]
 *     summary: The signed-in farmer's farms grouped by pre/post harvest (dashboard)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Farms split into preHarvest and postHarvest arrays
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.get("/mine", requireAuth, async (req, res) => {
  res.json(await farmsRepo.farmsForFarmer(req.user.id));
});

/**
 * @openapi
 * /api/farms/farmer/{farmerId}:
 *   get:
 *     tags: [Farms]
 *     summary: A farmer's farms grouped by stage (public, for dashboards)
 *     parameters:
 *       - in: path
 *         name: farmerId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Farms split into preHarvest and postHarvest arrays
 */
router.get("/farmer/:farmerId", async (req, res) => {
  res.json(await farmsRepo.farmsForFarmer(req.params.farmerId));
});

/**
 * @openapi
 * /api/farms/{id}:
 *   get:
 *     tags: [Farms]
 *     summary: Get a single farm by id (public)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: The farm
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.get("/:id", async (req, res) => {
  const farm = await farmsRepo.getFarm(req.params.id);
  if (!farm) return res.status(404).json({ error: "farm not found" });
  res.json(farm);
});

module.exports = router;
