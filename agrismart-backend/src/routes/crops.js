const express = require("express");
const cropsRepo = require("../repositories/crops");
const { requireAuth, requireRole } = require("../middleware/auth");

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

// GET /api/crops/all - every crop incl. inactive (admin)
router.get("/all", requireAuth, requireRole("admin"), async (_req, res) => {
  res.json(await cropsRepo.listAllCropTypes());
});

// POST /api/crops - create a crop (admin)
router.post("/", requireAuth, requireRole("admin"), async (req, res) => {
  const { name, defaultUnit, emoji, gradientFrom, gradientTo, displayOrder } = req.body;
  if (!name || !String(name).trim()) {
    return res.status(400).json({ error: "name is required" });
  }
  try {
    const crop = await cropsRepo.createCropType({ name, defaultUnit, emoji, gradientFrom, gradientTo, displayOrder });
    res.status(201).json(crop);
  } catch (err) {
    res.status(400).json({ error: err.message || "could not create crop" });
  }
});

// POST /api/crops/import - bulk-insert crop types from parsed CSV rows (admin).
// Rows: { name, defaultUnit?, emoji?, gradientFrom?, gradientTo?, displayOrder? }.
// Rows whose normalized key already exists are skipped. Failures are row-level.
router.post("/import", requireAuth, requireRole("admin"), async (req, res) => {
  const rows = Array.isArray(req.body.rows) ? req.body.rows : [];
  if (rows.length === 0) return res.status(400).json({ error: "rows must be a non-empty array" });
  if (rows.length > 1000) return res.status(400).json({ error: "import is limited to 1000 rows at once" });

  const valid = [];
  const failed = [];
  rows.forEach((row, i) => {
    if (!row || typeof row !== "object") return failed.push({ row: i + 1, reason: "not an object" });
    const name = row.name == null ? "" : String(row.name).trim();
    const displayOrderRaw = row.displayOrder == null || row.displayOrder === "" ? 0 : Number(row.displayOrder);
    if (!cropsRepo.cropKey(name)) return failed.push({ row: i + 1, reason: `invalid crop name '${name || ""}'` });
    if (!Number.isFinite(displayOrderRaw)) return failed.push({ row: name, reason: `invalid displayOrder '${row.displayOrder}'` });
    valid.push({
      name,
      defaultUnit: row.defaultUnit == null || row.defaultUnit === "" ? undefined : String(row.defaultUnit).trim(),
      emoji: row.emoji || undefined,
      gradientFrom: row.gradientFrom || undefined,
      gradientTo: row.gradientTo || undefined,
      displayOrder: displayOrderRaw,
    });
  });

  if (valid.length === 0) return res.status(400).json({ error: "no valid rows to import" });
  const result = await cropsRepo.importCropTypes(valid);
  res.json({ ...result, total: rows.length, failed });
});

// PUT /api/crops/:id - update a crop incl. the active toggle (admin)
router.put("/:id", requireAuth, requireRole("admin"), async (req, res) => {
  const { name, defaultUnit, emoji, gradientFrom, gradientTo, displayOrder, active } = req.body;
  const updated = await cropsRepo.updateCropType(req.params.id, {
    name, defaultUnit, emoji, gradientFrom, gradientTo, displayOrder, active,
  });
  if (!updated) return res.status(404).json({ error: "crop not found" });
  res.json(updated);
});

// DELETE /api/crops/:id - permanently remove a crop (admin)
router.delete("/:id", requireAuth, requireRole("admin"), async (req, res) => {
  const deleted = await cropsRepo.deleteCropType(req.params.id);
  if (!deleted) return res.status(404).json({ error: "crop not found" });
  res.json({ id: deleted });
});

module.exports = router;