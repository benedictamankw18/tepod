const express = require("express");
const auth = require("../services/auth");
const usersRepo = require("../repositories/users");
const verificationsRepo = require("../repositories/verifications");
const { geocode } = require("../services/geocode");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();
const bad = (res, msg) => res.status(400).json({ error: msg });
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// A deliverable Ghana mobile number (+233 + 9 digits); matches what the SMS
// gateway accepts. "024 123 4567" is normalized to "+233241234567" first.
const GHANA_PHONE_RE = /^\+233\d{9}$/;

// Latitude/longitude sanity check so garbage (e.g. NaN or out-of-range) never
// reaches the numeric columns. lat must be within [-90, 90], lng within [-180, 180].
function invalidCoords(lat, lng) {
  if (lat != null && (!Number.isFinite(lat) || lat < -90 || lat > 90)) return "latitude must be between -90 and 90";
  if (lng != null && (!Number.isFinite(lng) || lng < -180 || lng > 180)) return "longitude must be between -180 and 180";
  return null;
}

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
 *               email:
 *                 type: string
 *                 description: Optional recipient email; the code is also emailed when provided
 *                 example: "user@example.com"
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
  const { phone, purpose, email } = req.body;
  if (!phone) return bad(res, "phone is required");
  if (purpose !== undefined && !["login", "reset"].includes(purpose)) {
    return bad(res, "purpose must be login or reset");
  }
  if (email !== undefined && email !== "" && !EMAIL_RE.test(email)) {
    return bad(res, "email is invalid");
  }
  const result = await auth.issueOtp({ phone, purpose: purpose || "login", email: email || undefined });
  if (result.error) return res.status(404).json({ error: result.error });
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
<<<<<<< HEAD
=======
  if (req.body.acceptedTerms !== true) {
    return bad(res, "you must accept the Terms of Service and Privacy Policy to continue");
  }
>>>>>>> origin/development
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
    acceptedTerms: true,
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
<<<<<<< HEAD
  const result = await auth.googleLogin({ idToken, name, role, buyerType, acceptedTerms: req.body.acceptedTerms === true });
=======
  if (req.body.acceptedTerms !== true) {
    return bad(res, "you must accept the Terms of Service and Privacy Policy to continue");
  }
  const result = await auth.googleLogin({ idToken, name, role, buyerType, acceptedTerms: true });
>>>>>>> origin/development
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

/**
 * @openapi
 * /api/auth/verify:
 *   post:
 *     tags: [Auth]
 *     summary: Complete account verification / onboarding profile
 *     description: >
 *       Collects location details, identification type + number, and a live photo,
 *       then marks the account verified. Both buyers and farmers must be verified
 *       before they can trade: buyers before committing/purchasing, farmers before
 *       listing produce or managing farms.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [idType, idNumber, photoUrl]
 *             properties:
 *               purchaseCrops:
 *                 type: array
 *                 items: { type: string }
 *               region: { type: string }
 *               district: { type: string }
 *               gpsAddress: { type: string }
 *               address: { type: string }
 *               community: { type: string }
 *               lat: { type: number }
 *               lng: { type: number }
 *               idType:
 *                 type: string
 *                 enum: [ghana_card, voter_card, passport]
 *               idNumber: { type: string }
 *               photoUrl: { type: string }
 *     responses:
 *       200:
 *         description: Verified; returns the updated public profile
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *                 verification:
 *                   type: object
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         description: Admins do not verify their profile
 */
// POST /api/auth/verify - buyer/farmer verification / onboarding
router.post("/verify", requireAuth, async (req, res) => {
  if (req.user.role === "admin") {
    return res.status(403).json({ error: "admins do not verify their profile" });
  }
  if (!req.user.termsAcceptedAt && req.body.acceptedTerms !== true) {
<<<<<<< HEAD
=======
    return bad(res, "you must accept the Terms of Service and Privacy Policy to continue");
>>>>>>> origin/development
  }
  const { purchaseCrops, region, district, gpsAddress, address, community, lat, lng, idType, idNumber, photoUrl } = req.body;

  let resolvedLat = lat == null ? null : Number(lat);
  let resolvedLng = lng == null ? null : Number(lng);
  const geoSource = community || req.user.community || req.user.location;
  if ((resolvedLat == null || resolvedLng == null) && geoSource) {
    const g = await geocode(geoSource);
    if (g) {
      resolvedLat = resolvedLat ?? g.lat;
      resolvedLng = resolvedLng ?? g.lng;
    }
  }
  const coordErr = invalidCoords(resolvedLat, resolvedLng);
  if (coordErr) return bad(res, coordErr);

  // Record consent the first time it is given (idempotent for repeat verifications).
  if (!req.user.termsAcceptedAt) {
    await usersRepo.acceptTerms(req.user.id);
  }

  const updated = await usersRepo.updateProfile(req.user.id, {
    purchaseCrops,
    community: community || req.user.community,
    lat: resolvedLat,
    lng: resolvedLng,
    region: region || req.user.region,
    district: district || req.user.district,
    gpsAddress: gpsAddress || req.user.gpsAddress,
    address: address || req.user.address,
  });
  if (!updated) return res.status(404).json({ error: "user not found" });

  const verification = await verificationsRepo.submitVerification({
    userId: req.user.id, idType, idNumber, photoUrl, lat: resolvedLat, lng: resolvedLng,
  });
  if (verification.error) return bad(res, verification.error);

  const verifiedUser = await usersRepo.updateUserVerified(req.user.id, true);
  res.json({ user: usersRepo.publicUser(verifiedUser), verification });
});

