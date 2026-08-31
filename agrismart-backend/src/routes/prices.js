const express = require("express");
const pricesRepo = require("../repositories/prices");
const { requireAuth, requireRole } = require("../middleware/auth");

const router = express.Router();
const bad = (res, msg) => res.status(400).json({ error: msg });

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
  if (!result) return res.json({ cropType, market: market || "all markets", date: null, averagePrice: null });
  res.json(result);
});

// GET /api/prices/history?cropType=&market=&weeks= (FR-2.2)
router.get("/history", async (req, res) => {
  const { cropType, market } = req.query;
  if (!cropType) return res.status(400).json({ error: "cropType is required" });
  const weeks = Number(req.query.weeks) || 8;
  res.json(await pricesRepo.priceHistory({ cropType, market, weeks }));
});

// GET /api/prices/all - every price signal with optional crop/market filters (admin)
router.get("/all", requireAuth, requireRole("admin"), async (req, res) => {
  res.json(await pricesRepo.listPrices({ cropType: req.query.cropType, market: req.query.market }));
});

// POST /api/prices/import - bulk-upsert price signals from parsed CSV rows (admin).
// Rows: { cropType, market, price, date? }. Duplicate (crop, market, date) rows are
// skipped, so re-importing a file is safe. Row-level failures are reported, not fatal.
router.post("/import", requireAuth, requireRole("admin"), async (req, res) => {
  const rows = Array.isArray(req.body.rows) ? req.body.rows : [];
  if (rows.length === 0) return bad(res, "rows must be a non-empty array");
  if (rows.length > 1000) return bad(res, "import is limited to 1000 rows at once");

  const valid = [];
  const failed = [];
  rows.forEach((row, i) => {
    if (!row || typeof row !== "object") {
      failed.push({ row: i + 1, reason: "not an object" });
      return;
    }
    const cropType = String(row.cropType ?? "").trim().toLowerCase();
    const market = String(row.market ?? "").trim();
    const price = Number(row.price);
    let date;
    if (!cropType) return failed.push({ row: row.cropType || i + 1, reason: "cropType is required" });
    if (!market) return failed.push({ row: cropType, reason: "market is required" });
    if (!Number.isFinite(price) || price < 0) return failed.push({ row: `${cropType} → ${market}`, reason: "price must be a valid amount" });
    if (row.date === undefined || row.date === null || row.date === "") {
      date = new Date().toISOString().slice(0, 10);
    } else {
      const d = new Date(String(row.date).trim());
      if (Number.isNaN(d.getTime())) return failed.push({ row: `${cropType} → ${market}`, reason: `invalid date '${row.date}'` });
      date = d.toISOString().slice(0, 10);
    }
    valid.push({ cropType, market, price, date });
  });

  if (valid.length === 0) return bad(res, "no valid rows to import");
  const result = await pricesRepo.importPrices(valid);
  res.json({ ...result, total: rows.length, failed });
});

// POST /api/prices - record a price signal (admin)
router.post("/", requireAuth, requireRole("admin"), async (req, res) => {
  const { cropType, market, price, date } = req.body;
  const p = Number(price);
  if (!cropType || !String(cropType).trim()) return bad(res, "cropType is required");
  if (!market || !String(market).trim()) return bad(res, "market is required");
  if (Number.isNaN(p) || p < 0) return bad(res, "price must be a valid amount");
  if (date && Number.isNaN(new Date(date).getTime())) return bad(res, "date must be a valid date");
  const row = await pricesRepo.insertPrice({
    cropType: String(cropType).toLowerCase(),
    market: String(market).trim(),
    price: p,
    date: date || new Date().toISOString().slice(0, 10),
  });
  res.status(201).json(row);
});

// PUT /api/prices/:id - update a price signal (admin)
router.put("/:id", requireAuth, requireRole("admin"), async (req, res) => {
  const { cropType, market, price, date } = req.body;
  if (date && Number.isNaN(new Date(date).getTime())) return bad(res, "date must be a valid date");
  const updated = await pricesRepo.updatePrice(req.params.id, { cropType, market, price, date });
  if (!updated) return res.status(404).json({ error: "price not found" });
  res.json(updated);
});

// DELETE /api/prices/:id - remove a price signal (admin)
router.delete("/:id", requireAuth, requireRole("admin"), async (req, res) => {
  const deleted = await pricesRepo.deletePrice(req.params.id);
  if (!deleted) return res.status(404).json({ error: "price not found" });
  res.json({ id: deleted });
});

module.exports = router;
