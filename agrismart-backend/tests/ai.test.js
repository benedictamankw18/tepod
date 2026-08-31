const { closeAdmin, adminPool } = require("./helpers/db");
const request = require("supertest");
const { createApp } = require("../src/app");

// Force the rule-based (offline) advice path even when a real OpenRouter key is
// present in .env, so these tests never touch the network (same pattern as
// PAYSTACK_SIMULATED). Weather also runs on a deterministic fixture under jest.
process.env.OPENROUTER_SIMULATED = "1";

const app = createApp();

// NOTE: deliberately NO applySchema()/truncateAll() here. api.test.js and
// ussd.test.js cave truncateAll() in their own beforeAll (each in its own
// CI worker/process). A third concurrent TRUNCATE ... CASCADE on the shared DB
// deadlocks with theirs, so this suite only ever touches rows it owns (its own
// markets via seedPrices), which is also safe against their truncates.

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

async function seedPrices(rows) {
  for (const row of rows) {
    await adminPool.query("DELETE FROM prices WHERE crop_type = $1 AND market = $2", [row.cropType, row.market]);
    await adminPool.query(
      "INSERT INTO prices (crop_type, market, price, date) VALUES ($1,$2,$3,$4)",
      [row.cropType, row.market, row.price, row.date]
    );
  }
}

function fwdDate(days) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

// Flat series around a 14-day window, one weekday-stable value plus a little noise.
function priceSeries(base, fromDays, market) {
  const out = [];
  for (let i = fromDays; i <= 0; i += 1) {
    out.push({
      cropType: "tomato",
      market: market || "Guide Market",
      price: Math.round(base + (i % 3) * 1.5 + (i % 5) * 0.3),
      date: fwdDate(i),
    });
  }
  return out;
}

describe("priceGuide service (pure)", () => {
  test("buildGuide returns stats, forecast, confidence and advice", () => {
    const { buildGuide } = require("../src/services/priceGuide");
    const daily = priceSeries(100, -29, "Guide Market").map((r) => ({ date: r.date, value: r.price }));
    const guide = buildGuide({ cropType: "tomato", market: "Guide Market", daily });

    expect(guide.available).toBe(true);
    expect(guide.current).toBeTruthy();
    expect(typeof guide.current.price).toBe("number");
    expect(guide.averages.days7).toBeGreaterThan(0);
    expect(guide.forecast.days).toHaveLength(3);
    expect(guide.forecast.days[2].estimate).toBeGreaterThan(0);
    expect(guide.forecast.range.low).toBeLessThan(guide.forecast.range.high);
    expect(["low", "medium", "high"]).toContain(guide.confidence.level);
    expect(guide.advice.source).toBe("rules");
    expect(guide.advice.recommendation.length).toBeGreaterThan(10);
  });

  test("series too short -> available false", () => {
    const { buildGuide } = require("../src/services/priceGuide");
    const guide = buildGuide({ cropType: "tomato", market: "Empty", daily: [] });
    expect(guide.available).toBe(false);
    expect(guide.advice).toBeNull();
  });
});

describe("weather service (pure, offline fixture)", () => {
  test("forecastFor returns 7 days with risk + best window", async () => {
    const { forecastFor } = require("../src/services/weather");
    const f = await forecastFor(5.6, -0.18);
    expect(f.daily).toHaveLength(7);
    expect(f.daily[0].rainProbMax).toBeGreaterThanOrEqual(70); // fixture day 0 is heavy rain
    expect(f.risk.level).toBe("high");
    expect(f.risk.reasons.length).toBeGreaterThan(0);
    expect(f.bestWindow.date).toBeTruthy();
  });

  test("classifyRisk flags harvest risk near expected date", () => {
    const { buildFixture, classifyRisk } = require("../src/services/weather");
    const f = buildFixture(5.6, -0.18);
    const risk = classifyRisk(f, fwdDate(1)); // harvest tomorrow, rain today
    expect(risk.harvestNote.length).toBeGreaterThan(0);
  });
});

describe("GET /api/ai/price-guide", () => {
  test("returns guide for a crop + market and compares markets", async () => {
    const farmer = await register({ name: "GuideFarmer", phone: "0246680001", role: "farmer", password: "pw", location: "Kasoa" });
    await seedPrices(priceSeries(100, -20, "Guide Market"));
    await seedPrices(priceSeries(115, -20, "Far Market"));

    const res = await request(app).get("/api/ai/price-guide").query({ cropType: "tomato", market: "Guide Market" });
    expect(res.status).toBe(200);
    expect(res.body.available).toBe(true);
    expect(res.body.current.price).toBeGreaterThan(0);
    expect(res.body.forecast.days).toHaveLength(3);
    expect(["low", "medium", "high"]).toContain(res.body.confidence.level);
    expect(res.body.advice.source).toBe("rules");

    // Cross-market comparison present, higher-priced market listed first.
    expect(res.body.comparison.length).toBeGreaterThanOrEqual(2);
    const markets = res.body.comparison.map((c) => c.market);
    expect(markets).toContain("Guide Market");
    expect(markets).toContain("Far Market");
    expect(res.body.comparison[0].latestPrice).toBeGreaterThanOrEqual(res.body.comparison[1].latestPrice);
  });

  test("missing cropType -> 400", async () => {
    const res = await request(app).get("/api/ai/price-guide");
    expect(res.status).toBe(400);
  });
});

describe("GET /api/ai/weather-guide", () => {
  test("requires auth", async () => {
    const res = await request(app).get("/api/ai/weather-guide");
    expect(res.status).toBe(401);
  });

  test("returns forecast + rule advice for a farm with coordinates", async () => {
    const farmer = await register({ name: "WxFarmer", phone: "0246680002", role: "farmer", password: "pw", location: "Kasoa" });
    const token = farmer.body.token;

    const farm = await request(app)
      .post("/api/farms")
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "Rainy plot",
        cropType: "tomato",
        location: "Kasoa",
        lat: 5.5345,
        lng: -0.4163,
        expectedHarvestDate: fwdDate(2),
      });
    expect(farm.status).toBe(201);

    const res = await request(app).get("/api/ai/weather-guide").set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.daily).toHaveLength(7);
    expect(res.body.risk.level).toBe("high"); // fixture: heavy rain today
    expect(res.body.bestWindow).toBeTruthy();
    expect(res.body.advice.source).toBe("rules");
    expect(res.body.advice.recommendation.length).toBeGreaterThan(10);
  });

  test("404 when a farmer has no location and no farm", async () => {
    const farmer = await register({ name: "NowhereFarmer", phone: "0246680003", role: "farmer", password: "pw" });
    const token = farmer.body.token;
    const res = await request(app).get("/api/ai/weather-guide").set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(404);
  });
});