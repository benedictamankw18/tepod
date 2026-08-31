const { closeAdmin, adminPool } = require("./helpers/db");
const request = require("supertest");
const { createApp } = require("../src/app");

// Deliberately NO applySchema()/truncateAll() here — api.test.js and ussd.test.js
// already truncate in their own beforeAll inside their own CI worker/process, and a
// concurrent CASCADE truncate on the shared DB deadlocks with theirs. This suite
// only ever deletes the rows it owns (own phones), same as ai.test.js.

const app = createApp();

const OWN_PHONES = ["+233246680012", "+233246680013"];

beforeAll(async () => {
  // Leftover rows from an interrupted previous run: delete in dependency order so
  // the users row (last) isn't blocked by a foreign key.
  await adminPool.query("DELETE FROM system_settings WHERE key = 'commission'");
  await adminPool.query(
    "DELETE FROM notifications WHERE user_id IN (SELECT id FROM users WHERE phone = ANY($1::text[]))",
    [OWN_PHONES]
  );
  // pre_commitments.transaction_id references transactions (and the precommitment
  // rows reference the farmer's listings), so delete pc before txs and txs before listings.
  await adminPool.query(
    `DELETE FROM pre_commitments
     WHERE buyer_id IN (SELECT id FROM users WHERE phone = ANY($1::text[]))
        OR listing_id IN (SELECT id FROM listings WHERE farmer_id IN (SELECT id FROM users WHERE phone = ANY($1::text[])))`,
    [OWN_PHONES]
  );
  await adminPool.query(
    `DELETE FROM transactions
     WHERE buyer_id IN (SELECT id FROM users WHERE phone = ANY($1::text[]))
        OR farmer_id IN (SELECT id FROM users WHERE phone = ANY($1::text[]))`,
    [OWN_PHONES]
  );
  await adminPool.query(
    "DELETE FROM listings WHERE farmer_id IN (SELECT id FROM users WHERE phone = ANY($1::text[]))",
    [OWN_PHONES]
  );
  await adminPool.query(
    "DELETE FROM farms WHERE farmer_id IN (SELECT id FROM users WHERE phone = ANY($1::text[]))",
    [OWN_PHONES]
  );
  await adminPool.query(
    "DELETE FROM buyer_verifications WHERE user_id IN (SELECT id FROM users WHERE phone = ANY($1::text[]))",
    [OWN_PHONES]
  );
  await adminPool.query("DELETE FROM users WHERE phone = ANY($1::text[])", [OWN_PHONES]);
});

afterAll(async () => {
  await closeAdmin();
});

async function register(payload) {
  const res = await request(app).post("/api/auth/register").send({ acceptedTerms: true, ...payload });
  if (res.status === 201 && res.body.token && payload.role === "farmer") {
    await request(app)
      .post("/api/auth/verify")
      .set("Authorization", `Bearer ${res.body.token}`)
      .send({
        community: payload.location,
        region: payload.region || "Central",
        district: payload.district || "Awutu Senya East",
        gpsAddress: "GA-123-4567",
        idType: "ghana_card",
        idNumber: "GHA-REPORT-0001",
        photoUrl: "/uploads/test.jpg",
        acceptedTerms: true,
      });
  }
  return res;
}

async function verifyBuyer(token) {
  return request(app)
    .post("/api/auth/verify")
    .set("Authorization", `Bearer ${token}`)
    .send({
      purchaseCrops: ["tomato", "maize"],
      region: "Greater Accra",
      district: "Accra Metropolis",
      gpsAddress: "GA-123-4567",
      address: "12 Independence Ave",
      community: "Accra",
      idType: "ghana_card",
      idNumber: "GHA-98765432-1",
      photoUrl: "/uploads/photo.jpg",
    });
}

