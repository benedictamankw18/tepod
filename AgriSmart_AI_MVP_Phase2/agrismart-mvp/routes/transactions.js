const express = require("express");
const store = require("../store");

const router = express.Router();

// FR-5.1: record a payment obligation for a completed transaction
router.post("/", (req, res) => {
  const { listingId, buyerId, agreedPrice, dueDate } = req.body;
  const listing = store.getListing(listingId);
  if (!listing) return res.status(404).json({ error: "listing not found" });
  const buyer = store.getUser(buyerId);
  if (!buyer) return res.status(404).json({ error: "buyer not found" });

  const tx = store.createTransaction({
    listingId,
    buyerId,
    farmerId: listing.farmerId,
    agreedPrice,
    dueDate,
  });

  const farmer = store.getUser(listing.farmerId);
  store.logNotification({
    toPhone: farmer.phone,
    channel: "sms",
    messageKey: "sale_confirmed",
    language: farmer.language,
    params: { cropType: listing.cropType, price: agreedPrice, dueDate },
  });

  res.status(201).json(tx);
});

router.get("/user/:userId", (req, res) => {
  res.json(store.transactionsForUser(req.params.userId));
});

// FR-5.2: mark paid + notify farmer
router.post("/:id/pay", (req, res) => {
  const tx = store.markTransactionPaid(req.params.id);
  if (!tx) return res.status(404).json({ error: "transaction not found" });
  const farmer = store.getUser(tx.farmerId);
  store.logNotification({
    toPhone: farmer.phone,
    channel: "sms",
    messageKey: "payment_received",
    language: farmer.language,
    params: { price: tx.agreedPrice },
  });
  res.json(tx);
});

// FR-5.5: report a non-payment / delayed-payment dispute
router.post("/:id/dispute", (req, res) => {
  const tx = store.markTransactionDisputed(req.params.id);
  if (!tx) return res.status(404).json({ error: "transaction not found" });
  res.json(tx);
});

// FR-5.2: overdue reminder sweep (would run on a schedule in production)
router.post("/reminders/run", (req, res) => {
  const overdue = store.overdueTransactions();
  const sent = overdue.map((tx) => {
    const buyer = store.getUser(tx.buyerId);
    return store.logNotification({
      toPhone: buyer.phone,
      channel: "sms",
      messageKey: "payment_reminder",
      language: buyer.language,
      params: { price: tx.agreedPrice, dueDate: tx.dueDate },
    });
  });
  res.json({ remindersSent: sent.length, notifications: sent });
});

// FR-5.4: buyer payment reliability indicator
router.get("/reliability/:buyerId", (req, res) => {
  res.json({ buyerId: req.params.buyerId, onTimePaymentRate: store.buyerReliability(req.params.buyerId) });
});

module.exports = router;
