const { randomUUID } = require("crypto");
const { query } = require("../db/pool");
const listings = require("./listings");

const PC_STATUSES = ["pending", "accepted", "preparing", "ready", "delivered", "completed", "rejected", "countered"];
const FULFILL_STEPS = ["prepare", "ready", "delivered"];

const ROW_TO_PC = (r) => ({
  id: r.id,
  listingId: r.listing_id,
  buyerId: r.buyer_id,
  quantity: Number(r.quantity),
  offeredPrice: Number(r.offered_price),
  counterPrice: r.counter_price === null ? null : Number(r.counter_price),
  agreedPrice: r.agreed_price === null ? null : Number(r.agreed_price),
  actualQuantity: r.actual_quantity === null ? null : Number(r.actual_quantity),
  condition: r.condition || null,
  conditionPhotos: r.condition_photos || null,
  readyAt: r.ready_at || null,
  deliveredAt: r.delivered_at || null,
  completedAt: r.completed_at || null,
  transactionId: r.transaction_id || null,
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
    await query(`UPDATE pre_commitments SET status = 'accepted', agreed_price = $2 WHERE id = $1`, [id, pc.counterPrice != null ? pc.counterPrice : pc.offeredPrice]);
  } else if (action === "reject") {
    await query(`UPDATE pre_commitments SET status = 'rejected' WHERE id = $1`, [id]);
    await listings.setListingStatus(pc.listingId, "open");
  } else if (action === "counter") {
    await query(`UPDATE pre_commitments SET status = 'countered', counter_price = $2 WHERE id = $1`, [id, counterPrice]);
  }
  return getPreCommitment(id);
}

// Buyer responds to a farmer's counter-offer. Accepting closes the negotiation at
// the countered price (listing stays reserved); declining reopens the listing.
async function buyerRespondToCounter(id, { action }) {
  const pc = await getPreCommitment(id);
  if (!pc || pc.status !== "countered") return null;
  if (action === "accept") {
    await query(`UPDATE pre_commitments SET status = 'accepted', agreed_price = $2 WHERE id = $1`, [id, pc.counterPrice]);
  } else if (action === "decline") {
    await query(`UPDATE pre_commitments SET status = 'rejected' WHERE id = $1`, [id]);
    await listings.setListingStatus(pc.listingId, "open");
  }
  return getPreCommitment(id);
}

// Tie the auto-created transaction (from acceptance) to the pre-commitment so the
// fulfilment status can be completed once payment clears.
async function linkTransaction(id, transactionId) {
  await query(`UPDATE pre_commitments SET transaction_id = $2 WHERE id = $1`, [id, transactionId]);
  return getPreCommitment(id);
}

async function getPreCommitmentByTransactionId(transactionId) {
  const r = await query("SELECT * FROM pre_commitments WHERE transaction_id = $1", [transactionId]);
  return r.rowCount ? ROW_TO_PC(r.rows[0]) : null;
}

// Move an accepted commitment through its fulfilment lifecycle:
//   prepare   (farmer)  accepted -> preparing
//   ready     (farmer)  accepted/preparing -> ready   (record actual quantity/condition/photos)
//   delivered (buyer)   ready -> delivered
async function fulfillStep(id, step, data = {}) {
  const pc = await getPreCommitment(id);
  if (!pc) return null;
  if (!FULFILL_STEPS.includes(step)) return null;

  if (step === "prepare") {
    if (pc.status !== "accepted") return null;
    await query(`UPDATE pre_commitments SET status = 'preparing' WHERE id = $1`, [id]);
    return getPreCommitment(id);
  }

  if (step === "ready") {
    if (!["accepted", "preparing"].includes(pc.status)) return null;
    const cols = [];
    const vals = [];
    let idx = 2;
    if (data.actualQuantity != null) { cols.push(`actual_quantity = $${idx++}`); vals.push(Number(data.actualQuantity)); }
    if (data.condition != null) { cols.push(`"condition" = $${idx++}`); vals.push(String(data.condition)); }
    if (data.conditionPhotos != null) { cols.push(`condition_photos = $${idx++}`); vals.push(JSON.stringify(data.conditionPhotos)); }
    const extra = cols.length ? `, ${cols.join(", ")}` : "";
    const r = await query(
      `UPDATE pre_commitments SET status = 'ready', ready_at = COALESCE(ready_at, now())${extra} WHERE id = $1 RETURNING *`,
      [id, ...vals]
    );
    return r.rowCount ? ROW_TO_PC(r.rows[0]) : null;
  }

  // delivered
  if (pc.status !== "ready") return null;
  await query(`UPDATE pre_commitments SET status = 'delivered', delivered_at = now() WHERE id = $1`, [id]);
  return getPreCommitment(id);
}

// Final state. Only meaningful when the linked transaction is paid AND the produce
// has been delivered; the caller enforces that. Marks the listing sold only when
// the remaining quantity is exhausted, otherwise it stays pre_committed so the
// rest of the stock stays visible to buyers.
async function completePreCommitment(id) {
  const pc = await getPreCommitment(id);
  if (!pc) return null;
  await query(`UPDATE pre_commitments SET status = 'completed', completed_at = now() WHERE id = $1`, [id]);
  const rem = await query(
    `SELECT GREATEST(l.quantity - COALESCE((
       SELECT SUM(
         CASE WHEN p.status = 'completed' THEN COALESCE(p.actual_quantity, p.quantity)
              WHEN p.status IN ('accepted','preparing','ready','delivered') THEN p.quantity
              ELSE 0 END)
       FROM pre_commitments p WHERE p.listing_id = l.id), 0), 0) AS remaining
     FROM listings l WHERE l.id = $1`,
    [pc.listingId]
  );
  const remaining = Number(rem.rows[0]?.remaining ?? 0);
  await listings.setListingStatus(pc.listingId, remaining > 0 ? "pre_committed" : "sold");
  return getPreCommitment(id);
}