// POST /api/auth/profile - update onboarding fields (primary/purchase crops, coords, address)
router.post("/profile", requireAuth, async (req, res) => {
  const { primaryCrops, purchaseCrops, region, district, gpsAddress, address, community, lat, lng } = req.body;

  let resolvedLat = lat == null ? null : Number(lat);
  let resolvedLng = lng == null ? null : Number(lng);
  const geoSource = community || req.user.community || req.user.location;
  if ((resolvedLat == null || resolvedLng == null) && geoSource) {
    const g = await geocode(geoSource);
    if (g) {
      resolvedLat = resolvedLat ?? g.lat;
      resolvedLng = resolvedLng ?? g.lng;
    }
  }
  const coordErr = invalidCoords(resolvedLat, resolvedLng);
  if (coordErr) return bad(res, coordErr);

  const updated = await usersRepo.updateProfile(req.user.id, {
    primaryCrops,
    purchaseCrops,
    community: community || req.user.community,
    lat: resolvedLat,
    lng: resolvedLng,
    region: region || req.user.region,
    district: district || req.user.district,
    gpsAddress: gpsAddress || req.user.gpsAddress,
    address: address || req.user.address,
  });
  if (!updated) return res.status(404).json({ error: "user not found" });
  res.json({ user: usersRepo.publicUser(updated) });
});

