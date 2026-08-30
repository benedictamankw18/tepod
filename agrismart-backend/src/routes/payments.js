const express = require("express");
const config = require("../config");
const transactionsRepo = require("../repositories/transactions");
const paymentsRepo = require("../repositories/payments");
const settingsRepo = require("../repositories/systemSettings");
const paymentService = require("../services/payments");
const paystack = require("../services/paystack");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

// GET /api/payments/config - public settings the buyer needs to render checkout:
// whether escrow is on, the deposit floor and the Paystack public key.
router.get("/config", requireAuth, async (_req, res) => {
  const settings = await settingsRepo.getPayments();
  res.json({
    escrowEnabled: settings.escrowEnabled,
    depositPercent: settings.depositPercent,
    payoutMode: settings.payoutMode,
    currency: settings.currency,
    provider: settings.provider,
    publicKey: config.paystackPublicKey,
    simulated: !paystack.isEnabled(),
  });
});

// POST /api/payments/:id/confirm - the buyer lands back from Paystack (or the flow is
// simulated) and the charge is verified against the provider before being settled.
// Idempotent: confirming twice returns the same settled state. A still-in-flight
// charge (verified against Paystack but not yet settled) returns 202 with
// { status: "pending" } so clients can poll without treating it as an error.
router.post("/:id/confirm", requireAuth, async (req, res) => {
  const payment = await paymentsRepo.getPaymentById(req.params.id);
  if (!payment) return res.status(404).json({ error: "payment not found" });
  const tx = await transactionsRepo.getTransaction(payment.transactionId);
  if (!tx) return res.status(404).json({ error: "transaction not found" });
  if (tx.buyerId !== req.user.id) {
    return res.status(403).json({ error: "not your payment" });
  }
  if (payment.status === "success") {
    return res.json({ tx, payment });
  }
  if (payment.status === "failed") {
    return res.status(400).json({ error: "payment failed; start a new charge" });
  }

  if (payment.provider === "paystack" && paystack.isEnabled()) {
    const reference = req.body?.reference || payment.reference;
    if (!reference) return res.status(400).json({ error: "reference is required" });
    const verified = await paystack.verifyTransaction(reference);
    if (verified.status !== "success") {
      return res.status(202).json({ status: "pending", tx, payment });
    }
  }
  await paymentService.applySuccessfulCharge(payment, { channel: req.body?.channel });
  res.json({ tx: await transactionsRepo.getTransaction(payment.transactionId), payment: await paymentsRepo.getPaymentById(payment.id) });
});

// POST /api/payments/webhook - Paystack event delivery. The signature is verified
// against the raw body; settled payments are idempotent. Mounted with a raw-body
// capture in app.js so req.rawBody holds the exact bytes Paystack signed.
router.post("/webhook", async (req, res) => {
  const event = req.body || {};
  if (!event.event) return res.status(400).json({ error: "missing event" });
  if (!paystack.verifyWebhook(req.headers["x-paystack-signature"], req.rawBody)) {
    return res.status(403).json({ error: "invalid signature" });
  }
  const data = event.data || {};
  try {
    if (event.event.startsWith("charge.")) {
      const payment = await paymentsRepo.getPaymentByReference(data.reference);
      if (payment && payment.kind !== "payout" && payment.status === "pending") {
        await paymentService.applySuccessfulCharge(payment, { channel: data.channel });
      }
    } else if (event.event.startsWith("transfer.")) {
      const payout = await paymentsRepo.getPaymentByReference(data.reference);
      if (payout && payout.kind === "payout") {
        if (event.event === "transfer.success") {
          await paymentsRepo.markPaymentSuccess(payout.id, { chargedAt: data.transferred_at || new Date().toISOString() });
          await transactionsRepo.setEscrow(payout.transactionId, { status: "released" });
        } else if (["transfer.failed", "transfer.abandoned", "transfer.reversed", "transfer.revoked"].includes(event.event)) {
          await paymentsRepo.markPaymentFailed(payout.id, `transfer ${event.event}`);
        }
      }
    }
  } catch (err) {
    console.error("[paystack] webhook processing failed:", err.message);
  }
  res.json({ received: true });
});

module.exports = router;