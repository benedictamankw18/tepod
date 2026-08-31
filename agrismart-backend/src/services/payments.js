// payments.js (service)
// Shared money bookkeeping used by the charge, confirm and webhook handlers, plus the
// escrow release that pays the farmer when a sale completes. Everything here is
// payment-provider agnostic except `releaseToFarmer`, which shells out to Paystack.

const transactionsRepo = require("../repositories/transactions");
const paymentsRepo = require("../repositories/payments");
const usersRepo = require("../repositories/users");
const listingsRepo = require("../repositories/listings");
const notificationsRepo = require("../repositories/notifications");
const settingsRepo = require("../repositories/systemSettings");
const precommitmentsRepo = require("../repositories/precommitments");
const paystack = require("./paystack");

// Decides how much a charge must raise for a given transaction + kind.
//  - deposit: when escrow is on there is a floor of depositPercent of the price
//  - balance:  the remaining amount (agreed - deposit - already paid)
function computeChargeAmount({ tx, kind, amount, escrowEnabled, depositPercent }) {
  if (kind === "deposit") {
    const required = escrowEnabled
      ? Math.ceil((Number(tx.agreedPrice) * Number(depositPercent || 0)) / 100)
      : 0;
    if (amount == null) {
      if (required > 0) return { amount: required };
      return { error: "amount is required for a deposit" };
    }
    const a = Number(amount);
    if (!Number.isFinite(a) || a <= 0) return { error: "amount must be a positive number" };
    if (escrowEnabled && a < required) {
      return { error: `a deposit of at least GHS ${required} is required` };
    }
    // A deposit beyond the outstanding balance would overpay the sale and could
    // flip it to "Fully paid" early, so cap it like a balance payment.
    const remaining = Number(tx.agreedPrice) - Number(tx.depositAmount) - Number(tx.paidAmount);
    if (remaining <= 0) return { error: "nothing left to pay" };
    if (a > remaining) return { error: `amount exceeds the remaining balance of GHS ${remaining}` };
    return { amount: a };
  }
  // balance
  const remaining = Number(tx.agreedPrice) - Number(tx.depositAmount) - Number(tx.paidAmount);
  if (remaining <= 0) return { error: "nothing left to pay" };
  if (amount == null) return { amount: remaining };
  const a = Number(amount);
  if (!Number.isFinite(a) || a <= 0) return { error: "amount must be a positive number" };
  if (a > remaining) return { error: `amount exceeds the remaining balance of GHS ${remaining}` };
  return { amount: a };
}

// Settles a successful (deposit or balance) charge: records it on the transaction,
// tracks collected money as escrow when enabled, notifies the farmer and tries to
// close the sale. Idempotent - concurrent confirm/webhook calls return the current
// transaction instead of double-counting.
async function applySuccessfulCharge(payment, { channel } = {}) {
  const settled = await paymentsRepo.markPaymentSuccess(payment.id, { channel });
  if (!settled) {
    const existing = await transactionsRepo.getTransaction(payment.transactionId);
    if (!existing) throw new Error("transaction missing for settled payment");
    return existing;
  }

  const { kind, amount } = settled;
  let tx = await transactionsRepo.recordPayment(payment.transactionId, {
    kind: kind === "deposit" ? "deposit" : "payment",
    amount,
  });
  if (!tx) throw new Error(`transaction not found for payment ${payment.id}`);

  const settings = await settingsRepo.getPayments();
  if (settings.escrowEnabled) {
    await transactionsRepo.setEscrow(tx.id, {
      status: tx.paymentStatus === "paid" ? "held" : "funds_collected",
      amount: tx.depositAmount + tx.paidAmount,
      paymentMethod: channel || "mobile_money",
      paymentProvider: "paystack",
    });
    // Re-read so the returned transaction reflects the escrow ledger state.
    const updated = await transactionsRepo.getTransaction(tx.id);
    if (updated) tx = updated;
  }

  const farmer = await usersRepo.getUser(tx.farmerId);
  if (kind === "deposit") {
    const buyer = await usersRepo.getUser(tx.buyerId);
    const listing = await listingsRepo.getListing(tx.listingId);
    await notificationsRepo.notify({
      userId: farmer.id,
      phone: farmer.phone,
      email: farmer.email,
      title: "Deposit received",
      messageKey: "deposit_received",
      language: farmer.language,
      params: { buyerName: buyer.name, amount, cropType: listing.cropType },
    });
  } else if (tx.paymentStatus === "paid") {
    await notificationsRepo.notify({
      userId: farmer.id,
      phone: farmer.phone,
      email: farmer.email,
      title: "Payment received",
      messageKey: "payment_received",
      language: farmer.language,
      params: { price: tx.agreedPrice },
    });
  }

  // Completing payment on an already-delivered commitment closes the sale and, when
  // escrow is held, triggers the farmer payout.
  if (tx.paymentStatus === "paid") {
    const pc = await precommitmentsRepo.getPreCommitmentByTransactionId(tx.id);
    await require("./precommitments").attemptComplete(pc, tx);
    const after = await transactionsRepo.getTransaction(tx.id);
    if (after) tx = after;
  }
  return tx;
}

