const express = require("express");
const store = require("../store");

const router = express.Router();

// FR-2.1: current/recent average price by crop and market
router.get("/current", (req, res) => {
  const { cropType, market } = req.query;
  if (!cropType) return res.status(400).json({ error: "cropType is required" });
  const price = store.currentPrice({ cropType, market });
  if (!price) return res.status(404).json({ error: "no price data for this crop/market" });
  res.json(price);
});

// FR-2.2: historical price trend
router.get("/history", (req, res) => {
  const { cropType, market, weeks } = req.query;
  if (!cropType) return res.status(400).json({ error: "cropType is required" });
  res.json(store.priceHistory({ cropType, market, weeks: weeks ? Number(weeks) : 8 }));
});

// FR-2.4: flag a listing's asking price against the market average
router.get("/compare/:listingId", (req, res) => {
  const listing = store.getListing(req.params.listingId);
  if (!listing) return res.status(404).json({ error: "listing not found" });
  const market = store.currentPrice({ cropType: listing.cropType, market: listing.location });
  if (!market) return res.json({ listingId: listing.id, flag: null, reason: "no comparable market price data" });
  const deviationPct = Math.round(((listing.askingPrice - market.averagePrice) / market.averagePrice) * 100);
  const flag = Math.abs(deviationPct) >= 20 ? (deviationPct > 0 ? "above_market" : "below_market") : "in_line";
  res.json({ listingId: listing.id, askingPrice: listing.askingPrice, marketAverage: market.averagePrice, deviationPct, flag });
});

module.exports = router;
