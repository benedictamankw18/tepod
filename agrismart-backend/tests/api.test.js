const { applySchema, truncateAll, closeAdmin } = require("./helpers/db");
const request = require("supertest");
const { createApp } = require("../src/app");

const app = createApp();

beforeAll(async () => {
  await applySchema();
  await truncateAll();
});

afterAll(async () => {
  await closeAdmin();
});

async function register(payload) {
  const res = await request(app).post("/api/auth/register").send(payload);
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
      name: "ResetUser", phone, role: "farmer", password: "oldpass123", location: "Accra",
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
      name: "ResetUser2", phone: phone2, role: "farmer", password: "keepme123", location: "Kumasi",
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
});

describe("username login handle", () => {
  test("register with optional username stores it normalized and lower-cased", async () => {
    const res = await request(app).post("/api/auth/register").send({
      name: "UserHandle", phone: "0245550020", role: "farmer", password: "secret123",
      location: "Accra", username: "Farmer.Ama",
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
      buyerType: "retail", password: "secret123", location: "Kumasi",
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
      username: "farmer.ama", location: "Accra",
    });
    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/username already exists/);
  });

  test("invalid username format is rejected", async () => {
    const res = await request(app).post("/api/auth/register").send({
      name: "BadUser", phone: "0245550022", role: "farmer", password: "secret123",
      username: "x!", location: "Accra",
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
    const res = await request(app).post("/api/auth/google").send({ idToken: "whatever", role: "farmer" });
    // Absent GOOGLE_CLIENT_ID -> 501. If one is configured the outcome differs, so branch.
    if (!process.env.GOOGLE_CLIENT_ID) {
      expect(res.status).toBe(501);
      expect(res.body.error).toBe("google_signin_not_configured");
    } else {
      expect(res.status).toBe(401); // configured but the fake token is invalid
    }
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

    // farmer lists
    const listing = await request(app)
      .post("/api/listings").set("Authorization", `Bearer ${farmerToken}`)
      .send({ cropType: "tomato", quantity: 20, unit: "crates", askingPrice: 140 });
    expect(listing.status).toBe(201);
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

    // farmer accepts
    const accept = await request(app)
      .post(`/api/precommitments/${pcId}/respond`).set("Authorization", `Bearer ${farmerToken}`)
      .send({ action: "accept" });
    expect(accept.body.status).toBe("accepted");

    // farmer records transaction
    const tx = await request(app)
      .post("/api/transactions").set("Authorization", `Bearer ${farmerToken}`)
      .send({ listingId, buyerId: buyer.body.user.id, agreedPrice: 150 });
    expect(tx.status).toBe(201);
    expect(tx.body.paymentStatus).toBe("pending");

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
    // Data comes from seed; if unseeded it's 404. Either is a valid response shape.
    expect([200, 404]).toContain(res.status);
    if (res.status === 200) expect(res.body.averagePrice).toBeGreaterThan(0);
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
