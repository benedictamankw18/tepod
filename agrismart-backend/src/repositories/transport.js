const { randomUUID } = require("crypto");
const { query } = require("../db/pool");

const TRANSPORT_STATUSES = ["requested", "assigned", "confirmed", "cancelled"];

const ROW_TO_TR = (r) => ({
  id: r.id,
  farmerIds: r.farmer_ids,
  pickupLocation: r.pickup_location,
  requestedDate: r.requested_date && new Date(r.requested_date).toISOString().slice(0, 10),
  status: r.status,
  transporterId: r.transporter_id,
  estimatedCost: r.estimated_cost === null ? null : Number(r.estimated_cost),
  precommitmentId: r.precommitment_id || null,
  createdAt: r.created_at,
});

async function createTransportRequest({ farmerIds, pickupLocation, requestedDate, precommitmentId = null }) {
  const id = randomUUID();
  const r = await query(
    `INSERT INTO transport_requests (id, farmer_ids, pickup_location, requested_date, precommitment_id)
     VALUES ($1,$2,$3,$4,$5) RETURNING *`,
    [id, Array.isArray(farmerIds) ? farmerIds : [], pickupLocation, requestedDate || null, precommitmentId || null]
  );
  return ROW_TO_TR(r.rows[0]);
}

// An active (not cancelled) request already serving a pre-commitment, if any.
async function findActiveByPreCommitment(precommitmentId) {
  const r = await query(
    "SELECT * FROM transport_requests WHERE precommitment_id = $1 AND status != 'cancelled' LIMIT 1",
    [precommitmentId]
  );
  return r.rowCount ? ROW_TO_TR(r.rows[0]) : null;
}

async function assignTransport(id, { transporterId, estimatedCost }) {
  const r = await query(
    `UPDATE transport_requests
     SET transporter_id = $2, estimated_cost = $3, status = 'assigned'
     WHERE id = $1 RETURNING *`,
    [id, transporterId, estimatedCost]
  );
  return r.rowCount ? ROW_TO_TR(r.rows[0]) : null;
}

// Admin: set any lifecycle status (confirmed/cancelled/etc.) independent of assignment.
async function updateTransportStatus(id, status) {
  if (!TRANSPORT_STATUSES.includes(status)) return null;
  const r = await query(
    "UPDATE transport_requests SET status = $2 WHERE id = $1 RETURNING *",
    [id, status]
  );
  return r.rowCount ? ROW_TO_TR(r.rows[0]) : null;
}

async function listTransportRequests(status, precommitmentId) {
  const conds = [];
  const params = [];
  if (status) { params.push(status); conds.push(`status = $${params.length}`); }
  if (precommitmentId) { params.push(precommitmentId); conds.push(`precommitment_id = $${params.length}`); }
  const where = conds.length ? `WHERE ${conds.join(" AND ")}` : "";
  const r = await query(`SELECT * FROM transport_requests ${where} ORDER BY created_at ASC`, params);
  return r.rows.map(ROW_TO_TR);
}

module.exports = {
  TRANSPORT_STATUSES,
  createTransportRequest, findActiveByPreCommitment, assignTransport, updateTransportStatus, listTransportRequests,
};
