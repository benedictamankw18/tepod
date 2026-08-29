const express = require("express");
const cropsRepo = require("../repositories/crops");

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

module.exports = router;