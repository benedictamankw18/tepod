const express = require("express");
const usersRepo = require("../repositories/users");
const cropsRepo = require("../repositories/crops");
const authService = require("../services/auth");
const { requireAuth, requireRole } = require("../middleware/auth");

const router = express.Router();
const bad = (res, msg) => res.status(400).json({ error: msg });

/**
 * @openapi
 * /api/users:
 *   post:
 *     tags: [Users]
 *     summary: Create a user directly (FR-7.1)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, phone, role]
 *             properties:
 *               name: { type: string }
 *               phone: { type: string, example: "0241234567" }
 *               role:
 *                 type: string
 *                 enum: [farmer, buyer]
 *               location: { type: string }
 *               cropTypes:
 *                 type: array
 *                 items: { type: string }
 *               primaryCrops:
 *                 type: array
 *                 items: { type: string }
 *               purchaseCrops:
 *                 type: array
 *                 items: { type: string }
 *               language:
 *                 type: string
 *                 enum: [en, tw]
 *               farmSize: { type: number }
 *               community: { type: string }
 *               buyerType:
 *                 type: string
 *                 enum: [wholesale, retail, processor]
 *                 description: Required for role buyer
 *               mobileMoneyProvider:
 *                 type: string
 *                 enum: [mtn, vodafone_cash, airteltigo]
 *     responses:
 *       201:
 *         description: Created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       409:
 *         $ref: '#/components/responses/Conflict'
 *   get:
 *     tags: [Users]
 *     summary: List all users (admin only)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Array of public user profiles
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/User'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */
// POST /api/users - FR-7.1 register (also usable as a direct, pre-auth bootstrap).
// Buyer validation: buyerType required for role='buyer'.
router.post("/", async (req, res) => {
  const { name, phone, role, location, cropTypes, primaryCrops, purchaseCrops, language, farmSize, community, buyerType, mobileMoneyProvider } = req.body;

  if (!name || !phone) return bad(res, "name and phone are required");
  if (!usersRepo.SIGNUP_ROLES.includes(role)) return bad(res, `role is required and must be one of ${usersRepo.SIGNUP_ROLES.join(", ")}`);
  const existing = await usersRepo.findUserByPhone(phone);
  if (existing) return res.status(409).json({ error: "a user with this phone number already exists" });
  if (role === "buyer" && !usersRepo.BUYER_TYPES.includes(buyerType)) {
    return bad(res, "buyerType is required for buyers and must be one of wholesale, retail, processor");
  }
  if (buyerType !== undefined && role !== "buyer" && role !== "market_seller") {
    return bad(res, "buyerType is only valid for buyer/market_seller roles");
  }
  if (mobileMoneyProvider !== undefined && !usersRepo.MOBILE_MONEY.includes(mobileMoneyProvider)) {
    return bad(res, `mobileMoneyProvider must be one of ${usersRepo.MOBILE_MONEY.join(", ")}`);
  }
  if (language !== undefined && !usersRepo.LANGUAGES.includes(language)) {
    return bad(res, "language must be 'en' or 'tw'");
  }
  if (farmSize !== undefined && (typeof farmSize !== "number" || farmSize <= 0)) {
    return bad(res, "farmSize must be a positive number");
  }

  const user = await usersRepo.createUser({
    name, phone, role, location, cropTypes, primaryCrops, purchaseCrops,
    language, farmSize, community, buyerType, mobileMoneyProvider, verified: true,
  });
  res.status(201).json(usersRepo.publicUser(user));
});

// POST /api/users/create - admin creates a user of any role (with optional password,
// verified override, and an optional deactivation).
/**
 * @openapi
 * /api/users/create:
 *   post:
 *     tags: [Users]
 *     summary: Create a user as an admin (any role)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, phone, role]
 *             properties:
 *               name: { type: string }
 *               phone: { type: string, example: "0241234567" }
 *               email: { type: string, format: email }
 *               username: { type: string }
 *               password: { type: string, description: Optional; account can otherwise use OTP/Google login }
 *               role: { type: string, enum: [farmer, buyer, market_seller, transporter, admin] }
 *               verified: { type: boolean, default: true }
 *               active: { type: boolean, default: true }
 *               location: { type: string }
 *               buyerType: { type: string, enum: [wholesale, retail, processor] }
 *               language: { type: string, enum: [en, tw] }
 *               farmSize: { type: number }
 *               community: { type: string }
 *     responses:
 *       201:
 *         description: Created
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       409:
 *         $ref: '#/components/responses/Conflict'
 */
