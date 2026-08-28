const express = require("express");
const store = require("../store");

const router = express.Router();

// FR-4.1: farmer(s) request shared transport
router.post("/", (req, res) => {
  const { farmerIds, pickupLocation, requestedDate } = req.body;
  if (!Array.isArray(farmerIds) || farmerIds.length === 0 || !pickupLocation || !requestedDate) {
    return res.status(400).json({ error: "farmerIds (array), pickupLocation, and requestedDate are required" });
  }
  const reqObj = store.createTransportRequest({ farmerIds, pickupLocation, requestedDate });
  res.status(201).json(reqObj);
});

// FR-4.2: transport providers view open requests
router.get("/", (req, res) => {
  res.json(store.listTransportRequests(req.query.status));
});

// FR-4.2/4.3: transporter accepts + estimated cost is set
// FR-4.4: notify farmers of pickup confirmation
router.post("/:id/assign", (req, res) => {
  const { transporterId, estimatedCost } = req.body;
  const transporter = store.getUser(transporterId);
  if (!transporter || transporter.role !== "transporter") {
    return res.status(400).json({ error: "transporterId must reference a registered transport provider" });
  }
  const updated = store.assignTransport(req.params.id, { transporterId, estimatedCost });
  if (!updated) return res.status(404).json({ error: "transport request not found" });

  updated.farmerIds.forEach((fid) => {
    const farmer = store.getUser(fid);
    if (farmer) {
      store.logNotification({
        toPhone: farmer.phone,
        channel: "sms",
        messageKey: "transport_pickup",
        language: farmer.language,
        params: { date: updated.requestedDate, location: updated.pickupLocation, cost: estimatedCost },
      });
    }
  });

  res.json(updated);
});

module.exports = router;
