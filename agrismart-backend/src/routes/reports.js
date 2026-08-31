const express = require("express");
const reportsRepo = require("../repositories/reports");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

/**
 * @openapi
 * /api/reports/my:
 *   get:
 *     tags: [Reports]
 *     summary: Sales & performance report for the signed-in user
 *     description: |
 *       Farmers see earnings (net of commission), quantity sold, top crops and buyers;
 *       buyers see spend, quantity purchased, top crops and suppliers. Amounts cover
 *       every sale regardless of payment status; the paid/unpaid split is exposed via
 *       `overview.paidAmount` / `overview.outstandingAmount` and `statuses`.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: bucket
 *         schema: { type: string, enum: [week, month, year], default: month }
 *         description: Bucket size for the trend series
 *     responses:
 *       200:
 *         description: Aggregated sales report
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 role: { type: string, enum: [farmer, buyer] }
 *                 bucket: { type: string, enum: [week, month, year] }
 *                 overview:
 *                   type: object
 *                   properties:
 *                     totalAmount: { type: number }
 *                     paidAmount: { type: number }
 *                     outstandingAmount: { type: number }
 *                     totalQuantity: { type: number }
 *                     paidQuantity: { type: number }
 *                     items: { type: number }
 *                     paidItems: { type: number }
 *                     counterparties: { type: number }
 *                     avgPrice: { type: number }
 *                     avgOrder: { type: number }
 *                 statuses:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       count: { type: number }
 *                       amount: { type: number }
 *                 topCrops:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       cropType: { type: string }
 *                       quantity: { type: number }
 *                       amount: { type: number }
 *                       sharePct: { type: number }
 *                 trend:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       label: { type: string }
 *                       amount: { type: number }
 *                       quantity: { type: number }
 *                       paidAmount: { type: number }
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.get("/my", requireAuth, async (req, res) => {
  res.json(await reportsRepo.myReport({ userId: req.user.id, role: req.user.role, bucket: req.query.bucket }));
});

module.exports = router;