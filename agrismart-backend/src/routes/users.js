const express = require("express");
const usersRepo = require("../repositories/users");
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

// GET /api/users - list all (admin)
router.get("/", requireAuth, requireRole("admin"), async (_req, res) => {
  const users = await usersRepo.listUsers();
  res.json(users.map(usersRepo.publicUser));
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
// GET /api/users/:id - public profile (no auth needed so buyers can inspect farmers)
router.get("/:id", async (req, res) => {
  const user = await usersRepo.getUser(req.params.id);
  if (!user) return res.status(404).json({ error: "user not found" });
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
