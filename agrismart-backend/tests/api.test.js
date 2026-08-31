const { applySchema, truncateAll, closeAdmin, adminPool } = require("./helpers/db");
const request = require("supertest");
const { createApp } = require("../src/app");

const app = createApp();

beforeAll(async () => {
  await applySchema();
  await truncateAll();
  // Reference tables (crop_types / unit_of_measure) are intentionally NOT truncated
  // so their migration seeds survive every run. Purge only the rows the import tests
  // create so the public registry lists stay exactly at the seeded size run-to-run.
  await adminPool.query(`DELETE FROM crop_types WHERE id = ANY($1)`, [["soybean import a", "sorghum import b", "foxtail millet"]]);
  await adminPool.query(`DELETE FROM unit_of_measure WHERE id = ANY($1)`, [["bucket", "hamper", "sack"]]);
  await adminPool.query(`DELETE FROM prices WHERE market IN ('Tema ImportX', 'Circle Ext')`);
});

afterAll(async () => {
  await closeAdmin();
});

async function register(payload) {
  const res = await request(app).post("/api/auth/register").send({ acceptedTerms: true, ...payload });
  // Every account now starts unverified. Auto-complete the verification step for
  // non-admin users so downstream tests (listings, farms, transactions, reviews)
  // exercise a verified account; the dedicated "farmers must verify" describe
  // asserts the unverified gate itself via direct requests.
  if (res.status === 201 && res.body.token && payload.role === "farmer") {
    await request(app)
      .post("/api/auth/verify")
      .set("Authorization", `Bearer ${res.body.token}`)
      .send({
        community: payload.location || undefined,
        region: payload.region,
        district: payload.district,
        gpsAddress: payload.gpsAddress || "GA-000-0000",
        idType: "ghana_card",
        idNumber: "GHA-TEST-0001",
        photoUrl: "/uploads/test.jpg",
        acceptedTerms: true,
      });
  }
  return res;
}

describe("health", () => {
  test("GET /api/health reports db up", async () => {
    const res = await request(app).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body.db).toBe("up");
  });
});

describe("authentication", () => {
  test("register farmer with password", async () => {
    const res = await register({
      name: "Ama", phone: "0245550001", role: "farmer", password: "secret123",
      location: "Kasoa", primaryCrops: ["tomato", "maize"], language: "tw",
    });
    expect(res.status).toBe(201);
    expect(res.body.token).toBeTruthy();
    expect(res.body.user.role).toBe("farmer");
    expect(res.body.user.phone).toBe("+233245550001"); // E.164 normalization
  });

  test("buyer without buyerType is rejected", async () => {
    const res = await register({
      name: "B", phone: "0245550002", role: "buyer", password: "secret123", location: "Accra",
    });
    expect(res.status).toBe(400);
  });

  test("buyer with buyerType registers with mobile money preference", async () => {
    const res = await register({
      name: "Kofi", phone: "0245550003", role: "buyer", password: "secret123",
      location: "Accra", buyerType: "wholesale", mobileMoneyProvider: "mtn",
    });
    expect(res.status).toBe(201);
    expect(res.body.user.buyerType).toBe("wholesale");
    expect(res.body.user.mobileMoneyProvider).toBe("mtn");
  });

  test("login with wrong password is rejected, correct works", async () => {
    const bad = await request(app).post("/api/auth/login").send({ identifier: "0245550001", password: "nope" });
    expect(bad.status).toBe(401);
    const ok = await request(app).post("/api/auth/login").send({ identifier: "0245550001", password: "secret123" });
    expect(ok.status).toBe(200);
    expect(ok.body.token).toBeTruthy();
  });

  test("protected route without token is 401", async () => {
    const res = await request(app).get("/api/users");
    expect(res.status).toBe(401);
  });

  test("OTP issue and verify", async () => {
    const hasGateway = !!process.env.AGOOSMS_API_KEY;
    const issue = await request(app).post("/api/auth/otp/issue").send({ phone: "0245550009" });
    expect(issue.status).toBe(200);
    // With a real SMS gateway configured the code is texted (not exposed); without one
    // it is surfaced as debugCode for local end-to-end testing.
    const code = issue.body.debugCode;
    if (!hasGateway) {
      expect(code).toMatch(/^\d{6}$/);
    }
    expect(code || "000000").toMatch(/^\d{6}$/);
    const verify = await request(app).post("/api/auth/otp/verify").send({
      phone: "0245550009",
      code: code || "000000", // real code when available; otherwise a predictable wrong code
      name: "OTP User",
      role: "farmer",
    });
    if (hasGateway) {
      // We can't know the texted code, so only confirm bad codes are rejected.
      expect(verify.status).toBe(401);
    } else {
      expect(verify.status).toBe(200);
      expect(verify.body.token).toBeTruthy();
      // The successful login should have marked the code as used (single-use).
      const reuse = await request(app).post("/api/auth/otp/verify").send({
        phone: "0245550009",
        code,
        name: "OTP User",
        role: "farmer",
      });
      expect(reuse.status).toBe(401);
    }
  });

  test("OTP issue with email also records an email notification", async () => {
    const hasGateway = !!process.env.AGOOSMS_API_KEY;
    const res = await request(app).post("/api/auth/otp/issue").send({
      phone: "0245550081",
      email: "otp@example.com",
    });
    expect(res.status).toBe(200);
    if (!hasGateway) expect(res.body.debugCode).toMatch(/^\d{6}$/);

    // Both the SMS (phone) and email notifications are logged for the same code.
    const { rows } = await adminPool.query(
      "SELECT channel, to_email FROM notifications WHERE to_phone = '+233245550081' ORDER BY sent_at"
    );
    expect(rows.map((r) => r.channel).sort()).toEqual(["email", "sms"]);
    expect(rows.find((r) => r.channel === "email").to_email).toBe("otp@example.com");
  });

  test("OTP issue with an invalid email is rejected", async () => {
    const res = await request(app).post("/api/auth/otp/issue").send({
      phone: "0245550082",
      email: "not-an-email",
    });
    expect(res.status).toBe(400);
  });
});

describe("password reset (forgot password)", () => {
  const phone = "0245550030";
  const hasGateway = !!process.env.AGOOSMS_API_KEY;

  test("issue reset OTP requires a valid purpose", async () => {
    const bad = await request(app).post("/api/auth/otp/issue").send({ phone, purpose: "nope" });
    expect(bad.status).toBe(400);
  });

  test("invalid or expired reset code is rejected", async () => {
    const res = await request(app).post("/api/auth/password/reset").send({
      phone, code: "000000", password: "newpass123",
    });
    if (hasGateway) {
      expect(res.status).toBe(401);
    } else {
      expect(res.status).toBe(401);
    }
  });

  test("reset with a real code sets a new password that works", async () => {
    // Ensure the account exists and logs in with the original password first.
    await request(app).post("/api/auth/register").send({
      name: "ResetUser", phone, role: "farmer", password: "oldpass123", location: "Accra", acceptedTerms: true,
    });
    const before = await request(app).post("/api/auth/login").send({ identifier: phone, password: "oldpass123" });
    expect(before.status).toBe(200);

    // Issue a reset-purpose code.
    const issue = await request(app).post("/api/auth/otp/issue").send({ phone, purpose: "reset" });
    expect(issue.status).toBe(200);
    const code = issue.body.debugCode;
    if (!hasGateway) expect(code).toMatch(/^\d{6}$/);

    // Reset the password.
    const reset = await request(app).post("/api/auth/password/reset").send({
      phone, code: code || "000000", password: "brandnew99",
    });
    if (hasGateway) return; // can't know the texted code
    expect(reset.status).toBe(200);
    expect(reset.body.ok).toBe(true);

    // Old password no longer works, new one does.
    const oldLogin = await request(app).post("/api/auth/login").send({ identifier: phone, password: "oldpass123" });
    expect(oldLogin.status).toBe(401);
    const newLogin = await request(app).post("/api/auth/login").send({ identifier: phone, password: "brandnew99" });
    expect(newLogin.status).toBe(200);
    expect(newLogin.body.token).toBeTruthy();

    // The reset code is now consumed (single-use).
    const reuse = await request(app).post("/api/auth/password/reset").send({
      phone, code, password: "another99",
    });
    expect(reuse.status).toBe(401);
  });

  test("a login-purpose code cannot be used to reset a password", async () => {
    // Register a distinct account for isolation.
    const phone2 = "0245550031";
    await request(app).post("/api/auth/register").send({
      name: "ResetUser2", phone: phone2, role: "farmer", password: "keepme123", location: "Kumasi", acceptedTerms: true,
    });
    const issue = await request(app).post("/api/auth/otp/issue").send({ phone: phone2 }); // purpose defaults to login
    const code = issue.body.debugCode;
    const reset = await request(app).post("/api/auth/password/reset").send({
      phone: phone2, code: code || "000000", password: "hacked123",
    });
    if (hasGateway) return;
    expect(reset.status).toBe(401);
    // Original password must still work (reset did not go through).
    const still = await request(app).post("/api/auth/login").send({ identifier: phone2, password: "keepme123" });
    expect(still.status).toBe(200);
  });

  test("reset OTP is refused when the phone has no account", async () => {
    const res = await request(app).post("/api/auth/otp/issue").send({
      phone: "0249990001", purpose: "reset",
    });
    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/no account found/i);
  });

  test("reset OTP is refused when the email has no account", async () => {
    const res = await request(app).post("/api/auth/otp/issue").send({
      phone: "0249990002", purpose: "reset", email: "nobody@example.com",
    });
    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/no account found/i);
  });

  test("login OTP still issues for a brand-new phone (auto-register unaffected)", async () => {
    const res = await request(app).post("/api/auth/otp/issue").send({ phone: "0249990003" });
    expect(res.status).toBe(200);
    if (!hasGateway) expect(res.body.debugCode).toMatch(/^\d{6}$/);
  });
});

describe("username login handle", () => {
  test("register with optional username stores it normalized and lower-cased", async () => {
    const res = await request(app).post("/api/auth/register").send({
      name: "UserHandle", phone: "0245550020", role: "farmer", password: "secret123",
      location: "Accra", username: "Farmer.Ama", acceptedTerms: true,
    });
    expect(res.status).toBe(201);
    expect(res.body.user.username).toBe("farmer.ama");
  });

  test("login works with username + password (case-insensitive)", async () => {
    const ok = await request(app).post("/api/auth/login").send({ identifier: "FARMER.AMA", password: "secret123" });
    expect(ok.status).toBe(200);
    expect(ok.body.token).toBeTruthy();
  });

  test("login still works with email + password", async () => {
    const res = await request(app).post("/api/auth/register").send({
      name: "EmailUser", email: "buyer@example.com", username: "emailbuyer", role: "buyer",
      buyerType: "retail", password: "secret123", location: "Kumasi", acceptedTerms: true,
    });
    expect(res.status).toBe(201);
    const ok = await request(app).post("/api/auth/login").send({ identifier: "buyer@example.com", password: "secret123" });
    expect(ok.status).toBe(200);
  });

  test("email uniqueness is case-insensitive (mixed-case matches existing account)", async () => {
    // Register once with a mixed-case email; Google ID tokens preserve original casing.
    const first = await register({
      name: "CaseKeep", email: "MixedUser@Example.com", phone: "0245550023", role: "farmer",
      password: "secret123", location: "Accra",
    });
    expect(first.status).toBe(201);
    // Registering the same email in a different case must match the existing account
    // (409 "email already exists"), NOT create a duplicate. This is what lets Google
    // sign-in link and log in an already-registered account instead of erroring.
    const dup = await register({
      name: "CaseKeep2", email: "mixeduser@example.com", phone: "0245550024", role: "farmer",
      password: "secret123", location: "Accra",
    });
    expect(dup.status).toBe(409);
    expect(dup.body.error).toMatch(/email already exists/);
  });

  test("multiple email-only accounts (no phone) can coexist", async () => {
    // Two accounts created WITHOUT a phone must both succeed. Before this fix they
    // both stored a shared "" placeholder on the UNIQUE phone column, so the second
    // collided with a 409 "a record with that unique value already exists" (the
    // exact failure seen when signing up a second Google account).
    const a = await register({
      name: "NoPhone1", email: "nophone1@example.com", role: "farmer", password: "secret123", location: "Accra",
    });
    expect(a.status).toBe(201);
    expect(a.body.user.phone).toBeNull();
    const b = await register({
      name: "NoPhone2", email: "nophone2@example.com", role: "farmer", password: "secret123", location: "Kumasi",
    });
    expect(b.status).toBe(201);
    expect(b.body.user.phone).toBeNull();
  });

  test("duplicate username is rejected with 409", async () => {
    const res = await request(app).post("/api/auth/register").send({
      name: "Dup", phone: "0245550021", role: "farmer", password: "secret123",
      username: "farmer.ama", location: "Accra", acceptedTerms: true,
    });
    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/username already exists/);
  });

  test("invalid username format is rejected", async () => {
    const res = await request(app).post("/api/auth/register").send({
      name: "BadUser", phone: "0245550022", role: "farmer", password: "secret123",
      username: "x!", location: "Accra", acceptedTerms: true,
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/username must be/);
  });
});

describe("check-availability", () => {
  test("requires exactly one field", async () => {
    const none = await request(app).post("/api/users/check-availability").send({});
    expect(none.status).toBe(400);
    const both = await request(app).post("/api/users/check-availability").send({ phone: "0245550040", email: "a@b.com" });
    expect(both.status).toBe(400);
  });

  test("returns available for the seeded phone and is E.164-normalized", async () => {
    const taken = await request(app).post("/api/users/check-availability").send({ phone: "0245550001" }); // registered earlier
    expect(taken.status).toBe(200);
    expect(taken.body.available).toBe(false);
    // Same number in a different non-normalized form must still match (E.164 normalization).
    const takenAlt = await request(app).post("/api/users/check-availability").send({ phone: "+233245550001" });
    expect(takenAlt.body.available).toBe(false);
    const free = await request(app).post("/api/users/check-availability").send({ phone: "0559999999" });
    expect(free.body.available).toBe(true);
  });

  test("email check is case-insensitive", async () => {
    // buyer@example.com was registered earlier; a different case must still be taken.
    const res = await request(app).post("/api/users/check-availability").send({ email: "BUYER@example.com" });
    expect(res.status).toBe(200);
    expect(res.body.field).toBe("email");
    expect(res.body.available).toBe(false);
  });

  test("username check matches the normalized (lower-cased) username", async () => {
    // farmer.ama was registered earlier via username "Farmer.Ama".
    const res = await request(app).post("/api/users/check-availability").send({ username: "FARMER.AMA" });
    expect(res.status).toBe(200);
    expect(res.body.available).toBe(false);
  });
});

describe("google sign-in", () => {
  test("unconfigured GOOGLE_CLIENT_ID returns 501 not_configured", async () => {
    const res = await request(app).post("/api/auth/google").send({ acceptedTerms: true, idToken: "whatever", role: "farmer" });
    // Absent GOOGLE_CLIENT_ID -> 501. If one is configured the outcome differs, so branch.
    if (!process.env.GOOGLE_CLIENT_ID) {
      expect(res.status).toBe(501);
      expect(res.body.error).toBe("google_signin_not_configured");
    } else {
      expect(res.status).toBe(401); // configured but the fake token is invalid
    }
  });
});

describe("terms & privacy acceptance", () => {
  test("register requires the acceptance checkbox", async () => {
    const res = await request(app).post("/api/auth/register").send({
      name: "NoConsent", phone: "0249995001", role: "farmer", password: "pw", location: "Kasoa",
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/terms/i);
  });

  test("registering with acceptance records termsAcceptedAt", async () => {
    const res = await request(app).post("/api/auth/register").send({
      acceptedTerms: true, name: "ConsentFarmer", phone: "0249995002", role: "farmer", password: "pw", location: "Kasoa",
    });
    expect(res.status).toBe(201);
    expect(res.body.user.termsAcceptedAt).toBeTruthy();
  });

  test("buyer registering with purchase crops stores and echoes them", async () => {
    const res = await request(app).post("/api/auth/register").send({
      acceptedTerms: true, name: "CropBuyer", phone: "0249995008", role: "buyer", buyerType: "retail",
      password: "pw", location: "Accra", purchaseCrops: ["maize", "tomato"],
    });
    expect(res.status).toBe(201);
    expect(res.body.user.purchaseCrops).toEqual(expect.arrayContaining(["maize", "tomato"]));
  });

  test("verify requires acceptance the first time, then records it", async () => {
    const buyer = await register({ name: "ConsentBuyer", phone: "0249995003", role: "buyer", password: "pw", location: "Accra", buyerType: "retail" });
    // Simulate an account created before consent collection (e.g. via OTP or seed).
    await adminPool.query(`UPDATE users SET terms_accepted_at = NULL WHERE id = $1`, [buyer.body.user.id]);

    const base = {
      purchaseCrops: ["tomato"], region: "Greater Accra", district: "Accra Metropolis",
      gpsAddress: "GA-123-4567", idType: "ghana_card", idNumber: "GHA-33333333-1",
      photoUrl: "/uploads/photo.jpg",
    };
    const blocked = await request(app)
      .post("/api/auth/verify").set("Authorization", `Bearer ${buyer.body.token}`).send(base);
    expect(blocked.status).toBe(400);
    expect(blocked.body.error).toMatch(/terms/i);

    const ok = await request(app)
      .post("/api/auth/verify").set("Authorization", `Bearer ${buyer.body.token}`)
      .send({ ...base, acceptedTerms: true });
    expect(ok.status).toBe(200);
    expect(ok.body.user.verified).toBe(true);
    expect(ok.body.user.termsAcceptedAt).toBeTruthy();

    // Already-accepted users can verify again without being re-asked.
    const again = await request(app)
      .post("/api/auth/verify").set("Authorization", `Bearer ${buyer.body.token}`).send(base);
    expect(again.status).toBe(200);
  });
});

describe("live location on verification", () => {
  const base = {
    purchaseCrops: ["tomato"], region: "Greater Accra", district: "Accra Metropolis",
    gpsAddress: "GA-123-4567", idType: "ghana_card", idNumber: "GHA-44444444-1",
    photoUrl: "/uploads/photo.jpg",
  };

  test("verifying with coordinates stores them on the user and the verification record", async () => {
    const buyer = await register({ name: "LocBuyer", phone: "0249995004", role: "buyer", password: "pw", location: "Accra", buyerType: "retail" });
    const verify = await request(app)
      .post("/api/auth/verify").set("Authorization", `Bearer ${buyer.body.token}`)
      .send({ ...base, lat: 5.632566, lng: -0.177944, acceptedTerms: true });
    expect(verify.status).toBe(200);
    expect(verify.body.user.lat).toBeCloseTo(5.632566, 4);
    expect(verify.body.user.lng).toBeCloseTo(-0.177944, 4);
    expect(verify.body.verification.lat).toBeCloseTo(5.632566, 4);
    expect(verify.body.verification.lng).toBeCloseTo(-0.177944, 4);
  });

  test("verifying without coordinates geocodes the address location into the snapshot", async () => {
    const buyer = await register({ name: "NoLocBuyer", phone: "0249995005", role: "buyer", password: "pw", location: "Accra", buyerType: "retail" });
    const verify = await request(app)
      .post("/api/auth/verify").set("Authorization", `Bearer ${buyer.body.token}`)
      .send({ ...base, acceptedTerms: true });
    expect(verify.status).toBe(200);
    // location "Accra" resolves via the test geocode fallback (5.6037, -0.187).
    expect(verify.body.user.lat).toBeCloseTo(5.6037, 3);
    expect(verify.body.verification.lat).toBeCloseTo(5.6037, 3);
    expect(verify.body.verification.lng).toBeCloseTo(-0.187, 3);
  });

  test("verifying with out-of-range coordinates is rejected", async () => {
    const buyer = await register({ name: "BadLocBuyer", phone: "0249995006", role: "buyer", password: "pw", location: "Accra", buyerType: "retail" });
    const verify = await request(app)
      .post("/api/auth/verify").set("Authorization", `Bearer ${buyer.body.token}`)
      .send({ ...base, lat: 95, lng: 0, acceptedTerms: true });
    expect(verify.status).toBe(400);
    expect(verify.body.error).toMatch(/latitude/);
  });

  test("profile update rejects out-of-range coordinates too", async () => {
    const buyer = await register({ name: "BadProfLoc", phone: "0249995007", role: "buyer", password: "pw", location: "Accra", buyerType: "retail" });
    const res = await request(app)
      .post("/api/auth/profile").set("Authorization", `Bearer ${buyer.body.token}`)
      .send({ lat: 0, lng: 200 });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/longitude/);
  });
});

describe("farmers must verify", () => {
  const verifyPayload = {
    community: "Kasoa", region: "Central", district: "Awutu Senya East", gpsAddress: "GA-000-0001",
    idType: "ghana_card", idNumber: "GHA-77777777-1", photoUrl: "/uploads/f.jpg", acceptedTerms: true,
  };

  test("a newly registered farmer starts unverified", async () => {
    const res = await request(app).post("/api/auth/register").send({
      acceptedTerms: true, name: "FreshFarmer", phone: "0249996001", role: "farmer", password: "pw", location: "Kasoa",
    });
    expect(res.status).toBe(201);
    expect(res.body.user.verified).toBe(false);
  });

  test("an unverified farmer cannot list produce", async () => {
    const farmer = await request(app).post("/api/auth/register").send({
      acceptedTerms: true, name: "PendingFarmer", phone: "0249996002", role: "farmer", password: "pw", location: "Kasoa",
    });
    const res = await request(app)
      .post("/api/listings").set("Authorization", `Bearer ${farmer.body.token}`)
      .send({ cropType: "tomato", quantity: 10, unit: "crates", askingPrice: 100, location: "Kasoa" });
    expect(res.status).toBe(403);
  });

  test("verifying unlocks listing produce", async () => {
    const farmer = await request(app).post("/api/auth/register").send({
      acceptedTerms: true, name: "RealFarmer", phone: "0249996003", role: "farmer", password: "pw", location: "Kasoa",
    });
    const verify = await request(app)
      .post("/api/auth/verify").set("Authorization", `Bearer ${farmer.body.token}`).send(verifyPayload);
    expect(verify.status).toBe(200);
    expect(verify.body.user.verified).toBe(true);
    expect(verify.body.user.role).toBe("farmer");
    // Live location works for farmers too.
    const withCoords = await request(app)
      .post("/api/auth/verify").set("Authorization", `Bearer ${farmer.body.token}`)
      .send({ ...verifyPayload, lat: 5.5345, lng: -0.4163 });
    expect(withCoords.status).toBe(200);
    expect(withCoords.body.verification.lat).toBeCloseTo(5.5345, 4);

    const listing = await request(app)
      .post("/api/listings").set("Authorization", `Bearer ${farmer.body.token}`)
      .send({ cropType: "tomato", quantity: 10, unit: "crates", askingPrice: 100, location: "Kasoa" });
    expect(listing.status).toBe(201);
  });
});

describe("marketplace loop", () => {
  let farmerToken, farmerId, buyerToken, listingId, pcId;

  test("full loop: listing -> precommit -> accept -> transaction -> pay", async () => {
    const farmer = await register({ name: "Yaw", phone: "0246660001", role: "farmer", password: "pw", location: "Kasoa" });
    farmerToken = farmer.body.token;
    farmerId = farmer.body.user.id;

    const buyer = await register({ name: "Esi", phone: "0246660002", role: "buyer", password: "pw", location: "Accra", buyerType: "retail" });
    buyerToken = buyer.body.token;

    // A buyer must verify their profile before they can commit.
    const verify = await request(app)
      .post("/api/auth/verify").set("Authorization", `Bearer ${buyerToken}`)
      .send({
        purchaseCrops: ["tomato", "pepper"],
        region: "Greater Accra",
        district: "Accra Metropolis",
        gpsAddress: "GA-123-4567",
        address: "12 Independence Ave",
        community: "Accra",
        idType: "ghana_card",
        idNumber: "GHA-98765432-1",
        photoUrl: "/uploads/photo.jpg",
      });
    expect(verify.status).toBe(200);
    expect(verify.body.user.verified).toBe(true);

    // farmer lists
    const listing = await request(app)
      .post("/api/listings").set("Authorization", `Bearer ${farmerToken}`)
      .send({ cropType: "tomato", quantity: 20, unit: "crates", askingPrice: 140, location: "Kasoa", region: "Central", district: "Awutu Senya East", gpsAddress: "GA-123-4567", details: "Freshly harvested organic tomatoes", maturity: "Mature / Ready" });
    expect(listing.status).toBe(201);
    expect(listing.body.region).toBe("Central");
    expect(listing.body.district).toBe("Awutu Senya East");
    expect(listing.body.gpsAddress).toBe("GA-123-4567");
    expect(listing.body.details).toBe("Freshly harvested organic tomatoes");
    expect(listing.body.maturity).toBe("Mature / Ready");
    listingId = listing.body.id;

    // buyer precommits (should notify farmer with buyer label)
    const pc = await request(app)
      .post("/api/precommitments").set("Authorization", `Bearer ${buyerToken}`)
      .send({ listingId, quantity: 10, offeredPrice: 150 });
    expect(pc.status).toBe(201);
    pcId = pc.body.id;

    // listing became pre_committed
    const l2 = await request(app).get(`/api/listings/${listingId}`);
    expect(l2.body.status).toBe("pre_committed");

    // farmer accepts -> transaction auto-created at the agreed price
    const accept = await request(app)
      .post(`/api/precommitments/${pcId}/respond`).set("Authorization", `Bearer ${farmerToken}`)
      .send({ action: "accept" });
    expect(accept.body.status).toBe("accepted");
    expect(accept.body.agreedPrice).toBe(150);
    expect(accept.body.transactionId).toBeTruthy();

    // the auto-created transaction is pending until the buyer pays
    const tx = await request(app)
      .get(`/api/transactions/${accept.body.transactionId}`).set("Authorization", `Bearer ${buyerToken}`);
    expect(tx.status).toBe(200);
    expect(tx.body.paymentStatus).toBe("pending");
    expect(tx.body.agreedPrice).toBe(1500);
    expect(tx.body.listingId).toBe(listingId);

    // buyer marks paid
    const paid = await request(app)
      .post(`/api/transactions/${tx.body.id}/pay`).set("Authorization", `Bearer ${buyerToken}`);
    expect(paid.body.paymentStatus).toBe("paid");

    // buyer transaction list confirms the record
    const buyerTxs = await request(app)
      .get(`/api/transactions/user/${buyer.body.user.id}`).set("Authorization", `Bearer ${buyerToken}`);
    expect(buyerTxs.status).toBe(200);
    expect(buyerTxs.body).toBeInstanceOf(Array);
  });

  test("non-farmer cannot list produce", async () => {
    const buyer = await register({ name: "L", phone: "0246660003", role: "buyer", password: "pw", location: "Accra", buyerType: "processor" });
    const res = await request(app)
      .post("/api/listings").set("Authorization", `Bearer ${buyer.body.token}`)
      .send({ cropType: "maize", quantity: 5, askingPrice: 100 });
    expect(res.status).toBe(403);
  });
});

