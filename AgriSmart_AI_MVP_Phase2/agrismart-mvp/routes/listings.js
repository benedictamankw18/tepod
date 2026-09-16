const express = require("express");
const store = require("../store");

const router = express.Router();

// FR-1.1: farmer creates a produce listing
router.post("/", (req, res) => {
  const { farmerId, cropType, quantity, unit, harvestDate, askingPrice, location } = req.body;
  const farmer = store.getUser(farmerId);
  if (!farmer || farmer.role !== "farmer") {
    return res.status(400).json({ error: "farmerId must reference a registered farmer" });
  }
  if (!cropType || !quantity || !harvestDate || !askingPrice) {
    return res.status(400).json({ error: "cropType, quantity, harvestDate, and askingPrice are required" });
  }
  const listing = store.createListing({ farmerId, cropType, quantity, unit, harvestDate, askingPrice, location: location || farmer.location });
  res.status(201).json(listing);
});

// FR-1.2: buyers/market sellers browse or search listings
router.get("/", (req, res) => {
  const { cropType, location, status } = req.query;
  res.json(store.searchListings({ cropType, location, status }));
});

router.get("/:id", (req, res) => {
  const listing = store.getListing(req.params.id);
  if (!listing) return res.status(404).json({ error: "listing not found" });
  res.json(listing);
});

// FR-1.6: listing status history
router.get("/:id/history", (req, res) => {
  const listing = store.getListing(req.params.id);
  if (!listing) return res.status(404).json({ error: "listing not found" });
  res.json(listing.statusHistory);
});

module.exports = router;
