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
// markets via seedPrices, its own farmers), which is also safe against their
// truncates.

const OWN_PHONES = ["+233246680001", "+233246680002", "+233246680003"];

beforeAll(async () => {
  // Drop leftover rows from an interrupted previous run so re-runs (and the shared
  // test DB where api.test.js truncateAll has already run) stay deterministic.
  // Row-level DELETEs on our own fixed phones only — never a CASCADE truncate.
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

describe("GET /api/ai/crop-guide", () => {
  // This suite owns market_prices / crop_area rows (no other test suite touches
  // them, and truncateAll() deliberately excludes them). Ensure the empty tables
  // exist in case api.test.js has not applied the schema yet, then seed our own
  // rows (delete-then-insert so the suite is re-runnable).
  beforeAll(async () => {
    await adminPool.query(`
      CREATE TABLE IF NOT EXISTS market_prices (
        id             SERIAL PRIMARY KEY,
        region         TEXT NOT NULL,
        district       TEXT NOT NULL DEFAULT '',
        market         TEXT NOT NULL,
        commodity_key  TEXT NOT NULL,
        commodity_name TEXT NOT NULL,
        price          NUMERIC(10,2) NOT NULL,
        date           DATE NOT NULL,
        source         TEXT NOT NULL DEFAULT 'retail',
        created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    await adminPool.query(`
      CREATE TABLE IF NOT EXISTS crop_area (
        commodity_key  TEXT NOT NULL,
        commodity_name TEXT NOT NULL,
        year           INTEGER NOT NULL,
        hectares       NUMERIC(12,0) NOT NULL,
        PRIMARY KEY (commodity_key, year)
      )
    `);

    for (const region of ["Ashanti", "Volta"]) {
      await adminPool.query("DELETE FROM market_prices WHERE region = $1", [region]);
    }
    for (const key of ["tomato", "pepper"]) {
      await adminPool.query("DELETE FROM crop_area WHERE commodity_key = $1", [key]);
    }

    // Tomato (Ashanti): steadily rising retail prices Apr-Jul 2025.
    // Maize (Ashanti): gently falling. Pepper (Volta): rising.
    const tomato = [
      ["2025-04-08", 10],
      ["2025-04-22", 11],
      ["2025-05-06", 12],
      ["2025-05-20", 13],
      ["2025-06-04", 14],
      ["2025-06-18", 15],
      ["2025-07-02", 16],
    ];
    const maize = [
      ["2025-04-08", 40],
      ["2025-05-06", 39],
      ["2025-06-04", 38],
      ["2025-07-02", 37],
    ];
    const pepper = [
      ["2025-04-08", 25],
      ["2025-05-06", 26],
      ["2025-06-04", 27],
      ["2025-07-02", 28],
    ];
    for (const [date, price] of tomato) {
      await adminPool.query(
        "INSERT INTO market_prices (region, district, market, commodity_key, commodity_name, price, date) VALUES ('Ashanti','Kumasi','Kumasi Central','tomato','Tomato Local',$1,$2)",
        [price, date]
      );
    }
    for (const [date, price] of maize) {
      await adminPool.query(
        "INSERT INTO market_prices (region, district, market, commodity_key, commodity_name, price, date) VALUES ('Ashanti','Kwabre','Ejisu','maize','Maize Yellow',$1,$2)",
        [price, date]
      );
    }
    for (const [date, price] of pepper) {
      await adminPool.query(
        "INSERT INTO market_prices (region, district, market, commodity_key, commodity_name, price, date) VALUES ('Volta','Ho','Ho Central','pepper','Fresh Pepper Legon 18',$1,$2)",
        [price, date]
      );
    }
    await adminPool.query(
      "INSERT INTO crop_area (commodity_key, commodity_name, year, hectares) VALUES ('tomato','Tomato',2019,1000)"
    );
    await adminPool.query(
      "INSERT INTO crop_area (commodity_key, commodity_name, year, hectares) VALUES ('tomato','Tomato',2023,1100)"
    );
    await adminPool.query(
      "INSERT INTO crop_area (commodity_key, commodity_name, year, hectares) VALUES ('pepper','Pepper',2019,500)"
    );
    await adminPool.query(
      "INSERT INTO crop_area (commodity_key, commodity_name, year, hectares) VALUES ('pepper','Pepper',2023,520)"
    );
  });

  afterAll(async () => {
    await adminPool.query("DELETE FROM market_prices WHERE region = 'Greater Accra' AND commodity_key = 'beef'");
  });

  test("returns ranked commodities with drivers, attribution and rule advice", async () => {
    const res = await request(app).get("/api/ai/crop-guide");
    expect(res.status).toBe(200);
    expect(res.body.available).toBe(true);

    const types = res.body.commodities.map((c) => c.cropType);
    expect(types).toContain("tomato");
    expect(types).toContain("maize");
    expect(types).toContain("pepper");

    const tomato = res.body.commodities.find((c) => c.cropType === "tomato");
    const maize = res.body.commodities.find((c) => c.cropType === "maize");
    expect(tomato.direction).toBe("up"); // last month clearly above the month before
    expect(["high", "medium", "low"]).toContain(tomato.demandLevel);
    expect(tomato.score).toBeGreaterThanOrEqual(0);
    expect(tomato.score).toBeLessThanOrEqual(100);
    expect(tomato.emoji).toBeTruthy();
    expect(tomato.price.trendPct).toBeGreaterThan(0);
    expect(tomato.drivers.length).toBeGreaterThanOrEqual(2);
    expect(maize.score).toBeLessThan(tomato.score); // falling crop ranks below rising one
    expect([...res.body.commodities].sort((a, b) => b.score - a.score)[0].cropType).toBe(tomato.cropType);

    expect(res.body.availableRegions).toEqual(expect.arrayContaining(["Ashanti", "Volta"]));
    expect(res.body.observed).toMatch(/2025/);
    expect(res.body.attribution.length).toBeGreaterThan(5);
    expect(res.body.advice.source).toBe("rules");
    expect(res.body.advice.recommendation.length).toBeGreaterThan(10);
  });

  test("region filter limits the ranking to that region", async () => {
    const res = await request(app).get("/api/ai/crop-guide").query({ region: "Ashanti" });
    expect(res.status).toBe(200);
    expect(res.body.available).toBe(true);
    const types = res.body.commodities.map((c) => c.cropType);
    expect(types).toContain("tomato");
    expect(types).toContain("maize");
    expect(types).not.toContain("pepper"); // pepper rows are only in Volta
    expect(res.body.regionLabel).toBe("Ashanti");
  });

  test("unknown region -> 400 with available regions listed", async () => {
    const res = await request(app).get("/api/ai/crop-guide").query({ region: "Incomprehensive" });
    expect(res.status).toBe(400);
    expect(res.body.availableRegions).toContain("Ashanti");
  });

  test("plantMonth adds a harvest-month seasonal signal", async () => {
    const res = await request(app).get("/api/ai/crop-guide").query({ region: "Ashanti", plantMonth: 1 });
    expect(res.status).toBe(200);
    expect(res.body.plantMonth).toBe(1);
    const tomato = res.body.commodities.find((c) => c.cropType === "tomato");
    expect(tomato.seasonal).toBeTruthy();
    expect(tomato.seasonal.harvestMonth).toBe(4); // tomato matures ~3 months
    expect(typeof tomato.seasonal.liftPct).toBe("number");
  });

  test("plantMonth out of range -> 400", async () => {
    const res = await request(app).get("/api/ai/crop-guide").query({ plantMonth: 13 });
    expect(res.status).toBe(400);
  });

  test("region with only unmapped commodities -> available false", async () => {
    await adminPool.query(
      "INSERT INTO market_prices (region, district, market, commodity_key, commodity_name, price, date) VALUES ('Greater Accra','Ablekuma','Makola','beef','Beef',50,'2025-07-02')"
    );
    const res = await request(app).get("/api/ai/crop-guide").query({ region: "Greater Accra" });
    expect(res.status).toBe(200);
    expect(res.body.available).toBe(false);
    expect(res.body.commodities).toHaveLength(0);
    expect(res.body.advice).toBeNull();
    expect(res.body.availableRegions).toContain("Greater Accra");
  });
});