/**
 * @openapi
 * /api/auth/account:
 *   post:
 *     tags: [Auth]
 *     summary: Update the signed-in user's editable account + profile fields
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *               location: { type: string }
 *               language: { type: string, enum: [en, tw] }
 *               buyerType: { type: string, enum: [wholesale, retail, processor] }
 *               mobileMoneyProvider: { type: string, enum: [mtn, vodafone_cash, airteltigo] }
 *               farmSize: { type: number }
 *               primaryCrops: { type: array, items: { type: string } }
 *               purchaseCrops: { type: array, items: { type: string } }
 *               community: { type: string }
 *               region: { type: string }
 *               district: { type: string }
 *               gpsAddress: { type: string }
 *               address: { type: string }
 *               lat: { type: number }
 *               lng: { type: number }
 *               email: { type: string, nullable: true, description: "Login email; '' or null clears it. Requires currentPassword." }
 *               phone: { type: string, nullable: true, description: "Login phone (Ghana, normalized to +233…); '' or null clears it. Requires currentPassword." }
 *               currentPassword: { type: string, description: "Required when email or phone is being changed." }
 *               username: { type: string, description: "Claim a username when the account has none; once set, it cannot be changed by the user." }
 *     responses:
 *       200:
 *         description: Updated public profile
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
// POST /api/auth/account - update editable account + profile fields
router.post("/account", requireAuth, async (req, res) => {
  const {
    name, location, language, buyerType, mobileMoneyProvider, farmSize,
    primaryCrops, purchaseCrops, community, region, district, gpsAddress, address, lat, lng,
    email, phone, username, currentPassword,
  } = req.body;

  // A username can be claimed once, but only by an account that doesn't have one
  // yet. Once set it is immutable to the account holder (admin-managed afterwards).
  if (username !== undefined) {
    if (req.user.username) {
      return bad(res, "username is already set and cannot be changed");
    }
    const handle = String(username || "").trim();
    if (!/^[a-zA-Z0-9_.]{3,30}$/.test(handle)) {
      return bad(res, "username must be 3-30 characters using letters, numbers, _ or .");
    }
    const other = await usersRepo.findUserByUsername(handle);
    if (other) return res.status(409).json({ error: "a user with this username already exists" });
  }

  if (req.user.role !== "buyer" && buyerType !== undefined) {
    return bad(res, "buyerType only applies to buyer accounts");
  }

  // Changing the login contact details re-verifies the caller's identity. This is
  // skipped for ordinary profile edits that leave email/phone untouched.
  let contact = {};
  if (email !== undefined || phone !== undefined) {
    if (!req.user.passwordHash) {
      return bad(res, "this account has no password set");
    }
    if (!currentPassword) {
      return bad(res, "current password is required to change your login email or phone");
    }
    const passwordOk = await auth.comparePassword(currentPassword, req.user.passwordHash);
    if (!passwordOk) return bad(res, "current password is incorrect");

    const cleanEmail = email === undefined ? (req.user.email || null) : (String(email || "").trim().toLowerCase() || null);
    const cleanPhone = phone === undefined ? (req.user.phone || null) : (phone ? usersRepo.normalizeE164(phone) : null);

    if (cleanEmail && !EMAIL_RE.test(cleanEmail)) {
      return bad(res, "a valid email address is required");
    }
    if (cleanPhone && !GHANA_PHONE_RE.test(cleanPhone)) {
      return bad(res, "enter a valid Ghana phone number (e.g. 024 123 4567)");
    }
    // The account must keep at least one login identifier, counting the values that
    // were left untouched (an omitted field keeps its current stored value).
    if (!cleanEmail && !cleanPhone) {
      return bad(res, "keep at least a phone number or email so you can sign in");
    }

    if (cleanEmail) {
      const other = await usersRepo.findUserByEmail(cleanEmail);
      if (other && other.id !== req.user.id) {
        return res.status(409).json({ error: "a user with this email already exists" });
      }
    }
    if (cleanPhone) {
      const other = await usersRepo.findUserByPhone(cleanPhone);
      if (other && other.id !== req.user.id) {
        return res.status(409).json({ error: "a user with this phone already exists" });
      }
    }

    // Record only the fields the caller explicitly touched; untouched ones stay as-is.
    if (email !== undefined) contact.email = cleanEmail;
    if (phone !== undefined) contact.phone = cleanPhone;
  }

  let resolvedLat = lat == null ? null : Number(lat);
  let resolvedLng = lng == null ? null : Number(lng);
  const geoSource = community || req.user.community || req.user.location;
  if ((resolvedLat == null || resolvedLng == null) && geoSource) {
    const g = await geocode(geoSource);
    if (g) {
      resolvedLat = resolvedLat ?? g.lat;
      resolvedLng = resolvedLng ?? g.lng;
    }
  }

  const updated = await usersRepo.updateAccount(req.user.id, {
    name, location, language, buyerType, mobileMoneyProvider, farmSize,
    primaryCrops, purchaseCrops,
    community: community || req.user.community,
    region: region || req.user.region,
    district: district || req.user.district,
    gpsAddress: gpsAddress || req.user.gpsAddress,
    address: address || req.user.address,
    lat: resolvedLat,
    lng: resolvedLng,
    username,
    ...contact,
  });
  if (!updated) return res.status(404).json({ error: "user not found" });
  res.json({ user: usersRepo.publicUser(updated) });
});

/**
 * @openapi
 * /api/auth/photo:
 *   post:
 *     tags: [Auth]
 *     summary: Set the signed-in user's profile photo URL
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [photoUrl]
 *             properties:
 *               photoUrl: { type: string, nullable: true }
 *     responses:
 *       200:
 *         description: Updated public profile
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
// POST /api/auth/photo - set profile photo URL
router.post("/photo", requireAuth, async (req, res) => {
  const { photoUrl } = req.body;
  const updated = await usersRepo.updatePhotoUrl(req.user.id, photoUrl || null);
  if (!updated) return res.status(404).json({ error: "user not found" });
  res.json({ user: usersRepo.publicUser(updated) });
});

/**
 * @openapi
 * /api/auth/change-password:
 *   post:
 *     tags: [Auth]
 *     summary: Change the signed-in user's password after verifying the current one
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [currentPassword, newPassword]
 *             properties:
 *               currentPassword: { type: string }
 *               newPassword: { type: string, minLength: 6 }
 *     responses:
 *       200:
 *         description: Password updated
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
// POST /api/auth/change-password - verify current password, then set a new one
router.post("/change-password", requireAuth, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword) return bad(res, "current password is required");
  if (!newPassword || String(newPassword).length < 6) {
    return bad(res, "new password must be at least 6 characters");
  }
  if (!req.user.passwordHash) {
    return bad(res, "this account has no password set");
  }
  const ok = await auth.comparePassword(currentPassword, req.user.passwordHash);
  if (!ok) return bad(res, "current password is incorrect");
  const passwordHash = await auth.hashPassword(newPassword);
  await usersRepo.setPassword(req.user.id, passwordHash);
  res.json({ ok: true });
});

// POST /api/auth/payout - the farmer's own escrow payout destination: a bank account
// OR a mobile-money wallet. Saving one clears the other; any cached Paystack
// recipient is invalidated so a fresh one is built with the new details.
router.post("/payout", requireAuth, async (req, res) => {
  const { bankName, bankCode, bankAccountNumber, bankAccountName, momoProvider, momoNumber } = req.body || {};
  const wantsBank = bankCode || bankAccountNumber;
  const wantsMomo = momoProvider || momoNumber;
  if (wantsBank && wantsMomo) {
    return bad(res, "pick one payout method: bank or mobile money");
  }
  if (wantsBank && !bankAccountNumber) {
    return bad(res, "bank account number is required for a bank payout");
  }
  if (wantsMomo && !momoNumber) {
    return bad(res, "mobile money number is required for a mobile money payout");
  }
  const updated = await usersRepo.setPayoutAccount(req.user.id, {
    bankName, bankCode, bankAccountNumber, bankAccountName, momoProvider, momoNumber,
  });
  if (!updated) return res.status(404).json({ error: "user not found" });
  res.json({ user: usersRepo.publicUser(updated) });
});

module.exports = router;
