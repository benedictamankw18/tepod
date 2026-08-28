const express = require("express");
const auth = require("../services/auth");
const usersRepo = require("../repositories/users");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();
const bad = (res, msg) => res.status(400).json({ error: msg });

/**
 * @openapi
 * /api/auth/otp/issue:
 *   post:
 *     tags: [Auth]
 *     summary: Issue a one-time verification code for a phone number
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [phone]
 *             properties:
 *               phone:
 *                 type: string
 *                 example: "0241234567"
 *     responses:
 *       200:
 *         description: Code issued via SMS (or logged when no gateway is configured)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 expiresInMin:
 *                   type: number
 *                   example: 10
 *                 issued:
 *                   type: boolean
 *                   example: true
 *                 debugCode:
 *                   type: string
 *                   description: Only present in non-production without a real SMS gateway
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 */
// POST /api/auth/otp/issue - request a one-time code for a phone number
router.post("/otp/issue", async (req, res) => {
  const { phone, purpose } = req.body;
  if (!phone) return bad(res, "phone is required");
  if (purpose !== undefined && !["login", "reset"].includes(purpose)) {
    return bad(res, "purpose must be login or reset");
  }
  const result = await auth.issueOtp({ phone, purpose: purpose || "login" });
  res.json(result);
});

/**
 * @openapi
 * /api/auth/otp/verify:
 *   post:
 *     tags: [Auth]
 *     summary: Exchange a verification code for a token (auto-registers if new)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [phone, code]
 *             properties:
 *               phone:
 *                 type: string
 *                 example: "0241234567"
 *               code:
 *                 type: string
 *                 example: "123456"
 *               name:
 *                 type: string
 *                 description: Used to create the account when the phone is new
 *               role:
 *                 type: string
 *                 enum: [farmer, buyer]
 *                 description: Required only when creating a NEW account; returning users keep their stored role
 *               buyerType:
 *                 type: string
 *                 enum: [wholesale, retail, processor]
 *                 description: Required only when creating a NEW buyer account
 *               location:
 *                 type: string
 *     responses:
 *       200:
 *         description: Verified; returns an auth token (and a new account if it did not exist)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
// POST /api/auth/otp/verify - exchange a code for a token (auto-register if new)
router.post("/otp/verify", async (req, res) => {
  const { phone, code, name, role, buyerType, location } = req.body;
  if (!phone || !code) return bad(res, "phone and code are required");
  const otpRow = await auth.verifyOtp({ phone, code });
  if (!otpRow) return res.status(401).json({ error: "invalid or expired code" });
  const result = await auth.loginOrRegisterWithOtp({ phone, name, role, buyerType, location });
  if (result.error) return bad(res, result.error);
  // Consume the code only after the login/registration succeeded.
  await auth.markOtpUsed(otpRow);
  res.json({ ...result, user: usersRepo.publicUser(result.user) });
});

/**
 * @openapi
 * /api/auth/register:
 *   post:
 *     tags: [Auth]
 *     summary: Register with phone/email and password
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, password, role]
 *             properties:
 *               name:
 *                 type: string
 *               password:
 *                 type: string
 *                 format: password
 *               phone:
 *                 type: string
 *                 description: At least one of phone or email must be provided
 *               email:
 *                 type: string
 *                 format: email
 *               username:
 *                 type: string
 *                 description: Optional unique login handle; may be used together with a password to log in (phone or email is still required to register)
 *               role:
 *                 type: string
 *                 enum: [farmer, buyer]
 *               buyerType:
 *                 type: string
 *                 enum: [wholesale, retail, processor]
 *                 description: Required when role is buyer
 *               location:
 *                 type: string
 *               mobileMoneyProvider:
 *                 type: string
 *                 enum: [mtn, vodafone_cash, airteltigo]
 *                 description: Stored as a preference only
 *               purchaseCrops:
 *                 type: array
 *                 items: { type: string }
 *               primaryCrops:
 *                 type: array
 *                 items: { type: string }
 *               cropTypes:
 *                 type: array
 *                 items: { type: string }
 *               language:
 *                 type: string
 *                 enum: [en, tw]
 *               community:
 *                 type: string
 *               farmSize:
 *                 type: number
 *     responses:
 *       201:
 *         description: Created; returns an auth token and the public user profile
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       409:
 *         $ref: '#/components/responses/Conflict'
 */
