const express = require("express");
const farmsRepo = require("../repositories/farms");
const usersRepo = require("../repositories/users");
const audit = require("../repositories/adminAudit");
const { requireAuth, requireRole } = require("../middleware/auth");

const router = express.Router();

// Normalize a free-text moderation reason (trimmed, collapse whitespace, capped).
const cleanReason = (v) => String(v || "").trim().replace(/\s+/g, " ").slice(0, 500) || null;

// Owner-or-admin guard for edit/delete: admins may manage any farm; owners must be
// verified. Returns 403 with a message, or nothing when allowed.
const canManageFarm = (farm, user) => {
  if (farm.farmerId === user.id) {
    if (!user.verified) return "verify your farmer profile before managing a farm";
    return null;
  }
  if (user.role === "admin") return null;
  return "only the farm owner can manage this farm";
};

/**
 * @openapi
 * /api/farms:
 *   post:
 *     tags: [Farms]
 *     summary: Farmer creates a farm plot (pre/post harvest) (dashboard)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [cropType]
 *             properties:
 *               name: { type: string }
 *               cropType: { type: string, example: maize }
 *               stage: { type: string, enum: [pre_harvest, post_harvest] }
 *               status: { type: string, example: growing }
 *               expectedHarvestDate: { type: string, format: date, example: 2026-09-15 }
 *               imageUrl: { type: string }
 *               location: { type: string }
 *               lat: { type: number }
 *               lng: { type: number }
 *     responses:
 *       201:
 *         description: Created
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         description: Only farmers can create farms
 */
router.post("/", requireAuth, async (req, res) => {
  const { name, cropType, stage, status, imageUrl, location, lat, lng, expectedHarvestDate, farmerId } = req.body;
  if (!cropType) return res.status(400).json({ error: "cropType is required" });
  if (req.user.role === "admin") {
    // Admins may register a farm for any farmer (they pick the owner).
    if (!farmerId || !String(farmerId).trim()) {
      return res.status(400).json({ error: "farmerId is required when an admin creates a farm" });
    }
    const owner = await usersRepo.getUser(String(farmerId).trim());
    if (!owner || owner.role !== "farmer") {
      return res.status(400).json({ error: "farmerId must reference an existing farmer" });
    }
    const farm = await farmsRepo.createFarm({
      farmerId: owner.id, name, cropType, stage, status, imageUrl,
      location: location || owner.location, lat, lng, expectedHarvestDate,
    });
    await audit.logAction({ admin: req.user, entityType: "farm", entityId: farm.id, action: "create", reason: null, after: farm });
    return res.status(201).json(farm);
  }
  if (req.user.role !== "farmer") {
    return res.status(403).json({ error: "only farmers can create farms" });
  }
  if (!req.user.verified) {
    return res.status(403).json({ error: "verify your farmer profile before creating a farm" });
  }
  const farm = await farmsRepo.createFarm({
    farmerId: req.user.id, name, cropType, stage, status, imageUrl,
    location: location || req.user.location,
    lat, lng, expectedHarvestDate,
  });
  res.status(201).json(farm);
});

/**
 * @openapi
 * /api/farms/mine:
 *   get:
 *     tags: [Farms]
 *     summary: The signed-in farmer's farms grouped by pre/post harvest (dashboard)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Farms split into preHarvest and postHarvest arrays
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.get("/mine", requireAuth, async (req, res) => {
  res.json(await farmsRepo.farmsForFarmer(req.user.id));
});

/**
 * @openapi
 * /api/farms/farmer/{farmerId}:
 *   get:
 *     tags: [Farms]
 *     summary: A farmer's farms grouped by stage (public, for dashboards)
 *     parameters:
 *       - in: path
 *         name: farmerId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Farms split into preHarvest and postHarvest arrays
 */
router.get("/farmer/:farmerId", async (req, res) => {
  res.json(await farmsRepo.farmsForFarmer(req.params.farmerId));
});

// GET /api/farms/all - every farm across all farmers incl. soft-deleted (admin).
// Registered before /:id so "all" isn't swallowed as an id.
router.get("/all", requireAuth, requireRole("admin"), async (_req, res) => {
  res.json(await farmsRepo.listAllFarms());
});

/**
 * @openapi
 * /api/farms/{id}:
 *   get:
 *     tags: [Farms]
 *     summary: Get a single farm by id (public)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: The farm
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.get("/:id", async (req, res) => {
  const farm = await farmsRepo.getFarm(req.params.id);
  if (!farm) return res.status(404).json({ error: "farm not found" });
  res.json(farm);
});

// PUT /api/farms/:id - owner edits a farm (verified farmers only); admins may edit
// any farm but must supply a reason (audited).
router.put("/:id", requireAuth, async (req, res) => {
  const { name, cropType, stage, status, imageUrl, location, lat, lng, expectedHarvestDate, reason } = req.body;
  if (stage && !farmsRepo.FARM_STAGES.includes(stage)) {
    return res.status(400).json({ error: `stage must be one of: ${farmsRepo.FARM_STAGES.join(", ")}` });
  }
  const farm = await farmsRepo.getFarm(req.params.id);
  if (!farm) return res.status(404).json({ error: "farm not found" });
  const isAdmin = req.user.role === "admin";
  if (isAdmin) {
    const why = cleanReason(reason);
    if (!why) return res.status(400).json({ error: "a reason is required when an admin edits a farm" });
    const updated = await farmsRepo.updateFarm(req.params.id, {
      name, cropType, stage, status, imageUrl, location, lat, lng, expectedHarvestDate,
    });
    await audit.logAction({ admin: req.user, entityType: "farm", entityId: farm.id, action: "edit", reason: why, before: farm, after: updated });
    return res.json(updated);
  }
  const denied = canManageFarm(farm, req.user);
  if (denied) return res.status(403).json({ error: denied });
  const updated = await farmsRepo.updateFarm(req.params.id, {
    name, cropType, stage, status, imageUrl, location, lat, lng, expectedHarvestDate,
  });
  res.json(updated);
});

// DELETE /api/farms/:id - owner soft-deletes a farm (verified farmers only); admins
// may delete any farm but must supply a reason (audited).
router.delete("/:id", requireAuth, async (req, res) => {
  const farm = await farmsRepo.getFarm(req.params.id);
  if (!farm) return res.status(404).json({ error: "farm not found" });
  const isAdmin = req.user.role === "admin";
  if (isAdmin) {
    const why = cleanReason(req.body?.reason);
    if (!why) return res.status(400).json({ error: "a reason is required when an admin deletes a farm" });
    const deleted = await farmsRepo.deleteFarm(req.params.id);
    await audit.logAction({ admin: req.user, entityType: "farm", entityId: farm.id, action: "delete", reason: why, before: farm, after: deleted });
    return res.json(deleted);
  }
  const denied = canManageFarm(farm, req.user);
  if (denied) return res.status(403).json({ error: denied });
  const deleted = await farmsRepo.deleteFarm(req.params.id);
  res.json(deleted);
});

// PATCH /api/farms/:id/restore - admin restores a soft-deleted farm
router.patch("/:id/restore", requireAuth, requireRole("admin"), async (req, res) => {
  const restored = await farmsRepo.restoreFarm(req.params.id);
  if (!restored) return res.status(404).json({ error: "farm not found or already active" });
  await audit.logAction({ admin: req.user, entityType: "farm", entityId: restored.id, action: "restore", reason: cleanReason(req.body?.reason), after: restored });
  res.json(restored);
});

module.exports = router;
