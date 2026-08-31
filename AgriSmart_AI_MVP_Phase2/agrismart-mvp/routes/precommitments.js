const express = require("express");
const store = require("../store");
const { buyerTypeLabel } = require("../messages");

const router = express.Router();

// FR-1.3: buyer submits a pre-commitment against a listing
// FR-1.4: farmer is notified (SMS/USSD stub) when this happens
router.post("/", (req, res) => {
  const { listingId, buyerId, quantity, offeredPrice } = req.body;
  const listing = store.getListing(listingId);
  const buyer = store.getUser(buyerId);
  if (!listing) return res.status(404).json({ error: "listing not found" });
  if (!buyer || !["buyer", "market_seller"].includes(buyer.role)) {
    return res.status(400).json({ error: "buyerId must reference a registered buyer or market seller" });
  }
  if (listing.status !== "open") {
    return res.status(409).json({ error: `listing is not open (status: ${listing.status})` });
  }
  const pc = store.createPreCommitment({ listingId, buyerId, quantity, offeredPrice });

  const farmer = store.getUser(listing.farmerId);
  store.logNotification({
    toPhone: farmer.phone,
    channel: "sms",
    messageKey: "precommit_offer",
    language: farmer.language,
    params: {
      buyerName: buyer.name,
      buyerLabel: buyerTypeLabel(buyer.buyerType, farmer.language),
      quantity,
      unit: listing.unit,
      cropType: listing.cropType,
      price: offeredPrice,
    },
  });

  res.status(201).json(pc);
});

router.get("/listing/:listingId", (req, res) => {
  res.json(store.preCommitmentsForListing(req.params.listingId));
});

router.get("/buyer/:buyerId", (req, res) => {
  res.json(store.preCommitmentsForBuyer(req.params.buyerId));
});

// FR-1.5: farmer accepts, rejects, or counter-offers
router.post("/:id/respond", (req, res) => {
  const { action, counterPrice } = req.body;
  if (!["accept", "reject", "counter"].includes(action)) {
    return res.status(400).json({ error: "action must be accept, reject, or counter" });
  }
  const pc = store.getPreCommitment(req.params.id);
  if (!pc) return res.status(404).json({ error: "pre-commitment not found" });

  const updated = store.respondToPreCommitment(req.params.id, { action, counterPrice });
  const buyer = store.getUser(pc.buyerId);
  const listing = store.getListing(pc.listingId);

  const keyMap = {
    accept: "precommit_accepted",
    reject: "precommit_rejected",
    counter: "precommit_counter",
  };
  store.logNotification({
    toPhone: buyer.phone,
    channel: "sms",
    messageKey: keyMap[action],
    language: buyer.language,
    params: { cropType: listing.cropType, price: counterPrice || pc.offeredPrice },
  });

  res.json(updated);
});

module.exports = router;