async function preCommitmentsForListing(listingId) {
  const r = await query("SELECT * FROM pre_commitments WHERE listing_id = $1 ORDER BY created_at ASC", [listingId]);
  return r.rows.map(ROW_TO_PC);
}

// Pre-commitments made by a buyer, enriched with the listing crop/unit/image and
// the listing farmer's name (for the buyer's commitments panel).
async function preCommitmentsForBuyer(buyerId) {
  const r = await query(
    `SELECT pc.*,
            l.crop_type AS listing_crop, l.quantity AS listing_qty, l.unit AS listing_unit,
            l.image_url AS listing_image, l.image_urls AS listing_images, l.location AS listing_location,
            l.farmer_id AS listing_farmer_id, f.name AS farmer_name
     FROM pre_commitments pc
     JOIN listings l ON l.id = pc.listing_id
     JOIN users f ON f.id = l.farmer_id
     WHERE pc.buyer_id = $1
     ORDER BY CASE pc.status
       WHEN 'pending' THEN 0
       WHEN 'countered' THEN 1
       WHEN 'accepted' THEN 2
       ELSE 3 END ASC,
       pc.created_at DESC`,
    [buyerId]
  );
  return r.rows.map((row) => ({
    ...ROW_TO_PC(row),
    farmer: { id: row.listing_farmer_id, name: row.farmer_name },
    listing: {
      id: row.listing_id,
      cropType: row.listing_crop,
      quantity: Number(row.listing_qty),
      unit: row.listing_unit,
      imageUrl: row.listing_image,
      imageUrls: Array.isArray(row.listing_images)
        ? row.listing_images
        : (row.listing_image ? [row.listing_image] : []),
      location: row.listing_location,
    },
  }));
}

// Pre-commitments a farmer received on their listings, newest first, enriched with the
// requesting buyer's name and the listing's produce image (for the farmer dashboard).
async function preCommitmentsForFarmer(farmerId) {
  const r = await query(
    `SELECT pc.*,
            b.name AS buyer_name, b.buyer_type AS buyer_type,
            l.crop_type AS listing_crop, l.quantity AS listing_qty, l.unit AS listing_unit,
            l.image_url AS listing_image, l.image_urls AS listing_images, l.location AS listing_location
     FROM pre_commitments pc
     JOIN listings l ON l.id = pc.listing_id
     JOIN users b ON b.id = pc.buyer_id
     WHERE l.farmer_id = $1
     ORDER BY pc.created_at DESC`,
    [farmerId]
  );
  return r.rows.map((r) => ({
    ...ROW_TO_PC(r),
    buyer: { id: r.buyer_id, name: r.buyer_name, buyerType: r.buyer_type },
    listing: {
      id: r.listing_id,
      cropType: r.listing_crop,
      quantity: Number(r.listing_qty),
      unit: r.listing_unit,
      imageUrl: r.listing_image,
      imageUrls: Array.isArray(r.listing_images)
        ? r.listing_images
        : (r.listing_image ? [r.listing_image] : []),
      location: r.listing_location,
    },
  }));
}

// Admin: every pre-commitment across all users, enriched with buyer + farmer + listing
// info. Optional status filter.
async function listAllPreCommitments({ status } = {}) {
  const conds = [];
  const params = [];
  if (status) {
    params.push(status);
    conds.push(`pc.status = $${params.length}`);
  }
  const where = conds.length ? `WHERE ${conds.join(" AND ")}` : "";
  const r = await query(
    `SELECT pc.*,
            b.name AS buyer_name, b.buyer_type AS buyer_type,
            l.crop_type AS listing_crop, l.quantity AS listing_qty, l.unit AS listing_unit,
            l.image_url AS listing_image, l.image_urls AS listing_images, l.location AS listing_location,
            l.farmer_id AS listing_farmer_id, f.name AS farmer_name
     FROM pre_commitments pc
     JOIN listings l ON l.id = pc.listing_id
     JOIN users b ON b.id = pc.buyer_id
     JOIN users f ON f.id = l.farmer_id
     ${where}
     ORDER BY pc.created_at DESC`,
    params
  );
  return r.rows.map((row) => ({
    ...ROW_TO_PC(row),
    buyer: { id: row.buyer_id, name: row.buyer_name, buyerType: row.buyer_type },
    farmer: { id: row.listing_farmer_id, name: row.farmer_name },
    listing: {
      id: row.listing_id,
      cropType: row.listing_crop,
      quantity: Number(row.listing_qty),
      unit: row.listing_unit,
      imageUrl: row.listing_image,
      imageUrls: Array.isArray(row.listing_images)
        ? row.listing_images
        : (row.listing_image ? [row.listing_image] : []),
      location: row.listing_location,
    },
  }));
}

module.exports = {
  PC_STATUSES,
  FULFILL_STEPS,
  createPreCommitment, getPreCommitment, respondToPreCommitment, buyerRespondToCounter,
  linkTransaction, getPreCommitmentByTransactionId, fulfillStep, completePreCommitment,
  preCommitmentsForListing, preCommitmentsForBuyer, preCommitmentsForFarmer,
  listAllPreCommitments,
};