router.post("/create", requireAuth, requireRole("admin"), async (req, res) => {
  const { name, phone, email, username, password, role, verified, active, location, buyerType, mobileMoneyProvider, language, community, farmSize, primaryCrops, purchaseCrops, cropTypes } = req.body;

  if (!name || !phone) return bad(res, "name and phone are required");
  if (!usersRepo.ROLES.includes(role)) return bad(res, `role must be one of ${usersRepo.ROLES.join(", ")}`);
  const existingPhone = await usersRepo.findUserByPhone(phone);
  if (existingPhone) return res.status(409).json({ error: "a user with this phone already exists" });
  if (email) {
    const existingEmail = await usersRepo.findUserByEmail(email);
    if (existingEmail) return res.status(409).json({ error: "a user with this email already exists" });
  }
  if (username !== undefined) {
    if (!/^[a-zA-Z0-9_.]{3,30}$/.test(username)) {
      return bad(res, "username must be 3-30 characters using letters, numbers, _ or .");
    }
    const existingUsername = await usersRepo.findUserByUsername(username);
    if (existingUsername) return res.status(409).json({ error: "a user with this username already exists" });
  }
  if (role === "buyer" && !usersRepo.BUYER_TYPES.includes(buyerType)) {
    return bad(res, "buyerType is required for buyers and must be one of wholesale, retail, processor");
  }
  if (buyerType !== undefined && role !== "buyer" && role !== "market_seller") {
    return bad(res, "buyerType is only valid for buyer/market_seller roles");
  }
  if (mobileMoneyProvider !== undefined && !usersRepo.MOBILE_MONEY.includes(mobileMoneyProvider)) {
    return bad(res, `mobileMoneyProvider must be one of ${usersRepo.MOBILE_MONEY.join(", ")}`);
  }
  if (language !== undefined && !usersRepo.LANGUAGES.includes(language)) {
    return bad(res, "language must be 'en' or 'tw'");
  }
  if (farmSize !== undefined && (typeof farmSize !== "number" || farmSize <= 0)) {
    return bad(res, "farmSize must be a positive number");
  }

  const user = await authService.createUserByAdmin({
    name, phone, email, username, password, role, verified, location,
    buyerType, mobileMoneyProvider, language, community, farmSize,
    primaryCrops, purchaseCrops, cropTypes,
  });
  if (active === false) await usersRepo.setUserActive(user.id, false);
  res.status(201).json(usersRepo.publicUser(user));
});

// GET /api/users - list all (admin) with optional role/verified/search filters
router.get("/", requireAuth, requireRole("admin"), async (req, res) => {
  const users = await usersRepo.listUsers({
    role: req.query.role || undefined,
    verified: req.query.verified === undefined ? undefined : req.query.verified === "true",
    q: req.query.q ? String(req.query.q).trim() : undefined,
  });
  res.json(users.map(usersRepo.publicUser));
});

// GET /api/users/user-croptype - the normalized user_croptype registry (admin).
// Registered before /:id so "user-croptype" isn't swallowed as an id.
router.get("/user-croptype", requireAuth, requireRole("admin"), async (_req, res) => {
  res.json(await cropsRepo.listUserCropTypes());
});

// PATCH /api/users/:id/verified - admin revokes/restores a user's verified flag
router.patch("/:id/verified", requireAuth, requireRole("admin"), async (req, res) => {
  const verified = req.body && req.body.verified;
  if (typeof verified !== "boolean") return bad(res, "verified must be true or false");
  const updated = await usersRepo.updateUserVerified(req.params.id, verified);
  if (!updated) return res.status(404).json({ error: "user not found" });
  res.json(usersRepo.publicUser(updated));
});

