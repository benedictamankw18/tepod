const express = require("express");
const regionsRepo = require("../repositories/regions");

const router = express.Router();

/**
 * @openapi
 * /api/regions:
 *   get:
 *     tags: [Regions]
 *     summary: List canonical Ghana regions with their districts (public)
 *     responses:
 *       200:
 *         description: Active regions (ordered by display_order), each with its own districts
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Region'
 */
router.get("/", async (_req, res) => {
  res.json(await regionsRepo.listRegions());
});

module.exports = router;