// Sends the farmer their net amount once escrow is released. In simulated mode this
// just settles. In live mode it builds/uses a cached Paystack transfer recipient then
// initiates a transfer; failures keep escrow held for admin resolution.
async function releaseToFarmer(tx, farmer) {
  const reference = `payout-${tx.id.replace(/-/g, "").slice(0, 12)}-${Date.now()}`;
  const createRow = async (status, extra = {}) =>
    paymentsRepo.createPayment({
      transactionId: tx.id,
      kind: "payout",
      provider: "paystack",
      reference,
      amount: tx.netAmount,
      channel: "paystack",
      metadata: extra.metadata || null,
      status,
    });

  if (!paystack.isEnabled()) {
    await createRow("success", { metadata: { simulated: true } });
    await transactionsRepo.setPayoutReference(tx.id, reference);
    await transactionsRepo.setEscrow(tx.id, { status: "released" });
    return { simulated: true, reference };
  }

  let recipientCode = farmer.paystackRecipientCode;
  let type;
  let details;
  if (farmer.bankCode && farmer.bankAccountNumber) {
    type = "bank";
    details = { bankCode: farmer.bankCode, accountNumber: farmer.bankAccountNumber, name: farmer.bankAccountName || farmer.name };
  } else if (farmer.momoProvider && farmer.momoNumber) {
    type = "mobile_money";
    details = { momoProvider: farmer.momoProvider, momoPhone: farmer.momoNumber, name: farmer.name };
  }

  const row = await createRow(type ? "pending" : "failed", {
    metadata: type ? null : { error: "no payout account configured" },
  });
  await transactionsRepo.setPayoutReference(tx.id, row.reference);
  if (!type) {
    await transactionsRepo.setEscrow(tx.id, { status: "released" });
    return { error: "no payout account configured", reference };
  }

  try {
    if (!recipientCode) {
      recipientCode = await paystack.createTransferRecipient({ type, ...details });
      await usersRepo.setPayoutRecipient(farmer.id, recipientCode);
    }
    const transfer = await paystack.initiateTransfer({
      amountGhs: tx.netAmount,
      recipientCode,
      reference,
      reason: "NKABOM AGRILINK escrow payout",
    });
    await paymentsRepo.markPaymentSuccess(row.id, { reference });
    await transactionsRepo.setEscrow(tx.id, { status: "released" });
    return { reference, transferCode: transfer.transferCode };
  } catch (err) {
    const message = /authorization_code|account_number must be passed/.test(err.message)
      ? "Paystack requires this mobile-money number to be validated before it can receive escrow payouts (add a bank account or complete number validation)."
      : err.message;
    await paymentsRepo.markPaymentFailed(row.id, message);
    throw Object.assign(new Error(message), { cause: err }); // escrow stays held so an admin can resolve it
  }
}

module.exports = { computeChargeAmount, applySuccessfulCharge, releaseToFarmer };