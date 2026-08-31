const { randomUUID } = require("crypto");
const { query } = require("../db/pool");

const ROW_TO_WISHLIST = (r) => ({
  listingId: r.listing_id,
  cropType: r.crop_type,
  unit: r.unit,
  askingPrice: Number(r.asking_price),
  availableQty: Number(r.available_qty),
  status: r.status,
  farmerName: r.farmer_name,
  location: r.location,
  imageUrl: r.image_url,
  imageUrls: Array.isArray(r.image_urls)
    ? r.image_urls
    : (r.image_url ? [r.image_url] : []),
});

// A user's wishlisted listings, joined with listing metadata.
async function getWishlist(userId) {
  const r = await query(
    `SELECT w.listing_id, w.created_at,
            l.crop_type, l.unit, l.asking_price,
            GREATEST(l.quantity - COALESCE((
              SELECT SUM(
                CASE WHEN pc.status = 'completed' THEN COALESCE(pc.actual_quantity, pc.quantity)
                     WHEN pc.status IN ('accepted','preparing','ready','delivered') THEN pc.quantity
                     ELSE 0 END)
              FROM pre_commitments pc WHERE pc.listing_id = l.id), 0), 0) AS available_qty,
            l.status, l.location, l.image_url, l.image_urls,
            u.name AS farmer_name
     FROM wishlist_items w
     JOIN listings l ON l.id = w.listing_id
     JOIN users u ON u.id = l.farmer_id
     WHERE w.user_id = $1
     ORDER BY w.created_at DESC`,
    [userId]
  );
  return r.rows.map(ROW_TO_WISHLIST);
}

// Add a favourite. Idempotent: returns { ok, added } where added is false if it
// was already present. Returns { error, code } when the listing doesn't exist.
async function addWishlist(userId, listingId) {
  const listing = await query("SELECT 1 FROM listings WHERE id = $1", [listingId]);
  if (listing.rowCount === 0) return { error: "listing not found", code: 404 };
  const id = randomUUID();
  const r = await query(
    `INSERT INTO wishlist_items (id, user_id, listing_id)
     VALUES ($1, $2, $3)
     ON CONFLICT (user_id, listing_id) DO NOTHING
     RETURNING *`,
    [id, userId, listingId]
  );
  return { ok: true, added: r.rowCount > 0 };
}

async function removeWishlist(userId, listingId) {
  const r = await query(
    "DELETE FROM wishlist_items WHERE user_id = $1 AND listing_id = $2",
    [userId, listingId]
  );
  return { removed: r.rowCount > 0 };
}

module.exports = { getWishlist, addWishlist, removeWishlist };
