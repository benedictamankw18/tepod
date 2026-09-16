const { randomUUID } = require("crypto");
const { query } = require("../db/pool");

const ROW_TO_CART = (r) => ({
  listingId: r.listing_id,
  qty: Number(r.quantity),
  cropType: r.crop_type,
  unit: r.unit,
  askingPrice: Number(r.asking_price),
  minimumPrice: r.minimum_price == null ? null : Number(r.minimum_price),
  availableQty: Number(r.available_qty),
  status: r.status,
  farmerName: r.farmer_name,
  location: r.location,
  imageUrl: r.image_url,
  imageUrls: Array.isArray(r.image_urls)
    ? r.image_urls
    : (r.image_url ? [r.image_url] : []),
});

// Current cart lines for a buyer/seller, joined with their listing metadata.
async function getCart(userId) {
  const r = await query(
    `SELECT c.id, c.listing_id, c.quantity,
            l.crop_type, l.unit, l.asking_price, l.minimum_price, l.quantity AS available_qty,
            l.status, l.location, l.image_url, l.image_urls,
            u.name AS farmer_name
     FROM cart_items c
     JOIN listings l ON l.id = c.listing_id
     JOIN users u ON u.id = l.farmer_id
     WHERE c.user_id = $1
     ORDER BY c.created_at ASC`,
    [userId]
  );
  return r.rows.map(ROW_TO_CART);
}

// Add a line (or bump its quantity) if the listing exists and is still purchasable
// (open or pre_committed). Returns { item } on success, or { error, code } otherwise.
async function upsertCartItem({ userId, listingId, quantity }) {
  const listing = await query("SELECT status FROM listings WHERE id = $1", [listingId]);
  if (listing.rowCount === 0) return { error: "listing not found", code: 404 };
  if (!["open", "pre_committed"].includes(listing.rows[0].status)) {
    return { error: `listing is not purchasable (status: ${listing.rows[0].status})`, code: 409 };
  }
  const id = randomUUID();
  const r = await query(
    `INSERT INTO cart_items (id, user_id, listing_id, quantity)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (user_id, listing_id)
     DO UPDATE SET quantity = EXCLUDED.quantity, updated_at = now()
     RETURNING *`,
    [id, userId, listingId, quantity]
  );
  return { item: r.rows[0] };
}

async function setCartQty({ userId, listingId, quantity }) {
  const r = await query(
    `UPDATE cart_items SET quantity = $3, updated_at = now()
     WHERE user_id = $1 AND listing_id = $2
     RETURNING *`,
    [userId, listingId, quantity]
  );
  return r.rowCount ? r.rows[0] : null;
}

async function removeCartItem({ userId, listingId }) {
  await query("DELETE FROM cart_items WHERE user_id = $1 AND listing_id = $2", [
    userId,
    listingId,
  ]);
}

async function clearCart(userId) {
  await query("DELETE FROM cart_items WHERE user_id = $1", [userId]);
}

module.exports = { getCart, upsertCartItem, setCartQty, removeCartItem, clearCart };
