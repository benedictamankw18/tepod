const express = require("express");
const path = require("path");
const swaggerUi = require("swagger-ui-express");
const { errorHandler, notFound } = require("./middleware/error");
const swaggerSpec = require("./swagger");

const authRoutes = require("./routes/auth");
const usersRoutes = require("./routes/users");
const listingsRoutes = require("./routes/listings");
const precommitmentsRoutes = require("./routes/precommitments");
const transactionsRoutes = require("./routes/transactions");
const transportRoutes = require("./routes/transport");
const pricesRoutes = require("./routes/prices");
const notificationsRoutes = require("./routes/notifications");
const ussdRoutes = require("./routes/ussd");
const summaryRoutes = require("./routes/summary");
const healthRoutes = require("./routes/health");
const farmsRoutes = require("./routes/farms");
const produceRoutes = require("./routes/produce");
const uploadsRoutes = require("./routes/uploads");
const bannersRoutes = require("./routes/banners");
const cartRoutes = require("./routes/cart");
const wishlistRoutes = require("./routes/wishlist");
const cropsRoutes = require("./routes/crops");
const unitsRoutes = require("./routes/units");
const regionsRoutes = require("./routes/regions");
const adminRoutes = require("./routes/audit");
const reviewsRoutes = require("./routes/reviews");
const settingsRoutes = require("./routes/settings");
const paymentsRoutes = require("./routes/payments");
const aiRoutes = require("./routes/ai");
const reportsRoutes = require("./routes/reports");

function createApp() {
  const app = express();
  // Capture the raw JSON bytes so the Paystack webhook can verify its HMAC signature
  // against the exact payload the provider signed. verify() runs before parsing.
  app.use(express.json({
    verify: (req, _res, buf) => { req.rawBody = buf; },
  }));

  // Express only sets req.body when a JSON Content-Type body is sent; for body-less
  // requests req.body is undefined, which would crash any `const { ... } = req.body`.
  // Normalize it so routes can destructure safely and return proper 400s instead of 500s.
  app.use((req, _res, next) => {
    if (req.body === undefined || req.body === null) req.body = {};
    next();
  });

  app.use("/api/auth", authRoutes);
  app.use("/api/users", usersRoutes);
  app.use("/api/listings", listingsRoutes);
  app.use("/api/precommitments", precommitmentsRoutes);
  app.use("/api/transactions", transactionsRoutes);
  app.use("/api/transport-requests", transportRoutes);
  app.use("/api/prices", pricesRoutes);
  app.use("/api/notifications", notificationsRoutes);
  app.use("/api/summary", summaryRoutes);
  app.use("/api/health", healthRoutes);
  app.use("/api/farms", farmsRoutes);
  app.use("/api/produce", produceRoutes);
  app.use("/api/uploads", uploadsRoutes);
  app.use("/api/banners", bannersRoutes);
  app.use("/api/cart", cartRoutes);
  app.use("/api/wishlist", wishlistRoutes);
  app.use("/api/crops", cropsRoutes);
  app.use("/api/units", unitsRoutes);
  app.use("/api/regions", regionsRoutes);
  app.use("/api/admin", adminRoutes);
  app.use("/api/reviews", reviewsRoutes);
  app.use("/api/settings", settingsRoutes);
  app.use("/api/payments", paymentsRoutes);
  app.use("/api/ai", aiRoutes);
  app.use("/api/reports", reportsRoutes);
  app.use("/ussd", ussdRoutes);

  // Serve uploaded images (live photos, produce, farm) from /uploads/*.
  app.use("/uploads", express.static(path.join(__dirname, "..", "public", "uploads")));

  app.get("/", (_req, res) => {
    res.json({
      service: "agrismart-backend",
      api: "/api",
      health: "/api/health",
      ussd: "/ussd",
      docs: "/api-docs",
    });
  });

  // Swagger/OpenAPI interactive UI + raw spec.
  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
  app.get("/api-docs.json", (_req, res) => {
    res.setHeader("Content-Type", "application/json");
    res.send(swaggerSpec);
  });

  app.use(notFound);
  app.use(errorHandler);

  return app;
}

module.exports = { createApp };