// PATCH /api/users/:id/role - admin changes a user's role
router.patch("/:id/role", requireAuth, requireRole("admin"), async (req, res) => {
  const { role } = req.body || {};
  if (!usersRepo.ROLES.includes(role)) {
    return bad(res, `role must be one of ${usersRepo.ROLES.join(", ")}`);
  }
  const updated = await usersRepo.updateUserRole(req.params.id, role);
  if (!updated) return res.status(404).json({ error: "user not found" });
  res.json(usersRepo.publicUser(updated));
});

// PUT /api/users/:id/crops - admin assigns a user's primary/purchase crops (admin).
// Reuses updateProfile which normalizes the arrays and syncs the user_croptype registry.
router.put("/:id/crops", requireAuth, requireRole("admin"), async (req, res) => {
  const { primaryCrops, purchaseCrops } = req.body || {};
  if (!Array.isArray(primaryCrops) && !Array.isArray(purchaseCrops)) {
    return bad(res, "provide primaryCrops and/or purchaseCrops arrays");
  }
  const user = await usersRepo.getUser(req.params.id);
  if (!user) return res.status(404).json({ error: "user not found" });
  const updated = await usersRepo.updateProfile(req.params.id, { primaryCrops, purchaseCrops });
  res.json(usersRepo.publicUser(updated));
});

// PATCH /api/users/:id - admin edits a user's account fields (partial update) and
// optionally resets their password. Sub-routes above are still matched first thanks
// to their extra path segment, but /:id itself only ever has one segment.
router.patch("/:id", requireAuth, requireRole("admin"), async (req, res) => {
  const { password, ...fields } = req.body || {};
  const id = req.params.id;
  const current = await usersRepo.getUser(id);
  if (!current) return res.status(404).json({ error: "user not found" });

  if (fields.role !== undefined && !usersRepo.ROLES.includes(fields.role)) {
    return bad(res, `role must be one of ${usersRepo.ROLES.join(", ")}`);
  }
  const targetRole = fields.role ?? current.role;
  if (fields.buyerType !== undefined) {
    if (!usersRepo.BUYER_TYPES.includes(fields.buyerType)) {
      return bad(res, `buyerType must be one of ${usersRepo.BUYER_TYPES.join(", ")}`);
    }
    if (targetRole !== "buyer" && targetRole !== "market_seller") {
      return bad(res, "buyerType is only valid for buyer/market_seller roles");
    }
  }
  if (fields.username !== undefined && !/^[a-zA-Z0-9_.]{3,30}$/.test(fields.username)) {
    return bad(res, "username must be 3-30 characters using letters, numbers, _ or .");
  }
  if (fields.phone !== undefined) {
    const other = await usersRepo.findUserByPhone(fields.phone);
    if (other && other.id !== id) return res.status(409).json({ error: "a user with this phone already exists" });
  }
  if (fields.email !== undefined && fields.email !== "") {
    const other = await usersRepo.findUserByEmail(fields.email);
    if (other && other.id !== id) return res.status(409).json({ error: "a user with this email already exists" });
  }
  if (fields.username !== undefined && fields.username !== "") {
    const other = await usersRepo.findUserByUsername(fields.username);
    if (other && other.id !== id) return res.status(409).json({ error: "a user with this username already exists" });
  }
  if (fields.farmSize !== undefined && (typeof fields.farmSize !== "number" || fields.farmSize <= 0)) {
    return bad(res, "farmSize must be a positive number");
  }
  if (fields.language !== undefined && !usersRepo.LANGUAGES.includes(fields.language)) {
    return bad(res, "language must be 'en' or 'tw'");
  }

  const updated = await usersRepo.updateUserAdmin(id, fields);
  if (password !== undefined) {
    if (typeof password !== "string" || password.length === 0) return bad(res, "password must be a non-empty string");
    await usersRepo.setPassword(id, await authService.hashPassword(password));
  }
  const finalUser = await usersRepo.getUser(id);
  res.json(usersRepo.publicUser(updated && finalUser));
});

