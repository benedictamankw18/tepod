// migrate.js
// Tiny migration runner. Applies src/db/schema.sql once (tracked as "0001_initial_schema"),
// then applies any additional SQL files in src/db/migrations/*.sql in filename order.
// Run with: npm run migrate
const fs = require("fs");
const path = require("path");
const { pool } = require("./pool");

const MIGRATION_NAME = "0001_initial_schema";
const SCHEMA_PATH = path.join(__dirname, "schema.sql");
const MIGRATIONS_DIR = path.join(__dirname, "migrations");

function migrationName(file) {
  return path.basename(file, ".sql");
}

async function applied() {
  const r = await pool.query(
    "SELECT 1 FROM information_schema.tables WHERE table_name = 'schema_migrations'"
  );
  if (r.rowCount === 0) return [];
  const res = await pool.query("SELECT name FROM schema_migrations");
  return res.rows.map((x) => x.name);
}

async function run() {
  const already = new Set(await applied());
  const client = await pool.connect();
  try {
    await client.query(
      `CREATE TABLE IF NOT EXISTS schema_migrations (
         name TEXT PRIMARY KEY,
         applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
       )`
    );

    // 1) Base schema (self-contained BEGIN/COMMIT, so run it in a single statement).
    if (!already.has(MIGRATION_NAME)) {
      const sql = fs.readFileSync(SCHEMA_PATH, "utf8");
      try {
        await client.query(sql);
        await client.query(
          "INSERT INTO schema_migrations (name) VALUES ($1) ON CONFLICT (name) DO NOTHING",
          [MIGRATION_NAME]
        );
        console.log(`[migrate] applied ${MIGRATION_NAME}`);
      } catch (err) {
        console.error(`[migrate] failed ${MIGRATION_NAME}:`, err.message);
        process.exitCode = 1;
      }
    }

    // 2) Incremental migrations (idempotent SQL, wrapped in their own transaction).
    let ran = false;
    if (fs.existsSync(MIGRATIONS_DIR)) {
      const files = fs.readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith(".sql")).sort();
      for (const file of files) {
        const name = migrationName(file);
        if (already.has(name)) continue;
        ran = true;
        const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), "utf8");
        try {
          await client.query("BEGIN");
          await client.query(sql);
          await client.query(
            "INSERT INTO schema_migrations (name) VALUES ($1) ON CONFLICT (name) DO NOTHING",
            [name]
          );
          await client.query("COMMIT");
          console.log(`[migrate] applied ${name}`);
        } catch (err) {
          await client.query("ROLLBACK");
          console.error(`[migrate] failed ${name}:`, err.message);
          process.exitCode = 1;
        }
      }
    }

    if (already.has(MIGRATION_NAME) && !ran) {
      console.log("[migrate] nothing to do - all migrations already applied.");
    }
  } finally {
    client.release();
    await pool.end();
  }
}

run();