// POST /api/auth/register - phone/email + password
router.post("/register", async (req, res) => {
  const { name, phone, email, username, password, role, location, buyerType, mobileMoneyProvider, purchaseCrops, primaryCrops, cropTypes, language, community, farmSize } = req.body;
  if (!name || !password) return bad(res, "name and password are required");
  if (!phone && !email) return bad(res, "phone or email is required");
  if (!usersRepo.SIGNUP_ROLES.includes(role)) {
    return bad(res, "role is required and must be farmer or buyer");
  }
  if (role === "buyer" && !usersRepo.BUYER_TYPES.includes(buyerType)) {
    return bad(res, "buyerType is required for buyers (wholesale, retail, processor)");
  }
  if (mobileMoneyProvider !== undefined && !usersRepo.MOBILE_MONEY.includes(mobileMoneyProvider)) {
    return bad(res, `mobileMoneyProvider must be one of ${usersRepo.MOBILE_MONEY.join(", ")}`);
  }
  if (username !== undefined && !/^[a-zA-Z0-9_.]{3,30}$/.test(username)) {
    return bad(res, "username must be 3-30 characters using letters, numbers, _ or .");
  }
  if (phone) {
    const existing = await usersRepo.findUserByPhone(phone);
    if (existing) return res.status(409).json({ error: "a user with this phone already exists" });
  }
  if (email) {
    const existing = await usersRepo.findUserByEmail(email);
    if (existing) return res.status(409).json({ error: "a user with this email already exists" });
  }
  if (username !== undefined) {
    const existing = await usersRepo.findUserByUsername(username);
    if (existing) return res.status(409).json({ error: "a user with this username already exists" });
  }
  const result = await auth.registerWithPassword({
    name, phone, email, username, password, role, location, buyerType, mobileMoneyProvider,
    purchaseCrops, primaryCrops, cropTypes, language, community, farmSize,
  });
  res.status(201).json({ ...result, user: usersRepo.publicUser(result.user) });
});

/**
 * @openapi
 * /api/auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Log in with phone, email, or username plus password
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [identifier, password]
 *             properties:
 *               identifier:
 *                 type: string
 *                 description: Phone number, email, or username
 *               password:
 *                 type: string
 *                 format: password
 *     responses:
 *       200:
 *         description: Successful login
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         description: Invalid credentials
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: invalid_credentials
 */
// POST /api/auth/login - phone/email/username + password
router.post("/login", async (req, res) => {
  const { identifier, password } = req.body;
  if (!identifier || !password) return bad(res, "identifier and password are required");
  const result = await auth.loginWithPassword({ identifier, password });
  if (result.error) return res.status(401).json({ error: result.error });
  res.json({ ...result, user: usersRepo.publicUser(result.user) });
});

/**
 * @openapi
 * /api/auth/password/reset:
 *   post:
 *     tags: [Auth]
 *     summary: Set a new password using a reset OTP sent to the phone
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [phone, code, password]
 *             properties:
 *               phone:
 *                 type: string
 *                 example: "0241234567"
 *               code:
 *                 type: string
 *                 example: "123456"
 *                 description: Reset OTP issued with purpose "reset"
 *               password:
 *                 type: string
 *                 format: password
 *                 minLength: 6
 *     responses:
 *       200:
 *         description: Password reset successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *                   example: true
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         description: Invalid or expired reset code
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: invalid or expired code
 */
// POST /api/auth/password/reset - set a new password via a reset OTP
router.post("/password/reset", async (req, res) => {
  const { phone, code, password } = req.body;
  if (!phone || !code || !password) return bad(res, "phone, code and password are required");
  const result = await auth.resetPassword({ phone, code, password });
  if (result.error) return res.status(401).json({ error: result.error });
  res.json(result);
});

/**
 * @openapi
 * /api/auth/google:
 *   post:
 *     tags: [Auth]
 *     summary: Sign in with a Google ID token (auto-registers on first use)
 *     description: >
 *       Verifies a Google ID token server-side against GOOGLE_CLIENT_ID.
 *       New users must provide a role (farmer or buyer); returning users need only the token.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [idToken]
 *             properties:
 *               idToken:
 *                 type: string
 *                 description: Google ID token from the client's Google Sign-In
 *               name:
 *                 type: string
 *                 description: Fallback display name when the token has none and the user is new
 *               role:
 *                 type: string
 *                 enum: [farmer, buyer]
 *                 description: Required only when creating a NEW account
 *               buyerType:
 *                 type: string
 *                 enum: [wholesale, retail, processor]
 *                 description: Required only when creating a NEW buyer account
 *     responses:
 *       200:
 *         description: Signed in; returns an auth token (and a new account if it did not exist)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         description: The ID token is invalid
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: invalid_google_token
 *       501:
 *         description: Google sign-in is not configured (missing GOOGLE_CLIENT_ID)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: google_signin_not_configured
 */
// POST /api/auth/google - Google ID token sign-in
router.post("/google", async (req, res) => {
  const { idToken, name, role, buyerType } = req.body;
  const result = await auth.googleLogin({ idToken, name, role, buyerType });
  if (result.error) {
    if (result.error === "google_signin_not_configured") {
      return res.status(501).json({ error: result.error });
    }
    if (result.error === "invalid_google_token" || result.error === "idToken is required") {
      return res.status(401).json({ error: result.error });
    }
    return bad(res, result.error);
  }
  res.json({ ...result, user: usersRepo.publicUser(result.user) });
});

/**
 * @openapi
 * /api/auth/me:
 *   get:
 *     tags: [Auth]
 *     summary: Get the currently authenticated user
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: The authenticated user's public profile
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
// GET /api/auth/me - current user from bearer token
router.get("/me", requireAuth, (req, res) => {
  res.json({ user: usersRepo.publicUser(req.user) });
});

module.exports = router;
