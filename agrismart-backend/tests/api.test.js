const { applySchema, truncateAll, closeAdmin, adminPool } = require("./helpers/db");
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
    expect(feed.body.length).toBe(2);
    expect(feed.body.every((p) => p.status === "open")).toBe(true);

    // Tomato matches the buyer's purchase_crops -> must come first even though it is farther.
    expect(feed.body[0].cropType).toBe("tomato");
    expect(feed.body[0].distanceKm).toBeGreaterThan(feed.body[1].distanceKm);

    const ids = feed.body.map((p) => p.id);
    expect(ids).toContain(nearTomato.body.id);
    expect(ids).toContain(farMaize.body.id);
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
