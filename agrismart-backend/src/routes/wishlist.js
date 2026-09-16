const express = require("express");
const wishlistRepo = require("../repositories/wishlist");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

/**
 * @openapi
 * /api/wishlist:
 *   get:
 *     tags: [Wishlist]
 *     summary: Get the current user's wishlisted listings
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Wishlisted listings
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/CartItem'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.get("/", requireAuth, async (req, res) => {
  res.json(await wishlistRepo.getWishlist(req.user.id));
});

/**
 * @openapi
 * /api/wishlist/{listingId}:
 *   put:
 *     tags: [Wishlist]
 *     summary: Add a listing to the wishlist (idempotent)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: listingId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Added
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *   delete:
 *     tags: [Wishlist]
 *     summary: Remove a listing from the wishlist
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
 */
router.put("/:listingId", requireAuth, async (req, res) => {
  const result = await wishlistRepo.addWishlist(req.user.id, req.params.listingId);
  if (result.error) return res.status(result.code).json({ error: result.error });
  res.json({ ok: true });
});

router.delete("/:listingId", requireAuth, async (req, res) => {
  await wishlistRepo.removeWishlist(req.user.id, req.params.listingId);
  res.json({ ok: true });
});

module.exports = router;
