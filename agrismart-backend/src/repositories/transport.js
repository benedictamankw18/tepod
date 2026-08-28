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
  createdAt: r.created_at,
});

async function createTransportRequest({ farmerIds, pickupLocation, requestedDate }) {
  const id = randomUUID();
  const r = await query(
    `INSERT INTO transport_requests (id, farmer_ids, pickup_location, requested_date)
     VALUES ($1,$2,$3,$4) RETURNING *`,
    [id, Array.isArray(farmerIds) ? farmerIds : [], pickupLocation, requestedDate || null]
  );
  return ROW_TO_TR(r.rows[0]);
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

async function listTransportRequests(status) {
  const where = status ? "WHERE status = $1" : "";
  const params = status ? [status] : [];
  const r = await query(`SELECT * FROM transport_requests ${where} ORDER BY created_at ASC`, params);
  return r.rows.map(ROW_TO_TR);
}

module.exports = {
  TRANSPORT_STATUSES,
  createTransportRequest, assignTransport, listTransportRequests,
};
