const express = require("express");
const pricesRepo = require("../repositories/prices");

const router = express.Router();

/**
 * @openapi
 * /api/prices/current:
 *   get:
 *     tags: [Prices]
 *     summary: Get the current average price for a crop (FR-2.1)
 *     parameters:
 *       - in: query
 *         name: cropType
 *         required: true
 *         schema: { type: string, example: tomato }
 *       - in: query
 *         name: market
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Current price
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PriceCurrent'
 *       400:
 *         description: cropType is required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: No price data for the given crop
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 * /api/prices/history:
 *   get:
 *     tags: [Prices]
 *     summary: Get price history for a crop (FR-2.2)
 *     parameters:
 *       - in: query
 *         name: cropType
 *         required: true
 *         schema: { type: string, example: tomato }
 *       - in: query
 *         name: market
 *         schema: { type: string }
 *       - in: query
 *         name: weeks
 *         schema: { type: number, default: 8 }
 *     responses:
 *       200:
 *         description: Array of price records
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/PriceRecord'
 *       400:
 *         description: cropType is required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// GET /api/prices/current?cropType=&market= (FR-2.1)
router.get("/current", async (req, res) => {
  const { cropType, market } = req.query;
  if (!cropType) return res.status(400).json({ error: "cropType is required" });
  const result = await pricesRepo.currentPrice({ cropType, market });
  if (!result) return res.status(404).json({ error: `no price data for ${cropType}` });
  res.json(result);
});

// GET /api/prices/history?cropType=&market=&weeks= (FR-2.2)
router.get("/history", async (req, res) => {
  const { cropType, market } = req.query;
  if (!cropType) return res.status(400).json({ error: "cropType is required" });
  const weeks = Number(req.query.weeks) || 8;
  res.json(await pricesRepo.priceHistory({ cropType, market, weeks }));
});

module.exports = router;
