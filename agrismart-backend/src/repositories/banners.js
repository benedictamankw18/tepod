const { randomUUID } = require("crypto");
const { query } = require("../db/pool");

const ROW_TO_BANNER = (r) => ({
  id: r.id,
  title: r.title,
  eyebrow: r.eyebrow,
  subtitle: r.subtitle,
  imageUrl: r.image_url,
  linkUrl: r.link_url,
  sortOrder: Number(r.sort_order),
  active: r.active === true || r.active === "true",
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

const normalize = ({ title, eyebrow, subtitle, imageUrl, linkUrl, sortOrder, active }) => ({
  title: String(title || "").trim(),
  eyebrow: eyebrow == null ? null : String(eyebrow).trim() || null,
  subtitle: subtitle == null ? null : String(subtitle).trim() || null,
  imageUrl: imageUrl == null ? null : String(imageUrl).trim() || null,
  linkUrl: linkUrl == null ? null : String(linkUrl).trim() || null,
  sortOrder: Number.isFinite(Number(sortOrder)) && String(sortOrder).trim() !== ""
    ? Number(sortOrder)
    : 0,
  active: active === undefined ? true : Boolean(active),
});

async function listBanners() {
  const r = await query("SELECT * FROM banners ORDER BY sort_order ASC, created_at DESC");
  return r.rows.map(ROW_TO_BANNER);
}

async function listActiveBanners() {
  const r = await query("SELECT * FROM banners WHERE active = true ORDER BY sort_order ASC, created_at DESC");
  return r.rows.map(ROW_TO_BANNER);
}

async function getBanner(id) {
  const r = await query("SELECT * FROM banners WHERE id = $1", [id]);
  return r.rowCount ? ROW_TO_BANNER(r.rows[0]) : null;
}

async function createBanner(input) {
  const { title, eyebrow, subtitle, imageUrl, linkUrl, sortOrder, active } = normalize(input);
  if (!title) throw Object.assign(new Error("title is required"), { status: 400 });
  const id = randomUUID();
  const r = await query(
    `INSERT INTO banners (id, title, eyebrow, subtitle, image_url, link_url, sort_order, active)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
    [id, title, eyebrow, subtitle, imageUrl, linkUrl, sortOrder, active]
  );
  return ROW_TO_BANNER(r.rows[0]);
}

async function updateBanner(id, input) {
  const { title, eyebrow, subtitle, imageUrl, linkUrl, sortOrder, active } = normalize(input);
  const r = await query(
    `UPDATE banners
     SET title = $2, eyebrow = $3, subtitle = $4, image_url = $5, link_url = $6,
         sort_order = $7, active = $8, updated_at = now()
     WHERE id = $1 RETURNING *`,
    [id, title, eyebrow, subtitle, imageUrl, linkUrl, sortOrder, active]
  );
  return r.rowCount ? ROW_TO_BANNER(r.rows[0]) : null;
}

// Toggle active state without replacing the other fields.
async function setBannerActive(id, active) {
  const r = await query(
    "UPDATE banners SET active = $2, updated_at = now() WHERE id = $1 RETURNING *",
    [id, Boolean(active)]
  );
  return r.rowCount ? ROW_TO_BANNER(r.rows[0]) : null;
}

async function deleteBanner(id) {
  const r = await query("DELETE FROM banners WHERE id = $1 RETURNING id", [id]);
  return r.rowCount ? r.rows[0].id : null;
}

module.exports = {
  listBanners, listActiveBanners, getBanner,
  createBanner, updateBanner, setBannerActive, deleteBanner,
};