describe("prices", () => {
  test("current price returns structured data or 404 for unknown crop", async () => {
    const res = await request(app).get("/api/prices/current?cropType=tomato");
    // The route returns 200 with an explicit null averagePrice when no data yet,
    // or 200 with a positive average once price rows exist. Both are valid.
    expect(res.status).toBe(200);
    expect(res.body.cropType).toBe("tomato");
    if (res.body.averagePrice !== null && typeof res.body.averagePrice !== "undefined") {
      expect(res.body.averagePrice).toBeGreaterThan(0);
    }
  });
});

describe("body-less requests (regression)", () => {
  test("POST /api/auth/otp/issue with no body returns 400, not 500", async () => {
    const res = await request(app).post("/api/auth/otp/issue");
    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  test("POST /api/listings with no body returns 400 (guarded by auth/body normalization), not 500", async () => {
    const farmer = await register({ name: "NB", phone: "0247770001", role: "farmer", password: "pw", location: "Kumasi" });
    const res = await request(app)
      .post("/api/listings").set("Authorization", `Bearer ${farmer.body.token}`);
    expect(res.status).toBe(400);
  });

  test("POST /api/auth/register with no body returns 400, not 500", async () => {
    const res = await request(app).post("/api/auth/register");
    expect(res.status).toBe(400);
  });
});

describe("signup role is required (no default role)", () => {
  test("register without role is rejected", async () => {
    const res = await register({ name: "NoRole", phone: "0248880001", password: "pw", location: "Accra" });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/role is required/);
  });

  test("register with non-farmer/buyer role is rejected", async () => {
    const res = await register({ name: "BadRole", phone: "0248880002", role: "transporter", password: "pw" });
    expect(res.status).toBe(400);
  });

  test("register with buyer role requires buyerType", async () => {
    const res = await register({ name: "BuyerNoType", phone: "0248880003", role: "buyer", password: "pw" });
    expect(res.status).toBe(400);
  });

  test("POST /api/users rejects non-farmer/buyer role", async () => {
    const res = await request(app)
      .post("/api/users")
      .send({ name: "DirectBad", phone: "0248880004", role: "admin", location: "Accra" });
    expect(res.status).toBe(400);
  });

  test("register with farmer role succeeds", async () => {
    const res = await register({ name: "OkFarmer", phone: "0248880005", role: "farmer", password: "pw", location: "Kumasi" });
    expect(res.status).toBe(201);
    expect(res.body.user.role).toBe("farmer");
  });

  test("OTP verify requires a role for a NEW account (when no gateway exposes the code)", async () => {
    if (!!process.env.AGOOSMS_API_KEY) return; // code is texted, not exposed
    const phone = "0248880101";
    const issue = await request(app).post("/api/auth/otp/issue").send({ phone });
    const code = issue.body.debugCode;
    // New account without role -> 400, not a default 'farmer'.
    const noRole = await request(app).post("/api/auth/otp/verify").send({ phone, code, name: "New NoRole" });
    expect(noRole.status).toBe(400);
    expect(noRole.body.error).toMatch(/role is required/);
    // New account with role buyer + buyerType -> success.
    const withRole = await request(app).post("/api/auth/otp/verify").send({ phone, code, name: "New Buyer", role: "buyer", buyerType: "retail" });
    expect(withRole.status).toBe(200);
    expect(withRole.body.user.role).toBe("buyer");
    expect(withRole.body.user.buyerType).toBe("retail");
    // Returning user can log in with just phone + code (no role needed).
    const reissue = await request(app).post("/api/auth/otp/issue").send({ phone });
    const reCode = reissue.body.debugCode;
    const again = await request(app).post("/api/auth/otp/verify").send({ phone, code: reCode });
    expect(again.status).toBe(200);
    expect(again.body.user.role).toBe("buyer");
  });

  test("OTP verify for a NEW buyer requires buyerType (no raw DB constraint error)", async () => {
    if (!!process.env.AGOOSMS_API_KEY) return; // code is texted, not exposed
    const phone = "0248880102";
    const issue = await request(app).post("/api/auth/otp/issue").send({ phone });
    const code = issue.body.debugCode;
    // Buyer without buyerType -> clean 400, not the DB "value violates a data constraint".
    const noType = await request(app).post("/api/auth/otp/verify").send({ phone, code, name: "Buyer No Type", role: "buyer" });
    expect(noType.status).toBe(400);
    expect(noType.body.error).toMatch(/buyerType is required/);
    // The code is NOT consumed by the failed attempt, so it works on retry with a valid buyerType.
    const ok = await request(app).post("/api/auth/otp/verify").send({ phone, code, name: "Buyer With Type", role: "buyer", buyerType: "wholesale" });
    expect(ok.status).toBe(200);
    expect(ok.body.user.buyerType).toBe("wholesale");
    // And the consumed code is now single-use.
    const reuse = await request(app).post("/api/auth/otp/verify").send({ phone, code, name: "Buyer With Type", role: "buyer", buyerType: "wholesale" });
    expect(reuse.status).toBe(401);
  });
});

describe("AgoSMS delivery logging", () => {
  test("parses and stores the full AgoSMS response in ago_sms_logs", async () => {
    const payload = {
      success: true,
      data: {
        messageId: "6a9170663da94aca4f4cb90c",
        to: "0201234567",
        segments: 1,
        cost: 0,
        balance: 6.860000000000011,
        status: "SIMULATED",
        testMode: true,
      },
      meta: { requestId: "req_mtcv98gkyl10tb8d", timestamp: "2026-08-28T11:26:30.932Z" },
    };
    const originalFetch = global.fetch;
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      text: async () => JSON.stringify(payload),
    });
    try {
      const notifications = require("../src/repositories/notifications");
      const notif = await notifications.logNotification({
        toPhone: "0201234567",
        channel: "sms",
        messageKey: "otp",
        language: "en",
        params: { code: "123456", expiresIn: 10 },
      });

      // sendViaAgooSms is fire-and-forget, so poll briefly for the log row.
      let rows = [];
      for (let i = 0; i < 20 && rows.length === 0; i++) {
        await new Promise((r) => setTimeout(r, 50));
        rows = (await adminPool.query(
          "SELECT * FROM ago_sms_logs WHERE notification_id = $1", [notif.id]
        )).rows;
      }

      expect(rows.length).toBe(1);
      const row = rows[0];
      expect(row.message_id).toBe("6a9170663da94aca4f4cb90c");
      expect(row.request_id).toBe("req_mtcv98gkyl10tb8d");
      expect(row.to_e164).toBe("+233201234567");
      expect(Number(row.segments)).toBe(1);
      expect(Number(row.cost)).toBe(0);
      expect(Number(row.balance)).toBeCloseTo(6.86, 2);
      expect(row.status).toBe("SIMULATED");
      expect(row.test_mode).toBe(true);
      expect(row.success).toBe(true);

      // The notifications row's agoo_id is now the messageId (not the old body.id).
      const notifRow = (await adminPool.query("SELECT agoo_id, delivered FROM notifications WHERE id = $1", [notif.id])).rows[0];
      expect(notifRow.agoo_id).toBe("6a9170663da94aca4f4cb90c");
      expect(notifRow.delivered).toBe(true);
    } finally {
      global.fetch = originalFetch;
    }
  });
});

describe("buyer verification gating", () => {
  test("unverified buyer is blocked from committing; verified buyer can commit", async () => {
    const farmer = await register({ name: "GateFarmer", phone: "0249910001", role: "farmer", password: "pw", location: "Kasoa" });
    const buyer = await register({ name: "GateBuyer", phone: "0249910002", role: "buyer", password: "pw", location: "Accra", buyerType: "retail" });
    expect(buyer.body.user.verified).toBe(false); // buyers start unverified

    const listing = await request(app)
      .post("/api/listings").set("Authorization", `Bearer ${farmer.body.token}`)
      .send({ cropType: "maize", quantity: 10, unit: "bags", askingPrice: 200, location: "Kasoa" });
    expect(listing.status).toBe(201);

    const blocked = await request(app)
      .post("/api/precommitments").set("Authorization", `Bearer ${buyer.body.token}`)
      .send({ listingId: listing.body.id, quantity: 5, offeredPrice: 200 });
    expect(blocked.status).toBe(403);
    expect(blocked.body.error).toMatch(/verify/i);

    const verify = await request(app)
      .post("/api/auth/verify").set("Authorization", `Bearer ${buyer.body.token}`)
      .send({
        purchaseCrops: ["maize"], region: "Greater Accra", district: "Accra Metropolis",
        gpsAddress: "GA-123-4567", address: "1 Main Rd", community: "Accra",
        idType: "ghana_card", idNumber: "GHA-12345678-1", photoUrl: "/uploads/p.jpg",
      });
    expect(verify.status).toBe(200);
    expect(verify.body.user.verified).toBe(true);
    // ID number must be stored redacted, not plaintext.
    const idRow = (await adminPool.query("SELECT id_number FROM buyer_verifications WHERE user_id = $1", [buyer.body.user.id])).rows[0];
    expect(idRow.id_number).toContain("6781");
    expect(idRow.id_number).not.toContain("12345678");

    const ok = await request(app)
      .post("/api/precommitments").set("Authorization", `Bearer ${buyer.body.token}`)
      .send({ listingId: listing.body.id, quantity: 5, offeredPrice: 200 });
    expect(ok.status).toBe(201);
  });

  test("verify requires idType, idNumber, photoUrl", async () => {
    const buyer = await register({ name: "VBad", phone: "0249910003", role: "buyer", password: "pw", location: "Accra", buyerType: "retail" });
    const res = await request(app)
      .post("/api/auth/verify").set("Authorization", `Bearer ${buyer.body.token}`)
      .send({ idType: "ghana_card" });
    expect(res.status).toBe(400);
  });
});

describe("farms dashboard", () => {
  test("farmer creates farms and reads them grouped by stage", async () => {
    const farmer = await register({ name: "FarmYo", phone: "0249920001", role: "farmer", password: "pw", location: "Teso" });

    const pre = await request(app)
      .post("/api/farms").set("Authorization", `Bearer ${farmer.body.token}`)
      .send({ name: "North plot", cropType: "tomato", stage: "pre_harvest", status: "growing", imageUrl: "/uploads/f1.jpg", location: "Teso", lat: 5.86, lng: -1.56 });
    expect(pre.status).toBe(201);
    expect(pre.body.stage).toBe("pre_harvest");

    const post2 = await request(app)
      .post("/api/farms").set("Authorization", `Bearer ${farmer.body.token}`)
      .send({ name: "South plot", cropType: "maize", stage: "post_harvest", status: "ready", imageUrl: "/uploads/f2.jpg", location: "Kumasi", lat: 6.68, lng: -1.62 });
    expect(post2.status).toBe(201);

    const mine = await request(app)
      .get("/api/farms/mine").set("Authorization", `Bearer ${farmer.body.token}`);
    expect(mine.status).toBe(200);
    expect(mine.body.preHarvest).toHaveLength(1);
    expect(mine.body.postHarvest).toHaveLength(1);
    expect(mine.body.preHarvest[0].cropType).toBe("tomato");
  });

  test("non-farmer cannot create a farm", async () => {
    const buyer = await register({ name: "NF", phone: "0249920002", role: "buyer", password: "pw", location: "Accra", buyerType: "retail" });
    const res = await request(app)
      .post("/api/farms").set("Authorization", `Bearer ${buyer.body.token}`)
      .send({ cropType: "pepper" });
    expect(res.status).toBe(403);
  });
});

