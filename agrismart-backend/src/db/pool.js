const { Pool } = require("pg");
const config = require("../config");

if (!config.databaseUrl) {
  throw new Error("DATABASE_URL is not set. Copy .env.example to .env and configure it.");
}

const pool = new Pool({ connectionString: config.databaseUrl });

pool.on("error", (err) => {
  console.error("[DB POOL ERROR]", err.message);
});

module.exports = {
  pool,
  query: (text, params) => pool.query(text, params),
};