// PATCH /api/users/:id/active - admin deactivates/reactivates an account. A deactivated
// account can't log in and its existing tokens are rejected by requireAuth immediately.
router.patch("/:id/active", requireAuth, requireRole("admin"), async (req, res) => {
  const active = req.body && req.body.active;
  if (typeof active !== "boolean") return bad(res, "active must be true or false");
  if (req.params.id === req.user.id && active === false) {
    return bad(res, "cannot deactivate your own account");
  }
  const updated = await usersRepo.setUserActive(req.params.id, active);
  if (!updated) return res.status(404).json({ error: "user not found or deleted" });
  res.json(usersRepo.publicUser(updated));
});

// DELETE /api/users/:id - admin soft-deletes a user (stamps deleted_at; restorable).
router.delete("/:id", requireAuth, requireRole("admin"), async (req, res) => {
  if (req.params.id === req.user.id) return bad(res, "cannot delete your own account");
  const updated = await usersRepo.deleteUser(req.params.id);
  if (!updated) return res.status(404).json({ error: "user not found or already deleted" });
  res.json(usersRepo.publicUser(updated));
});

// PATCH /api/users/:id/restore - admin restores a soft-deleted user.
router.patch("/:id/restore", requireAuth, requireRole("admin"), async (req, res) => {
  const updated = await usersRepo.restoreUser(req.params.id);
  if (!updated) return res.status(404).json({ error: "user not found or not deleted" });
  res.json(usersRepo.publicUser(updated));
});

/**
 * @openapi
 * /api/users/{id}:
 *   get:
 *     tags: [Users]
 *     summary: Get a public user profile by id (no auth required)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *         description: User id
 *     responses:
 *       200:
 *         description: Public user profile
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
// GET /api/users/:id - public profile (no auth needed so buyers can inspect farmers).
// Soft-deleted accounts are not publicly visible.
router.get("/:id", async (req, res) => {
  const user = await usersRepo.getUser(req.params.id);
  if (!user || user.deletedAt) return res.status(404).json({ error: "user not found" });
  res.json(usersRepo.publicUser(user));
});

/**
 * @openapi
 * /api/users/{id}/rate:
 *   post:
 *     tags: [Users]
 *     summary: Rate a user (FR-7.3)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [score]
 *             properties:
 *               score:
 *                 type: number
 *                 minimum: 0
 *                 maximum: 5
 *     responses:
 *       200:
 *         description: Updated user profile with new rating
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         description: User not found or invalid score
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// POST /api/users/:id/rate - FR-7.3 rate a user (requires auth)
router.post("/:id/rate", requireAuth, async (req, res) => {
  const score = Number(req.body.score);
  const updated = await usersRepo.rateUser(req.params.id, score);
  if (!updated) return res.status(404).json({ error: "user not found or invalid score" });
  res.json(usersRepo.publicUser(updated));
});

/**
 * @openapi
 * /api/users/check-availability:
 *   post:
 *     tags: [Users]
 *     summary: Check whether a phone, email, or username is already registered (no auth)
 *     description: >
 *       Public availability check used by the sign-up form to warn a user before they
 *       submit. Pass exactly one of phone, email, or username. Matching is
 *       case-insensitive for email/username and normalized (E.164) for phone, mirroring
 *       how the register endpoint enforces uniqueness.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               phone:
 *                 type: string
 *                 example: "0241234567"
 *               email:
 *                 type: string
 *                 format: email
 *               username:
 *                 type: string
 *     responses:
 *       200:
 *         description: Availability result
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 field:
 *                   type: string
 *                   enum: [phone, email, username]
 *                 available:
 *                   type: boolean
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 */
// POST /api/users/check-availability - public pre-registration uniqueness check
router.post("/check-availability", async (req, res) => {
  const { phone, email, username } = req.body || {};
  const given = [
    [phone !== undefined && phone !== "", phone, "phone"],
    [email !== undefined && email !== "", email, "email"],
    [username !== undefined && username !== "", username, "username"],
  ].filter(([present]) => present);

  if (given.length === 0) return bad(res, "provide phone, email, or username to check");
  if (given.length > 1) return bad(res, "check only one of phone, email, or username at a time");

  const [, value, field] = given[0];
  let existing;
  if (field === "phone") existing = await usersRepo.findUserByPhone(value);
  else if (field === "email") existing = await usersRepo.findUserByEmail(value);
  else existing = await usersRepo.findUserByUsername(value);

  res.json({ field, available: !existing });
});

module.exports = router;
