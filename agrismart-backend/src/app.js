const express = require("express");
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

function createApp() {
  const app = express();
  app.use(express.json());

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
  app.use("/ussd", ussdRoutes);

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
