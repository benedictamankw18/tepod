const express = require("express");
const store = require("../store");

const router = express.Router();

// FR-7.1: register as Farmer, Buyer, Market Seller, or Transport Provider
router.post("/", (req, res) => {
  const { name, phone, role, location, cropTypes, primaryCrops, language, farmSize, community, buyerType, purchaseCrops, mobileMoneyProvider } = req.body;
  if (!name || !phone || !role) {
    return res.status(400).json({ error: "name, phone, and role are required" });
  }
  const validRoles = ["farmer", "buyer", "market_seller", "transporter", "admin"];
  if (!validRoles.includes(role)) {
    return res.status(400).json({ error: `role must be one of ${validRoles.join(", ")}` });
  }
  if (store.findUserByPhone(phone)) {
    return res.status(409).json({ error: "a user with this phone number already exists" });
  }
  if (language && !["en", "tw"].includes(language)) {
    return res.status(400).json({ error: "language must be 'en' or 'tw'" });
  }
  if (farmSize !== undefined && (typeof farmSize !== "number" || farmSize <= 0)) {
    return res.status(400).json({ error: "farmSize must be a positive number" });
  }
  if (role === "buyer") {
    // buyerType is required for buyers - it shapes the trust signal farmers see (FR-1.4).
    if (!["wholesale", "retail", "processor"].includes(buyerType)) {
      return res.status(400).json({ error: "buyerType is required for buyers and must be one of wholesale, retail, processor" });
    }
  } else if (buyerType !== undefined || purchaseCrops !== undefined || mobileMoneyProvider !== undefined) {
    return res.status(400).json({ error: "buyerType, purchaseCrops, and mobileMoneyProvider are only valid for buyer/market_seller roles" });
  }
  if (mobileMoneyProvider && !["mtn", "vodafone_cash", "airteltigo"].includes(mobileMoneyProvider)) {
    return res.status(400).json({ error: "mobileMoneyProvider must be one of mtn, vodafone_cash, airteltigo" });
  }
  const user = store.createUser({
    name, phone, role, location, cropTypes, primaryCrops, language, farmSize, community,
    buyerType, purchaseCrops, mobileMoneyProvider,
  });
  res.status(201).json(user);
});

router.get("/", (req, res) => {
  res.json(store.listUsers());
});

router.get("/:id", (req, res) => {
  const user = store.getUser(req.params.id);
  if (!user) return res.status(404).json({ error: "user not found" });
  res.json(user);
});

// FR-7.3: rate a counterparty after a completed transaction
router.post("/:id/rate", (req, res) => {
  const { score } = req.body;
  if (typeof score !== "number" || score < 1 || score > 5) {
    return res.status(400).json({ error: "score must be a number between 1 and 5" });
  }
  const user = store.rateUser(req.params.id, score);
  if (!user) return res.status(404).json({ error: "user not found" });
  res.json(user);
});

module.exports = router;
