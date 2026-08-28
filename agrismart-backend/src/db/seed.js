// seed.js - Demo/smoke data for day-one use. Run with: npm run seed
// Idempotent: skips prices already present and upserts the sample users by phone.
const { pool } = require("./pool");
const usersRepo = require("../repositories/users");
const listingsRepo = require("../repositories/listings");
const pricesRepo = require("../repositories/prices");
const auth = require("../services/auth");

const CROPS = ["tomato", "maize", "pepper"];
const MARKETS = ["Kasoa", "Ashanti Market (Domenasi)", "Ada"];
const BASE = { tomato: 140, maize: 190, pepper: 220 };

async function seedPrices() {
  const existing = await pool.query("SELECT count(*) FROM prices");
  if (Number(existing.rows[0].count) > 0) {
    console.log("[seed] prices already seeded - skipping.");
    return;
  }
  let n = 0;
  for (let daysAgo = 56; daysAgo >= 0; daysAgo -= 7) {
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);
    const iso = date.toISOString().slice(0, 10);
    for (const crop of CROPS) {
      for (const market of MARKETS) {
        const noise = Math.round((Math.random() - 0.5) * 30);
        await pricesRepo.insertPrice({
          cropType: crop,
          market,
          price: Math.max(50, BASE[crop] + noise),
          date: iso,
        });
        n++;
      }
    }
  }
  console.log(`[seed] inserted ${n} price rows.`);
}

async function seedUsersAndListings() {
  // Admin
  let admin = await usersRepo.findUserByPhone("+233240000001");
  if (!admin) {
    const { user } = await auth.registerWithPassword({
      name: "System Admin",
      phone: "0240000001",
      email: "admin@agrismart.gh",
      role: "admin",
      password: process.env.ADMIN_SEED_PASSWORD || "AgriSmart123!",
    });
    admin = user;
    console.log("[seed] created admin user:", user.id);
  }

  // Sample farmer
  let farmer = await usersRepo.findUserByPhone("+233241234561");
  if (!farmer) {
    farmer = await usersRepo.createUser({
      name: "Ama Mensah", phone: "0241234561", role: "farmer",
      location: "Kasoa", primaryCrops: ["tomato", "maize"], language: "tw",
      farmSize: 4.5, community: "Twelagua", verified: true,
    });
    console.log("[seed] created sample farmer:", farmer.id);
  }

  // Sample buyer (wholesale)
  let buyer = await usersRepo.findUserByPhone("+233241234562");
  if (!buyer) {
    buyer = await usersRepo.createUser({
      name: "Kofi Owusu", phone: "0241234562", role: "buyer",
      location: "Accra", buyerType: "wholesale", purchaseCrops: ["tomato", "maize"],
      mobileMoneyProvider: "mtn", verified: true,
    });
    console.log("[seed] created sample buyer:", buyer.id);
  }

  // A listing for the sample farmer if none exist
  const listings = await listingsRepo.searchListings({});
  if (listings.length === 0) {
    const l = await listingsRepo.createListing({
      farmerId: farmer.id,
      cropType: "tomato",
      quantity: 40,
      unit: "crates",
      askingPrice: 140,
      location: farmer.location,
      harvestDate: new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10),
    });
    console.log("[seed] created sample listing:", l.id);
  }
}

async function main() {
  await seedPrices();
  await seedUsersAndListings();
  await pool.end();
  console.log("[seed] done.");
}

main().catch((err) => {
  console.error("[seed] failed:", err);
  process.exitCode = 1;
});
