// Test database helper: applies the schema to TEST_DATABASE_URL (or DATABASE_URL)
// and provides a truncate helper. The app under test is expected to use DATABASE_URL,
// which tests set to the same target before requiring src/app.
const fs = require("fs");
const path = require("path");
require("dotenv").config();
const { Pool } = require("pg");

const TEST_URL = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL;

if (!TEST_URL) {
  throw new Error("TEST_DATABASE_URL (or DATABASE_URL) must be set to run tests");
}

// The app's pool reads DATABASE_URL at module load; align it with the test DB.
process.env.DATABASE_URL = TEST_URL;

const adminPool = new Pool({ connectionString: TEST_URL });

const SCHEMA = fs.readFileSync(path.join(__dirname, "../../src/db/schema.sql"), "utf8");

// Incremental migrations (e.g. adding the username column) applied after the base schema
// so existing test databases created before a column was added still get it.
const MIGRATIONS_DIR = path.join(__dirname, "../../src/db/migrations");
const MIGRATIONS = fs.existsSync(MIGRATIONS_DIR)
  ? fs.readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith(".sql")).sort()
      .map((f) => fs.readFileSync(path.join(MIGRATIONS_DIR, f), "utf8"))
  : [];

const TABLES = [
  "ago_sms_logs", "notifications", "otp_codes", "oauth_accounts", "ussd_sessions",
  "transport_requests", "pre_commitments", "transactions", "listings", "prices", "users",
  "farms", "buyer_verifications", "banners", "cart_items", "user_croptype",
];

async function applySchema() {
  await adminPool.query(SCHEMA);
  for (const sql of MIGRATIONS) {
    await adminPool.query(sql);
  }
}

async function truncateAll() {
  for (const t of TABLES) {
    await adminPool.query(`TRUNCATE ${t} CASCADE`);
  }
}

async function closeAdmin() {
  await adminPool.end();
  // Close the app's own pool (created from DATABASE_URL) so jest can exit cleanly.
  try {
    const { pool } = require("../../src/db/pool");
    await pool.end();
  } catch (_) { /* already closed */ }
}

module.exports = { adminPool, applySchema, truncateAll, closeAdmin, TEST_URL };
