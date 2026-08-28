const swaggerJsdoc = require("swagger-jsdoc");

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "AgriSmart AI API",
      version: "1.0.0",
      description:
        "Backend API for the AgriSmart AI marketplace: users, listings, pre-commitments, " +
        "transactions, transport requests, market prices, notifications, and the USSD webhook.",
    },
    servers: [{ url: "http://localhost:3000", description: "Local development server" }],
    components: {
      securitySchemes: {
        bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
      },
      responses: {
        BadRequest: {
          description: "Invalid or missing request fields",
          content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } },
        },
        Unauthorized: {
          description: "Missing or invalid bearer token / bad credentials",
          content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } },
        },
        Forbidden: {
          description: "Authenticated but role not allowed for this action",
          content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } },
        },
        NotFound: {
          description: "Requested resource not found",
          content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } },
        },
        Conflict: {
          description: "Resource already exists or state conflict",
          content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } },
        },
      },
      schemas: {
        Error: {
          type: "object",
          properties: { error: { type: "string", example: "a message describing the problem" } },
        },
        User: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            name: { type: "string" },
            phone: { type: "string", example: "+233241234567" },
            email: { type: "string", nullable: true },
            username: { type: "string", nullable: true, description: "Optional login handle" },
            role: { type: "string", enum: ["farmer", "buyer", "market_seller", "transporter", "admin"] },
            location: { type: "string", nullable: true },
            cropTypes: { type: "array", items: { type: "string" } },
            primaryCrops: { type: "array", items: { type: "string" } },
            purchaseCrops: { type: "array", items: { type: "string" } },
            buyerType: { type: "string", enum: ["wholesale", "retail", "processor"], nullable: true },
            mobileMoneyProvider: { type: "string", enum: ["mtn", "vodafone_cash", "airteltigo"], nullable: true },
            language: { type: "string", enum: ["en", "tw"] },
            farmSize: { type: "number", nullable: true },
            community: { type: "string", nullable: true },
            verified: { type: "boolean" },
            rating: { type: "number", nullable: true },
            ratingCount: { type: "number" },
            createdAt: { type: "string", format: "date-time" },
          },
        },
        AuthResponse: {
          type: "object",
          required: ["user", "token"],
          properties: {
            user: { $ref: "#/components/schemas/User" },
            token: { type: "string", description: "JWT bearer token", example: "eyJhbGciOiJIUzI1NiIs..." },
          },
        },
        Listing: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            farmerId: { type: "string", format: "uuid" },
            cropType: { type: "string", example: "tomato" },
            quantity: { type: "number" },
            unit: { type: "string", example: "crates" },
            harvestDate: { type: "string", format: "date", nullable: true },
            askingPrice: { type: "number" },
            location: { type: "string", nullable: true },
            status: { type: "string", enum: ["open", "pre_committed", "sold", "expired", "spoiled_withdrawn"] },
            statusHistory: { type: "array", items: { type: "object" } },
            createdAt: { type: "string", format: "date-time" },
          },
        },
        Precommitment: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            listingId: { type: "string", format: "uuid" },
            buyerId: { type: "string", format: "uuid" },
            quantity: { type: "number" },
            offeredPrice: { type: "number" },
            counterPrice: { type: "number", nullable: true },
            status: { type: "string", enum: ["pending", "accepted", "rejected", "countered"] },
            createdAt: { type: "string", format: "date-time" },
          },
        },
        Transaction: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            listingId: { type: "string", format: "uuid" },
            buyerId: { type: "string", format: "uuid" },
            farmerId: { type: "string", format: "uuid" },
            agreedPrice: { type: "number" },
            paymentStatus: { type: "string", enum: ["pending", "paid", "overdue", "disputed"] },
            dueDate: { type: "string", format: "date" },
            paidAt: { type: "string", format: "date-time", nullable: true },
            createdAt: { type: "string", format: "date-time" },
          },
        },
        TransportRequest: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            farmerIds: { type: "array", items: { type: "string", format: "uuid" } },
            pickupLocation: { type: "string" },
            requestedDate: { type: "string", format: "date", nullable: true },
            status: { type: "string", enum: ["requested", "assigned", "confirmed", "cancelled"] },
            transporterId: { type: "string", format: "uuid", nullable: true },
            estimatedCost: { type: "number", nullable: true },
            createdAt: { type: "string", format: "date-time" },
          },
        },
        PriceCurrent: {
          type: "object",
          properties: {
            cropType: { type: "string" },
            market: { type: "string", nullable: true },
            date: { type: "string", format: "date" },
            averagePrice: { type: "number" },
          },
        },
        PriceRecord: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            cropType: { type: "string" },
            market: { type: "string", nullable: true },
            price: { type: "number" },
            date: { type: "string", format: "date" },
          },
        },
        Notification: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            to_phone: { type: "string" },
            channel: { type: "string" },
            message_key: { type: "string", nullable: true },
            language: { type: "string", nullable: true },
            params: { type: "object", nullable: true },
            message: { type: "string" },
            delivered: { type: "boolean" },
            agoo_id: { type: "string", nullable: true },
            error: { type: "string", nullable: true },
            sent_at: { type: "string", format: "date-time" },
          },
        },
        Summary: {
          type: "object",
          properties: {
            users: { type: "number" },
            listings: { type: "number" },
            openListings: { type: "number" },
            preCommitments: { type: "number" },
            transactions: { type: "number" },
            overduePayments: { type: "number" },
            transportRequests: { type: "number" },
            notificationsSent: { type: "number" },
          },
        },
        Health: {
          type: "object",
          properties: {
            status: { type: "string", example: "ok" },
            db: { type: "string", example: "up" },
            time: { type: "string", format: "date-time" },
          },
        },
      },
    },
    tags: [
      { name: "Auth" },
      { name: "Users" },
      { name: "Listings" },
      { name: "Precommitments" },
      { name: "Transactions" },
      { name: "Transport" },
      { name: "Prices" },
      { name: "Notifications" },
      { name: "Summary" },
      { name: "Health" },
      { name: "USSD" },
    ],
  },
  apis: ["src/routes/*.js"],
};

const spec = swaggerJsdoc(options);
module.exports = spec;
