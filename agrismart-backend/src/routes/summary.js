const express = require("express");
const { query } = require("../db/pool");
const transactionsRepo = require("../repositories/transactions");
const { requireAuth, requireRole } = require("../middleware/auth");

const router = express.Router();

/**
 * @openapi
 * /api/summary:
 *   get:
 *     tags: [Summary]
 *     summary: Aggregate counts for the admin dashboard (FR-9.1)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Aggregate counts
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Summary'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */
// GET /api/summary - aggregate counts for the admin dashboard (FR-9.1)
router.get("/", requireAuth, requireRole("admin"), async (_req, res) => {
  const ids = ["users", "listings", "pre_commitments", "transactions", "transport_requests"];
  const counts = {};
  for (const t of ids) {
    const r = await query(`SELECT count(*) FROM ${t}`);
    counts[t] = Number(r.rows[0].count);
  }
  const open = await query("SELECT count(*) FROM listings WHERE status = 'open'");
  const overdue = (await transactionsRepo.overdueTransactions()).length;
  const notifs = await query("SELECT count(*) FROM notifications");

  res.json({
    users: counts["users"],
    listings: counts["listings"],
    openListings: Number(open.rows[0].count),
    preCommitments: counts["pre_commitments"],
    transactions: counts["transactions"],
    overduePayments: overdue,
    transportRequests: counts["transport_requests"],
    notificationsSent: Number(notifs.rows[0].count),
  });
});

module.exports = router;
