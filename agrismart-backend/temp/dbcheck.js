const { Pool } = require("pg");
const p = new Pool({ connectionString: process.env.DATABASE_URL || "postgres://agrismart_app:agrismart-pass@localhost:5432/agrismart" });
(async () => {
  const migs = await p.query("SELECT name FROM schema_migrations ORDER BY name DESC LIMIT 4");
  console.log("migrations:", migs.rows.map((x) => x.name).join(", "));
  const rows = await p.query(
    `SELECT t.id, t.agreed_price, t.deposit_amount, t.paid_amount, p.quantity
     FROM transactions t LEFT JOIN pre_commitments p ON p.transaction_id = t.id
     ORDER BY t.created_at DESC LIMIT 10`
  );
  rows.rows.forEach((x) =>
    console.log(x.id.slice(0, 8), "agreed=" + x.agreed_price, "dep=" + x.deposit_amount, "paid=" + x.paid_amount, "qty=" + x.quantity)
  );
  await p.end();
})().catch((e) => {
  console.error(e.message);
  process.exit(1);
});