describe("GET /api/reports/my", () => {
  let farmerToken;
  let buyerToken;

  test("farmer sees earned/paid/top crops/trend over paid + pending sales", async () => {
    const farmer = await register({
      name: "ReportFarmer",
      phone: "0246680012",
      role: "farmer",
      password: "pw",
      location: "Kasoa",
      region: "Central",
      district: "Awutu Senya East",
    });
    expect(farmer.status).toBe(201);
    farmerToken = farmer.body.token;

    const buyer = await register({
      name: "ReportBuyer",
      phone: "0246680013",
      role: "buyer",
      password: "pw",
      location: "Accra",
      buyerType: "retail",
    });
    expect(buyer.status).toBe(201);
    buyerToken = buyer.body.token;
    const buyerVerify = await verifyBuyer(buyerToken);
    expect(buyerVerify.status).toBe(200);

    // Paid sale: tomatoes, 5 crates @ GHS 200 = GHS 1000.
    const listingA = await request(app)
      .post("/api/listings").set("Authorization", `Bearer ${farmerToken}`)
      .send({ cropType: "tomato", quantity: 20, unit: "crates", askingPrice: 140, location: "Kasoa" });
    expect(listingA.status).toBe(201);
    const offerA = await request(app)
      .post("/api/precommitments").set("Authorization", `Bearer ${buyerToken}`)
      .send({ listingId: listingA.body.id, quantity: 5, offeredPrice: 200 });
    expect(offerA.status).toBe(201);
    const acceptA = await request(app)
      .post(`/api/precommitments/${offerA.body.id}/respond`).set("Authorization", `Bearer ${farmerToken}`)
      .send({ action: "accept" });
    expect(acceptA.status).toBe(200);
    const payA = await request(app)
      .post(`/api/transactions/${acceptA.body.transactionId}/pay`).set("Authorization", `Bearer ${buyerToken}`);
    expect(payA.body.paymentStatus).toBe("paid");

    // Still-pending sale: maize, 3 bags @ GHS 100 = GHS 300.
    const listingB = await request(app)
      .post("/api/listings").set("Authorization", `Bearer ${farmerToken}`)
      .send({ cropType: "maize", quantity: 15, unit: "bags", askingPrice: 90, location: "Kasoa" });
    expect(listingB.status).toBe(201);
    const offerB = await request(app)
      .post("/api/precommitments").set("Authorization", `Bearer ${buyerToken}`)
      .send({ listingId: listingB.body.id, quantity: 3, offeredPrice: 100 });
    expect(offerB.status).toBe(201);
    const acceptB = await request(app)
      .post(`/api/precommitments/${offerB.body.id}/respond`).set("Authorization", `Bearer ${farmerToken}`)
      .send({ action: "accept" });
    expect(acceptB.body.transactionId).toBeTruthy();
    const txB = await request(app)
      .get(`/api/transactions/${acceptB.body.transactionId}`).set("Authorization", `Bearer ${buyerToken}`);
    expect(txB.body.paymentStatus).toBe("pending");

    const rep = await request(app).get("/api/reports/my").set("Authorization", `Bearer ${farmerToken}`);
    expect(rep.status).toBe(200);
    expect(rep.body.role).toBe("farmer");
    expect(rep.body.bucket).toBe("month");

    // Commission is admin-tuned and may vary run-to-run, so compare money against
    // the transaction rows themselves instead of hard-coding farmer net amounts.
    const nets = await adminPool.query(
      `SELECT payment_status, sum(net_amount) AS amount
       FROM transactions WHERE farmer_id = $1 GROUP BY payment_status`,
      [farmer.body.user.id]
    );
    const netTotals = Object.fromEntries(nets.rows.map((r) => [r.payment_status, Number(r.amount)]));
    const expTotal = Object.values(netTotals).reduce((a, b) => a + b, 0);
    const expPaid = netTotals.paid || 0;

    expect(rep.body.overview.items).toBe(2);
    expect(rep.body.overview.paidItems).toBe(1);
    expect(rep.body.overview.totalAmount).toBe(expTotal);
    expect(rep.body.overview.paidAmount).toBe(expPaid);
    expect(rep.body.overview.outstandingAmount).toBe(expTotal - expPaid);
    expect(rep.body.overview.totalQuantity).toBe(8);
    expect(rep.body.overview.paidQuantity).toBe(5);
    expect(rep.body.overview.counterparties).toBe(1); // one buyer
    expect(rep.body.topCrops).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ cropType: "tomato", quantity: 5 }),
        expect.objectContaining({ cropType: "maize", quantity: 3 }),
      ])
    );
    expect(rep.body.statuses.find((s) => s.status === "paid").count).toBe(1);
    expect(rep.body.statuses.find((s) => s.status === "pending").count).toBe(1);
    expect(rep.body.trend.length).toBeGreaterThanOrEqual(1);
    expect(rep.body.trend[0].amount).toBe(expTotal);
    expect(rep.body.trend[0].label.length).toBeGreaterThan(0);
  });

  test("buyer sees spend, quantity purchased and supplier count", async () => {
    const rep = await request(app).get("/api/reports/my?bucket=month").set("Authorization", `Bearer ${buyerToken}`);
    expect(rep.status).toBe(200);
    expect(rep.body.role).toBe("buyer");
    expect(rep.body.overview.totalAmount).toBe(1300);
    expect(rep.body.overview.paidAmount).toBe(1000);
    expect(rep.body.overview.items).toBe(2);
    expect(rep.body.overview.counterparties).toBe(1); // one supplier
    expect(rep.body.overview.totalQuantity).toBe(8);
    expect(rep.body.topCrops[0].cropType).toBe("tomato");
    expect(rep.body.topCrops[0].quantity).toBe(5);
  });

  test("weekly bucket labels and bad bucket falls back to month", async () => {
    const week = await request(app).get("/api/reports/my?bucket=week").set("Authorization", `Bearer ${farmerToken}`);
    expect(week.status).toBe(200);
    expect(week.body.bucket).toBe("week");
    expect(week.body.trend[0].label).toMatch(/^Wk of /);

    const bad = await request(app).get("/api/reports/my?bucket=fortnight").set("Authorization", `Bearer ${farmerToken}`);
    expect(bad.status).toBe(200);
    expect(bad.body.bucket).toBe("month");
  });

  test("report requires authentication", async () => {
    const res = await request(app).get("/api/reports/my");
    expect(res.status).toBe(401);
  });
});