const express = require("express");
const { query } = require("../db/pool");

const router = express.Router();

/**
 * @openapi
 * /api/health:
 *   get:
 *     tags: [Health]
 *     summary: Liveness and database connectivity check (no auth)
 *     responses:
 *       200:
 *         description: Healthy
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Health'
 *       503:
 *         description: Database is unreachable
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string, example: degraded }
 *                 db: { type: string, example: down }
 *                 error: { type: string }
 */
// GET /api/health - liveness + database connectivity (no auth)
router.get("/", async (_req, res) => {
  try {
    await query("SELECT 1");
    res.json({ status: "ok", db: "up", time: new Date().toISOString() });
  } catch (err) {
    res.status(503).json({ status: "degraded", db: "down", error: err.message });
  }
});

module.exports = router;