describe("buyer produce feed", () => {
  test("orders by purchase-crop match first, then proximity", async () => {
    const farmerA = await register({ name: "ProA", phone: "0249930001", role: "farmer", password: "pw", location: "Kumasi" });
    const farmerB = await register({ name: "ProB", phone: "0249930002", role: "farmer", password: "pw", location: "Accra" });
    const buyer = await register({ name: "ProBuyer", phone: "0249930003", role: "buyer", password: "pw", location: "Accra", buyerType: "retail" });

    // Farmers set their coordinates via the profile endpoint.
    await request(app).post("/api/auth/profile").set("Authorization", `Bearer ${farmerA.body.token}`)
      .send({ primaryCrops: ["tomato"], community: "Kumasi", lat: 6.6885, lng: -1.6244 });
    await request(app).post("/api/auth/profile").set("Authorization", `Bearer ${farmerB.body.token}`)
      .send({ primaryCrops: ["maize"], community: "Accra", lat: 5.6037, lng: -0.187 });

    const nearTomato = await request(app)
      .post("/api/listings").set("Authorization", `Bearer ${farmerA.body.token}`)
      .send({ cropType: "tomato", quantity: 5, unit: "crates", askingPrice: 100, location: "Kumasi" });
    const farMaize = await request(app)
      .post("/api/listings").set("Authorization", `Bearer ${farmerB.body.token}`)
      .send({ cropType: "maize", quantity: 5, unit: "bags", askingPrice: 100, location: "Accra" });

    // Buyer wants tomato and is located in Accra (farmerB's side).
    await request(app)
      .post("/api/auth/verify").set("Authorization", `Bearer ${buyer.body.token}`)
      .send({
        purchaseCrops: ["tomato"], community: "Accra", lat: 5.6037, lng: -0.187,
        idType: "voter_card", idNumber: "VTD-0000000-2", photoUrl: "/uploads/live.jpg",
      });

    const lat = 5.6037, lng = -0.187;
    const feed = await request(app)
      .get(`/api/produce?nearLat=${lat}&nearLng=${lng}`)
      .set("Authorization", `Bearer ${buyer.body.token}`);
    expect(feed.status).toBe(200);
    // Scope to this test's listings: shared DB may already hold pre_committed rows from
    // earlier tests, which are intentionally visible in the feed now.
    const mine = feed.body.filter(
      (p) => p.id === nearTomato.body.id || p.id === farMaize.body.id,
    );
    expect(mine).toHaveLength(2);
    expect(mine.every((p) => p.status === "open")).toBe(true);

    const idx = feed.body.map((p) => p.id);
    // Tomato matches the buyer's purchase_crops -> must come first even though it is farther.
    expect(idx.indexOf(nearTomato.body.id)).toBeLessThan(idx.indexOf(farMaize.body.id));
    expect(feed.body[idx.indexOf(nearTomato.body.id)].distanceKm).toBeGreaterThan(
      feed.body[idx.indexOf(farMaize.body.id)].distanceKm,
    );
  });

  test("GET /api/produce/:id returns the enriched row or 404", async () => {
    const farmer = await register({ name: "DetailF", phone: "0249930004", role: "farmer", password: "pw", location: "Teso" });
    const buyer = await register({ name: "DetailB", phone: "0249930005", role: "buyer", password: "pw", location: "Accra", buyerType: "retail" });

    const listing = await request(app)
      .post("/api/listings").set("Authorization", `Bearer ${farmer.body.token}`)
      .send({ cropType: "pepper", quantity: 7, unit: "bags", askingPrice: 150, location: "Teso", details: "Very hot, sun-dried", maturity: "Partially mature", imageUrls: ["/uploads/a.jpg"] });
    expect(listing.status).toBe(201);
    expect(listing.body.details).toBe("Very hot, sun-dried");
    expect(listing.body.maturity).toBe("Partially mature");

    const res = await request(app)
      .get(`/api/produce/${listing.body.id}`)
      .set("Authorization", `Bearer ${buyer.body.token}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(listing.body.id);
    expect(res.body.status).toBe("open");
    expect(res.body.cropType).toBe("pepper");
    expect(res.body.farmerName).toBe("DetailF");
    expect(res.body.imageUrls).toEqual(["/uploads/a.jpg"]);
    expect(res.body.details).toBe("Very hot, sun-dried");
    expect(res.body.maturity).toBe("Partially mature");

    const edited = await request(app)
      .put(`/api/listings/${listing.body.id}`).set("Authorization", `Bearer ${farmer.body.token}`)
      .send({ maturity: "Mature / Ready" });
    expect(edited.status).toBe(200);
    expect(edited.body.maturity).toBe("Mature / Ready");

    const afterEdit = await request(app)
      .get(`/api/produce/${listing.body.id}`)
      .set("Authorization", `Bearer ${buyer.body.token}`);
    expect(afterEdit.body.maturity).toBe("Mature / Ready");

    const missing = await request(app)
      .get("/api/produce/00000000-0000-0000-0000-000000000000")
      .set("Authorization", `Bearer ${buyer.body.token}`);
    expect(missing.status).toBe(404);
  });

  test("pre_committed listings appear in the feed and stay purchasable", async () => {
    const farmer = await register({ name: "PcFarmer", phone: "0249930010", role: "farmer", password: "pw", location: "Teso" });
    const b1 = await register({ name: "PcBuyer1", phone: "0249930011", role: "buyer", password: "pw", location: "Accra", buyerType: "retail" });
    const b2 = await register({ name: "PcBuyer2", phone: "0249930012", role: "buyer", password: "pw", location: "Accra", buyerType: "retail" });
    const b3 = await register({ name: "PcBuyer3", phone: "0249930013", role: "buyer", password: "pw", location: "Accra", buyerType: "retail" });
    await request(app).post("/api/auth/verify").set("Authorization", `Bearer ${b1.body.token}`)
      .send({ idType: "passport", idNumber: "P-9001", photoUrl: "/uploads/p.jpg" });
    await request(app).post("/api/auth/verify").set("Authorization", `Bearer ${b2.body.token}`)
      .send({ idType: "passport", idNumber: "P-9002", photoUrl: "/uploads/p.jpg" });
    await request(app).post("/api/auth/verify").set("Authorization", `Bearer ${b3.body.token}`)
      .send({ idType: "passport", idNumber: "P-9003", photoUrl: "/uploads/p.jpg" });

    const listing = await request(app)
      .post("/api/listings").set("Authorization", `Bearer ${farmer.body.token}`)
      .send({ cropType: "pepper", quantity: 8, unit: "bags", askingPrice: 160, location: "Teso" });
    expect(listing.status).toBe(201);

    const pc = await request(app)
      .post("/api/precommitments").set("Authorization", `Bearer ${b1.body.token}`)
      .send({ listingId: listing.body.id, quantity: 3, offeredPrice: 160 });
    expect(pc.status).toBe(201);

    const feed = await request(app)
      .get("/api/produce").set("Authorization", `Bearer ${b1.body.token}`);
    expect(feed.status).toBe(200);
    const inFeed = feed.body.find((p) => p.id === listing.body.id);
    expect(inFeed).toBeTruthy();
    expect(inFeed.status).toBe("pre_committed");
    expect(inFeed.committedByMe).toBe(true);

    const detail = await request(app)
      .get(`/api/produce/${listing.body.id}`).set("Authorization", `Bearer ${b1.body.token}`);
    expect(detail.status).toBe(200);
    expect(detail.body.status).toBe("pre_committed");
    expect(detail.body.committedByMe).toBe(true);

    const cart = await request(app)
      .post("/api/cart").set("Authorization", `Bearer ${b1.body.token}`)
      .send({ listingId: listing.body.id, quantity: 4 });
    expect(cart.status).toBe(201);

    const commit2 = await request(app)
      .post("/api/precommitments").set("Authorization", `Bearer ${b2.body.token}`)
      .send({ listingId: listing.body.id, quantity: 2, offeredPrice: 165 });
    expect(commit2.status).toBe(201);

    const feedB2 = await request(app)
      .get("/api/produce").set("Authorization", `Bearer ${b2.body.token}`);
    expect(feedB2.body.find((p) => p.id === listing.body.id).committedByMe).toBe(true);

    const feedB3 = await request(app)
      .get("/api/produce").set("Authorization", `Bearer ${b3.body.token}`);
    expect(feedB3.body.find((p) => p.id === listing.body.id).committedByMe).toBe(false);

    const detailB3 = await request(app)
      .get(`/api/produce/${listing.body.id}`).set("Authorization", `Bearer ${b3.body.token}`);
    expect(detailB3.status).toBe(200);
    expect(detailB3.body.status).toBe("pre_committed");
    expect(detailB3.body.committedByMe).toBe(false);
  });
});

describe("similar produce feed", () => {
  test("GET /api/produce?cropType=&exclude= returns same-crop open listings minus the current one", async () => {
    const farmer = await register({ name: "SimilarF", phone: "0249930006", role: "farmer", password: "pw", location: "Teso" });
    await request(app)
      .post("/api/auth/verify").set("Authorization", `Bearer ${farmer.body.token}`)
      .send({ idType: "ghana_card", idNumber: "GHA-11111111-1", photoUrl: "/uploads/s.jpg", address: "1 Farm Rd" });

    const make = (cropType) =>
      request(app)
        .post("/api/listings").set("Authorization", `Bearer ${farmer.body.token}`)
        .send({ cropType, quantity: 5, unit: "bags", askingPrice: 90, location: "Teso" });

    const p1 = await make("pepper");
    expect(p1.status).toBe(201);
    const p2 = await make("pepper");
    expect(p2.status).toBe(201);
    const otherCrop = await make("tomato");
    expect(otherCrop.status).toBe(201);
    const offMarket = await make("pepper");
    expect(offMarket.status).toBe(201);
    await request(app)
      .patch(`/api/listings/${offMarket.body.id}/status`).set("Authorization", `Bearer ${farmer.body.token}`)
      .send({ status: "deactivated" });

    const buyer = await register({ name: "SimilarB", phone: "0249930007", role: "buyer", password: "pw", location: "Accra", buyerType: "retail" });

    const res = await request(app)
      .get(`/api/produce?cropType=pepper&exclude=${p1.body.id}`)
      .set("Authorization", `Bearer ${buyer.body.token}`);
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThan(0);
    expect(res.body.every((r) => r.cropType === "pepper")).toBe(true);

    const ids = res.body.map((r) => r.id);
    expect(ids).toContain(p2.body.id);
    expect(ids).not.toContain(p1.body.id);
    expect(ids).not.toContain(otherCrop.body.id);
    expect(ids).not.toContain(offMarket.body.id);
  });
});

describe("farmer received commitments", () => {
  test("lists commitments on the farmer's listings, newest first", async () => {
    const farmer = await register({ name: "RecFarmer", phone: "0249940001", role: "farmer", password: "pw", location: "Teso" });
    const b1 = await register({ name: "B1", phone: "0249940002", role: "buyer", password: "pw", location: "Accra", buyerType: "retail" });
    const b2 = await register({ name: "B2", phone: "0249940003", role: "buyer", password: "pw", location: "Accra", buyerType: "retail" });
    await request(app).post("/api/auth/verify").set("Authorization", `Bearer ${b1.body.token}`)
      .send({ idType: "passport", idNumber: "P-1111", photoUrl: "/uploads/x.jpg" });
    await request(app).post("/api/auth/verify").set("Authorization", `Bearer ${b2.body.token}`)
      .send({ idType: "passport", idNumber: "P-2222", photoUrl: "/uploads/y.jpg" });

    const listing1 = await request(app)
      .post("/api/listings").set("Authorization", `Bearer ${farmer.body.token}`)
      .send({ cropType: "pepper", quantity: 9, unit: "bags", askingPrice: 180, location: "Teso" });
    const listing2 = await request(app)
      .post("/api/listings").set("Authorization", `Bearer ${farmer.body.token}`)
      .send({ cropType: "pepper", quantity: 8, unit: "bags", askingPrice: 180, location: "Teso" });

    const c1 = await request(app)
      .post("/api/precommitments").set("Authorization", `Bearer ${b1.body.token}`)
      .send({ listingId: listing1.body.id, quantity: 3, offeredPrice: 180 });
    const c2 = await request(app)
      .post("/api/precommitments").set("Authorization", `Bearer ${b2.body.token}`)
      .send({ listingId: listing2.body.id, quantity: 3, offeredPrice: 180 });
    expect(c1.status).toBe(201);
    expect(c2.status).toBe(201);

    const recv = await request(app).get(`/api/precommitments/farmer/${farmer.body.user.id}`);
    expect(recv.status).toBe(200);
    expect(recv.body).toHaveLength(2);
    expect(recv.body[0].id).toBe(c2.body.id); // newest first
    expect(recv.body.map((c) => c.buyer.name)).toEqual(["B2", "B1"]);
  });
});

describe("banners (admin CRUD)", () => {
  const auth = require("../src/services/auth");

  test("admins can create, update, toggle, and delete banners; public sees only active", async () => {
    const { token } = await auth.registerWithPassword({
      name: "Banner Admin",
      phone: "0249970001",
      email: "banneradmin@agrismart.gh",
      role: "admin",
      password: "AgriSmart123!",
    });

    const buyer = await register({ name: "Bea", phone: "0249970002", role: "buyer", password: "pw", location: "Accra", buyerType: "retail" });
    const forbidden = await request(app)
      .post("/api/banners").set("Authorization", `Bearer ${buyer.body.token}`)
      .send({ title: "Nope" });
    expect(forbidden.status).toBe(403);

    const created = await request(app)
      .post("/api/banners").set("Authorization", `Bearer ${token}`)
      .send({ title: "Good morning deal", eyebrow: "Harvest marketplace", subtitle: "Fresh today", sortOrder: 2, active: true });
    expect(created.status).toBe(201);
    expect(created.body.title).toBe("Good morning deal");

    const bad = await request(app)
      .post("/api/banners").set("Authorization", `Bearer ${token}`)
      .send({ title: "  " });
    expect(bad.status).toBe(400);

    const created2 = await request(app)
      .post("/api/banners").set("Authorization", `Bearer ${token}`)
      .send({ title: "Priority banner", sortOrder: 1, active: true });

    // Public feed returns only active banners, lowest sort_order first.
    const pub = await request(app).get("/api/banners");
    expect(pub.status).toBe(200);
    expect(pub.body.map((b) => b.title)).toEqual(["Priority banner", "Good morning deal"]);

    // Admin list returns all.
    const all = await request(app).get("/api/banners/all").set("Authorization", `Bearer ${token}`);
    expect(all.status).toBe(200);
    expect(all.body).toHaveLength(2);

    // Update fields.
    const updated = await request(app)
      .put(`/api/banners/${created.body.id}`).set("Authorization", `Bearer ${token}`)
      .send({ title: "Good morning deal v2", linkUrl: "https://example.com", sortOrder: 3 });
    expect(updated.status).toBe(200);
    expect(updated.body.linkUrl).toBe("https://example.com");

    // Deactivate -> disappears from public feed.
    await request(app)
      .patch(`/api/banners/${created.body.id}/active`).set("Authorization", `Bearer ${token}`)
      .send({ active: false });
    const pub2 = await request(app).get("/api/banners");
    expect(pub2.body.map((b) => b.title)).toEqual(["Priority banner"]);

    // Delete -> gone entirely.
    const del = await request(app)
      .delete(`/api/banners/${created2.body.id}`).set("Authorization", `Bearer ${token}`);
    expect(del.status).toBe(200);
    const all2 = await request(app).get("/api/banners/all").set("Authorization", `Bearer ${token}`);
    expect(all2.body).toHaveLength(1);

    const missing = await request(app)
      .delete(`/api/banners/${created2.body.id}`).set("Authorization", `Bearer ${token}`);
    expect(missing.status).toBe(404);
  });
});

describe("crops registry", () => {
  test("GET /api/crops is public and returns the seeded canonical list in order", async () => {
    const res = await request(app).get("/api/crops");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(16);
    expect(res.body[0]).toMatchObject({
      id: "tomato",
      name: "Tomato",
      defaultUnit: "crates",
      emoji: expect.any(String),
      gradientFrom: expect.any(String),
      gradientTo: expect.any(String),
    });
    // display_order ascending: tomato first, garden eggs present, 16 crops seeded.
    const ids = res.body.map((c) => c.id);
    expect(ids[0]).toBe("tomato");
    expect(ids).toHaveLength(16);
    expect(ids).toContain("garden eggs");
  });
});

describe("units registry", () => {
  test("GET /api/units is public and returns the seeded units", async () => {
    const res = await request(app).get("/api/units");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(11);
    expect(res.body[0]).toMatchObject({ id: "bag", name: "Bag", plural: "bags" });
    const ids = res.body.map((u) => u.id);
    expect(ids[0]).toBe("bag");
    expect(ids).toContain("crates");
    expect(ids).toContain("kg");
  });
});

describe("regions registry", () => {
  test("GET /api/regions is public and returns all 16 regions with their districts nested and mapped", async () => {
    const res = await request(app).get("/api/regions");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toHaveLength(16);
    // display_order ascending: Greater Accra first.
    expect(res.body[0]).toMatchObject({ id: "greater accra", name: "Greater Accra" });

    const regions = new Map(res.body.map((r) => [r.id, r]));
    expect(res.body.every((r) => Array.isArray(r.districts) && r.districts.length > 0)).toBe(true);

    // Every region has at least one district and districts map back to their region.
    const total = res.body.reduce((n, r) => n + r.districts.length, 0);
    expect(total).toBeGreaterThanOrEqual(256);

    // Known district -> region mappings.
    const ga = regions.get("greater accra");
    expect(ga.districts.map((d) => d.id)).toEqual(expect.arrayContaining(["ga-east", "tema", "ada-west"]));
    const ashanti = regions.get("ashanti");
    expect(ashanti.districts.map((d) => d.id)).toEqual(expect.arrayContaining(["ejisu", "kumasi"]));
    const central = regions.get("central");
    expect(central.districts.map((d) => d.id)).toEqual(expect.arrayContaining(["cape-coast", "awutu-senya-east"]));
  });
});

describe("custom crops / user_croptype registry", () => {
  test("register normalizes custom primary crops into user_croptype", async () => {
    const res = await register({
      name: "CustomFarmer", phone: "0245570001", role: "farmer", password: "secret123",
      location: "Kasoa", primaryCrops: ["Tiger Nuts", "tomato"],
    });
    expect(res.status).toBe(201);
    // Stored arrays use the normalized lowercase keys.
    expect(res.body.user.primaryCrops).toEqual(["tiger nuts", "tomato"]);
    const { rows } = await adminPool.query(
      "SELECT name, kind, custom, crop_type_id FROM user_croptype WHERE user_id = $1 ORDER BY name",
      [res.body.user.id]
    );
    const byName = Object.fromEntries(rows.map((r) => [r.name, r]));
    expect(byName["tiger nuts"]).toMatchObject({ kind: "primary", custom: true, crop_type_id: null });
    expect(byName["tomato"]).toMatchObject({ kind: "primary", custom: false, crop_type_id: "tomato" });
  });

  test("account update resyncs user_croptype and clears on empty", async () => {
    const reg = await register({
      name: "SyncFarmer", phone: "0245570002", role: "farmer", password: "secret123",
      primaryCrops: ["tomato"],
    });
    expect(reg.status).toBe(201);
    const token = reg.body.token;
    const id = reg.body.user.id;
    expect(reg.body.user.primaryCrops).toEqual(["tomato"]);

    const upd = await request(app)
      .post("/api/auth/account").set("Authorization", `Bearer ${token}`)
      .send({ primaryCrops: ["shea nuts"] });
    expect(upd.status).toBe(200);
    expect(upd.body.user.primaryCrops).toEqual(["shea nuts"]);
    let { rows } = await adminPool.query(
      "SELECT name, custom FROM user_croptype WHERE user_id = $1",
      [id]
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ name: "shea nuts", custom: true });

    const cleared = await request(app)
      .post("/api/auth/account").set("Authorization", `Bearer ${token}`)
      .send({ primaryCrops: [] });
    expect(cleared.status).toBe(200);
    expect(cleared.body.user.primaryCrops).toEqual([]);
    ({ rows } = await adminPool.query(
      "SELECT name FROM user_croptype WHERE user_id = $1",
      [id]
    ));
    expect(rows).toHaveLength(0);
  });
});

describe("user profile / settings", () => {
  test("POST /api/auth/account updates editable profile fields", async () => {
    const reg = await register({
      name: "PhotoFarmer", phone: "0245560001", role: "farmer", password: "secret123", location: "Kasoa",
    });
    expect(reg.status).toBe(201);
    const token = reg.body.token;

    const res = await request(app)
      .post("/api/auth/account").set("Authorization", `Bearer ${token}`)
      .send({ name: "Kwame Adu", location: "Kumasi", language: "tw", farmSize: 12.5 });
    expect(res.status).toBe(200);
    expect(res.body.user.name).toBe("Kwame Adu");
    expect(res.body.user.location).toBe("Kumasi");
    expect(res.body.user.language).toBe("tw");
    expect(res.body.user.farmSize).toBe(12.5);

    const me = await request(app).get("/api/auth/me").set("Authorization", `Bearer ${token}`);
    expect(me.status).toBe(200);
    expect(me.body.user.name).toBe("Kwame Adu");
  });

  test("POST /api/auth/photo sets the profile photo URL", async () => {
    const reg = await register({
      name: "Ava", phone: "0245560002", role: "buyer", password: "secret123", location: "Accra", buyerType: "retail",
    });
    const token = reg.body.token;

    const res = await request(app)
      .post("/api/auth/photo").set("Authorization", `Bearer ${token}`)
      .send({ photoUrl: "/uploads/avatar.jpg" });
    expect(res.status).toBe(200);
    expect(res.body.user.photoUrl).toBe("/uploads/avatar.jpg");

    const me = await request(app).get("/api/auth/me").set("Authorization", `Bearer ${token}`);
    expect(me.body.user.photoUrl).toBe("/uploads/avatar.jpg");
  });

  test("POST /api/auth/change-password validates and updates the password", async () => {
    const reg = await register({
      name: "Dede", phone: "0245560003", role: "farmer", password: "oldpass1", location: "Tema",
    });
    const token = reg.body.token;

    // Wrong current password is rejected.
    const wrong = await request(app)
      .post("/api/auth/change-password").set("Authorization", `Bearer ${token}`)
      .send({ currentPassword: "nope123", newPassword: "newpass1" });
    expect(wrong.status).toBe(400);

    // Correct current password updates it.
    const ok = await request(app)
      .post("/api/auth/change-password").set("Authorization", `Bearer ${token}`)
      .send({ currentPassword: "oldpass1", newPassword: "newpass1" });
    expect(ok.status).toBe(200);
    expect(ok.body.ok).toBe(true);

    // Old password no longer works, new one does.
    const oldLogin = await request(app).post("/api/auth/login").send({ identifier: "0245560003", password: "oldpass1" });
    expect(oldLogin.status).toBe(401);
    const newLogin = await request(app).post("/api/auth/login").send({ identifier: "0245560003", password: "newpass1" });
    expect(newLogin.status).toBe(200);
  });

  test("email and phone can be added or changed with the current password", async () => {
    const reg = await register({
      name: "ContactFarmer", phone: "0245560011", role: "farmer", password: "secret123", location: "Kasoa",
    });
    expect(reg.status).toBe(201);
    const token = reg.body.token;
    expect(reg.body.user.email).toBeNull();

    const res = await request(app)
      .post("/api/auth/account").set("Authorization", `Bearer ${token}`)
      .send({ email: "NewCoNaCt@Example.com", phone: "024 557 9999", currentPassword: "secret123" });
    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe("newconact@example.com");
    expect(res.body.user.phone).toBe("+233245579999");

    const me = await request(app).get("/api/auth/me").set("Authorization", `Bearer ${token}`);
    expect(me.body.user.email).toBe("newconact@example.com");
    expect(me.body.user.phone).toBe("+233245579999");

    // The freshly set phone is immediately usable for login.
    const login = await request(app).post("/api/auth/login").send({ identifier: "0245579999", password: "secret123" });
    expect(login.status).toBe(200);
  });

  test("changing login contact requires the current password", async () => {
    const reg = await register({
      name: "Guarded", phone: "0245560014", role: "buyer", password: "secret123", location: "Accra", buyerType: "retail",
    });
    const token = reg.body.token;

    const missing = await request(app)
      .post("/api/auth/account").set("Authorization", `Bearer ${token}`)
      .send({ email: "guarded@example.com" });
    expect(missing.status).toBe(400);
    expect(missing.body.error).toMatch(/current password is required/);

    const wrong = await request(app)
      .post("/api/auth/account").set("Authorization", `Bearer ${token}`)
      .send({ email: "guarded@example.com", currentPassword: "nope123" });
    expect(wrong.status).toBe(400);
    expect(wrong.body.error).toMatch(/current password is incorrect/);

    const me = await request(app).get("/api/auth/me").set("Authorization", `Bearer ${token}`);
    expect(me.body.user.email).toBeNull();
  });

  test("contact updates validate, enforce uniqueness, and keep at least one identifier", async () => {
    const a = await register({
      name: "UniqueA", phone: "0245560012", role: "farmer", password: "secret123", location: "Tema",
    });
    const b = await register({
      name: "UniqueB", phone: "0245560013", email: "already.taken@example.com", role: "farmer", password: "secret123", location: "Accra",
    });
    expect(a.status).toBe(201);
    expect(b.status).toBe(201);

    // Email already used by another account.
    const emailDup = await request(app)
      .post("/api/auth/account").set("Authorization", `Bearer ${a.body.token}`)
      .send({ email: "ALREADY.taken@example.com", currentPassword: "secret123" });
    expect(emailDup.status).toBe(409);
    expect(emailDup.body.error).toMatch(/email already exists/);

    // Phone already used by another account.
    const phoneDup = await request(app)
      .post("/api/auth/account").set("Authorization", `Bearer ${a.body.token}`)
      .send({ phone: "0245560013", currentPassword: "secret123" });
    expect(phoneDup.status).toBe(409);
    expect(phoneDup.body.error).toMatch(/phone already exists/);

    // Not a deliverable Ghana number.
    const badPhone = await request(app)
      .post("/api/auth/account").set("Authorization", `Bearer ${a.body.token}`)
      .send({ phone: "0555123", currentPassword: "secret123" });
    expect(badPhone.status).toBe(400);

    // Clearing email works while the existing phone is kept (phone key omitted).
    const cleared = await request(app)
      .post("/api/auth/account").set("Authorization", `Bearer ${a.body.token}`)
      .send({ email: "", currentPassword: "secret123" });
    expect(cleared.status).toBe(200);
    expect(cleared.body.user.email).toBeNull();
    expect(cleared.body.user.phone).toBe("+233245560012");

    // Blanking the last identifier is refused.
    const bothBlank = await request(app)
      .post("/api/auth/account").set("Authorization", `Bearer ${a.body.token}`)
      .send({ email: "", phone: "", currentPassword: "secret123" });
    expect(bothBlank.status).toBe(400);
    expect(bothBlank.body.error).toMatch(/at least a phone number or email/);
  });

  test("username cannot be changed by the account holder", async () => {
    const reg = await register({
      name: "Handle", username: "dora", phone: "0245560015", role: "buyer", password: "secret123", location: "Accra", buyerType: "retail",
    });
    const token = reg.body.token;
    expect(reg.body.user.username).toBe("dora");

    const res = await request(app)
      .post("/api/auth/account").set("Authorization", `Bearer ${token}`)
      .send({ username: "hacker" });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/cannot be changed/);

    const me = await request(app).get("/api/auth/me").set("Authorization", `Bearer ${token}`);
    expect(me.body.user.username).toBe("dora");
  });

  test("an account without a username can claim one once", async () => {
    const reg = await register({
      name: "Claimer", phone: "0245560016", role: "buyer", password: "secret123", location: "Accra", buyerType: "retail",
    });
    expect(reg.status).toBe(201);
    expect(reg.body.user.username).toBeNull();
    const token = reg.body.token;

    // Invalid formats are rejected up front.
    const short = await request(app)
      .post("/api/auth/account").set("Authorization", `Bearer ${token}`)
      .send({ username: "ab" });
    expect(short.status).toBe(400);

    const weird = await request(app)
      .post("/api/auth/account").set("Authorization", `Bearer ${token}`)
      .send({ username: "bad handle!" });
    expect(weird.status).toBe(400);

    // Claiming succeeds without a current password and normalizes to lower-case.
    const res = await request(app)
      .post("/api/auth/account").set("Authorization", `Bearer ${token}`)
      .send({ username: "Kwame_24" });
    expect(res.status).toBe(200);
    expect(res.body.user.username).toBe("kwame_24");

    // The handle is immediately usable to sign in (case-insensitively).
    const login = await request(app).post("/api/auth/login").send({ identifier: "KWAME_24", password: "secret123" });
    expect(login.status).toBe(200);

    // Once claimed it is locked: changing it is rejected.
    const again = await request(app)
      .post("/api/auth/account").set("Authorization", `Bearer ${token}`)
      .send({ username: "otherhandle" });
    expect(again.status).toBe(400);
    expect(again.body.error).toMatch(/cannot be changed/);

    // Another account cannot reuse the taken handle.
    const other = await register({
      name: "Claimer2", phone: "0245560017", role: "buyer", password: "secret123", location: "Accra", buyerType: "retail",
    });
    const dup = await request(app)
      .post("/api/auth/account").set("Authorization", `Bearer ${other.body.token}`)
      .send({ username: "kwame_24" });
    expect(dup.status).toBe(409);
    expect(dup.body.error).toMatch(/already exists/);
  });
});

describe("cart + zero-price precommitment", () => {
  let farmerToken, buyerToken, listingId;

  beforeAll(async () => {
    const farmer = await register({ name: "Kwabena", phone: `024777${Math.floor(Math.random() * 100000).toString().padStart(5, "0")}`, role: "farmer", password: "pw", location: "Kasoa" });
    farmerToken = farmer.body.token;
    const buyer = await register({ name: "Adwoa", phone: `024777${Math.floor(Math.random() * 100000).toString().padStart(5, "0")}`, role: "buyer", password: "pw", location: "Accra", buyerType: "retail" });
    buyerToken = buyer.body.token;

    await request(app)
      .post("/api/auth/verify").set("Authorization", `Bearer ${buyerToken}`)
      .send({
        purchaseCrops: ["yam"],
        region: "Greater Accra",
        district: "Accra Metropolis",
        gpsAddress: "GA-111-2222",
        address: "1 Test Rd",
        community: "Accra",
        idType: "ghana_card",
        idNumber: "GHA-55555555-1",
        photoUrl: "/uploads/photo.jpg",
      });

    const listing = await request(app)
      .post("/api/listings").set("Authorization", `Bearer ${farmerToken}`)
      .send({ cropType: "yam", quantity: 30, unit: "bags", askingPrice: 200 });
    expect(listing.status).toBe(201);
    listingId = listing.body.id;
  });

  test("add + get + update qty + remove cart line", async () => {
    const add = await request(app)
      .post("/api/cart").set("Authorization", `Bearer ${buyerToken}`)
      .send({ listingId, quantity: 5 });
    expect(add.status).toBe(201);

    const cart = await request(app)
      .get("/api/cart").set("Authorization", `Bearer ${buyerToken}`);
    expect(cart.status).toBe(200);
    expect(cart.body).toHaveLength(1);
    expect(cart.body[0].listingId).toBe(listingId);
    expect(cart.body[0].qty).toBe(5);
    expect(cart.body[0].cropType).toBe("yam");

    const patch = await request(app)
      .patch(`/api/cart/${listingId}`).set("Authorization", `Bearer ${buyerToken}`)
      .send({ quantity: 8 });
    expect(patch.status).toBe(200);

    const after = await request(app)
      .get("/api/cart").set("Authorization", `Bearer ${buyerToken}`);
    expect(after.body[0].qty).toBe(8);

    const del = await request(app)
      .delete(`/api/cart/${listingId}`).set("Authorization", `Bearer ${buyerToken}`);
    expect(del.status).toBe(200);

    const empty = await request(app)
      .get("/api/cart").set("Authorization", `Bearer ${buyerToken}`);
    expect(empty.body).toHaveLength(0);
  });

  test("cart rejects invalid quantity / non-open listing", async () => {
    const bad = await request(app)
      .post("/api/cart").set("Authorization", `Bearer ${buyerToken}`)
      .send({ listingId, quantity: 0 });
    expect(bad.status).toBe(400);

    const missing = await request(app)
      .post("/api/cart").set("Authorization", `Bearer ${buyerToken}`)
      .send({ quantity: 5 });
    expect(missing.status).toBe(400);
  });

  test("farmer cannot use a cart", async () => {
    const res = await request(app)
      .post("/api/cart").set("Authorization", `Bearer ${farmerToken}`)
      .send({ listingId, quantity: 5 });
    expect(res.status).toBe(403);
  });

  test("clear cart empties all lines", async () => {
    await request(app)
      .post("/api/cart").set("Authorization", `Bearer ${buyerToken}`)
      .send({ listingId, quantity: 3 });
    const cleared = await request(app)
      .delete("/api/cart").set("Authorization", `Bearer ${buyerToken}`);
    expect(cleared.status).toBe(200);
    const cart = await request(app)
      .get("/api/cart").set("Authorization", `Bearer ${buyerToken}`);
    expect(cart.body).toHaveLength(0);
  });

  test("precommitment accepts a zero offered price", async () => {
    const free = await request(app)
      .post("/api/listings").set("Authorization", `Bearer ${farmerToken}`)
      .send({ cropType: "cassava", quantity: 10, unit: "bags", askingPrice: 0 });
    expect(free.status).toBe(201);

    const pc = await request(app)
      .post("/api/precommitments").set("Authorization", `Bearer ${buyerToken}`)
      .send({ listingId: free.body.id, quantity: 2, offeredPrice: 0 });
    expect(pc.status).toBe(201);
    expect(pc.body.offeredPrice).toBe(0);
  });
});

describe("pre-commitment negotiation (offers, counters, minimum price)", () => {
  async function makePair(phoneSeed) {
    const farmerPhone = `02488${Math.floor(Math.random() * 100000).toString().padStart(5, "0")}`;
    const buyerPhone = `02488${Math.floor(Math.random() * 100000).toString().padStart(5, "0")}`;
    const farmer = await register({
      name: "NegFarmer",
      phone: farmerPhone,
      role: "farmer",
      password: "pw",
      location: "Kasoa",
    });
    const buyer = await register({
      name: "NegBuyer",
      phone: buyerPhone,
      role: "buyer",
      password: "pw",
      location: "Accra",
      buyerType: "retail",
    });
    await request(app)
      .post("/api/auth/verify")
      .set("Authorization", `Bearer ${buyer.body.token}`)
      .send({
        purchaseCrops: ["tomato"],
        region: "Greater Accra",
        district: "Accra Metropolis",
        gpsAddress: "GA-111-2222",
        address: "1 Test Rd",
        community: "Accra",
        idType: "ghana_card",
        idNumber: "GHA-42424242-1",
        photoUrl: "/uploads/photo.jpg",
      });
    return { farmer, buyer };
  }

  async function makeListing(farmerToken, askingPrice, minimumPrice) {
    const listing = await request(app)
      .post("/api/listings").set("Authorization", `Bearer ${farmerToken}`)
      .send({
        cropType: "tomato",
        quantity: 20,
        unit: "crates",
        askingPrice,
        minimumPrice,
        location: "Kasoa",
      });
    expect(listing.status).toBe(201);
    return listing.body;
  }

  test("minimum price is stored on the listing and exposed to buyers", async () => {
    const { farmer } = await makePair(1);
    const listing = await makeListing(farmer.body.token, 120, 115);
    expect(listing.minimumPrice).toBe(115);

    const feed = await request(app)
      .get("/api/produce").set("Authorization", `Bearer ${farmer.body.token}`);
    expect(feed.status).toBe(200);
    expect(feed.body.some((p) => p.id === listing.id && p.minimumPrice === 115)).toBe(true);
  });

  test("negative minimum price is rejected on create and update", async () => {
    const { farmer } = await makePair(2);
    const bad = await request(app)
      .post("/api/listings").set("Authorization", `Bearer ${farmer.body.token}`)
      .send({ cropType: "tomato", quantity: 10, unit: "crates", askingPrice: 100, minimumPrice: -1 });
    expect(bad.status).toBe(400);

    const listing = await makeListing(farmer.body.token, 100, null);
    const badUpdate = await request(app)
      .put(`/api/listings/${listing.id}`).set("Authorization", `Bearer ${farmer.body.token}`)
      .send({ minimumPrice: -5 });
    expect(badUpdate.status).toBe(400);

    const clear = await request(app)
      .put(`/api/listings/${listing.id}`).set("Authorization", `Bearer ${farmer.body.token}`)
      .send({ minimumPrice: null });
    expect(clear.status).toBe(200);
    expect(clear.body.minimumPrice).toBe(null);
  });

  test("buyer offer below the farmer minimum is rejected", async () => {
    const { farmer, buyer } = await makePair(3);
    const listing = await makeListing(farmer.body.token, 120, 115);
    const offer = await request(app)
      .post("/api/precommitments").set("Authorization", `Bearer ${buyer.body.token}`)
      .send({ listingId: listing.id, quantity: 5, offeredPrice: 110 });
    expect(offer.status).toBe(400);
    expect(offer.body.error).toContain("below the farmer's minimum");

    const open = await request(app).get(`/api/listings/${listing.id}`);
    expect(open.body.status).toBe("open");
  });

  test("buyer offer at the minimum is accepted and reserves the listing", async () => {
    const { farmer, buyer } = await makePair(4);
    const listing = await makeListing(farmer.body.token, 120, 115);
    const offer = await request(app)
      .post("/api/precommitments").set("Authorization", `Bearer ${buyer.body.token}`)
      .send({ listingId: listing.id, quantity: 5, offeredPrice: 115 });
    expect(offer.status).toBe(201);
    expect(offer.body.offeredPrice).toBe(115);

    const reserved = await request(app).get(`/api/listings/${listing.id}`);
    expect(reserved.body.status).toBe("pre_committed");
  });

  test("farmer counters a pending offer; buyer cannot respond before the counter", async () => {
    const { farmer, buyer } = await makePair(5);
    const listing = await makeListing(farmer.body.token, 120);
    const offer = await request(app)
      .post("/api/precommitments").set("Authorization", `Bearer ${buyer.body.token}`)
      .send({ listingId: listing.id, quantity: 4, offeredPrice: 90 });
    expect(offer.status).toBe(201);

    // Buyer cannot accept/decline while still pending.
    const early = await request(app)
      .post(`/api/precommitments/${offer.body.id}/respond`).set("Authorization", `Bearer ${buyer.body.token}`)
      .send({ action: "accept" });
    expect(early.status).toBe(400);

    // Farmer counter without a price, or with a negative one, is invalid.
    const noPrice = await request(app)
      .post(`/api/precommitments/${offer.body.id}/respond`).set("Authorization", `Bearer ${farmer.body.token}`)
      .send({ action: "counter" });
    expect(noPrice.status).toBe(400);

    const negative = await request(app)
      .post(`/api/precommitments/${offer.body.id}/respond`).set("Authorization", `Bearer ${farmer.body.token}`)
      .send({ action: "counter", counterPrice: -2 });
    expect(negative.status).toBe(400);

    const countered = await request(app)
      .post(`/api/precommitments/${offer.body.id}/respond`).set("Authorization", `Bearer ${farmer.body.token}`)
      .send({ action: "counter", counterPrice: 118 });
    expect(countered.status).toBe(200);
    expect(countered.body.status).toBe("countered");
    expect(countered.body.counterPrice).toBe(118);

    // Farmer cannot respond again once the offer is countered.
    const again = await request(app)
      .post(`/api/precommitments/${offer.body.id}/respond`).set("Authorization", `Bearer ${farmer.body.token}`)
      .send({ action: "accept" });
    expect(again.status).toBe(400);
  });

  test("buyer accepts the farmer's counter and the pre-commitment is confirmed", async () => {
    const { farmer, buyer } = await makePair(6);
    const listing = await makeListing(farmer.body.token, 120);
    const offer = await request(app)
      .post("/api/precommitments").set("Authorization", `Bearer ${buyer.body.token}`)
      .send({ listingId: listing.id, quantity: 4, offeredPrice: 90 });
    await request(app)
      .post(`/api/precommitments/${offer.body.id}/respond`).set("Authorization", `Bearer ${farmer.body.token}`)
      .send({ action: "counter", counterPrice: 118 });

    // The buyer's own commitments feed lists the countered offer (enriched).
    const mine = await request(app)
      .get("/api/precommitments/me").set("Authorization", `Bearer ${buyer.body.token}`);
    expect(mine.status).toBe(200);
    expect(mine.body.some((pc) => pc.id === offer.body.id && pc.listing.cropType === "tomato" && pc.counterPrice === 118)).toBe(true);

    // The buyer accepts the counter, confirming the pre-commitment.
    const accepted = await request(app)
      .post(`/api/precommitments/${offer.body.id}/respond`).set("Authorization", `Bearer ${buyer.body.token}`)
      .send({ action: "accept" });
    expect(accepted.status).toBe(200);
    expect(accepted.body.status).toBe("accepted");

    const listingAfter = await request(app).get(`/api/listings/${listing.id}`);
    expect(listingAfter.body.status).toBe("pre_committed");
  });

  test("buyer declines a counter and the listing reopens", async () => {
    const { farmer, buyer } = await makePair(7);
    const listing = await makeListing(farmer.body.token, 120);
    const offer = await request(app)
      .post("/api/precommitments").set("Authorization", `Bearer ${buyer.body.token}`)
      .send({ listingId: listing.id, quantity: 3, offeredPrice: 88 });
    await request(app)
      .post(`/api/precommitments/${offer.body.id}/respond`).set("Authorization", `Bearer ${farmer.body.token}`)
      .send({ action: "counter", counterPrice: 119 });

    const declined = await request(app)
      .post(`/api/precommitments/${offer.body.id}/respond`).set("Authorization", `Bearer ${buyer.body.token}`)
      .send({ action: "decline" });
    expect(declined.status).toBe(200);
    expect(declined.body.status).toBe("rejected");

    const reopened = await request(app).get(`/api/listings/${listing.id}`);
    expect(reopened.body.status).toBe("open");
  });

  test("an unrelated user cannot respond to a pre-commitment", async () => {
    const { farmer, buyer } = await makePair(8);
    const outsider = await register({
      name: "Outsider",
      phone: `02488${Math.floor(Math.random() * 100000).toString().padStart(5, "0")}`,
      role: "farmer",
      password: "pw",
      location: "Tema",
    });
    const listing = await makeListing(farmer.body.token, 120);
    const offer = await request(app)
      .post("/api/precommitments").set("Authorization", `Bearer ${buyer.body.token}`)
      .send({ listingId: listing.id, quantity: 2, offeredPrice: 100 });

    const blocked = await request(app)
      .post(`/api/precommitments/${offer.body.id}/respond`).set("Authorization", `Bearer ${outsider.body.token}`)
      .send({ action: "accept" });
    expect(blocked.status).toBe(403);
  });

  test("buyer offers list is ordered by status: pending, countered, accepted, rejected", async () => {
    const { farmer, buyer } = await makePair(9);
    const buy = async (listingId) =>
      (await request(app)
        .post("/api/precommitments").set("Authorization", `Bearer ${buyer.body.token}`)
        .send({ listingId, quantity: 1, offeredPrice: 100 })).body;
    const respond = async (pcId, token, body) =>
      request(app)
        .post(`/api/precommitments/${pcId}/respond`).set("Authorization", `Bearer ${token}`)
        .send(body);

    // created first -> countered; created second -> pending; created third -> accepted;
    // created last -> rejected. So created_at DESC alone would yield rejected, accepted,
    // countered, pending; the status sort must flip that.
    const l1 = await makeListing(farmer.body.token, 100, null);
    const l2 = await makeListing(farmer.body.token, 100, null);
    const l3 = await makeListing(farmer.body.token, 100, null);
    const l4 = await makeListing(farmer.body.token, 100, null);

    const counteredPc = await buy(l1.id);
    const pendingPc = await buy(l2.id);
    const acceptedPc = await buy(l3.id);
    const rejectedPc = await buy(l4.id);

    await respond(counteredPc.id, farmer.body.token, { action: "counter", counterPrice: 110 });
    await respond(acceptedPc.id, farmer.body.token, { action: "accept" });
    await respond(rejectedPc.id, farmer.body.token, { action: "counter", counterPrice: 110 });
    await respond(rejectedPc.id, buyer.body.token, { action: "decline" });

    const mine = await request(app)
      .get("/api/precommitments/me").set("Authorization", `Bearer ${buyer.body.token}`);
    expect(mine.status).toBe(200);
    expect(mine.body.map((pc) => pc.id)).toEqual([pendingPc.id, counteredPc.id, acceptedPc.id, rejectedPc.id]);
    expect(mine.body.map((pc) => pc.status)).toEqual(["pending", "countered", "accepted", "rejected"]);
  });

  test("each negotiation step creates in-app notification feedback for the other side", async () => {
    const { farmer, buyer } = await makePair(10);
    const inbox = (token) =>
      request(app).get("/api/notifications/me").set("Authorization", `Bearer ${token}`);
    const titles = async (token) => {
      const r = await inbox(token);
      expect(r.status).toBe(200);
      return (r.body.notifications || []).map((n) => n.title);
    };
    const respond = async (pcId, token, body) =>
      request(app)
        .post(`/api/precommitments/${pcId}/respond`).set("Authorization", `Bearer ${token}`)
        .send(body);

    const l1 = await makeListing(farmer.body.token, 100, null);
    const offer = await request(app)
      .post("/api/precommitments").set("Authorization", `Bearer ${buyer.body.token}`)
      .send({ listingId: l1.id, quantity: 2, offeredPrice: 95 });
    expect(offer.status).toBe(201);

    // Farmer is notified of the offer (in-app, unread).
    const farmerAfterOffer = await inbox(farmer.body.token);
    expect(farmerAfterOffer.body.unread).toBeGreaterThanOrEqual(1);
    expect(farmerAfterOffer.body.notifications.some((n) => n.title === "New pre-commitment offer" && n.message.includes("tomato"))).toBe(true);

    // Farmer counters -> buyer is notified in-app.
    await respond(offer.body.id, farmer.body.token, { action: "counter", counterPrice: 110 });
    expect(await titles(buyer.body.token)).toContain("Counter-offer received");

    // Buyer accepts the counter -> farmer is notified the sale is confirmed.
    await respond(offer.body.id, buyer.body.token, { action: "accept" });
    expect(await titles(farmer.body.token)).toContain("Counter accepted");

    // Farmer rejects a second offer -> buyer told the offer was declined.
    const l2 = await makeListing(farmer.body.token, 100, null);
    const offer2 = await request(app)
      .post("/api/precommitments").set("Authorization", `Bearer ${buyer.body.token}`)
      .send({ listingId: l2.id, quantity: 2, offeredPrice: 95 });
    await respond(offer2.body.id, farmer.body.token, { action: "reject" });
    expect(await titles(buyer.body.token)).toContain("Offer declined");

    // Marking read clears the buyer's unread count.
    const mark = await request(app)
      .post("/api/notifications/me/read").set("Authorization", `Bearer ${buyer.body.token}`)
      .send({});
    expect(mark.status).toBe(200);
    const buyerAfter = await inbox(buyer.body.token);
    expect(buyerAfter.body.unread).toBe(0);
  });

  test("a buyer cannot commit more than the listed quantity", async () => {
    const { farmer, buyer } = await makePair(5);
    const listing = await makeListing(farmer.body.token, 100, null); // quantity 20

    const over = await request(app)
      .post("/api/precommitments").set("Authorization", `Bearer ${buyer.body.token}`)
      .send({ listingId: listing.id, quantity: 25, offeredPrice: 100 });
    expect(over.status).toBe(400);
    expect(over.body.error).toContain("cannot exceed the listed amount");

    const at = await request(app)
      .post("/api/precommitments").set("Authorization", `Bearer ${buyer.body.token}`)
      .send({ listingId: listing.id, quantity: 20, offeredPrice: 100 });
    expect(at.status).toBe(201);
  });
});

describe("pre-commitment fulfillment (deposits, produce-ready, delivery, completion)", () => {
  async function makePair() {
    const farmerPhone = `02488${Math.floor(Math.random() * 100000).toString().padStart(5, "0")}`;
    const buyerPhone = `02488${Math.floor(Math.random() * 100000).toString().padStart(5, "0")}`;
    const intruderPhone = `02488${Math.floor(Math.random() * 100000).toString().padStart(5, "0")}`;
    const mailSuffix = `${Date.now()}-${Math.floor(Math.random() * 99999)}`;
    const farmerMail = `fulfillfarmer${mailSuffix}@example.com`;
    const buyerMail = `fulfillbuyer${mailSuffix}@example.com`;
    const farmer = await register({ name: "FulfillFarmer", phone: farmerPhone, email: farmerMail, role: "farmer", password: "pw", location: "Kasoa" });
    const buyer = await register({ name: "FulfillBuyer", phone: buyerPhone, email: buyerMail, role: "buyer", password: "pw", location: "Accra", buyerType: "retail" });
    const intruder = await register({ name: "FulfillIntruder", phone: intruderPhone, role: "buyer", password: "pw", location: "Accra", buyerType: "retail" });
    await request(app)
      .post("/api/auth/verify").set("Authorization", `Bearer ${buyer.body.token}`)
      .send({ purchaseCrops: ["tomato"], region: "Greater Accra", district: "Okaikwei North", idType: "ghana_card", idNumber: "GHA-50505050-1", photoUrl: "/uploads/photo.jpg" });
    const listing = await request(app)
      .post("/api/listings").set("Authorization", `Bearer ${farmer.body.token}`)
      .send({ cropType: "tomato", quantity: 20, unit: "crates", askingPrice: 150, location: "Kasoa" });
    expect(listing.status).toBe(201);
    const pc = await request(app)
      .post("/api/precommitments").set("Authorization", `Bearer ${buyer.body.token}`)
      .send({ listingId: listing.body.id, quantity: 10, offeredPrice: 150 });
    expect(pc.status).toBe(201);
    const accept = await request(app)
      .post(`/api/precommitments/${pc.body.id}/respond`).set("Authorization", `Bearer ${farmer.body.token}`)
      .send({ action: "accept" });
    expect(accept.body.status).toBe("accepted");
    return { farmer, buyer, intruder, listing: listing.body, pc: accept.body, farmerMail, buyerMail };
  }

  test("acceptance auto-creates a pending transaction and the listing stays reserved until completion", async () => {
    const { farmer, buyer, listing, pc } = await makePair();
    expect(pc.transactionId).toBeTruthy();

    const tx = await request(app)
      .get(`/api/transactions/${pc.transactionId}`).set("Authorization", `Bearer ${buyer.body.token}`);
    expect(tx.status).toBe(200);
    expect(tx.body.paymentStatus).toBe("pending");
    expect(tx.body.agreedPrice).toBe(1500);
    expect(tx.body.depositAmount).toBe(0);
    expect(tx.body.paidAmount).toBe(0);

    const still = await request(app).get(`/api/listings/${listing.id}`);
    expect(still.body.status).toBe("pre_committed");

    // Manual re-record of the same sale is idempotent.
    const again = await request(app)
      .post("/api/transactions").set("Authorization", `Bearer ${farmer.body.token}`)
      .send({ listingId: listing.id, buyerId: buyer.body.user.id, agreedPrice: 150 });
    expect(again.status).toBe(200);
    expect(again.body.id).toBe(pc.transactionId);
  });

  test("farmer marks produce ready (prepare + verification data), buyer confirms receipt", async () => {
    const { farmer, buyer, intruder, pc } = await makePair();

    // Out-of-order: delivered before ready is refused, and only the buyer can do it.
    const premature = await request(app)
      .post(`/api/precommitments/${pc.id}/fulfill`).set("Authorization", `Bearer ${buyer.body.token}`)
      .send({ step: "delivered" });
    expect(premature.status).toBe(409);

    const intruded = await request(app)
      .post(`/api/precommitments/${pc.id}/fulfill`).set("Authorization", `Bearer ${intruder.body.token}`)
      .send({ step: "ready" });
    expect(intruded.status).toBe(403);

    // Farmer can skip 'prepare' and go straight to ready.
    const ready = await request(app)
      .post(`/api/precommitments/${pc.id}/fulfill`).set("Authorization", `Bearer ${farmer.body.token}`)
      .send({ step: "ready", actualQuantity: 8, condition: "Grade A, fresh" });
    expect(ready.status).toBe(200);
    expect(ready.body.status).toBe("ready");
    expect(ready.body.actualQuantity).toBe(8);
    expect(ready.body.condition).toBe("Grade A, fresh");
    expect(ready.body.readyAt).toBeTruthy();

    // The buyer's list exposes the verification data + state.
    const mine = await request(app)
      .get("/api/precommitments/me").set("Authorization", `Bearer ${buyer.body.token}`);
    const minePc = mine.body.find((p) => p.id === pc.id);
    expect(minePc.status).toBe("ready");
    expect(minePc.actualQuantity).toBe(8);

    const buyerInbox = await request(app).get("/api/notifications/me").set("Authorization", `Bearer ${buyer.body.token}`);
    expect(buyerInbox.body.notifications.some((n) => n.title && n.title.includes("is ready"))).toBe(true);

    // A non-buyer cannot confirm receipt; only the committing buyer can.
    const wrongDeliverer = await request(app)
      .post(`/api/precommitments/${pc.id}/fulfill`).set("Authorization", `Bearer ${farmer.body.token}`)
      .send({ step: "delivered" });
    expect(wrongDeliverer.status).toBe(403);

    const delivered = await request(app)
      .post(`/api/precommitments/${pc.id}/fulfill`).set("Authorization", `Bearer ${buyer.body.token}`)
      .send({ step: "delivered" });
    expect(delivered.status).toBe(200);
    expect(delivered.body.status).toBe("delivered");
    expect(delivered.body.deliveredAt).toBeTruthy();

    // Delivered but not yet paid -> the commitment does NOT complete.
    expect((await request(app).get("/api/precommitments/me").set("Authorization", `Bearer ${buyer.body.token}`)).body.find((p) => p.id === pc.id).status).toBe("delivered");

    const farmerInbox = await request(app).get("/api/notifications/me").set("Authorization", `Bearer ${farmer.body.token}`);
    expect(farmerInbox.body.notifications.map((n) => n.title)).toContain("Buyer confirmed receipt");
  });

  test("deposit then remainder payment completes the delivered commitment and sells the listing", async () => {
    const { farmer, buyer, listing, pc } = await makePair();

    const deposit = await request(app)
      .post(`/api/transactions/${pc.transactionId}/deposit`).set("Authorization", `Bearer ${buyer.body.token}`)
      .send({ amount: 600 });
    expect(deposit.status).toBe(200);
    expect(deposit.body.paymentStatus).toBe("deposited");
    expect(deposit.body.depositAmount).toBe(600);

    const farmerInbox = await request(app).get("/api/notifications/me").set("Authorization", `Bearer ${farmer.body.token}`);
    expect(farmerInbox.body.notifications.map((n) => n.title)).toContain("Deposit received");

    // Fulfil: ready -> delivered (payment still outstanding).
    await request(app)
      .post(`/api/precommitments/${pc.id}/fulfill`).set("Authorization", `Bearer ${farmer.body.token}`)
      .send({ step: "ready" });
    await request(app)
      .post(`/api/precommitments/${pc.id}/fulfill`).set("Authorization", `Bearer ${buyer.body.token}`)
      .send({ step: "delivered" });

    // Paying the remaining balance (1500 - 600) closes the deal.
    const pay = await request(app)
      .post(`/api/transactions/${pc.transactionId}/pay`).set("Authorization", `Bearer ${buyer.body.token}`)
      .send({ amount: 900 });
    expect(pay.status).toBe(200);
    expect(pay.body.paymentStatus).toBe("paid");
    expect(pay.body.paidAmount).toBe(900);

    const finished = await request(app)
      .get("/api/precommitments/me").set("Authorization", `Bearer ${buyer.body.token}`);
    const donePc = finished.body.find((p) => p.id === pc.id);
    expect(donePc.status).toBe("completed");
    expect(donePc.completedAt).toBeTruthy();

    const soldListing = await request(app).get(`/api/listings/${listing.id}`);
    expect(soldListing.body.status).toBe("pre_committed");
    expect(soldListing.body.remainingQuantity).toBe(10);

    const buyerInbox = await request(app).get("/api/notifications/me").set("Authorization", `Bearer ${buyer.body.token}`);
    expect(buyerInbox.body.notifications.map((n) => n.title)).toContain("Sale completed");
  });

  test("full payment before delivery completes the moment the buyer confirms receipt", async () => {
    const { buyer, farmer, listing, pc } = await makePair();

    await request(app)
      .post(`/api/transactions/${pc.transactionId}/pay`).set("Authorization", `Bearer ${buyer.body.token}`);
    await request(app)
      .post(`/api/precommitments/${pc.id}/fulfill`).set("Authorization", `Bearer ${farmer.body.token}`)
      .send({ step: "prepare" });
    const mid = await request(app).get("/api/precommitments/me").set("Authorization", `Bearer ${buyer.body.token}`);
    expect(mid.body.find((p) => p.id === pc.id).status).toBe("preparing");

    await request(app)
      .post(`/api/precommitments/${pc.id}/fulfill`).set("Authorization", `Bearer ${farmer.body.token}`)
      .send({ step: "ready" });

    // Delivery triggers completion because payment already cleared.
    await request(app)
      .post(`/api/precommitments/${pc.id}/fulfill`).set("Authorization", `Bearer ${buyer.body.token}`)
      .send({ step: "delivered" });

    const after = await request(app).get("/api/precommitments/me").set("Authorization", `Bearer ${buyer.body.token}`);
    expect(after.body.find((p) => p.id === pc.id).status).toBe("completed");
    const l = await request(app).get(`/api/listings/${listing.id}`);
    expect(l.body.status).toBe("pre_committed");
    expect(l.body.remainingQuantity).toBe(10);
  });

  test("partial completion keeps the listing visible with remainingQuantity; full completion marks sold", async () => {
    const { farmer, buyer, listing } = await makePair(); // 20 crates, first pc = 10 accepted

    const feed = await request(app).get("/api/produce").set("Authorization", `Bearer ${buyer.body.token}`);
    const feedItem = feed.body.find((p) => p.id === listing.id);
    expect(feedItem).toBeTruthy();
    expect(feedItem.remainingQuantity).toBe(10);

    // Commit the remaining 10 crates via a second buyer commitment
    const pc2 = await request(app)
      .post("/api/precommitments").set("Authorization", `Bearer ${buyer.body.token}`)
      .send({ listingId: listing.id, quantity: 10, offeredPrice: 150 });
    expect(pc2.status).toBe(201);
    const accept2 = await request(app)
      .post(`/api/precommitments/${pc2.body.id}/respond`).set("Authorization", `Bearer ${farmer.body.token}`)
      .send({ action: "accept" });
    expect(accept2.body.status).toBe("accepted");

    // Pay + fulfill the second commitment
    await request(app)
      .post(`/api/transactions/${accept2.body.transactionId}/pay`).set("Authorization", `Bearer ${buyer.body.token}`);
    await request(app)
      .post(`/api/precommitments/${accept2.body.id}/fulfill`).set("Authorization", `Bearer ${farmer.body.token}`)
      .send({ step: "ready" });
    await request(app)
      .post(`/api/precommitments/${accept2.body.id}/fulfill`).set("Authorization", `Bearer ${buyer.body.token}`)
      .send({ step: "delivered" });

    const done = await request(app).get("/api/precommitments/me").set("Authorization", `Bearer ${buyer.body.token}`);
    expect(done.body.find((p) => p.id === accept2.body.id).status).toBe("completed");

    const l = await request(app).get(`/api/listings/${listing.id}`);
    expect(l.body.status).toBe("sold");
    expect(l.body.remainingQuantity).toBe(0);

    // Sold listing disappears from the buyer feed.
    const feedAfter = await request(app).get("/api/produce").set("Authorization", `Bearer ${buyer.body.token}`);
    expect(feedAfter.body.find((p) => p.id === listing.id)).toBeUndefined();
  });

  test("a buyer cannot commit more than the remaining quantity of a listing", async () => {
    const { farmer, buyer, listing } = await makePair(); // 20 crates, first pc = 10 accepted → remaining 10

    const over = await request(app)
      .post("/api/precommitments").set("Authorization", `Bearer ${buyer.body.token}`)
      .send({ listingId: listing.id, quantity: 11, offeredPrice: 150 });
    expect(over.status).toBe(400);
    expect(over.body.error).toContain("only 10");
  });

  test("legacy commitments without a transaction get one on delivery and a real-price receipt", async () => {
    const { buyer, farmer, pc, farmerMail } = await makePair();

    // Simulate a pre-0032 pre-commitment: accepted but with no linked transaction or
    // agreed price recorded (the data that used to render "Payment of GHS null").
    await adminPool.query(
      "UPDATE pre_commitments SET transaction_id = NULL, agreed_price = NULL WHERE id = $1",
      [pc.id]
    );

    await request(app)
      .post(`/api/precommitments/${pc.id}/fulfill`).set("Authorization", `Bearer ${farmer.body.token}`)
      .send({ step: "ready" });
    const delivered = await request(app)
      .post(`/api/precommitments/${pc.id}/fulfill`).set("Authorization", `Bearer ${buyer.body.token}`)
      .send({ step: "delivered" });
    expect(delivered.status).toBe(200);

    // The route auto-created a transaction at the offered price × quantity...
    const mine = await request(app)
      .get("/api/precommitments/me").set("Authorization", `Bearer ${buyer.body.token}`);
    const afterPc = mine.body.find((p) => p.id === pc.id);
    expect(afterPc.transactionId).toBeTruthy();
    const tx = await request(app)
      .get(`/api/transactions/${afterPc.transactionId}`).set("Authorization", `Bearer ${buyer.body.token}`);
    expect(tx.status).toBe(200);
    expect(tx.body.agreedPrice).toBe(1500);

    // ...so the receipt notification shows the real amount, not "GHS null".
    const { rows } = await adminPool.query(
      `SELECT params, message FROM notifications
       WHERE message_key = 'precommit_received' AND to_email = $1
       ORDER BY sent_at DESC LIMIT 1`,
      [farmerMail]
    );
    expect(rows.length).toBe(1);
    expect(rows[0].params.price).toBe(1500);
    expect(rows[0].message).toContain("GHS 1500");
    expect(rows[0].message).not.toContain("null");

    // Payment is still outstanding, so the commitment is not completed yet.
    expect(afterPc.status).toBe("delivered");
  });

  test("transport can be arranged for a pre-commitment by either party", async () => {
    const { farmer, buyer, intruder, listing, pc } = await makePair();

    const made = await request(app)
      .post("/api/transport-requests").set("Authorization", `Bearer ${buyer.body.token}`)
      .send({ precommitmentId: pc.id, requestedDate: "2026-09-10" });
    expect(made.status).toBe(201);
    expect(made.body.precommitmentId).toBe(pc.id);
    expect(made.body.farmerIds).toEqual([listing.farmerId]);
    expect(made.body.pickupLocation).toBe("Kasoa");

    // The farmer creating for the same commitment gets the same request back.
    const dup = await request(app)
      .post("/api/transport-requests").set("Authorization", `Bearer ${farmer.body.token}`)
      .send({ precommitmentId: pc.id });
    expect(dup.status).toBe(200);
    expect(dup.body.id).toBe(made.body.id);

    // Outsiders are refused, and the pc filter surfaces the request.
    const forbidden = await request(app)
      .post("/api/transport-requests").set("Authorization", `Bearer ${intruder.body.token}`)
      .send({ precommitmentId: pc.id });
    expect(forbidden.status).toBe(403);

    const listed = await request(app)
      .get(`/api/transport-requests?precommitmentId=${pc.id}`).set("Authorization", `Bearer ${buyer.body.token}`);
    expect(listed.status).toBe(200);
    expect(listed.body.map((t) => t.id)).toEqual([made.body.id]);
  });

  test("transaction & pre-commitment events reach buyer and farmer over email and SMS as available", async () => {
    const { buyer, farmer, pc, farmerMail, buyerMail } = await makePair();

    // makePair already accepted: offer (->farmer) and sale confirmed (->buyer).
    await request(app)
      .post(`/api/precommitments/${pc.id}/fulfill`).set("Authorization", `Bearer ${farmer.body.token}`)
      .send({ step: "ready", actualQuantity: 10 });
    await request(app)
      .post(`/api/transactions/${pc.transactionId}/deposit`).set("Authorization", `Bearer ${buyer.body.token}`)
.send({ amount: 300 });
await request(app)
      .post(`/api/precommitments/${pc.id}/fulfill`).set("Authorization", `Bearer ${buyer.body.token}`)
      .send({ step: "delivered" });
    await request(app)
      .post(`/api/transactions/${pc.transactionId}/pay`).set("Authorization", `Bearer ${buyer.body.token}`)
      .send({ amount: 1200 });

    const { rows } = await adminPool.query(
      `SELECT message_key, channel, to_email, to_phone, user_id FROM notifications
       WHERE message_key = ANY($1)
       ORDER BY message_key, channel`,
      [["precommit_offer", "sale_confirmed", "precommit_ready", "deposit_received", "precommit_received", "payment_received", "precommit_completed"]]
    );

    const emailFor = (key, email) =>
      rows.some((r) => r.message_key === key && r.channel === "email" && r.to_email === email);
    const smsFor = (key, phone) =>
      rows.some((r) => r.message_key === key && r.channel === "sms" && r.to_phone === phone);
    const inAppFor = (key) => rows.some((r) => r.message_key === key && r.channel === "in_app" && r.user_id != null);

    // Farmer-facing events.
    expect(emailFor("precommit_offer", farmerMail)).toBe(true);
    expect(emailFor("deposit_received", farmerMail)).toBe(true);
    expect(emailFor("precommit_received", farmerMail)).toBe(true);
    expect(inAppFor("precommit_offer")).toBe(true);

    // Buyer-facing events.
    expect(emailFor("sale_confirmed", buyerMail)).toBe(true);
    expect(emailFor("precommit_ready", buyerMail)).toBe(true);
    expect(inAppFor("precommit_ready")).toBe(true);

    // Payment + completion fan out to both text and email for the farmer.
    expect(smsFor("payment_received", farmer.body.user.phone)).toBe(true);
    expect(emailFor("payment_received", farmerMail)).toBe(true);

    // Sale completed reaches BOTH parties over in-app, sms, and email.
    for (const mail of [farmerMail, buyerMail]) {
      expect(emailFor("precommit_completed", mail)).toBe(true);
      expect(smsFor("precommit_completed", mail === farmerMail ? farmer.body.user.phone : buyer.body.user.phone)).toBe(true);
    }
    expect(inAppFor("precommit_completed")).toBe(true);
  });

  test("ready delivery cannot exceed the buyer's requested quantity", async () => {
    const { farmer, pc } = await makePair(); // requested quantity is 10

    const over = await request(app)
      .post(`/api/precommitments/${pc.id}/fulfill`).set("Authorization", `Bearer ${farmer.body.token}`)
      .send({ step: "ready", actualQuantity: 11 });
    expect(over.status).toBe(400);
    expect(over.body.error).toContain("exceed the buyer's requested quantity");

    // Equal to the requested amount is allowed and the commitment proceeds.
    const ok = await request(app)
      .post(`/api/precommitments/${pc.id}/fulfill`).set("Authorization", `Bearer ${farmer.body.token}`)
      .send({ step: "ready", actualQuantity: 10 });
    expect(ok.status).toBe(200);
    expect(ok.body.actualQuantity).toBe(10);
  });
});

describe("payments & escrow (Paystack simulated)", () => {
  const auth = require("../src/services/auth");

  let adminToken;

  const rndPhone = () => `02490${String(Math.floor(Math.random() * 100000)).padStart(5, "0")}`;

  async function resetPayments(over = {}) {
    const res = await request(app)
      .put("/api/settings/payments").set("Authorization", `Bearer ${adminToken}`)
      .send({ config: { escrowEnabled: false, depositPercent: 30, payoutMode: "auto", currency: "GHS", ...over } });
    expect(res.status).toBe(200);
  }

  async function setPayments(over) {
    await resetPayments({ escrowEnabled: true, ...over });
  }

  async function makePair(price = 200) {
    const seed = `${Date.now()}-${Math.floor(Math.random() * 99999)}`;
    const farmer = await register({ name: `PayFarmer${seed}`, phone: rndPhone(), email: `payfarmer${seed}@example.com`, role: "farmer", password: "pw", location: "Kasoa" });
    const buyer = await register({ name: `PayBuyer${seed}`, phone: rndPhone(), email: `paybuyer${seed}@example.com`, role: "buyer", password: "pw", location: "Accra", buyerType: "retail" });
    const intruder = await register({ name: `PayIntruder${seed}`, phone: rndPhone(), role: "buyer", password: "pw", location: "Accra", buyerType: "retail" });
    await request(app)
      .post("/api/auth/verify").set("Authorization", `Bearer ${buyer.body.token}`)
      .send({ purchaseCrops: ["tomato"], region: "Greater Accra", district: "Ada East", idType: "ghana_card", idNumber: `GHA-${seed.slice(-9)}`, photoUrl: "/uploads/photo.jpg" });
    const listing = await request(app)
      .post("/api/listings").set("Authorization", `Bearer ${farmer.body.token}`)
      .send({ cropType: "tomato", quantity: 10, unit: "crates", askingPrice: price, location: "Kasoa" });
    expect(listing.status).toBe(201);
    const pc = await request(app)
      .post("/api/precommitments").set("Authorization", `Bearer ${buyer.body.token}`)
      .send({ listingId: listing.body.id, quantity: 5, offeredPrice: price });
    expect(pc.status).toBe(201);
    const accept = await request(app)
      .post(`/api/precommitments/${pc.body.id}/respond`).set("Authorization", `Bearer ${farmer.body.token}`)
      .send({ action: "accept" });
    expect(accept.body.status).toBe("accepted");
    return { farmer, buyer, intruder, listing: listing.body, pc: accept.body };
  }

  beforeAll(async () => {
    // Default the suite to deterministic simulated Paystack even when a sandbox key
    // lives in .env (PAYSTACK_SIMULATED is read per request by services/paystack).
    process.env.PAYSTACK_SIMULATED = "1";
    const { token } = await auth.registerWithPassword({ name: "Pay Admin", phone: "0249090001", role: "admin", password: "AgriSmart123!" });
    adminToken = token;
    await resetPayments();
  });

  afterAll(async () => {
    await resetPayments();
    delete process.env.PAYSTACK_SIMULATED;
  });

  test("payments config exposes checkout defaults and simulated mode without keys", async () => {
    const buyer = await register({ name: "CfgBuyer", phone: rndPhone(), role: "buyer", password: "pw", location: "Accra", buyerType: "retail" });
    const res = await request(app).get("/api/payments/config").set("Authorization", `Bearer ${buyer.body.token}`);
    expect(res.status).toBe(200);
    expect(res.body.provider).toBe("paystack");
    expect(res.body.currency).toBe("GHS");
    expect(typeof res.body.escrowEnabled).toBe("boolean");
    expect(res.body.depositPercent).toBe(30);
    expect(res.body.payoutMode).toBe("auto");
    expect(typeof res.body.simulated).toBe("boolean");
    // Test runs never hold Paystack keys, so the flow is deterministic simulated.
    expect(res.body.simulated).toBe(true);
  });

  test("charge settles a deposit and balance in simulated mode; only the buyer may charge", async () => {
    const { farmer, buyer, intruder, pc } = await makePair(200);

    const intrusion = await request(app)
      .post(`/api/transactions/${pc.transactionId}/charge`).set("Authorization", `Bearer ${intruder.body.token}`)
      .send({ kind: "deposit", amount: 40 });
    expect(intrusion.status).toBe(403);

    const deposit = await request(app)
      .post(`/api/transactions/${pc.transactionId}/charge`).set("Authorization", `Bearer ${buyer.body.token}`)
      .send({ kind: "deposit", amount: 40 });
    expect(deposit.status).toBe(200);
    expect(deposit.body.simulated).toBe(true);
    expect(deposit.body.transaction.depositAmount).toBe(40);
    expect(deposit.body.transaction.paymentStatus).toBe("deposited");

    await request(app)
      .post(`/api/precommitments/${pc.id}/fulfill`).set("Authorization", `Bearer ${farmer.body.token}`)
      .send({ step: "ready" });
    await request(app)
      .post(`/api/precommitments/${pc.id}/fulfill`).set("Authorization", `Bearer ${buyer.body.token}`)
      .send({ step: "delivered" });

    const balance = await request(app)
      .post(`/api/transactions/${pc.transactionId}/charge`).set("Authorization", `Bearer ${buyer.body.token}`)
      .send({ kind: "balance" });
    expect(balance.status).toBe(200);
    expect(balance.body.simulated).toBe(true);
    expect(balance.body.transaction.paymentStatus).toBe("paid");
    expect(balance.body.transaction.paidAmount).toBe(960);

    const finished = await request(app).get("/api/precommitments/me").set("Authorization", `Bearer ${buyer.body.token}`);
    expect(finished.body.find((p) => p.id === pc.id).status).toBe("completed");

    const { rows } = await adminPool.query("SELECT kind, status FROM payments WHERE transaction_id = $1", [pc.transactionId]);
    expect(rows.map((r) => r.kind).sort()).toEqual(["balance", "deposit"]);
    expect(rows.every((r) => r.status === "success")).toBe(true);
  });

  test("escrow on: deposit floor enforced, funds held, released to the farmer on completion", async () => {
    await setPayments({ depositPercent: 30 });
    try {
      const { farmer, buyer, pc } = await makePair(200); // floor = 300 (30% of 5 × 200)

      const short = await request(app)
        .post(`/api/transactions/${pc.transactionId}/charge`).set("Authorization", `Bearer ${buyer.body.token}`)
        .send({ kind: "deposit", amount: 10 });
      expect(short.status).toBe(400);
      expect(short.body.error).toMatch(/at least GHS 300/);

      const deposit = await request(app)
        .post(`/api/transactions/${pc.transactionId}/charge`).set("Authorization", `Bearer ${buyer.body.token}`)
        .send({ kind: "deposit" });
      expect(deposit.status).toBe(200);
      expect(deposit.body.simulated).toBe(true);
      expect(deposit.body.transaction.depositAmount).toBe(300);
      expect(deposit.body.transaction.escrowStatus).toBe("funds_collected");
      expect(deposit.body.transaction.escrowAmount).toBe(300);

      await request(app)
        .post(`/api/precommitments/${pc.id}/fulfill`).set("Authorization", `Bearer ${farmer.body.token}`)
        .send({ step: "ready" });
      await request(app)
        .post(`/api/precommitments/${pc.id}/fulfill`).set("Authorization", `Bearer ${buyer.body.token}`)
        .send({ step: "delivered" });

      const balance = await request(app)
        .post(`/api/transactions/${pc.transactionId}/charge`).set("Authorization", `Bearer ${buyer.body.token}`)
        .send({ kind: "balance" });
      expect(balance.status).toBe(200);
      expect(balance.body.transaction.paymentStatus).toBe("paid");
      // Completion released the escrow to the farmer (simulated payout).
      expect(balance.body.transaction.escrowStatus).toBe("released");

      const finished = await request(app).get("/api/precommitments/me").set("Authorization", `Bearer ${buyer.body.token}`);
      expect(finished.body.find((p) => p.id === pc.id).status).toBe("completed");

      const { rows } = await adminPool.query("SELECT kind, status, amount FROM payments WHERE transaction_id = $1", [pc.transactionId]);
      expect(rows.filter((r) => r.kind === "deposit").length).toBe(1);
      expect(rows.filter((r) => r.kind === "balance").length).toBe(1);
      const payout = rows.find((r) => r.kind === "payout");
      expect(payout.status).toBe("success");
      expect(Number(payout.amount)).toBeGreaterThan(0);
    } finally {
      await resetPayments();
    }
  });

  test("webhook requires a signature and tolerates missing event payloads", async () => {
    const missing = await request(app).post("/api/payments/webhook").send({ event: "charge.success", data: { reference: "AGL-none" } });
    expect(missing.status).toBe(403);
    const noEvent = await request(app).post("/api/payments/webhook").send({});
    expect(noEvent.status).toBe(400);
  });
});

describe("listing farm link", () => {
  test("listing links to the farmer's own farm and produce exposes it", async () => {
    const farmer = await register({ name: "FarmLink", phone: "0249921001", role: "farmer", password: "pw", location: "Teso" });
    const buyer = await register({ name: "FarmBuyer", phone: "0249921002", role: "buyer", password: "pw", location: "Accra", buyerType: "retail" });

    const farm = await request(app)
      .post("/api/farms").set("Authorization", `Bearer ${farmer.body.token}`)
      .send({ name: "North plot", cropType: "tomato", stage: "post_harvest", status: "ready", location: "Teso", lat: 5.86, lng: -1.56 });
    expect(farm.status).toBe(201);

    const listing = await request(app)
      .post("/api/listings").set("Authorization", `Bearer ${farmer.body.token}`)
      .send({ cropType: "tomato", quantity: 10, unit: "crates", askingPrice: 120, location: "Teso", farmId: farm.body.id });
    expect(listing.status).toBe(201);
    expect(listing.body.farmId).toBe(farm.body.id);

    const produce = await request(app)
      .get(`/api/produce/${listing.body.id}`).set("Authorization", `Bearer ${buyer.body.token}`);
    expect(produce.status).toBe(200);
    expect(produce.body.farmId).toBe(farm.body.id);
    expect(produce.body.farmName).toBe("North plot");
  });

  test("listing without a farm leaves farmId null, and another farmer's farm is rejected", async () => {
    const farmerA = await register({ name: "FarmA", phone: "0249921003", role: "farmer", password: "pw", location: "Teso" });
    const farmerB = await register({ name: "FarmB", phone: "0249921004", role: "farmer", password: "pw", location: "Ho" });

    const plain = await request(app)
      .post("/api/listings").set("Authorization", `Bearer ${farmerA.body.token}`)
      .send({ cropType: "pepper", quantity: 5, unit: "bags", askingPrice: 60, location: "Teso" });
    expect(plain.status).toBe(201);
    expect(plain.body.farmId).toBeNull();

    const otherFarm = await request(app)
      .post("/api/farms").set("Authorization", `Bearer ${farmerB.body.token}`)
      .send({ name: "B's plot", cropType: "maize", stage: "pre_harvest", location: "Ho" });
    expect(otherFarm.status).toBe(201);

    const rejected = await request(app)
      .post("/api/listings").set("Authorization", `Bearer ${farmerA.body.token}`)
      .send({ cropType: "maize", quantity: 5, unit: "bags", askingPrice: 80, location: "Teso", farmId: otherFarm.body.id });
    expect(rejected.status).toBe(400);
    expect(rejected.body.error).toMatch(/farm/i);
  });
});

describe("listing soft delete", () => {
  test("verified farmer soft-deletes a listing even with offers; row and history are kept", async () => {
    const farmer = await register({ name: "DelFarmer", phone: "0249930020", role: "farmer", password: "pw", location: "Teso" });
    await request(app).post("/api/auth/verify").set("Authorization", `Bearer ${farmer.body.token}`)
      .send({ idType: "ghana_card", idNumber: "GHA-22222222-2", photoUrl: "/uploads/d.jpg", address: "2 Farm Rd" });
    const buyer = await register({ name: "DelBuyer", phone: "0249930021", role: "buyer", password: "pw", location: "Accra", buyerType: "retail" });
    await request(app).post("/api/auth/verify").set("Authorization", `Bearer ${buyer.body.token}`)
      .send({ idType: "passport", idNumber: "P-9021", photoUrl: "/uploads/p.jpg" });

    const listing = await request(app)
      .post("/api/listings").set("Authorization", `Bearer ${farmer.body.token}`)
      .send({ cropType: "pepper", quantity: 6, unit: "bags", askingPrice: 140, location: "Teso", details: "Sun dried" });
    expect(listing.status).toBe(201);

    // Activity exists -> previously this forced a hard-delete refusal; soft delete must still work.
    const pc = await request(app)
      .post("/api/precommitments").set("Authorization", `Bearer ${buyer.body.token}`)
      .send({ listingId: listing.body.id, quantity: 2, offeredPrice: 140 });
    expect(pc.status).toBe(201);

    const del = await request(app)
      .delete(`/api/listings/${listing.body.id}`).set("Authorization", `Bearer ${farmer.body.token}`);
    expect(del.status).toBe(200);
    expect(del.body.status).toBe("deleted");

    // Row is preserved (soft delete) so commitments/history remain intact.
    const row = await request(app)
      .get(`/api/listings/${listing.body.id}`).set("Authorization", `Bearer ${farmer.body.token}`);
    expect(row.status).toBe(200);
    expect(row.body.id).toBe(listing.body.id);
    expect(row.body.status).toBe("deleted");

    // Hidden from the buyer feed, 404 on buyer detail, absent from listing lists.
    const feed = await request(app)
      .get("/api/produce").set("Authorization", `Bearer ${buyer.body.token}`);
    expect(feed.body.find((p) => p.id === listing.body.id)).toBeUndefined();

    const detail = await request(app)
      .get(`/api/produce/${listing.body.id}`).set("Authorization", `Bearer ${buyer.body.token}`);
    expect(detail.status).toBe(404);

    const list = await request(app)
      .get("/api/listings").set("Authorization", `Bearer ${farmer.body.token}`);
    expect(list.body.find((l) => l.id === listing.body.id)).toBeUndefined();

    // An explicit status='deleted' search still sees the (soft-deleted) row.
    const searchDeleted = await request(app)
      .get("/api/listings?status=deleted").set("Authorization", `Bearer ${farmer.body.token}`);
    expect(searchDeleted.body.find((l) => l.id === listing.body.id)).toBeTruthy();
  });

  test("non-owner cannot delete another farmer's listing", async () => {
    const farmerA = await register({ name: "DelA", phone: "0249930022", role: "farmer", password: "pw", location: "Teso" });
    const farmerB = await register({ name: "DelB", phone: "0249930023", role: "farmer", password: "pw", location: "Ho" });

    const listing = await request(app)
      .post("/api/listings").set("Authorization", `Bearer ${farmerB.body.token}`)
      .send({ cropType: "maize", quantity: 4, unit: "bags", askingPrice: 90, location: "Teso" });
    expect(listing.status).toBe(201);

    // farmerA is a verified farmer but not the owner -> 403.
    const notOwner = await request(app)
      .delete(`/api/listings/${listing.body.id}`).set("Authorization", `Bearer ${farmerA.body.token}`);
    expect(notOwner.status).toBe(403);
  });
});

describe("farms CRUD", () => {
  test("only farmers create farms; a farmer can create many and they group by stage", async () => {
    const farmer = await register({ name: "FarmFarmer", phone: "0249930040", role: "farmer", password: "pw", location: "Teso" });
    const buyer = await register({ name: "FarmBuyerCRUD", phone: "0249930041", role: "buyer", password: "pw", location: "Accra", buyerType: "retail" });

    const denied = await request(app)
      .post("/api/farms").set("Authorization", `Bearer ${buyer.body.token}`)
      .send({ name: "Nope", cropType: "maize", stage: "pre_harvest" });
    expect(denied.status).toBe(403);

    const a = await request(app)
      .post("/api/farms").set("Authorization", `Bearer ${farmer.body.token}`)
      .send({ name: "North plot", cropType: "tomato", stage: "pre_harvest", status: "growing", expectedHarvestDate: "2026-12-01" });
    expect(a.status).toBe(201);
    expect(a.body.farmerId).toBe(farmer.body.user.id);

    const b = await request(app)
      .post("/api/farms").set("Authorization", `Bearer ${farmer.body.token}`)
      .send({ name: "East plot", cropType: "maize", stage: "post_harvest", status: "ready" });
    expect(b.status).toBe(201);

    const c = await request(app)
      .post("/api/farms").set("Authorization", `Bearer ${farmer.body.token}`)
      .send({ name: "West plot", cropType: "pepper" });
    expect(c.status).toBe(201);

    const mine = await request(app)
      .get("/api/farms/mine").set("Authorization", `Bearer ${farmer.body.token}`);
    expect(mine.status).toBe(200);
    const all = [...mine.body.preHarvest, ...mine.body.postHarvest];
    expect(all).toHaveLength(3);
    expect(mine.body.preHarvest.find((f) => f.id === a.body.id)).toBeTruthy();
    expect(mine.body.postHarvest.find((f) => f.id === b.body.id)).toBeTruthy();
  });

  test("owner edits a farm; buyers, other farmers, and invalid stages are refused", async () => {
    const farmerA = await register({ name: "EditA", phone: "0249930042", role: "farmer", password: "pw", location: "Teso" });
    const farmerB = await register({ name: "EditB", phone: "0249930043", role: "farmer", password: "pw", location: "Ho" });
    const buyer = await register({ name: "EditBuyer", phone: "0249930044", role: "buyer", password: "pw", location: "Accra", buyerType: "retail" });

    const created = await request(app)
      .post("/api/farms").set("Authorization", `Bearer ${farmerA.body.token}`)
      .send({ name: "Old name", cropType: "yam", stage: "pre_harvest" });
    expect(created.status).toBe(201);

    const byBuyer = await request(app)
      .put(`/api/farms/${created.body.id}`).set("Authorization", `Bearer ${buyer.body.token}`)
      .send({ name: "Hijacked" });
    expect(byBuyer.status).toBe(403);

    const byOther = await request(app)
      .put(`/api/farms/${created.body.id}`).set("Authorization", `Bearer ${farmerB.body.token}`)
      .send({ name: "Hijacked" });
    expect(byOther.status).toBe(403);

    const badStage = await request(app)
      .put(`/api/farms/${created.body.id}`).set("Authorization", `Bearer ${farmerA.body.token}`)
      .send({ stage: "under_water" });
    expect(badStage.status).toBe(400);

    const updated = await request(app)
      .put(`/api/farms/${created.body.id}`).set("Authorization", `Bearer ${farmerA.body.token}`)
      .send({ name: "Renamed plot", cropType: "cassava", status: "ready", imageUrl: "/uploads/f.jpg", location: "Teso" });
    expect(updated.status).toBe(200);
    expect(updated.body.name).toBe("Renamed plot");
    expect(updated.body.cropType).toBe("cassava");
    expect(updated.body.status).toBe("ready");
  });

  test("soft delete hides the farm but keeps the row; deleted farms can't be re-linked", async () => {
    const farmer = await register({ name: "DelFarm", phone: "0249930045", role: "farmer", password: "pw", location: "Teso" });

    const farm = await request(app)
      .post("/api/farms").set("Authorization", `Bearer ${farmer.body.token}`)
      .send({ name: "Doomed plot", cropType: "onion", stage: "pre_harvest" });
    expect(farm.status).toBe(201);

    const del = await request(app)
      .delete(`/api/farms/${farm.body.id}`).set("Authorization", `Bearer ${farmer.body.token}`);
    expect(del.status).toBe(200);
    expect(del.body.deletedAt).toBeTruthy();

    const pub = await request(app).get(`/api/farms/${farm.body.id}`);
    expect(pub.status).toBe(404);

    const mine = await request(app)
      .get("/api/farms/mine").set("Authorization", `Bearer ${farmer.body.token}`);
    const all = [...mine.body.preHarvest, ...mine.body.postHarvest];
    expect(all.find((f) => f.id === farm.body.id)).toBeUndefined();

    const listing = await request(app)
      .post("/api/listings").set("Authorization", `Bearer ${farmer.body.token}`)
      .send({ cropType: "onion", quantity: 5, unit: "bags", askingPrice: 60, location: "Teso", farmId: farm.body.id });
    expect(listing.status).toBe(400);
    expect(listing.body.error).toMatch(/farm/i);
  });
});

describe("admin endpoints", () => {
  const auth = require("../src/services/auth");

  test("non-admins are forbidden from every admin route", async () => {
    const farmer = await register({ name: "AdminNoFarmer", phone: "0249980010", role: "farmer", password: "pw", location: "Teso" });
    const buyer = await register({ name: "AdminNoBuyer", phone: "0249980011", role: "buyer", password: "pw", location: "Accra", buyerType: "retail" });

    const adminOnly = [
      ["get", "/api/users"],
      ["get", "/api/users/user-croptype"],
      ["get", "/api/crops/all"],
      ["post", "/api/crops"],
      ["get", "/api/units/all"],
      ["get", "/api/prices/all"],
      ["get", "/api/farms/all"],
      ["get", "/api/listings/all"],
      ["get", "/api/transactions/all"],
      ["get", "/api/precommitments/all"],
      ["get", "/api/notifications"],
      ["patch", "/api/users/some-user-id/verified"],
      ["patch", "/api/users/some-user-id/role"],
      ["put", "/api/users/some-user-id/crops"],
    ];
    for (const token of [farmer.body.token, buyer.body.token]) {
      for (const [method, path] of adminOnly) {
        const res = await request(app)[method](path).set("Authorization", `Bearer ${token}`);
        expect(res.status).toBe(403);
      }
    }
  });

  test("admin lists users with role/verified/search filters and embedded verification", async () => {
    const { token } = await auth.registerWithPassword({
      name: "Users Admin", phone: "0249980020", email: "usersadmin@agrismart.gh", role: "admin", password: "AgriSmart123!",
    });
    const buyer = await register({ name: "FilterBuyerZX", phone: "0249980021", role: "buyer", password: "pw", location: "Accra", buyerType: "retail" });
    await register({ name: "FilterFarmerZX", phone: "0249980022", role: "farmer", password: "pw", location: "Teso" });
    expect(buyer.body.user.verified).toBe(false);

    // Complete buyer verification -> a buyer_verifications row is stored.
    const verify = await request(app)
      .post("/api/auth/verify").set("Authorization", `Bearer ${buyer.body.token}`)
      .send({
        purchaseCrops: ["maize"], region: "Greater Accra", district: "Accra Metropolis",
        gpsAddress: "GA-123-9999", address: "1 Main Rd", community: "Accra",
        idType: "ghana_card", idNumber: "GHA-87654321-9", photoUrl: "/uploads/b.jpg",
        lat: 5.6301, lng: -0.184,
      });
    expect(verify.status).toBe(200);

    // role filter
    const buyers = await request(app).get("/api/users?role=buyer").set("Authorization", `Bearer ${token}`);
    expect(buyers.status).toBe(200);
    const filterBuyer = buyers.body.find((u) => u.id === buyer.body.user.id);
    expect(filterBuyer).toBeTruthy();
    expect(filterBuyer.verification).toMatchObject({
      idType: "ghana_card", idNumber: expect.stringContaining("3219"), photoUrl: "/uploads/b.jpg",
      lat: 5.6301, lng: -0.184,
    });
    expect(filterBuyer.verification.submittedAt).toBeTruthy();

    // search filter
    const byQ = await request(app).get("/api/users?q=FilterBuyerZX").set("Authorization", `Bearer ${token}`);
    expect(byQ.body.find((u) => u.id === buyer.body.user.id)).toBeTruthy();

    // verified filter (+ role) - only the verified buyer matches
    const verified = await request(app)
      .get("/api/users?role=buyer&verified=true").set("Authorization", `Bearer ${token}`);
    expect(verified.body.map((u) => u.id)).toContain(buyer.body.user.id);

    // users without verification embed null
    const unverified = await request(app)
      .get("/api/users?role=buyer&verified=false").set("Authorization", `Bearer ${token}`);
    expect(unverified.body.some((u) => u.verification === null)).toBe(true);

    // revoke -> restores -> lost again
    const revoke = await request(app)
      .patch(`/api/users/${buyer.body.user.id}/verified`).set("Authorization", `Bearer ${token}`)
      .send({ verified: false });
    expect(revoke.status).toBe(200);
    expect(revoke.body.verified).toBe(false);

    const restore = await request(app)
      .patch(`/api/users/${buyer.body.user.id}/verified`).set("Authorization", `Bearer ${token}`)
      .send({ verified: true });
    expect(restore.body.verified).toBe(true);

    const badFlag = await request(app)
      .patch(`/api/users/${buyer.body.user.id}/verified`).set("Authorization", `Bearer ${token}`)
      .send({ verified: "yes" });
    expect(badFlag.status).toBe(400);

    const missing = await request(app)
      .patch("/api/users/nope/verified").set("Authorization", `Bearer ${token}`)
      .send({ verified: false });
    expect(missing.status).toBe(404);
  });

  test("admin changes a user's role", async () => {
    const { token } = await auth.registerWithPassword({
      name: "Role Admin", phone: "0249980030", email: "roleadmin@agrismart.gh", role: "admin", password: "AgriSmart123!",
    });
    const user = await register({ name: "RoleSwapUser", phone: "0249980031", role: "buyer", password: "pw", location: "Accra", buyerType: "retail" });

    const promoted = await request(app)
      .patch(`/api/users/${user.body.user.id}/role`).set("Authorization", `Bearer ${token}`)
      .send({ role: "transporter" });
    expect(promoted.status).toBe(200);
    expect(promoted.body.role).toBe("transporter");

    const bad = await request(app)
      .patch(`/api/users/${user.body.user.id}/role`).set("Authorization", `Bearer ${token}`)
      .send({ role: "wizard" });
    expect(bad.status).toBe(400);
  });

  test("admin assigns crops and the user_croptype registry reflects the assignment", async () => {
    const { token } = await auth.registerWithPassword({
      name: "Crops Admin", phone: "0249980040", email: "cropsadmin@agrismart.gh", role: "admin", password: "AgriSmart123!",
    });
    const farmer = await register({
      name: "AssignCropsFarmer", phone: "0249980041", role: "farmer", password: "pw",
      location: "Teso", primaryCrops: ["tomato", "Tiger Nuts"],
    });

    let registry = await request(app)
      .get("/api/users/user-croptype").set("Authorization", `Bearer ${token}`);
    expect(registry.status).toBe(200);
    const mine = registry.body.filter((r) => r.userId === farmer.body.user.id);
    expect(mine.map((r) => `${r.kind}:${r.crop}`).sort()).toEqual(["primary:tiger nuts", "primary:tomato"]);
    expect(mine.find((r) => r.crop === "tiger nuts").custom).toBe(true);
    expect(mine.find((r) => r.crop === "tomato").custom).toBe(false);

    const assigned = await request(app)
      .put(`/api/users/${farmer.body.user.id}/crops`).set("Authorization", `Bearer ${token}`)
      .send({ primaryCrops: ["maize"], purchaseCrops: ["rice"] });
    expect(assigned.status).toBe(200);
    expect(assigned.body.primaryCrops).toEqual(["maize"]);
    expect(assigned.body.purchaseCrops).toEqual(["rice"]);

    registry = await request(app)
      .get("/api/users/user-croptype").set("Authorization", `Bearer ${token}`);
    const after = registry.body.filter((r) => r.userId === farmer.body.user.id);
    expect(after.map((r) => `${r.kind}:${r.crop}`).sort()).toEqual(["primary:maize", "purchase:rice"]);

    const noArrays = await request(app)
      .put(`/api/users/${farmer.body.user.id}/crops`).set("Authorization", `Bearer ${token}`)
      .send({ crop: "x" });
    expect(noArrays.status).toBe(400);

    const missing = await request(app)
      .put("/api/users/nope/crops").set("Authorization", `Bearer ${token}`)
      .send({ primaryCrops: ["maize"] });
    expect(missing.status).toBe(404);
  });

  test("crops: admin CRUD incl. deactivate, re-activate, rename, and delete", async () => {
    const { token } = await auth.registerWithPassword({
      name: "Crop Admin", phone: "0249980042", email: "cropadmin@agrismart.gh", role: "admin", password: "AgriSmart123!",
    });
    const farmer = await register({ name: "CropNoFarmer", phone: "0249980043", role: "farmer", password: "pw", location: "Teso" });

    const forbidden = await request(app)
      .post("/api/crops").set("Authorization", `Bearer ${farmer.body.token}`)
      .send({ name: "Nope" });
    expect(forbidden.status).toBe(403);

    const created = await request(app)
      .post("/api/crops").set("Authorization", `Bearer ${token}`)
      .send({ name: "Tiger Nuts", defaultUnit: "bags" });
    expect(created.status).toBe(201);
    expect(created.body).toMatchObject({ id: "tiger nuts", name: "Tiger Nuts", active: true });

    const pub = await request(app).get("/api/crops");
    expect(pub.body.find((c) => c.id === "tiger nuts")).toBeTruthy();

    // Deactivate -> hidden from the public list, still visible to admin.
    await request(app).put("/api/crops/tiger nuts").set("Authorization", `Bearer ${token}`).send({ active: false });
    const pub2 = await request(app).get("/api/crops");
    expect(pub2.body.find((c) => c.id === "tiger nuts")).toBeUndefined();
    const all = await request(app).get("/api/crops/all").set("Authorization", `Bearer ${token}`);
    expect(all.body.find((c) => c.id === "tiger nuts")).toMatchObject({ active: false });

    // POST again re-activates the archived crop.
    const revive = await request(app)
      .post("/api/crops").set("Authorization", `Bearer ${token}`)
      .send({ name: "Tiger Nuts" });
    expect(revive.status).toBe(201);
    expect(revive.body.active).toBe(true);

    const renamed = await request(app)
      .put("/api/crops/tiger nuts").set("Authorization", `Bearer ${token}`)
      .send({ name: "Tiger Nuts Plus", displayOrder: 99 });
    expect(renamed.body).toMatchObject({ id: "tiger nuts", name: "Tiger Nuts Plus", displayOrder: 99 });

    const deleted = await request(app).delete("/api/crops/tiger nuts").set("Authorization", `Bearer ${token}`);
    expect(deleted.status).toBe(200);
    const gone = await request(app).delete("/api/crops/tiger nuts").set("Authorization", `Bearer ${token}`);
    expect(gone.status).toBe(404);

    const missing = await request(app).put("/api/crops/nope").set("Authorization", `Bearer ${token}`).send({ name: "X" });
    expect(missing.status).toBe(404);
  });

  test("units: admin CRUD mirrors crops", async () => {
    const { token } = await auth.registerWithPassword({
      name: "Unit Admin", phone: "0249980044", email: "unitadmin@agrismart.gh", role: "admin", password: "AgriSmart123!",
    });
    const farmer = await register({ name: "UnitNoFarmer", phone: "0249980045", role: "farmer", password: "pw", location: "Teso" });

    const forbidden = await request(app)
      .post("/api/units").set("Authorization", `Bearer ${farmer.body.token}`)
      .send({ name: "Sack" });
    expect(forbidden.status).toBe(403);

    const created = await request(app)
      .post("/api/units").set("Authorization", `Bearer ${token}`)
      .send({ name: "Sack", plural: "sacks", displayOrder: 50 });
    expect(created.status).toBe(201);
    expect(created.body).toMatchObject({ id: "sack", active: true });

    let pub = await request(app).get("/api/units");
    expect(pub.body.find((u) => u.id === "sack")).toBeTruthy();

    await request(app).put("/api/units/sack").set("Authorization", `Bearer ${token}`).send({ active: false });
    pub = await request(app).get("/api/units");
    expect(pub.body.find((u) => u.id === "sack")).toBeUndefined();
    const all = await request(app).get("/api/units/all").set("Authorization", `Bearer ${token}`);
    expect(all.body.find((u) => u.id === "sack").active).toBe(false);

    const revive = await request(app)
      .post("/api/units").set("Authorization", `Bearer ${token}`)
      .send({ name: "Sack" });
    expect(revive.body.active).toBe(true);

    const renamed = await request(app)
      .put("/api/units/sack").set("Authorization", `Bearer ${token}`)
      .send({ plural: "sacks!" });
    expect(renamed.body.plural).toBe("sacks!");

    expect((await request(app).delete("/api/units/sack").set("Authorization", `Bearer ${token}`)).status).toBe(200);
    expect((await request(app).delete("/api/units/sack").set("Authorization", `Bearer ${token}`)).status).toBe(404);
    const bad = await request(app).post("/api/units").set("Authorization", `Bearer ${token}`).send({ name: "  " });
    expect(bad.status).toBe(400);
  });

  test("prices: admin CRUD, filters, and public current price updates", async () => {
    const { token } = await auth.registerWithPassword({
      name: "Price Admin", phone: "0249980046", email: "priceadmin@agrismart.gh", role: "admin", password: "AgriSmart123!",
    });
    const farmer = await register({ name: "PriceNoFarmer", phone: "0249980047", role: "farmer", password: "pw", location: "Teso" });

    const forbidden = await request(app)
      .post("/api/prices").set("Authorization", `Bearer ${farmer.body.token}`)
      .send({ cropType: "garden eggs", market: "Makola", price: 10 });
    expect(forbidden.status).toBe(403);

    const created = await request(app)
      .post("/api/prices").set("Authorization", `Bearer ${token}`)
      .send({ cropType: "Garden Eggs", market: "Makola", price: 25.5 });
    expect(created.status).toBe(201);
    expect(created.body.cropType).toBe("garden eggs");

    const current = await request(app).get("/api/prices/current?cropType=garden%20eggs&market=Makola");
    expect(current.body.averagePrice).toBe(25.5);

    const all = await request(app).get("/api/prices/all?cropType=garden%20eggs").set("Authorization", `Bearer ${token}`);
    expect(all.body.length).toBeGreaterThanOrEqual(1);
    expect(all.body[0]).toMatchObject({ cropType: "garden eggs", market: "Makola", price: 25.5 });

    const noMarket = await request(app)
      .post("/api/prices").set("Authorization", `Bearer ${token}`)
      .send({ cropType: "maize", price: 5 });
    expect(noMarket.status).toBe(400);

    const badPrice = await request(app)
      .post("/api/prices").set("Authorization", `Bearer ${token}`)
      .send({ cropType: "maize", market: "Kumasi", price: -4 });
    expect(badPrice.status).toBe(400);

    const updated = await request(app)
      .put(`/api/prices/${created.body.id}`).set("Authorization", `Bearer ${token}`)
      .send({ price: 30 });
    expect(updated.body.price).toBe(30);

    expect((await request(app).delete(`/api/prices/${created.body.id}`).set("Authorization", `Bearer ${token}`)).status).toBe(200);
    expect((await request(app).delete(`/api/prices/${created.body.id}`).set("Authorization", `Bearer ${token}`)).status).toBe(404);
  });

  test("farms: admin sees all farms incl. soft-deleted and can edit/delete any farm", async () => {
    const { token } = await auth.registerWithPassword({
      name: "Farm Admin", phone: "0249980048", email: "farmadmin@agrismart.gh", role: "admin", password: "AgriSmart123!",
    });
    const farmer1 = await register({ name: "AdminFarmOne", phone: "0249980049", role: "farmer", password: "pw", location: "Teso" });
    const farmer2 = await register({ name: "AdminFarmTwo", phone: "0249980050", role: "farmer", password: "pw", location: "Ho" });

    const a = await request(app)
      .post("/api/farms").set("Authorization", `Bearer ${farmer1.body.token}`)
      .send({ name: "Admin plot A", cropType: "maize", stage: "pre_harvest" });
    const b = await request(app)
      .post("/api/farms").set("Authorization", `Bearer ${farmer2.body.token}`)
      .send({ name: "Admin plot B", cropType: "yam", stage: "post_harvest" });
    expect(a.status).toBe(201);
    expect(b.status).toBe(201);

    const all = await request(app).get("/api/farms/all").set("Authorization", `Bearer ${token}`);
    expect(all.status).toBe(200);
    expect(all.body.find((f) => f.id === a.body.id)).toMatchObject({ name: "Admin plot A", farmerName: "AdminFarmOne" });

    // Owner soft-deletes A -> still visible to admin with deletedAt.
    await request(app).delete(`/api/farms/${a.body.id}`).set("Authorization", `Bearer ${farmer1.body.token}`);
    const all2 = await request(app).get("/api/farms/all").set("Authorization", `Bearer ${token}`);
    expect(all2.body.find((f) => f.id === a.body.id).deletedAt).toBeTruthy();

    // Admin edits B despite not owning it (reason required).
    const edited = await request(app)
      .put(`/api/farms/${b.body.id}`).set("Authorization", `Bearer ${token}`)
      .send({ name: "Admin renamed B", status: "ready", reason: "admin correction" });
    expect(edited.status).toBe(200);
    expect(edited.body.name).toBe("Admin renamed B");

    // Admin soft-deletes B (reason required).
    const delB = await request(app)
      .delete(`/api/farms/${b.body.id}`).set("Authorization", `Bearer ${token}`)
      .send({ reason: "admin cleanup" });
    expect(delB.status).toBe(200);
    expect(delB.body.deletedAt).toBeTruthy();

    const buyer = await register({ name: "FarmNoBuyer", phone: "0249980051", role: "buyer", password: "pw", location: "Accra", buyerType: "retail" });
    const forbidden = await request(app).get("/api/farms/all").set("Authorization", `Bearer ${buyer.body.token}`);
    expect(forbidden.status).toBe(403);
  });

  test("listings: admin sees all incl. deleted, can force status and delete any", async () => {
    const { token } = await auth.registerWithPassword({
      name: "List Admin", phone: "0249980052", email: "listadmin@agrismart.gh", role: "admin", password: "AgriSmart123!",
    });
    const farmer = await register({ name: "AdminListFarmer", phone: "0249980053", role: "farmer", password: "pw", location: "Teso" });

    const listing = await request(app)
      .post("/api/listings").set("Authorization", `Bearer ${farmer.body.token}`)
      .send({ cropType: "pepper", quantity: 8, unit: "bags", askingPrice: 90, location: "Teso" });
    expect(listing.status).toBe(201);

    const all = await request(app).get("/api/listings/all").set("Authorization", `Bearer ${token}`);
    expect(all.body.find((l) => l.id === listing.body.id)).toMatchObject({ cropType: "pepper", status: "open" });

    // Owner soft-deletes -> hidden publicly, still visible to admin as 'deleted'.
    await request(app).delete(`/api/listings/${listing.body.id}`).set("Authorization", `Bearer ${farmer.body.token}`);
    const pub = await request(app).get("/api/listings");
    expect(pub.body.find((l) => l.id === listing.body.id)).toBeUndefined();
    const all2 = await request(app).get("/api/listings/all?status=deleted").set("Authorization", `Bearer ${token}`);
    expect(all2.body.find((l) => l.id === listing.body.id)).toMatchObject({ status: "deleted" });

    // Admin can flip it back to open (any status allowed) and soft-delete any listing.
    const reopened = await request(app)
      .patch(`/api/listings/${listing.body.id}/status`).set("Authorization", `Bearer ${token}`)
      .send({ status: "open" });
    expect(reopened.status).toBe(200);
    expect(reopened.body.status).toBe("open");

    const badStatus = await request(app)
      .patch(`/api/listings/${listing.body.id}/status`).set("Authorization", `Bearer ${farmer.body.token}`)
      .send({ status: "deleted" });
    expect(badStatus.status).toBe(400); // owners may only use open/deactivated

    await request(app)
      .delete(`/api/listings/${listing.body.id}`).set("Authorization", `Bearer ${token}`)
      .send({ reason: "admin removal" });
    const all3 = await request(app).get("/api/listings/all").set("Authorization", `Bearer ${token}`);
    expect(all3.body.find((l) => l.id === listing.body.id).status).toBe("deleted");

    const forbidden = await request(app).get("/api/listings/all").set("Authorization", `Bearer ${farmer.body.token}`);
    expect(forbidden.status).toBe(403);
  });

  test("transactions: admin lists all across users with names + paymentStatus filter", async () => {
    const { token } = await auth.registerWithPassword({
      name: "Tx Admin", phone: "0249980054", email: "txadmin@agrismart.gh", role: "admin", password: "AgriSmart123!",
    });
    const farmer = await register({ name: "TxAdminFarmer", phone: "0249980055", role: "farmer", password: "pw", location: "Teso" });
    const buyer = await register({ name: "TxAdminBuyer", phone: "0249980056", role: "buyer", password: "pw", location: "Accra", buyerType: "retail" });
    await request(app)
      .post("/api/auth/verify").set("Authorization", `Bearer ${buyer.body.token}`)
      .send({ idType: "passport", idNumber: "P123456", photoUrl: "/uploads/tx.jpg" });

    const listing = await request(app)
      .post("/api/listings").set("Authorization", `Bearer ${farmer.body.token}`)
      .send({ cropType: "tomato", quantity: 3, unit: "crates", askingPrice: 45, location: "Teso" });
    const made = await request(app)
      .post("/api/transactions").set("Authorization", `Bearer ${farmer.body.token}`)
      .send({ listingId: listing.body.id, buyerId: buyer.body.user.id, agreedPrice: 40 });
    expect(made.status).toBe(201);

    const all = await request(app).get("/api/transactions/all").set("Authorization", `Bearer ${token}`);
    expect(all.status).toBe(200);
    const tx = all.body.find((t) => t.id === made.body.id);
    expect(tx).toMatchObject({
      cropType: "tomato",
      agreedPrice: 40,
      buyer: { name: "TxAdminBuyer" },
      farmer: { name: "TxAdminFarmer" },
    });

    const pending = await request(app).get("/api/transactions/all?paymentStatus=pending").set("Authorization", `Bearer ${token}`);
    expect(pending.body.find((t) => t.id === made.body.id)).toBeTruthy();
    const paid = await request(app).get("/api/transactions/all?paymentStatus=paid").set("Authorization", `Bearer ${token}`);
    expect(paid.body.find((t) => t.id === made.body.id)).toBeUndefined();

    const forbidden = await request(app).get("/api/transactions/all").set("Authorization", `Bearer ${buyer.body.token}`);
    expect(forbidden.status).toBe(403);
  });

  test("precommitments: admin lists all enriched across users + status filter", async () => {
    const { token } = await auth.registerWithPassword({
      name: "Precommit Admin", phone: "0249980057", email: "pcadmin@agrismart.gh", role: "admin", password: "AgriSmart123!",
    });
    const farmer = await register({ name: "PCAdminFarmer", phone: "0249980058", role: "farmer", password: "pw", location: "Teso" });
    const buyer = await register({ name: "PCAdminBuyer", phone: "0249980059", role: "buyer", password: "pw", location: "Accra", buyerType: "retail" });
    await request(app)
      .post("/api/auth/verify").set("Authorization", `Bearer ${buyer.body.token}`)
      .send({ idType: "voter_card", idNumber: "V000000011", photoUrl: "/uploads/pc.jpg" });

    const listing = await request(app)
      .post("/api/listings").set("Authorization", `Bearer ${farmer.body.token}`)
      .send({ cropType: "maize", quantity: 6, unit: "bags", askingPrice: 100, location: "Teso" });
    const pc = await request(app)
      .post("/api/precommitments").set("Authorization", `Bearer ${buyer.body.token}`)
      .send({ listingId: listing.body.id, quantity: 4, offeredPrice: 95 });
    expect(pc.status).toBe(201);

    const all = await request(app).get("/api/precommitments/all").set("Authorization", `Bearer ${token}`);
    expect(all.status).toBe(200);
    const row = all.body.find((p) => p.id === pc.body.id);
    expect(row).toMatchObject({
      status: "pending",
      buyer: { name: "PCAdminBuyer" },
      farmer: { name: "PCAdminFarmer" },
      listing: { cropType: "maize", quantity: 6, unit: "bags" },
    });

    const pending = await request(app).get("/api/precommitments/all?status=pending").set("Authorization", `Bearer ${token}`);
    expect(pending.body.find((p) => p.id === pc.body.id)).toBeTruthy();
    const accepted = await request(app).get("/api/precommitments/all?status=accepted").set("Authorization", `Bearer ${token}`);
    expect(accepted.body.find((p) => p.id === pc.body.id)).toBeUndefined();

    const forbidden = await request(app).get("/api/precommitments/all").set("Authorization", `Bearer ${buyer.body.token}`);
    expect(forbidden.status).toBe(403);
  });

  test("notifications: admin outbox is camelCased and filters; non-admin is 403", async () => {
    const { token } = await auth.registerWithPassword({
      name: "Notify Admin", phone: "0249980060", email: "notifyadmin@agrismart.gh", role: "admin", password: "AgriSmart123!",
    });
    const farmer = await register({ name: "NotifyFarmer", phone: "0249980061", role: "farmer", password: "pw", location: "Teso" });
    const buyer = await register({ name: "NotifyBuyer", phone: "0249980062", role: "buyer", password: "pw", location: "Accra", buyerType: "retail" });
    await request(app)
      .post("/api/auth/verify").set("Authorization", `Bearer ${buyer.body.token}`)
      .send({ idType: "ghana_card", idNumber: "GHA-11112222-9", photoUrl: "/uploads/n.jpg" });

    // Buyer precommits -> an SMS notification is logged to the farmer.
    const listing = await request(app)
      .post("/api/listings").set("Authorization", `Bearer ${farmer.body.token}`)
      .send({ cropType: "onion", quantity: 2, unit: "bags", askingPrice: 30, location: "Teso" });
    await request(app)
      .post("/api/precommitments").set("Authorization", `Bearer ${buyer.body.token}`)
      .send({ listingId: listing.body.id, quantity: 1, offeredPrice: 30 });

    const sms = await request(app).get("/api/notifications?channel=sms").set("Authorization", `Bearer ${token}`);
    expect(sms.status).toBe(200);
    expect(sms.body.length).toBeGreaterThanOrEqual(1);
    const allSms = sms.body.filter((n) => n.channel === "sms");
    expect(allSms.length).toBe(sms.body.length);
    expect(allSms.every((n) => "toPhone" in n && "message" in n && "sentAt" in n)).toBe(true);
    expect(sms.body.find((n) => n.toPhone === "+233249980061" && n.messageKey === "precommit_offer")).toBeTruthy();

    const undelivered = await request(app).get("/api/notifications?delivered=false").set("Authorization", `Bearer ${token}`);
    expect(undelivered.body.every((n) => n.delivered === false)).toBe(true);

    const forbidden = await request(app).get("/api/notifications").set("Authorization", `Bearer ${buyer.body.token}`);
    expect(forbidden.status).toBe(403);
  });

  test("notifications: admin broadcasts to farmers via in-app + sms; users read their inbox", async () => {
    const { token } = await auth.registerWithPassword({
      name: "Broadcast Admin", phone: "0249980090", email: "broadcastadmin@agrismart.gh", role: "admin", password: "AgriSmart123!",
    });
    const farmer = await register({ name: "BroadcastFarmer", phone: "0249980091", email: "broadcastfarmer@agrismart.gh", role: "farmer", password: "pw", location: "Teso" });

    // Validation failures first.
    const noMessage = await request(app)
      .post("/api/notifications/broadcast").set("Authorization", `Bearer ${token}`)
      .send({ audience: "farmers", channels: ["in_app"], message: "   " });
    expect(noMessage.status).toBe(400);

    const badAudience = await request(app)
      .post("/api/notifications/broadcast").set("Authorization", `Bearer ${token}`)
      .send({ audience: "robot", channels: ["sms"], message: "hi" });
    expect(badAudience.status).toBe(400);

    const forbidden = await request(app)
      .post("/api/notifications/broadcast").set("Authorization", `Bearer ${farmer.body.token}`)
      .send({ audience: "farmers", channels: ["in_app"], message: "hi" });
    expect(forbidden.status).toBe(403);

    // Broadcast targets every active farmer in the DB, so assert minimums only.
    const broadcast = await request(app)
      .post("/api/notifications/broadcast").set("Authorization", `Bearer ${token}`)
      .send({ audience: "farmers", channels: ["in_app", "sms", "email"], title: "Harvest sale", message: "Big harvest sale at Kasoa!" });
    expect(broadcast.status).toBe(200);
    expect(broadcast.body.audience).toBe("farmers");
    expect(broadcast.body.recipients).toBeGreaterThanOrEqual(1);
    expect(broadcast.body.counts.in_app).toBeGreaterThanOrEqual(1);
    expect(broadcast.body.counts.sms).toBeGreaterThanOrEqual(1);
    expect(broadcast.body.counts.email).toBeGreaterThanOrEqual(1);

    // The farmer's inbox has the broadcast with a title, unread.
    const inbox = await request(app).get("/api/notifications/me").set("Authorization", `Bearer ${farmer.body.token}`);
    expect(inbox.status).toBe(200);
    const mine = inbox.body.notifications.find((n) => n.message === "Big harvest sale at Kasoa!");
    expect(mine).toBeTruthy();
    expect(mine.title).toBe("Harvest sale");
    expect(mine.read).toBe(false);
    expect(inbox.body.unread).toBeGreaterThanOrEqual(1);

    // Non-admin still cannot read another user's inbox / admin outbox.
    const adminOutboxForFarmer = await request(app).get("/api/notifications").set("Authorization", `Bearer ${farmer.body.token}`);
    expect(adminOutboxForFarmer.status).toBe(403);

    // Marking read clears the unread count for in-app rows.
    const mark = await request(app).post("/api/notifications/me/read").set("Authorization", `Bearer ${farmer.body.token}`);
    expect(mark.status).toBe(200);
    expect(mark.body.marked).toBeGreaterThanOrEqual(1);
    const after = await request(app).get("/api/notifications/me").set("Authorization", `Bearer ${farmer.body.token}`);
    expect(after.body.unread).toBe(0);
    expect(after.body.notifications.every((n) => n.read)).toBe(true);
  });

  test("notifications: broadcast skips and counts invalid phone / email contacts", async () => {
    const { token } = await auth.registerWithPassword({
      name: "Clean Admin", phone: "0249990071", email: "cleanadmin@agrismart.gh", role: "admin", password: "AgriSmart123!",
    });

    // A deliverable farmer so at least one real send happens this run.
    const good = await register({ name: "GoodFarmer", phone: "0249990072", email: "goodfarmer@agrismart.gh", role: "farmer", password: "pw", location: "Kasoa" });
    expect(good.status).toBe(201);
    const goodId = good.body.user.id;

    // Dirty contacts inserted directly — registration would reject these, but the
    // live DB has such rows (e.g. "4244423", "fwwwrwer") from other entry points.
    const stamp = Date.now();
    await adminPool.query(
      `INSERT INTO users (id, name, phone, email, role, verified) VALUES ($1,$2,$3,$4,'farmer', true)`,
      [`dirty-phone-${stamp}`, "DirtyPhone Farmer", "4244423", `dirtyphone-${stamp}@agrismart.gh`]
    );
    await adminPool.query(
      `INSERT INTO users (id, name, phone, email, role, verified) VALUES ($1,$2,$3,$4,'farmer', true)`,
      [`dirty-email-${stamp}`, "DirtyEmail Farmer", null, "fwwwrwer"]
    );

    const res = await request(app)
      .post("/api/notifications/broadcast").set("Authorization", `Bearer ${token}`)
      .send({ audience: "farmers", channels: ["in_app", "sms", "email"], title: "Validated send", message: "Contact check" });
    expect(res.status).toBe(200);
    expect(res.body.recipients).toBeGreaterThanOrEqual(3);
    expect(res.body.counts.in_app).toBeGreaterThanOrEqual(3);
    // The two dirty contacts are reported rather than sent.
    expect(res.body.counts.invalidPhones).toBeGreaterThanOrEqual(1);
    expect(res.body.counts.invalidEmails).toBeGreaterThanOrEqual(1);

    // The dirty phone never produced an SMS row, the dirty email no email row.
    const smsRows = (await adminPool.query("SELECT count(*)::int AS n FROM notifications WHERE to_phone = '4244423' AND channel = 'sms'")).rows[0].n;
    expect(smsRows).toBe(0);
    const emailRows = (await adminPool.query("SELECT count(*)::int AS n FROM notifications WHERE to_email = 'fwwwrwer' AND channel = 'email'")).rows[0].n;
    expect(emailRows).toBe(0);

    // The good farmer still received all three channels; in-app rows are delivered=true.
    const goodRows = (await adminPool.query(
      "SELECT channel, delivered FROM notifications WHERE user_id = $1 AND message = 'Contact check'", [goodId]
    )).rows;
    const goodChannels = goodRows.map((r) => r.channel);
    expect(goodChannels).toEqual(expect.arrayContaining(["in_app", "sms", "email"]));
    expect(goodRows.find((r) => r.channel === "in_app").delivered).toBe(true);
  });

  test("farms: admin can restore a soft-deleted farm; owner cannot", async () => {
    const { token } = await auth.registerWithPassword({
      name: "Restore Admin", phone: "0249980063", email: "restoreadmin@agrismart.gh", role: "admin", password: "AgriSmart123!",
    });
    const farmer = await register({ name: "RestoreFarmer", phone: "0249980064", role: "farmer", password: "pw", location: "Teso" });
    const created = await request(app)
      .post("/api/farms").set("Authorization", `Bearer ${farmer.body.token}`)
      .send({ name: "Restore me", cropType: "maize", stage: "pre_harvest" });
    expect(created.status).toBe(201);

    await request(app).delete(`/api/farms/${created.body.id}`).set("Authorization", `Bearer ${farmer.body.token}`);
    const gone = await request(app).get("/api/farms/all").set("Authorization", `Bearer ${token}`);
    expect(gone.body.find((f) => f.id === created.body.id).deletedAt).toBeTruthy();

    const ownerRestore = await request(app)
      .patch(`/api/farms/${created.body.id}/restore`).set("Authorization", `Bearer ${farmer.body.token}`);
    expect(ownerRestore.status).toBe(403);

    const restored = await request(app)
      .patch(`/api/farms/${created.body.id}/restore`).set("Authorization", `Bearer ${token}`);
    expect(restored.status).toBe(200);
    expect(restored.body.deletedAt).toBeFalsy();

    const again = await request(app)
      .patch(`/api/farms/${created.body.id}/restore`).set("Authorization", `Bearer ${token}`);
    expect(again.status).toBe(404); // already active -> nothing to restore

    const missing = await request(app)
      .patch("/api/farms/00000000-0000-4000-8000-000000000000/restore").set("Authorization", `Bearer ${token}`);
    expect(missing.status).toBe(404);
  });

  test("transport: admin assigns a specific transporter and can change status", async () => {
    const { token } = await auth.registerWithPassword({
      name: "Tr Admin", phone: "0249980065", email: "theadmin@agrismart.gh", role: "admin", password: "AgriSmart123!",
    });
    const farmer = await register({ name: "TrFarmer", phone: "0249980066", role: "farmer", password: "pw", location: "Teso" });
    const skipper = await auth.registerWithPassword({
      name: "TrDriver", phone: "0249980067", role: "transporter", password: "AgriSmart123!",
    });

    const created = await request(app)
      .post("/api/transport-requests").set("Authorization", `Bearer ${farmer.body.token}`)
      .send({ pickupLocation: "Teso main market", requestedDate: "2026-09-10" });
    expect(created.status).toBe(201);

    const assigned = await request(app)
      .post(`/api/transport-requests/${created.body.id}/assign`).set("Authorization", `Bearer ${token}`)
      .send({ transporterId: skipper.user.id, estimatedCost: 120 });
    expect(assigned.status).toBe(200);
    expect(assigned.body).toMatchObject({ status: "assigned", transporterId: skipper.user.id, estimatedCost: 120 });

    const asBuyer = await request(app)
      .post(`/api/transport-requests/${created.body.id}/assign`).set("Authorization", `Bearer ${farmer.body.token}`);
    expect(asBuyer.status).toBe(403);

    const confirmed = await request(app)
      .patch(`/api/transport-requests/${created.body.id}/status`).set("Authorization", `Bearer ${token}`)
      .send({ status: "confirmed" });
    expect(confirmed.status).toBe(200);
    expect(confirmed.body.status).toBe("confirmed");

    const bad = await request(app)
      .patch(`/api/transport-requests/${created.body.id}/status`).set("Authorization", `Bearer ${token}`)
      .send({ status: "nope" });
    expect(bad.status).toBe(400);

    const denied = await request(app)
      .patch(`/api/transport-requests/${created.body.id}/status`).set("Authorization", `Bearer ${farmer.body.token}`)
      .send({ status: "confirmed" });
    expect(denied.status).toBe(403);

    const missing = await request(app)
      .patch("/api/transport-requests/00000000-0000-4000-8000-000000000000/status").set("Authorization", `Bearer ${token}`)
      .send({ status: "cancelled" });
    expect(missing.status).toBe(404);
  });

  test("users: admin can create a user of any role with a password who can then log in", async () => {
    const { token } = await auth.registerWithPassword({
      name: "Create Admin", phone: "0249980070", email: "createadmin@agrismart.gh", role: "admin", password: "AgriSmart123!",
    });
    const created = await request(app)
      .post("/api/users/create").set("Authorization", `Bearer ${token}`)
      .send({ name: "SystemDriver", phone: "0249980071", role: "transporter", password: "AgriSmart123!" });
    expect(created.status).toBe(201);
    expect(created.body).toMatchObject({ role: "transporter", verified: true, active: true });

    const login = await request(app)
      .post("/api/auth/login").send({ identifier: "0249980071", password: "AgriSmart123!" });
    expect(login.status).toBe(200);
    expect(login.body.user.role).toBe("transporter");

    const farmer = await register({ name: "CreateNoPerms", phone: "0249980072", role: "farmer", password: "pw", location: "Teso" });
    const forbidden = await request(app)
      .post("/api/users/create").set("Authorization", `Bearer ${farmer.body.token}`)
      .send({ name: "Nope", phone: "0249980073", role: "farmer" });
    expect(forbidden.status).toBe(403);

    const anon = await request(app).post("/api/users/create").send({ name: "Nope", phone: "0249980074", role: "farmer" });
    expect(anon.status).toBe(401);
  });

  test("users: admin create validates role, buyerType, and duplicates", async () => {
    const { token } = await auth.registerWithPassword({
      name: "Create2 Admin", phone: "0249980075", email: "create2admin@agrismart.gh", role: "admin", password: "AgriSmart123!",
    });
    const credOpts = { Authorization: `Bearer ${token}` };

    const noName = await request(app)
      .post("/api/users/create").set(credOpts).send({ phone: "0249980076", role: "farmer" });
    expect(noName.status).toBe(400);

    const badRole = await request(app)
      .post("/api/users/create").set(credOpts).send({ name: "BadRole", phone: "0249980076", role: "wizard" });
    expect(badRole.status).toBe(400);

    const buyerNoType = await request(app)
      .post("/api/users/create").set(credOpts).send({ name: "BuyerNoType", phone: "0249980076", role: "buyer" });
    expect(buyerNoType.status).toBe(400);

    const buyer = await request(app)
      .post("/api/users/create").set(credOpts)
      .send({ name: "MadeBuyer", phone: "0249980076", role: "buyer", buyerType: "retail", verified: false });
    expect(buyer.status).toBe(201);
    expect(buyer.body).toMatchObject({ role: "buyer", buyerType: "retail", verified: false });

    const dupPhone = await request(app)
      .post("/api/users/create").set(credOpts).send({ name: "Dup", phone: "0249980076", role: "farmer" });
    expect(dupPhone.status).toBe(409);

    const dupEmail = await request(app)
      .post("/api/users/create").set(credOpts).send({ name: "DupMail", phone: "0249980077", role: "farmer", email: "dupmail@example.com" });
    expect(dupEmail.status).toBe(201);
    const dupEmailAgain = await request(app)
      .post("/api/users/create").set(credOpts).send({ name: "DupMail2", phone: "0249980078", role: "farmer", email: "DUPMAIL@example.com" });
    expect(dupEmailAgain.status).toBe(409);

    const admin = await request(app)
      .post("/api/users/create").set(credOpts).send({ name: "MadeAdmin", phone: "0249980079", role: "admin", verified: true });
    expect(admin.status).toBe(201);
    expect(admin.body.role).toBe("admin");
  });

  test("users: admin edits a user (name, role, verified, password reset)", async () => {
    const { token } = await auth.registerWithPassword({
      name: "Edit Admin", phone: "0249980080", email: "editadmin@agrismart.gh", role: "admin", password: "AgriSmart123!",
    });
    const target = await register({ name: "EditableUser", phone: "0249980081", role: "farmer", password: "oldPass1", location: "Teso" });
    const other = await register({ name: "OtherUser", phone: "0249980082", role: "farmer", password: "pw", location: "Accra" });

    const edited = await request(app)
      .patch(`/api/users/${target.body.user.id}`).set("Authorization", `Bearer ${token}`)
      .send({ name: "Renamed User", role: "market_seller", buyerType: "retail", verified: false, password: "NewPass123", location: "Accra" });
    expect(edited.status).toBe(200);
    expect(edited.body).toMatchObject({ name: "Renamed User", role: "market_seller", buyerType: "retail", verified: false });

    const newLogin = await request(app).post("/api/auth/login").send({ identifier: "0249980081", password: "NewPass123" });
    expect(newLogin.status).toBe(200);
    const oldLogin = await request(app).post("/api/auth/login").send({ identifier: "0249980081", password: "oldPass1" });
    expect(oldLogin.status).toBe(401);

    const badRole = await request(app)
      .patch(`/api/users/${target.body.user.id}`).set("Authorization", `Bearer ${token}`).send({ role: "wizard" });
    expect(badRole.status).toBe(400);

    const dupPhone = await request(app)
      .patch(`/api/users/${other.body.user.id}`).set("Authorization", `Bearer ${token}`).send({ phone: "0249980081" });
    expect(dupPhone.status).toBe(409);

    const asFarmer = await request(app)
      .patch(`/api/users/${target.body.user.id}`).set("Authorization", `Bearer ${target.body.token}`).send({ name: "Hax" });
    expect(asFarmer.status).toBe(403);

    const missing = await request(app)
      .patch("/api/users/00000000-0000-4000-8000-000000000000").set("Authorization", `Bearer ${token}`).send({ name: "Ghost" });
    expect(missing.status).toBe(404);
  });

  test("users: deactivation blocks login and revokes tokens; reactivation restores", async () => {
    const { token } = await auth.registerWithPassword({
      name: "Active Admin", phone: "0249980083", email: "actadmin@agrismart.gh", role: "admin", password: "AgriSmart123!",
    });
    const user = await register({ name: "DeactivateMe", phone: "0249980084", role: "farmer", password: "pw", location: "Teso" });
    const userToken = user.body.token;

    const before = await request(app).get("/api/farms/mine").set("Authorization", `Bearer ${userToken}`);
    expect(before.status).toBe(200);

    const off = await request(app)
      .patch(`/api/users/${user.body.user.id}/active`).set("Authorization", `Bearer ${token}`).send({ active: false });
    expect(off.status).toBe(200);
    expect(off.body.active).toBe(false);

    const revoked = await request(app).get("/api/farms/mine").set("Authorization", `Bearer ${userToken}`);
    expect(revoked.status).toBe(401);

    const login = await request(app).post("/api/auth/login").send({ identifier: "0249980084", password: "pw" });
    expect(login.status).toBe(401);
    expect(login.body.error).toContain("deactivated");

    const selfOff = await request(app)
      .patch("/api/users/nope/active").set("Authorization", `Bearer ${userToken}`).send({ active: false });
    expect(selfOff.status).toBe(401); // deactivated token is rejected by requireAuth

    const on = await request(app)
      .patch(`/api/users/${user.body.user.id}/active`).set("Authorization", `Bearer ${token}`).send({ active: true });
    expect(on.status).toBe(200);
    expect(on.body.active).toBe(true);

    const loginAgain = await request(app).post("/api/auth/login").send({ identifier: "0249980084", password: "pw" });
    expect(loginAgain.status).toBe(200);
  });

  test("users: delete is soft and restorable; deleted users can't log in or be viewed publicly", async () => {
    const { token } = await auth.registerWithPassword({
      name: "Del Admin", phone: "0249980085", email: "deladmin@agrismart.gh", role: "admin", password: "AgriSmart123!",
    });
    const user = await register({ name: "DeleteMe", phone: "0249980086", role: "farmer", password: "pw", location: "Teso" });

    const publicBefore = await request(app).get(`/api/users/${user.body.user.id}`);
    expect(publicBefore.status).toBe(200);

    const del = await request(app).delete(`/api/users/${user.body.user.id}`).set("Authorization", `Bearer ${token}`);
    expect(del.status).toBe(200);
    expect(del.body.deletedAt).toBeTruthy();
    expect(del.body.active).toBe(true);

    const publicAfter = await request(app).get(`/api/users/${user.body.user.id}`);
    expect(publicAfter.status).toBe(404);

    const login = await request(app).post("/api/auth/login").send({ identifier: "0249980086", password: "pw" });
    expect(login.status).toBe(401);

    const delAgain = await request(app).delete(`/api/users/${user.body.user.id}`).set("Authorization", `Bearer ${token}`);
    expect(delAgain.status).toBe(404);

    const selfDel = await request(app).delete(`/api/users/${user.body.user.id}`).set("Authorization", `Bearer ${user.body.token}`);
    expect(selfDel.status).toBe(401); // deleted account's token is rejected outright

    const restored = await request(app)
      .patch(`/api/users/${user.body.user.id}/restore`).set("Authorization", `Bearer ${token}`);
    expect(restored.status).toBe(200);
    expect(restored.body.deletedAt).toBeFalsy();

    const publicRestored = await request(app).get(`/api/users/${user.body.user.id}`);
    expect(publicRestored.status).toBe(200);

    const loginAgain = await request(app).post("/api/auth/login").send({ identifier: "0249980086", password: "pw" });
    expect(loginAgain.status).toBe(200);

    const restoreAgain = await request(app)
      .patch(`/api/users/${user.body.user.id}/restore`).set("Authorization", `Bearer ${token}`);
    expect(restoreAgain.status).toBe(404);
  });
});

describe("admin moderation audit (farms + listings)", () => {
  const auth = require("../src/services/auth");
  const pick = (rows, id) => rows.find((r) => r.entityId === id);

  const mkAdmin = (name, phone) =>
    auth.registerWithPassword({ name, phone, email: `${name.toLowerCase().replace(/\s+/g, "")}@agrismart.gh`, role: "admin", password: "AgriSmart123!" });

  test("create/edit/delete/restore farm: admin reasons required and audited", async () => {
    const { token, user } = await mkAdmin("Audit Farm Admin", "0249990101");
    const farmer = await register({ name: "AuditFarmOwner", phone: "0249990102", role: "farmer", password: "pw", location: "Teso" });

    // Admin create requires a farmerId.
    const noOwner = await request(app).post("/api/farms").set("Authorization", `Bearer ${token}`).send({ cropType: "maize" });
    expect(noOwner.status).toBe(400);

    const created = await request(app)
      .post("/api/farms").set("Authorization", `Bearer ${token}`)
      .send({ farmerId: farmer.body.user.id, name: "Audit plot", cropType: "maize", stage: "post_harvest", status: "ready" });
    expect(created.status).toBe(201);
    expect(created.body.farmerId).toBe(farmer.body.user.id);

    let audit = await request(app).get("/api/admin/audit").set("Authorization", `Bearer ${token}`);
    expect(audit.status).toBe(200);
    let entry = pick(audit.body, created.body.id);
    expect(entry).toMatchObject({ entityType: "farm", action: "create", adminName: "Audit Farm Admin", reason: null });
    expect(entry.after.name).toBe("Audit plot");

    // Admin edit requires a reason.
    const editNoReason = await request(app)
      .put(`/api/farms/${created.body.id}`).set("Authorization", `Bearer ${token}`)
      .send({ status: "harvested" });
    expect(editNoReason.status).toBe(400);

    const edited = await request(app)
      .put(`/api/farms/${created.body.id}`).set("Authorization", `Bearer ${token}`)
      .send({ status: "harvested", reason: "  Field   finished   " });
    expect(edited.status).toBe(200);
    expect(edited.body.status).toBe("harvested");

    audit = await request(app).get("/api/admin/audit").set("Authorization", `Bearer ${token}`);
    entry = pick(audit.body, created.body.id);
    const editEntry = audit.body.filter((r) => r.entityId === created.body.id && r.action === "edit").slice(-1)[0];
    expect(editEntry).toMatchObject({ entityType: "farm", action: "edit", reason: "Field finished" });
    expect(editEntry.before.status).toBe("ready");
    expect(editEntry.after.status).toBe("harvested");

    // Farmer-owner edit is NOT audited.
    const beforeCount = audit.body.length;
    await request(app)
      .put(`/api/farms/${created.body.id}`).set("Authorization", `Bearer ${farmer.body.token}`)
      .send({ location: "Teso Junction" });
    const afterFarmerEdit = await request(app).get("/api/admin/audit").set("Authorization", `Bearer ${token}`);
    expect(afterFarmerEdit.body.length).toBe(beforeCount);

    // Admin delete requires a reason.
    const delNoReason = await request(app).delete(`/api/farms/${created.body.id}`).set("Authorization", `Bearer ${token}`);
    expect(delNoReason.status).toBe(400);

    const deleted = await request(app)
      .delete(`/api/farms/${created.body.id}`).set("Authorization", `Bearer ${token}`)
      .send({ reason: "duplicate plot" });
    expect(deleted.status).toBe(200);
    expect(deleted.body.deletedAt).toBeTruthy();

    audit = await request(app).get("/api/admin/audit").set("Authorization", `Bearer ${token}`);
    const delEntry = audit.body.filter((r) => r.entityId === created.body.id && r.action === "delete").slice(-1)[0];
    expect(delEntry).toMatchObject({ entityType: "farm", action: "delete", reason: "duplicate plot" });
    expect(delEntry.before.status).toBe("harvested");

    // Restore is audited too.
    const restored = await request(app)
      .patch(`/api/farms/${created.body.id}/restore`).set("Authorization", `Bearer ${token}`)
      .send({ reason: "restored in error" });
    expect(restored.status).toBe(200);
    audit = await request(app).get("/api/admin/audit").set("Authorization", `Bearer ${token}`);
    const restoreEntry = audit.body.filter((r) => r.entityId === created.body.id && r.action === "restore").slice(-1)[0];
    expect(restoreEntry).toMatchObject({ entityType: "farm", action: "restore", reason: "restored in error" });
  });

  test("create/edit/delete listing: admin farmerId + reasons and audit filters", async () => {
    const { token } = await mkAdmin("Audit Listing Admin", "0249990103");
    const farmer = await register({ name: "AuditListOwner", phone: "0249990104", role: "farmer", password: "pw", location: "Hohoe" });

    // Admin create requires a farmerId.
    const noOwner = await request(app).post("/api/listings").set("Authorization", `Bearer ${token}`).send({ cropType: "tomato", quantity: 5, askingPrice: 60 });
    expect(noOwner.status).toBe(400);

    const created = await request(app)
      .post("/api/listings").set("Authorization", `Bearer ${token}`)
      .send({ farmerId: farmer.body.user.id, cropType: "tomato", quantity: 5, unit: "crates", askingPrice: 60, harvestDate: "2026-10-01" });
    expect(created.status).toBe(201);
    expect(created.body.farmerId).toBe(farmer.body.user.id);
    expect(created.body.location).toBe("Hohoe"); // defaults from the farmer

    let audit = await request(app).get("/api/admin/audit").set("Authorization", `Bearer ${token}`);
    let entry = pick(audit.body, created.body.id);
    expect(entry).toMatchObject({ entityType: "listing", action: "create", adminName: "Audit Listing Admin" });
    expect(entry.after.cropType).toBe("tomato");

    // Admin edit requires a reason.
    const editNoReason = await request(app)
      .put(`/api/listings/${created.body.id}`).set("Authorization", `Bearer ${token}`)
      .send({ askingPrice: 70 });
    expect(editNoReason.status).toBe(400);

    const edited = await request(app)
      .put(`/api/listings/${created.body.id}`).set("Authorization", `Bearer ${token}`)
      .send({ askingPrice: 70, reason: "reprice for market" });
    expect(edited.status).toBe(200);
    expect(edited.body.askingPrice).toBe(70);

    audit = await request(app).get("/api/admin/audit").set("Authorization", `Bearer ${token}`);
    const editEntry = audit.body.filter((r) => r.entityId === created.body.id && r.action === "edit").slice(-1)[0];
    expect(editEntry).toMatchObject({ entityType: "listing", action: "edit", reason: "reprice for market" });
    expect(editEntry.before.askingPrice).toBe(60);
    expect(editEntry.after.askingPrice).toBe(70);

    // Filters: entityType + action narrow the feed.
    const filtered = await request(app)
      .get("/api/admin/audit?entityType=listing&action=edit").set("Authorization", `Bearer ${token}`);
    expect(filtered.body.length).toBeGreaterThan(0);
    expect(filtered.body.every((r) => r.entityType === "listing" && r.action === "edit")).toBe(true);

    const byEntity = await request(app)
      .get(`/api/admin/audit?entityId=${created.body.id}`).set("Authorization", `Bearer ${token}`);
    expect(byEntity.body.every((r) => r.entityId === created.body.id)).toBe(true);

    const badType = await request(app).get("/api/admin/audit?entityType=nope").set("Authorization", `Bearer ${token}`);
    expect(badType.status).toBe(400);

    // Admin delete requires a reason; audit route is admin-only.
    const delNoReason = await request(app).delete(`/api/listings/${created.body.id}`).set("Authorization", `Bearer ${token}`);
    expect(delNoReason.status).toBe(400);

    const deleted = await request(app)
      .delete(`/api/listings/${created.body.id}`).set("Authorization", `Bearer ${token}`)
      .send({ reason: "fraudulent posting" });
    expect(deleted.status).toBe(200);
    expect(deleted.body.status).toBe("deleted");

    audit = await request(app).get("/api/admin/audit").set("Authorization", `Bearer ${token}`);
    const delEntry = audit.body.filter((r) => r.entityId === created.body.id && r.action === "delete").slice(-1)[0];
    expect(delEntry).toMatchObject({ entityType: "listing", action: "delete", reason: "fraudulent posting" });
    expect(delEntry.before.askingPrice).toBe(70);

    const forbidden = await request(app).get("/api/admin/audit").set("Authorization", `Bearer ${farmer.body.token}`);
    expect(forbidden.status).toBe(403);
  });

  test("audit rows are created only by admin actions, not ordinary users", async () => {
    const { token } = await mkAdmin("Audit Count Admin", "0249990105");
    const farmer = await register({ name: "AuditCountFarmer", phone: "0249990106", role: "farmer", password: "pw", location: "Teso" });

    const before = await request(app).get("/api/admin/audit").set("Authorization", `Bearer ${token}`);

    // Farmer creates + edits + deletes their own farm: nothing lands in the audit log.
    const farm = await request(app)
      .post("/api/farms").set("Authorization", `Bearer ${farmer.body.token}`)
      .send({ name: "Normal farm", cropType: "cassava" });
    expect(farm.status).toBe(201);
    await request(app)
      .put(`/api/farms/${farm.body.id}`).set("Authorization", `Bearer ${farmer.body.token}`)
      .send({ location: "Kpong" });
    await request(app)
      .delete(`/api/farms/${farm.body.id}`).set("Authorization", `Bearer ${farmer.body.token}`);

    const after = await request(app).get("/api/admin/audit").set("Authorization", `Bearer ${token}`);
    expect(after.body.length).toBe(before.body.length);
    expect(pick(after.body, farm.body.id)).toBeUndefined();
  });
});

describe("reviews (buyer product reviews)", () => {
  let farmerToken, buyerToken, buyerId, listingId;

  const verifyBuyer = async (token, name = "Regina", phone = "0247770101") => {
    const reg = await register({ name, phone, role: "buyer", password: "pw", location: "Accra", buyerType: "retail" });
    const v = await request(app)
      .post("/api/auth/verify").set("Authorization", `Bearer ${reg.body.token}`)
      .send({
        purchaseCrops: ["tomato"], region: "Greater Accra", district: "Accra Metropolis",
        gpsAddress: "GA-123-4567", address: "12 Independence Ave", community: "Accra",
        idType: "ghana_card", idNumber: "GHA-77777777-1", photoUrl: "/uploads/photo.jpg",
      });
    expect(v.status).toBe(200);
    return reg;
  };

  test("review is gated to verified buyers with a paid purchase", async () => {
    const farmer = await register({ name: "RV Farmer", phone: "0247770100", role: "farmer", password: "pw", location: "Kasoa" });
    farmerToken = farmer.body.token;

    const buyer = await verifyBuyer(null, "Regina Reed", "0247770101");
    buyerToken = buyer.body.token;
    buyerId = buyer.body.user.id;

    // Farmer cannot review their own listing.
    const listing = await request(app)
      .post("/api/listings").set("Authorization", `Bearer ${farmerToken}`)
      .send({ cropType: "tomato", quantity: 20, unit: "crates", askingPrice: 140, location: "Kasoa" });
    expect(listing.status).toBe(201);
    listingId = listing.body.id;

    const farmerReview = await request(app)
      .post("/api/reviews").set("Authorization", `Bearer ${farmerToken}`)
      .send({ listingId, rating: 5, comment: "great" });
    expect(farmerReview.status).toBe(403);

    // Unverified buyer is refused up front.
    const unverified = await register({ name: "Nova", phone: "0247770102", role: "buyer", password: "pw", location: "Accra", buyerType: "retail" });
    const unvReview = await request(app)
      .post("/api/reviews").set("Authorization", `Bearer ${unverified.body.token}`)
      .send({ listingId, rating: 4, comment: "nice" });
    expect(unvReview.status).toBe(403);

    // Buyer with no purchase at all is refused.
    const browser = await register({ name: "Browsa", phone: "0247770103", role: "buyer", password: "pw", location: "Tema", buyerType: "retail" });
    await request(app)
      .post("/api/auth/verify").set("Authorization", `Bearer ${browser.body.token}`)
      .send({ purchaseCrops: ["maize"], region: "Greater Accra", district: "Tema Metro", idType: "ghana_card", idNumber: "GHA-11111111-1", photoUrl: "/uploads/photo.jpg" });
    const noPurchase = await request(app)
      .post("/api/reviews").set("Authorization", `Bearer ${browser.body.token}`)
      .send({ listingId, rating: 3, comment: "ok" });
    expect(noPurchase.status).toBe(403);

    // Invalid ratings are rejected before anything else.
    const badRating = await request(app)
      .post("/api/reviews").set("Authorization", `Bearer ${buyerToken}`)
      .send({ listingId, rating: 6, comment: "nope" });
    expect(badRating.status).toBe(400);

    // Buyer with a pending (unpaid) transaction is still refused. Accepting a
    // pre-commitment now auto-creates the pending transaction.
    const pc = await request(app)
      .post("/api/precommitments").set("Authorization", `Bearer ${buyerToken}`)
      .send({ listingId, quantity: 10, offeredPrice: 150 });
    expect(pc.status).toBe(201);
    const accept = await request(app)
      .post(`/api/precommitments/${pc.body.id}/respond`).set("Authorization", `Bearer ${farmerToken}`)
      .send({ action: "accept" });
    expect(accept.body.status).toBe("accepted");
    expect(accept.body.transactionId).toBeTruthy();

    const unpaid = await request(app)
      .post("/api/reviews").set("Authorization", `Bearer ${buyerToken}`)
      .send({ listingId, rating: 5, comment: "tempting" });
    expect(unpaid.status).toBe(403);

    // The listing's public review view reports no rating and canReview=false (pending).
    const before = await request(app)
      .get(`/api/reviews/listing/${listingId}`).set("Authorization", `Bearer ${buyerToken}`);
    expect(before.status).toBe(200);
    expect(before.body.rating).toBeNull();
    expect(before.body.reviewCount).toBe(0);
    expect(before.body.canReview).toBe(false);
  });

  test("paid purchase unlocks review, upsert, feed aggregates, and purchaser visibility", async () => {
    // Mark the pending transaction paid.
    const txs = await request(app)
      .get("/api/transactions/mine").set("Authorization", `Bearer ${buyerToken}`);
    expect(txs.status).toBe(200);
    const mine = txs.body.find((t) => t.listingId === listingId);
    expect(mine).toBeTruthy();
    expect(mine.cropType).toBe("tomato");
    expect(mine.farmerName).toBe("RV Farmer");

    await request(app)
      .post(`/api/transactions/${mine.id}/pay`).set("Authorization", `Bearer ${buyerToken}`);

    // Overlong comments are trimmed to 500 chars.
    const long = await request(app)
      .post("/api/reviews").set("Authorization", `Bearer ${buyerToken}`)
      .send({ listingId, rating: 5, comment: "x".repeat(700) });
    expect(long.status).toBe(201);
    expect(long.body.review.comment.length).toBe(500);

    // Updating the review returns 200 (not 201) and keeps a single row.
    const update = await request(app)
      .post("/api/reviews").set("Authorization", `Bearer ${buyerToken}`)
      .send({ listingId, rating: 4, comment: "Really crisp tomatoes!" });
    expect(update.status).toBe(200);
    expect(update.body.rating).toBe(4);
    expect(update.body.reviewCount).toBe(1);

    // Listing review view now reflects aggregate + the reviewer's breakdown.
    const after = await request(app)
      .get(`/api/reviews/listing/${listingId}`).set("Authorization", `Bearer ${buyerToken}`);
    expect(after.body.rating).toBe(4);
    expect(after.body.reviewCount).toBe(1);
    expect(after.body.canReview).toBe(true);
    expect(after.body.myReview).toMatchObject({ rating: 4, comment: "Really crisp tomatoes!" });
    expect(after.body.reviews[0]).toMatchObject({ buyerName: "Regina Reed", rating: 4 });
    expect(after.body.reviews).toHaveLength(1);

    // The buyer's review also shows on their /mine list.
    const mineReviews = await request(app)
      .get("/api/reviews/mine").set("Authorization", `Bearer ${buyerToken}`);
    expect(mineReviews.status).toBe(200);
    expect(mineReviews.body.map((r) => r.listingId)).toContain(listingId);

    // Produces re-opened: the buyer feed row carries rating + reviewCount aggregates.
    await adminPool.query("UPDATE listings SET status = 'open' WHERE id = $1", [listingId]);
    const feed = await request(app)
      .get("/api/produce").set("Authorization", `Bearer ${buyerToken}`);
    const row = feed.body.find((p) => p.id === listingId);
    expect(row).toBeTruthy();
    expect(row.rating).toBe(4);
    expect(row.reviewCount).toBe(1);
  });

  test("sold/paid listing stays visible to the purchaser but hidden from others", async () => {
    await adminPool.query("UPDATE listings SET status = 'sold' WHERE id = $1", [listingId]);

    const stranger = await verifyBuyer(null, "Stranger Dan", "0247770104");
    const hidden = await request(app)
      .get(`/api/produce/${listingId}`).set("Authorization", `Bearer ${stranger.body.token}`);
    expect(hidden.status).toBe(404);

    const visible = await request(app)
      .get(`/api/produce/${listingId}`).set("Authorization", `Bearer ${buyerToken}`);
    expect(visible.status).toBe(200);
    expect(visible.body.rating).toBe(4);
    expect(visible.body.reviewCount).toBe(1);
  });

  test("farmer sees received reviews; buyers are refused", async () => {
    const received = await request(app)
      .get("/api/reviews/received").set("Authorization", `Bearer ${farmerToken}`);
    expect(received.status).toBe(200);
    expect(received.body).toHaveLength(1);
    expect(received.body[0]).toMatchObject({
      cropType: "tomato", buyerName: "Regina Reed", rating: 4,
    });
    expect(received.body[0].buyerId).toBe(buyerId);

    const refused = await request(app)
      .get("/api/reviews/received").set("Authorization", `Bearer ${buyerToken}`);
    expect(refused.status).toBe(403);
  });

  test("same buyer reviewing several listings of one farmer shows once in the dashboard", async () => {
    const listing2 = await request(app)
      .post("/api/listings").set("Authorization", `Bearer ${farmerToken}`)
      .send({ cropType: "pepper", quantity: 5, unit: "bags", askingPrice: 60, location: "Kasoa" });
    expect(listing2.status).toBe(201);
    const listing2Id = listing2.body.id;

    const pc = await request(app)
      .post("/api/precommitments").set("Authorization", `Bearer ${buyerToken}`)
      .send({ listingId: listing2Id, quantity: 2, offeredPrice: 60 });
    expect(pc.status).toBe(201);
    const accept = await request(app)
      .post(`/api/precommitments/${pc.body.id}/respond`).set("Authorization", `Bearer ${farmerToken}`)
      .send({ action: "accept" });
    expect(accept.body.status).toBe("accepted");

    await request(app)
      .post(`/api/transactions/${accept.body.transactionId}/pay`).set("Authorization", `Bearer ${buyerToken}`);

    const review = await request(app)
      .post("/api/reviews").set("Authorization", `Bearer ${buyerToken}`)
      .send({ listingId: listing2Id, rating: 5, comment: "Another great buy" });
    expect(review.status).toBe(201);

    // One buyer across two listings -> the farmer dashboard shows a single review (the newest).
    const received = await request(app)
      .get("/api/reviews/received").set("Authorization", `Bearer ${farmerToken}`);
    expect(received.status).toBe(200);
    expect(received.body).toHaveLength(1);
    expect(received.body[0].rating).toBe(5);
    expect(received.body[0].buyerId).toBe(buyerId);

    // Per-listing storage is unchanged: each listing still carries its own review.
    const listingReviews = await request(app)
      .get(`/api/reviews/listing/${listing2Id}`).set("Authorization", `Bearer ${buyerToken}`);
    expect(listingReviews.body.reviewCount).toBe(1);
    expect(listingReviews.body.reviews[0].rating).toBe(5);
  });
});

describe("prices import (admin bulk)", () => {
  const auth = require("../src/services/auth");

  let adminToken;
  const ROWS = [
    { cropType: "okra", market: "Tema ImportX", price: 88, date: "2026-08-30" },
    { cropType: "plantain", market: "Tema ImportX", price: 97, date: "2026-08-30" },
  ];

  beforeAll(async () => {
    await adminPool.query(`DELETE FROM prices WHERE market IN ('Tema ImportX', 'Circle Ext')`);
  });

  test("non-admin cannot bulk import", async () => {
    const buyer = await register({ name: "PI Buyer", phone: "0248880101", role: "buyer", password: "pw", location: "Accra", buyerType: "retail" });
    const res = await request(app).post("/api/prices/import").set("Authorization", `Bearer ${buyer.body.token}`).send({ rows: ROWS });
    expect(res.status).toBe(403);
    const loggedOut = await request(app).post("/api/prices/import").send({ rows: ROWS });
    expect(loggedOut.status).toBe(401);
  });

  test("valid rows insert and become visible", async () => {
    const { token } = await auth.registerWithPassword({ name: "PI Admin", phone: "0248880102", role: "admin", password: "AgriSmart123!" });
    adminToken = token;

    const res = await request(app).post("/api/prices/import").set("Authorization", `Bearer ${adminToken}`).send({ rows: ROWS });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ total: 2, inserted: 2, skipped: 0, failed: [] });

    const all = await request(app).get("/api/prices/all").set("Authorization", `Bearer ${adminToken}`);
    expect(all.status).toBe(200);
    expect(all.body.filter((r) => r.cropType === "okra" && r.market === "Tema ImportX")).toHaveLength(1);

    const cur = await request(app).get("/api/prices/current?cropType=okra&market=Tema ImportX");
    expect(cur.status).toBe(200);
    expect(cur.body.averagePrice).toBe(88);
  });

  test("re-importing the same rows skips duplicates", async () => {
    const res = await request(app).post("/api/prices/import").set("Authorization", `Bearer ${adminToken}`).send({ rows: ROWS });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ total: 2, inserted: 0, skipped: 2, failed: [] });

    const all = await request(app).get("/api/prices/all").set("Authorization", `Bearer ${adminToken}`);
    expect(all.body.filter((r) => r.market === "Tema ImportX")).toHaveLength(2);
  });

  test("mixed file inserts the valid rows and reports the failures", async () => {
    const res = await request(app)
      .post("/api/prices/import").set("Authorization", `Bearer ${adminToken}`)
      .send({ rows: [
        { cropType: "okra", market: "Circle Ext", price: 120, date: "2026-08-29" },
        { cropType: "tomato", market: "", price: 50 },
        { cropType: "maize", market: "Circle Ext", price: "oops" },
      ] });
    expect(res.status).toBe(200);
    expect(res.body.inserted).toBe(1);
    expect(res.body.failed).toHaveLength(2);

    const all = await request(app).get("/api/prices/all").set("Authorization", `Bearer ${adminToken}`);
    expect(all.body.some((r) => r.cropType === "okra" && r.market === "Circle Ext")).toBe(true);
  });

  test("all-invalid file is refused with 400", async () => {
    const res = await request(app).post("/api/prices/import").set("Authorization", `Bearer ${adminToken}`).send({ rows: [{ market: "x" }] });
    expect(res.status).toBe(400);

    const empty = await request(app).post("/api/prices/import").set("Authorization", `Bearer ${adminToken}`).send({ rows: [] });
    expect(empty.status).toBe(400);
  });
});

describe("crops import (admin bulk)", () => {
  const auth = require("../src/services/auth");

  let adminToken;
  const ROWS = [
    { name: "Soybean Import A", defaultUnit: "bags", emoji: "🫘", gradientFrom: "#e8d9b0", gradientTo: "#b98d5a", displayOrder: 500 },
    { name: "Sorghum Import B", displayOrder: 501 },
  ];

  beforeAll(async () => {
    await adminPool.query(`DELETE FROM crop_types WHERE id = ANY($1)`, [["soybean import a", "sorghum import b", "foxtail millet"]]);
  });

  test("non-admin cannot bulk import crops", async () => {
    const buyer = await register({ name: "CI Buyer", phone: "0248880103", role: "buyer", password: "pw", location: "Accra", buyerType: "retail" });
    const res = await request(app).post("/api/crops/import").set("Authorization", `Bearer ${buyer.body.token}`).send({ rows: ROWS });
    expect(res.status).toBe(403);
    const loggedOut = await request(app).post("/api/crops/import").send({ rows: ROWS });
    expect(loggedOut.status).toBe(401);
  });

  test("valid rows insert and appear in the admin list", async () => {
    const { token } = await auth.registerWithPassword({ name: "CI Admin", phone: "0248880104", role: "admin", password: "AgriSmart123!" });
    adminToken = token;

    const res = await request(app).post("/api/crops/import").set("Authorization", `Bearer ${adminToken}`).send({ rows: ROWS });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ total: 2, inserted: 2, skipped: 0, failed: [] });

    const all = await request(app).get("/api/crops/all").set("Authorization", `Bearer ${adminToken}`);
    expect(all.status).toBe(200);
    expect(all.body.filter((c) => c.id === "soybean import a")).toHaveLength(1);
    expect(all.body.find((c) => c.id === "soybean import a").emoji).toBe("🫘");
  });

  test("re-importing the same names skips duplicates", async () => {
    const res = await request(app).post("/api/crops/import").set("Authorization", `Bearer ${adminToken}`).send({ rows: ROWS });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ total: 2, inserted: 0, skipped: 2, failed: [] });

    const all = await request(app).get("/api/crops/all").set("Authorization", `Bearer ${adminToken}`);
    expect(all.body.filter((c) => /^soybean import a$|^sorghum import b$/.test(c.id))).toHaveLength(2);
  });

  test("mixed file inserts new rows and reports duplicate + invalid lines", async () => {
    const res = await request(app)
      .post("/api/crops/import").set("Authorization", `Bearer ${adminToken}`)
      .send({ rows: [
        { name: "Foxtail Millet", displayOrder: 502 },
        { name: "Soybean Import A" },
        { name: "!!!" },
        { name: "" },
      ] });
    expect(res.status).toBe(200);
    expect(res.body.inserted).toBe(1);
    expect(res.body.skipped).toBe(1);
    expect(res.body.failed).toHaveLength(2);

    const all = await request(app).get("/api/crops/all").set("Authorization", `Bearer ${adminToken}`);
    expect(all.body.some((c) => c.id === "foxtail millet")).toBe(true);
  });

  test("all-invalid file is refused with 400", async () => {
    const res = await request(app).post("/api/crops/import").set("Authorization", `Bearer ${adminToken}`).send({ rows: [{ name: "1234" }] });
    expect(res.status).toBe(400);
  });
});

describe("units import (admin bulk)", () => {
  const auth = require("../src/services/auth");

  let adminToken;
  const ROWS = [
    { name: "Bucket", plural: "Buckets", displayOrder: 500 },
    { name: "Hamper", displayOrder: 501 },
  ];

  beforeAll(async () => {
    await adminPool.query(`DELETE FROM unit_of_measure WHERE id = ANY($1)`, [["bucket", "hamper", "sack"]]);
  });

  test("non-admin cannot bulk import units", async () => {
    const buyer = await register({ name: "UI Buyer", phone: "0248880105", role: "buyer", password: "pw", location: "Accra", buyerType: "retail" });
    const res = await request(app).post("/api/units/import").set("Authorization", `Bearer ${buyer.body.token}`).send({ rows: ROWS });
    expect(res.status).toBe(403);
  });

  test("valid rows insert and appear in the admin list", async () => {
    const { token } = await auth.registerWithPassword({ name: "UI Admin", phone: "0248880106", role: "admin", password: "AgriSmart123!" });
    adminToken = token;

    const res = await request(app).post("/api/units/import").set("Authorization", `Bearer ${adminToken}`).send({ rows: ROWS });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ total: 2, inserted: 2, skipped: 0, failed: [] });

    const all = await request(app).get("/api/units/all").set("Authorization", `Bearer ${adminToken}`);
    expect(all.status).toBe(200);
    expect(all.body.find((u) => u.id === "bucket")).toMatchObject({ name: "Bucket", plural: "Buckets" });
  });

  test("re-importing the same names skips duplicates", async () => {
    const res = await request(app).post("/api/units/import").set("Authorization", `Bearer ${adminToken}`).send({ rows: ROWS });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ total: 2, inserted: 0, skipped: 2, failed: [] });

    const all = await request(app).get("/api/units/all").set("Authorization", `Bearer ${adminToken}`);
    expect(all.body.filter((u) => /^bucket$|^hamper$/.test(u.id))).toHaveLength(2);
  });

  test("mixed file inserts new rows and reports duplicate + invalid lines", async () => {
    const res = await request(app)
      .post("/api/units/import").set("Authorization", `Bearer ${adminToken}`)
      .send({ rows: [
        { name: "Sack", displayOrder: 502 },
        { name: "Bucket" },
        { name: "#####" },
      ] });
    expect(res.status).toBe(200);
    expect(res.body.inserted).toBe(1);
    expect(res.body.skipped).toBe(1);
    expect(res.body.failed).toHaveLength(1);

    const all = await request(app).get("/api/units/all").set("Authorization", `Bearer ${adminToken}`);
    expect(all.body.some((u) => u.id === "sack")).toBe(true);
  });

  test("all-invalid file is refused with 400", async () => {
    const res = await request(app).post("/api/units/import").set("Authorization", `Bearer ${adminToken}`).send({ rows: [{ name: "999" }] });
    expect(res.status).toBe(400);
  });
});

describe("commission math (service)", () => {
  const { computeCommission } = require("../src/services/commission");

  test("disabled config takes nothing", () => {
    expect(computeCommission({ enabled: false }, 1000)).toEqual({ commission: 0, net: 1000 });
  });

  test("flat percent", () => {
    const cfg = { enabled: true, mode: "percent", strategy: "flat", flatValue: 3 };
    expect(computeCommission(cfg, 1000)).toEqual({ commission: 30, net: 970 });
  });

  test("flat percent rounds to 2dp", () => {
    const cfg = { enabled: true, mode: "percent", strategy: "flat", flatValue: 3.33 };
    expect(computeCommission(cfg, 1000)).toEqual({ commission: 33.3, net: 966.7 });
  });

  test("flat fixed", () => {
    const cfg = { enabled: true, mode: "fixed", strategy: "flat", flatValue: 100 };
    expect(computeCommission(cfg, 1000)).toEqual({ commission: 100, net: 900 });
  });

  test("flat fixed never yields a negative net", () => {
    const cfg = { enabled: true, mode: "fixed", strategy: "flat", flatValue: 100 };
    expect(computeCommission(cfg, 50)).toEqual({ commission: 100, net: 0 });
  });

  test("tiered percent boundaries", () => {
    const cfg = { enabled: true, mode: "percent", strategy: "tiered", tiers: [{ min: 0, value: 5 }, { min: 1000, value: 10 }, { min: 3000, value: 15 }] };
    expect(computeCommission(cfg, 0)).toEqual({ commission: 0, net: 0 });
    expect(computeCommission(cfg, 500)).toEqual({ commission: 25, net: 475 });
    expect(computeCommission(cfg, 999.99)).toEqual({ commission: 50, net: 949.99 });
    expect(computeCommission(cfg, 1000)).toEqual({ commission: 100, net: 900 });
    expect(computeCommission(cfg, 2999)).toEqual({ commission: 299.9, net: 2699.1 });
    expect(computeCommission(cfg, 3000)).toEqual({ commission: 450, net: 2550 });
    expect(computeCommission(cfg, 5000)).toEqual({ commission: 750, net: 4250 });
  });

  test("tiered fixed", () => {
    const cfg = { enabled: true, mode: "fixed", strategy: "tiered", tiers: [{ min: 0, value: 20 }, { min: 1000, value: 50 }, { min: 3000, value: 100 }] };
    expect(computeCommission(cfg, 500)).toEqual({ commission: 20, net: 480 });
    expect(computeCommission(cfg, 1500)).toEqual({ commission: 50, net: 1450 });
    expect(computeCommission(cfg, 4000)).toEqual({ commission: 100, net: 3900 });
  });

  test("below the first tier uses the smallest tier", () => {
    const cfg = { enabled: true, mode: "percent", strategy: "tiered", tiers: [{ min: 1000, value: 10 }] };
    expect(computeCommission(cfg, 400)).toEqual({ commission: 40, net: 360 });
  });
});

describe("commission settings + transaction snapshots (admin)", () => {
  const auth = require("../src/services/auth");

  let adminToken;
  let farmerToken;
  let buyerId;
  let buyerToken;

  beforeAll(async () => {
    // Reset the setting to its unset state so the default assertion is deterministic
    // even when the dev test DB carries state from earlier runs.
    await adminPool.query(`DELETE FROM system_settings WHERE key = 'commission'`);
  });

  async function setupTrade(agreedPrice) {
    const listing = await request(app)
      .post("/api/listings").set("Authorization", `Bearer ${farmerToken}`)
      .send({ cropType: "tomato", quantity: 10, unit: "crates", askingPrice: agreedPrice, location: "Kasoa" });
    expect(listing.status).toBe(201);
    const pc = await request(app)
      .post("/api/precommitments").set("Authorization", `Bearer ${buyerToken}`).send({ listingId: listing.body.id, quantity: 5, offeredPrice: agreedPrice });
    expect(pc.status).toBe(201);
    const accept = await request(app)
      .post(`/api/precommitments/${pc.body.id}/respond`).set("Authorization", `Bearer ${farmerToken}`).send({ action: "accept" });
    expect(accept.body.status).toBe("accepted");
    // Accepting opens the transaction automatically at the agreed price.
    const tx = await request(app)
      .get(`/api/transactions/${accept.body.transactionId}`).set("Authorization", `Bearer ${buyerToken}`);
    expect(tx.status).toBe(200);
    expect(tx.body.paymentStatus).toBe("pending");
    return tx.body;
  }

  test("settings are admin-only", async () => {
    const buyer = await register({ name: "S Buyer", phone: "0246660100", role: "buyer", password: "pw", location: "Accra", buyerType: "retail" });
    const forbidden = await request(app).get("/api/settings/commission").set("Authorization", `Bearer ${buyer.body.token}`);
    expect(forbidden.status).toBe(403);
    const loggedOut = await request(app).get("/api/settings/commission");
    expect(loggedOut.status).toBe(401);
  });

  test("unset commission defaults to disabled flat", async () => {
    const { token } = await auth.registerWithPassword({ name: "S Admin", phone: "0246660101", role: "admin", password: "AgriSmart123!" });
    adminToken = token;
    const res = await request(app).get("/api/settings/commission").set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.config).toMatchObject({ enabled: false, mode: "percent", strategy: "flat", flatValue: 0, tiers: [] });

    const farmer = await register({ name: "S Farmer", phone: "0246660102", role: "farmer", password: "pw", location: "Kasoa" });
    farmerToken = farmer.body.token;
    const buyer = await register({ name: "S Buy", phone: "0246660103", role: "buyer", password: "pw", location: "Accra", buyerType: "retail" });
    buyerId = buyer.body.user.id;
    buyerToken = buyer.body.token;
    await request(app)
      .post("/api/auth/verify").set("Authorization", `Bearer ${buyerToken}`)
      .send({ purchaseCrops: ["maize"], region: "Greater Accra", district: "Ada East", idType: "ghana_card", idNumber: "GHA-77776666-1", photoUrl: "/uploads/photo.jpg" });

    const tx = await setupTrade(240); // total = 5 × 240
    expect(tx.commissionAmount).toBe(0);
    expect(tx.netAmount).toBe(1200);
  });

  test("validation rejects bad payloads", async () => {
    const badMode = await request(app).put("/api/settings/commission").set("Authorization", `Bearer ${adminToken}`).send({ config: { mode: "chips" } });
    expect(badMode.status).toBe(400);
    const badStrategy = await request(app).put("/api/settings/commission").set("Authorization", `Bearer ${adminToken}`).send({ config: { strategy: "ladder" } });
    expect(badStrategy.status).toBe(400);
    const unsorted = await request(app)
      .put("/api/settings/commission").set("Authorization", `Bearer ${adminToken}`)
      .send({ config: { enabled: true, mode: "percent", strategy: "tiered", tiers: [{ min: 1000, value: 10 }, { min: 0, value: 5 }] } });
    expect(unsorted.status).toBe(400);
    const negative = await request(app)
      .put("/api/settings/commission").set("Authorization", `Bearer ${adminToken}`)
      .send({ config: { enabled: true, mode: "flat", strategy: "percent", flatValue: -1 } });
    expect(negative.status).toBe(400);
  });

  test("PUT persists and GET returns the saved schedule", async () => {
    const cfg = { enabled: true, mode: "percent", strategy: "tiered", flatValue: 0, tiers: [{ min: 0, value: 5 }, { min: 1000, value: 10 }, { min: 3000, value: 15 }] };
    const put = await request(app).put("/api/settings/commission").set("Authorization", `Bearer ${adminToken}`).send({ config: cfg });
    expect(put.status).toBe(200);
    expect(put.body.config).toEqual(cfg);

    const get = await request(app).get("/api/settings/commission").set("Authorization", `Bearer ${adminToken}`);
    expect(get.body.config).toEqual(cfg);
  });

  test("new transactions snapshot the current schedule", async () => {
    // Tiered percent on totals: 5 × 300 = 1500 -> 10% (150); 5 × 100 = 500 -> 5% (25).
    const tx = await setupTrade(300);
    expect(tx.commissionAmount).toBe(150);
    expect(tx.netAmount).toBe(1350);

    const tx2 = await setupTrade(100);
    expect(tx2.commissionAmount).toBe(25);
    expect(tx2.netAmount).toBe(475);

    const all = await request(app).get("/api/transactions/all").set("Authorization", `Bearer ${adminToken}`);
    const row = all.body.find((t) => t.id === tx.id);
    expect(row.commissionAmount).toBe(150);
    expect(row.netAmount).toBe(1350);
  });

  test("fixed flat snapshot", async () => {
    await request(app)
      .put("/api/settings/commission").set("Authorization", `Bearer ${adminToken}`)
      .send({ config: { enabled: true, mode: "fixed", strategy: "flat", flatValue: 100, tiers: [] } });
    const tx = await setupTrade(160); // total = 5 × 160
    expect(tx.commissionAmount).toBe(100);
    expect(tx.netAmount).toBe(700);
  });
});
