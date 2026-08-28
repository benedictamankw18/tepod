const { randomUUID } = require("crypto");
const { query } = require("../db/pool");
const listings = require("./listings");

const PC_STATUSES = ["pending", "accepted", "rejected", "countered"];

const ROW_TO_PC = (r) => ({
  id: r.id,
  listingId: r.listing_id,
  buyerId: r.buyer_id,
  quantity: Number(r.quantity),
  offeredPrice: Number(r.offered_price),
  counterPrice: r.counter_price === null ? null : Number(r.counter_price),
  status: r.status,
  createdAt: r.created_at,
});

async function createPreCommitment({ listingId, buyerId, quantity, offeredPrice }) {
  const id = randomUUID();
  const r = await query(
    `INSERT INTO pre_commitments (id, listing_id, buyer_id, quantity, offered_price)
     VALUES ($1,$2,$3,$4,$5) RETURNING *`,
    [id, listingId, buyerId, quantity, offeredPrice]
  );
  await listings.setListingStatus(listingId, "pre_committed");
  return ROW_TO_PC(r.rows[0]);
}

async function getPreCommitment(id) {
  const r = await query("SELECT * FROM pre_commitments WHERE id = $1", [id]);
  return r.rowCount ? ROW_TO_PC(r.rows[0]) : null;
}

async function respondToPreCommitment(id, { action, counterPrice }) {
  const pc = await getPreCommitment(id);
  if (!pc) return null;
  if (action === "accept") {
    await query(`UPDATE pre_commitments SET status = 'accepted' WHERE id = $1`, [id]);
  } else if (action === "reject") {
    await query(`UPDATE pre_commitments SET status = 'rejected' WHERE id = $1`, [id]);
    await listings.setListingStatus(pc.listingId, "open");
  } else if (action === "counter") {
    await query(`UPDATE pre_commitments SET status = 'countered', counter_price = $2 WHERE id = $1`, [id, counterPrice]);
  }
  return getPreCommitment(id);
}

async function preCommitmentsForListing(listingId) {
  const r = await query("SELECT * FROM pre_commitments WHERE listing_id = $1 ORDER BY created_at ASC", [listingId]);
  return r.rows.map(ROW_TO_PC);
}

async function preCommitmentsForBuyer(buyerId) {
  const r = await query("SELECT * FROM pre_commitments WHERE buyer_id = $1 ORDER BY created_at ASC", [buyerId]);
  return r.rows.map(ROW_TO_PC);
}

module.exports = {
  PC_STATUSES,
  createPreCommitment, getPreCommitment, respondToPreCommitment,
  preCommitmentsForListing, preCommitmentsForBuyer,
};
