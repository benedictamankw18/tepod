const express = require("express");
const cartRepo = require("../repositories/cart");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

const BAD = (res, msg) => res.status(400).json({ error: msg });

// Only verified buyers and market sellers can hold a cart.
function canHoldCart(user) {
  return ["buyer", "market_seller"].includes(user.role) && user.verified;
}

const GUARD_RES = 403;
const guard = (res) =>
  res.status(GUARD_RES).json({ error: "only verified buyers and market sellers can use a cart" });

/**
 * @openapi
 * /api/cart:
 *   get:
 *     tags: [Cart]
 *     summary: Get the current user's cart lines
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Cart lines, ordered by date added
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/CartItem'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *   post:
 *     tags: [Cart]
 *     summary: Add a listing to the cart (upserts its quantity)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [listingId, quantity]
 *             properties:
 *               listingId: { type: string, format: uuid }
 *               quantity: { type: number }
 *     responses:
 *       201:
 *         description: Added
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *   delete:
 *     tags: [Cart]
 *     summary: Clear the entire cart
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Cleared
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */
router.get("/", requireAuth, async (req, res) => {
  if (!canHoldCart(req.user)) return guard(res);
  res.json(await cartRepo.getCart(req.user.id));
});

router.post("/", requireAuth, async (req, res) => {
  if (!canHoldCart(req.user)) return guard(res);
  const { listingId, quantity } = req.body;
  const q = Number(quantity);
  if (!listingId) return BAD(res, "listingId is required");
  if (!Number.isFinite(q) || q <= 0) return BAD(res, "quantity must be a positive number");
  const result = await cartRepo.upsertCartItem({
    userId: req.user.id,
    listingId,
    quantity: q,
  });
  if (result.error) return res.status(result.code).json({ error: result.error });
  res.status(201).json({ ok: true });
});

router.delete("/", requireAuth, async (req, res) => {
  if (!canHoldCart(req.user)) return guard(res);
  await cartRepo.clearCart(req.user.id);
  res.json({ ok: true });
});

/**
 * @openapi
 * /api/cart/{listingId}:
 *   patch:
 *     tags: [Cart]
 *     summary: Set a cart line's quantity
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: listingId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [quantity]
 *             properties:
 *               quantity: { type: number }
 *     responses:
 *       200:
 *         $ref: '#/components/schemas/CartItem'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *   delete:
 *     tags: [Cart]
 *     summary: Remove a line from the cart
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: listingId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Removed
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */
router.patch("/:listingId", requireAuth, async (req, res) => {
  if (!canHoldCart(req.user)) return guard(res);
  const q = Number(req.body.quantity);
  if (!Number.isFinite(q) || q <= 0) return BAD(res, "quantity must be a positive number");
  const line = await cartRepo.setCartQty({
    userId: req.user.id,
    listingId: req.params.listingId,
    quantity: q,
  });
  if (!line) return res.status(404).json({ error: "cart line not found" });
  res.json({ ok: true });
});

router.delete("/:listingId", requireAuth, async (req, res) => {
  if (!canHoldCart(req.user)) return guard(res);
  await cartRepo.removeCartItem({ userId: req.user.id, listingId: req.params.listingId });
  res.json({ ok: true });
});

module.exports = router;
