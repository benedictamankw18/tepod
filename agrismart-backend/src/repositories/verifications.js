const { randomUUID } = require("crypto");
const { query } = require("../db/pool");

const ID_TYPES = ["ghana_card", "voter_card", "passport"];

// Never store the full ID plaintext: persist a redacted form (e.g. "••••1234").
function redactIdNumber(value) {
  const digits = String(value || "").replace(/[^0-9A-Za-z]/g, "");
  if (!digits) return null;
  const visible = digits.slice(-4);
  return `${"•".repeat(Math.max(4, digits.length - 4))}${visible}`;
}

const ROW_TO_VERIFICATION = (r) => ({
  id: r.id,
  userId: r.user_id,
  idType: r.id_type,
  idNumber: r.id_number, // already redacted at write time
  photoUrl: r.photo_url,
  submittedAt: r.submitted_at,
});

async function submitVerification({ userId, idType, idNumber, photoUrl }) {
  const redacted = redactIdNumber(idNumber);
  if (!ID_TYPES.includes(idType)) return { error: `idType must be one of ${ID_TYPES.join(", ")}` };
  if (!redacted) return { error: "a valid idNumber is required" };
  if (!photoUrl) return { error: "a live photo is required" };
  const id = randomUUID();
  const r = await query(
    `INSERT INTO buyer_verifications (id, user_id, id_type, id_number, photo_url)
     VALUES ($1,$2,$3,$4,$5) RETURNING *`,
    [id, userId, idType, redacted, photoUrl]
  );
  return ROW_TO_VERIFICATION(r.rows[0]);
}

async function getVerificationForUser(userId) {
  const r = await query(
    "SELECT * FROM buyer_verifications WHERE user_id = $1 ORDER BY submitted_at DESC LIMIT 1",
    [userId]
  );
  return r.rowCount ? ROW_TO_VERIFICATION(r.rows[0]) : null;
}

module.exports = { ID_TYPES, redactIdNumber, submitVerification, getVerificationForUser };
