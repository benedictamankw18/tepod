const express = require("express");
const cropsRepo = require("../repositories/crops");

const router = express.Router();

/**
 * @openapi
 * /api/crops:
 *   get:
 *     tags: [Crops]
 *     summary: List canonical crop types with display + storefront-art metadata (public)
 *     responses:
 *       200:
 *         description: Active crops, ordered by display_order
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/CropType'
 */
router.get("/", async (_req, res) => {
  res.json(await cropsRepo.listCropTypes());
});

module.exports = router;