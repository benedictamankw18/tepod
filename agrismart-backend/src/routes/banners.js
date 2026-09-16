const express = require("express");
const bannersRepo = require("../repositories/banners");
const { requireAuth, requireRole } = require("../middleware/auth");

const router = express.Router();

const BAD = (res, msg) => res.status(400).json({ error: msg });
const NOTFOUND = (res) => res.status(404).json({ error: "banner not found" });

/**
 * @openapi
 * /api/banners:
 *   get:
 *     tags: [Banners]
 *     summary: List ACTIVE banners for the storefront (public)
 *     responses:
 *       200:
 *         description: Active banners, ordered (lowest sort_order first)
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Banner'
 *   post:
 *     tags: [Banners]
 *     summary: Create a banner (admin only)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title]
 *             properties:
 *               title: { type: string }
 *               eyebrow: { type: string }
 *               subtitle: { type: string }
 *               imageUrl: { type: string }
 *               linkUrl: { type: string }
 *               sortOrder: { type: number }
 *               active: { type: boolean }
 *     responses:
 *       201:
 *         description: Created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Banner'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */
router.get("/", async (_req, res) => {
  res.json(await bannersRepo.listActiveBanners());
});

router.post("/", requireAuth, requireRole("admin"), async (req, res) => {
  if (!String(req.body.title || "").trim()) return BAD(res, "title is required");
  try {
    const banner = await bannersRepo.createBanner(req.body);
    res.status(201).json(banner);
  } catch (err) {
    if (err.status === 400) return BAD(res, err.message);
    throw err;
  }
});

/**
 * @openapi
 * /api/banners/all:
 *   get:
 *     tags: [Banners]
 *     summary: List ALL banners for administration (admin only)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: All banners
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Banner'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */
router.get("/all", requireAuth, requireRole("admin"), async (_req, res) => {
  res.json(await bannersRepo.listBanners());
});

/**
 * @openapi
 * /api/banners/{id}:
 *   put:
 *     tags: [Banners]
 *     summary: Update a banner (admin only)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title: { type: string }
 *               eyebrow: { type: string }
 *               subtitle: { type: string }
 *               imageUrl: { type: string }
 *               linkUrl: { type: string }
 *               sortOrder: { type: number }
 *               active: { type: boolean }
 *     responses:
 *       200:
 *         $ref: '#/components/schemas/Banner'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *   delete:
 *     tags: [Banners]
 *     summary: Delete a banner (admin only)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Deleted
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.put("/:id", requireAuth, requireRole("admin"), async (req, res) => {
  if (req.body.title !== undefined && !String(req.body.title).trim()) {
    return BAD(res, "title is required");
  }
  const banner = await bannersRepo.updateBanner(req.params.id, req.body);
  if (!banner) return NOTFOUND(res);
  res.json(banner);
});

router.patch("/:id/active", requireAuth, requireRole("admin"), async (req, res) => {
  const active = req.body.active === undefined ? true : Boolean(req.body.active);
  const banner = await bannersRepo.setBannerActive(req.params.id, active);
  if (!banner) return NOTFOUND(res);
  res.json(banner);
});

router.delete("/:id", requireAuth, requireRole("admin"), async (req, res) => {
  const deleted = await bannersRepo.deleteBanner(req.params.id);
  if (!deleted) return NOTFOUND(res);
  res.json({ ok: true, id: deleted });
});

module.exports = router;
