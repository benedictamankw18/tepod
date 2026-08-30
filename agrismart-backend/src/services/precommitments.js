// precommitments.js (service)
// Business rules shared across route handlers after a pre-commitment is accepted:
//  - create the linked transaction automatically (listing stays pre_committed),
//  - complete the commitment once the produce is delivered AND payment cleared.

const precommitmentsRepo = require("../repositories/precommitments");
const transactionsRepo = require("../repositories/transactions");
const listingsRepo = require("../repositories/listings");
const usersRepo = require("../repositories/users");
const notificationsRepo = require("../repositories/notifications");
const settingsRepo = require("../repositories/systemSettings");
const { computeCommission } = require("./commission");

// Every acceptance (farmer accept or buyer counter-accept) opens the payment record
// at the agreed price. Idempotent: never creates a second transaction for the pc.
async function ensureTransaction(pc) {
  if (pc.transactionId) {
    const existing = await transactionsRepo.getTransaction(pc.transactionId);
    if (existing) return { pc, tx: existing };
  }
  const listing = await listingsRepo.getListing(pc.listingId);
  const price = pc.agreedPrice != null ? pc.agreedPrice : pc.offeredPrice;
  const commission = await settingsRepo.getCommission();
  const { commission: commissionAmount, net: netAmount } = computeCommission(commission, price);
  const tx = await transactionsRepo.createTransaction({
    listingId: pc.listingId,
    buyerId: pc.buyerId,
    farmerId: listing.farmerId,
    agreedPrice: price,
    commissionAmount,
    netAmount,
    dueDate: new Date(Date.now() + 14 * 864e5),
    markSold: false,
  });
  const linked = await precommitmentsRepo.linkTransaction(pc.id, tx.id);
  const buyer = await usersRepo.getUser(pc.buyerId);
  const farmer = await usersRepo.getUser(listing.farmerId);
  const saleParams = {
    cropType: listing.cropType,
    price,
    dueDate: tx.dueDate,
    farmerName: farmer?.name || null,
  };
  await notificationsRepo.notify({
    userId: buyer.id,
    phone: buyer.phone,
    email: buyer.email,
    title: "Sale confirmed",
    messageKey: "sale_confirmed",
    language: buyer.language,
    params: saleParams,
  });
  return { pc: linked, tx };
}

// Deliver + paid means the deal is over: mark the commitment completed, the listing
// sold, and tell both sides. Returns true when a completion happened.
async function attemptComplete(pc, tx) {
  if (!pc) return false;
  if (pc.status !== "delivered") return false;
  if (!tx || tx.paymentStatus !== "paid") return false;
  const completed = await precommitmentsRepo.completePreCommitment(pc.id);
  if (!completed) return false;

  const listing = await listingsRepo.getListing(pc.listingId);
  const buyer = await usersRepo.getUser(pc.buyerId);
  const farmer = await usersRepo.getUser(listing.farmerId);
  const cropType = listing.cropType;
  const buyerParams = { cropType, price: tx.agreedPrice };
  await notificationsRepo.notify({
    userId: buyer.id,
    phone: buyer.phone,
    email: buyer.email,
    title: "Sale completed",
    messageKey: "precommit_completed",
    language: buyer.language,
    params: buyerParams,
  });
  const farmerParams = { cropType, price: tx.agreedPrice, net: tx.netAmount };
  await notificationsRepo.notify({
    userId: farmer.id,
    phone: farmer.phone,
    email: farmer.email,
    title: "Sale completed",
    messageKey: "precommit_completed",
    language: farmer.language,
    params: farmerParams,
  });
  return true;
}

module.exports = { ensureTransaction, attemptComplete };