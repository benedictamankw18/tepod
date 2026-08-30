const express = require("express");
const cropsRepo = require("../repositories/crops");
const { requireAuth, requireRole } = require("../middleware/auth");

const router = express.Router();

/**
 * @openapi
 * /api/units:
 *   get:
 *     tags: [Units]
 *     summary: List units of measure with display metadata (public)
 *     responses:
 *       200:
 *         description: Active units, ordered by display_order
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Unit'
 */
router.get("/", async (_req, res) => {
  res.json(await cropsRepo.listUnits());
});

// GET /api/units/all - every unit incl. inactive (admin)
router.get("/all", requireAuth, requireRole("admin"), async (_req, res) => {
  res.json(await cropsRepo.listAllUnits());
});

// POST /api/units - create a unit of measure (admin)
router.post("/", requireAuth, requireRole("admin"), async (req, res) => {
  const { name, plural, displayOrder } = req.body;
  if (!name || !String(name).trim()) {
    return res.status(400).json({ error: "name is required" });
  }
  try {
    const unit = await cropsRepo.createUnit({ name, plural, displayOrder });
    res.status(201).json(unit);
  } catch (err) {
    res.status(400).json({ error: err.message || "could not create unit" });
  }
});

// POST /api/units/import - bulk-insert units of measure from parsed CSV rows (admin).
// Rows: { name, plural?, displayOrder? }. Rows whose normalized key already exists
// are skipped. Failures are row-level.
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
    if (!cropsRepo.cropKey(name)) return failed.push({ row: i + 1, reason: `invalid unit name '${name || ""}'` });
    if (!Number.isFinite(displayOrderRaw)) return failed.push({ row: name, reason: `invalid displayOrder '${row.displayOrder}'` });
    valid.push({ name, plural: row.plural || undefined, displayOrder: displayOrderRaw });
  });

  if (valid.length === 0) return res.status(400).json({ error: "no valid rows to import" });
  const result = await cropsRepo.importUnits(valid);
  res.json({ ...result, total: rows.length, failed });
});

// PUT /api/units/:id - update a unit incl. the active toggle (admin)
router.put("/:id", requireAuth, requireRole("admin"), async (req, res) => {
  const { name, plural, displayOrder, active } = req.body;
  const updated = await cropsRepo.updateUnit(req.params.id, { name, plural, displayOrder, active });
  if (!updated) return res.status(404).json({ error: "unit not found" });
  res.json(updated);
});

// DELETE /api/units/:id - permanently remove a unit (admin)
router.delete("/:id", requireAuth, requireRole("admin"), async (req, res) => {
  const deleted = await cropsRepo.deleteUnit(req.params.id);
  if (!deleted) return res.status(404).json({ error: "unit not found" });
  res.json({ id: deleted });
});

module.exports = router;