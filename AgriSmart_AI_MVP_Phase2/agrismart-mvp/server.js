require("dotenv").config();

const express = require("express");
const path = require("path");
const store = require("./store");

const usersRouter = require("./routes/users");
const listingsRouter = require("./routes/listings");
const precommitmentsRouter = require("./routes/precommitments");
const transactionsRouter = require("./routes/transactions");
const transportRouter = require("./routes/transport");
const pricesRouter = require("./routes/prices");
const notificationsRouter = require("./routes/notifications");
const ussdRouter = require("./ussd");

const app = express();
app.use(express.json());

// Seed illustrative price history so /api/prices has something to show on day one
// (stands in for the Esoko/MoFA price feed until that integration is wired up in Phase 3).
store.seedPrices();

app.use("/api/users", usersRouter);
app.use("/api/listings", listingsRouter);
app.use("/api/precommitments", precommitmentsRouter);
app.use("/api/transactions", transactionsRouter);
app.use("/api/transport-requests", transportRouter);
app.use("/api/prices", pricesRouter);
app.use("/api/notifications", notificationsRouter);
app.use("/ussd", ussdRouter);

// Lightweight aggregate endpoint for the admin dashboard
app.get("/api/summary", (req, res) => {
  const db = store._db;
  res.json({
    users: db.users.size,
    listings: db.listings.size,
    openListings: [...db.listings.values()].filter((l) => l.status === "open").length,
    preCommitments: db.preCommitments.size,
    transactions: db.transactions.size,
    overduePayments: store.overdueTransactions().length,
    transportRequests: db.transportRequests.size,
    notificationsSent: db.notifications.length,
  });
});

app.use("/app", express.static(path.join(__dirname, "public/app")));
app.use("/admin", express.static(path.join(__dirname, "public/admin")));

app.get("/", (req, res) => {
  res.redirect("/admin");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`AgriSmart AI MVP server listening on http://localhost:${PORT}`);
  console.log(`Admin dashboard: http://localhost:${PORT}/admin`);
});
