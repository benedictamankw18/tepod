// Thin wrappers around the NKABOM AGRILINK backend API.
// All requests are same-origin during development via the Vite proxy (see vite.config.js).

import { getToken } from './auth'

async function request(method, path, body, raw) {
  const headers = {}
  if (!raw) headers['Content-Type'] = 'application/json'
  const token = getToken()
  if (token) headers.Authorization = `Bearer ${token}`
  const res = await fetch(path, {
    method,
    headers,
    body: raw ? body : body ? JSON.stringify(body) : undefined,
  })
  let data = null
  try {
    data = await res.json()
  } catch {
    data = null
  }
  if (!res.ok) {
    const err = new Error((data && data.error) || `Request failed (${res.status})`)
    err.status = res.status
    err.body = data
    throw err
  }
  return data
}

export function register(payload) {
  return request('POST', '/api/auth/register', payload)
}

export function checkAvailability(payload) {
  return request('POST', '/api/users/check-availability', payload)
}

export function login(identifier, password) {
  return request('POST', '/api/auth/login', { identifier, password })
}

export function issueOtp(phone, purpose = 'login', email) {
  const payload = { phone, purpose }
  if (email) payload.email = email
  return request('POST', '/api/auth/otp/issue', payload)
}

export function verifyOtp(payload) {
  return request('POST', '/api/auth/otp/verify', payload)
}

export function resetPassword(payload) {
  return request('POST', '/api/auth/password/reset', payload)
}

export function googleLogin(idToken, payload) {
  return request('POST', '/api/auth/google', { idToken, ...payload })
}

// --- Role-dashboard + verification API ---

export async function uploadImage(file) {
  const form = new FormData()
  form.append('file', file)
  return request('POST', '/api/uploads', form, true)
}

export function verifyBuyer(payload) {
  return request('POST', '/api/auth/verify', payload)
}

export function updateProfile(payload) {
  return request('POST', '/api/auth/profile', payload)
}

export function getMe() {
  return request('GET', '/api/auth/me')
}

export function updateAccount(payload) {
  return request('POST', '/api/auth/account', payload)
}

export function updatePhoto(photoUrl) {
  return request('POST', '/api/auth/photo', { photoUrl })
}

export function changePassword(currentPassword, newPassword) {
  return request('POST', '/api/auth/change-password', { currentPassword, newPassword })
}

export function getMyFarms() {
  return request('GET', '/api/farms/mine')
}

export function createFarm(payload) {
  return request('POST', '/api/farms', payload)
}

export function updateFarm(farmId, payload) {
  return request('PUT', `/api/farms/${farmId}`, payload)
}

export function deleteFarm(farmId, reason) {
  return request('DELETE', `/api/farms/${farmId}`, reason ? { reason } : undefined)
}

export function getProduce(nearLat, nearLng) {
  const q = numeric(nearLat) && numeric(nearLng) ? `?nearLat=${nearLat}&nearLng=${nearLng}` : ''
  return request('GET', `/api/produce${q}`)
}

export function getProduceById(id) {
  return request('GET', `/api/produce/${id}`)
}

export function getSimilarProduce(id, cropType, nearLat, nearLng) {
  const q = new URLSearchParams({ cropType, exclude: id })
  if (typeof nearLat === 'number' && Number.isFinite(nearLat)) q.set('nearLat', String(nearLat))
  if (typeof nearLng === 'number' && Number.isFinite(nearLng)) q.set('nearLng', String(nearLng))
  return request('GET', `/api/produce?${q.toString()}`)
}

export function getFarmerCommitments(farmerId) {
  return request('GET', `/api/precommitments/farmer/${farmerId}`)
}

export function createPrecommitment(payload) {
  return request('POST', '/api/precommitments', payload)
}

export function respondPrecommitment(id, payload) {
  return request('POST', `/api/precommitments/${id}/respond`, payload)
}

export function getMyPreCommitments() {
  return request('GET', '/api/precommitments/me')
}

// Drive an accepted pre-commitment through fulfilment: prepare / ready / delivered.
export function fulfillPrecommitment(id, payload) {
  return request('POST', `/api/precommitments/${id}/fulfill`, payload)
}

// Payment against the auto-created transaction of an accepted commitment.
export function depositTransaction(id, amount) {
  return request('POST', `/api/transactions/${id}/deposit`, { amount })
}

export function payTransaction(id, amount) {
  return request('POST', `/api/transactions/${id}/pay`, amount ? { amount } : undefined)
}

export function getTransaction(id) {
  return request('GET', `/api/transactions/${id}`)
}

// --- Payments (Paystack charges + escrow) ---

// Settings the checkout needs: escrow toggle, deposit floor, currency, Paystack key.
export function getPaymentsConfig() {
  return request('GET', '/api/payments/config')
}

// Open a Paystack charge for a deposit or balance payment on a transaction.
// Simulated mode (no PAYSTACK_SECRET_KEY) settles instantly and returns { simulated: true }.
export function chargeTransaction(id, payload) {
  return request('POST', `/api/transactions/${id}/charge`, payload)
}

// Verify + settle a charge after the buyer returns from Paystack. Idempotent.
export function confirmPayment(id, payload) {
  return request('POST', `/api/payments/${id}/confirm`, payload)
}

// The farmer's escrow payout destination (bank account or mobile-money wallet).
export function updatePayoutAccount(payload) {
  return request('POST', '/api/auth/payout', payload)
}

// --- Cart (server-backed) ---

export function getCart() {
  return request('GET', '/api/cart')
}

export function addToCart(payload) {
  return request('POST', '/api/cart', payload)
}

export function setCartLineQty(listingId, quantity) {
  return request('PATCH', `/api/cart/${listingId}`, { quantity })
}

export function removeFromCart(listingId) {
  return request('DELETE', `/api/cart/${listingId}`)
}

export function clearCart() {
  return request('DELETE', '/api/cart')
}

export function getWishlist() {
  return request('GET', '/api/wishlist')
}

export function addWishlistItem(listingId) {
  return request('PUT', `/api/wishlist/${listingId}`)
}

export function removeWishlistItem(listingId) {
  return request('DELETE', `/api/wishlist/${listingId}`)
}

// --- Marketplace + price guide ---

export function createListing(payload) {
  return request('POST', '/api/listings', payload)
}

export function updateListingImages(listingId, imageUrls) {
  return request('PUT', `/api/listings/${listingId}/images`, { imageUrls })
}

export function updateListing(listingId, payload) {
  return request('PUT', `/api/listings/${listingId}`, payload)
}

export function deleteListing(listingId, reason) {
  return request('DELETE', `/api/listings/${listingId}`, reason ? { reason } : undefined)
}

export function setListingStatus(listingId, status) {
  return request('PATCH', `/api/listings/${listingId}/status`, { status })
}

// --- Banners (admin-managed storefront hero) ---

export function getBanners() {
  return request('GET', '/api/banners')
}

export function getCrops() {
  return request('GET', '/api/crops')
}

export function getUnits() {
  return request('GET', '/api/units')
}

export function getRegions() {
  return request('GET', '/api/regions')
}

export function getAllBanners() {
  return request('GET', '/api/banners/all')
}

export function createBanner(payload) {
  return request('POST', '/api/banners', payload)
}

export function updateBanner(id, payload) {
  return request('PUT', `/api/banners/${id}`, payload)
}

export function setBannerActive(id, active) {
  return request('PATCH', `/api/banners/${id}/active`, { active })
}

export function deleteBanner(id) {
  return request('DELETE', `/api/banners/${id}`)
}

export function getListings(params = {}) {
  const q = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') q.set(k, v)
  }
  const qs = q.toString()
  return request('GET', `/api/listings${qs ? `?${qs}` : ''}`)
}

export function getListing(listingId) {
  return request('GET', `/api/listings/${listingId}`)
}

export function getCurrentPrice(cropType, market) {
  const q = new URLSearchParams({ cropType })
  if (market) q.set('market', market)
  return request('GET', `/api/prices/current?${q.toString()}`)
}

export function getPriceHistory(cropType, market, weeks = 8) {
  const q = new URLSearchParams({ cropType, weeks: String(weeks) })
  if (market) q.set('market', market)
  return request('GET', `/api/prices/history?${q.toString()}`)
}

// --- AI guide (weather + price) ---

export function getWeatherGuide(farmId) {
  const q = farmId ? new URLSearchParams({ farmId }) : null
  return request('GET', `/api/ai/weather-guide${q ? `?${q.toString()}` : ''}`)
}

export function getPriceGuide(cropType, market) {
  const q = new URLSearchParams({ cropType })
  if (market && market !== 'all markets') q.set('market', market)
  return request('GET', `/api/ai/price-guide?${q.toString()}`)
}

function numeric(v) {
  return typeof v === 'number' && Number.isFinite(v)
}

// --- Admin workspace ---

function qs(params = {}) {
  const q = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') q.set(k, v)
  }
  const s = q.toString()
  return s ? `?${s}` : ''
}

export function getSummary() {
  return request('GET', '/api/summary')
}

export function getUsers(params = {}) {
  return request('GET', `/api/users${qs(params)}`)
}

export function setUserVerified(id, verified) {
  return request('PATCH', `/api/users/${id}/verified`, { verified })
}

export function setUserRole(id, role) {
  return request('PATCH', `/api/users/${id}/role`, { role })
}

export function setUserCrops(id, crops) {
  return request('PUT', `/api/users/${id}/crops`, crops)
}

export function getUserCropTypes() {
  return request('GET', '/api/users/user-croptype')
}

export function createUser(payload) {
  return request('POST', '/api/users/create', payload)
}

export function getUser(id) {
  return request('GET', `/api/users/${id}`)
}

export function updateUser(id, payload) {
  return request('PATCH', `/api/users/${id}`, payload)
}

export function setUserActive(id, active) {
  return request('PATCH', `/api/users/${id}/active`, { active })
}

export function deleteUser(id) {
  return request('DELETE', `/api/users/${id}`)
}

export function restoreUser(id) {
  return request('PATCH', `/api/users/${id}/restore`)
}

export function getAdminCrops() {
  return request('GET', '/api/crops/all')
}

export function createCrop(payload) {
  return request('POST', '/api/crops', payload)
}

export function updateCrop(id, payload) {
  return request('PUT', `/api/crops/${id}`, payload)
}

export function deleteCrop(id) {
  return request('DELETE', `/api/crops/${id}`)
}

export function getAdminUnits() {
  return request('GET', '/api/units/all')
}

export function createUnit(payload) {
  return request('POST', '/api/units', payload)
}

export function updateUnit(id, payload) {
  return request('PUT', `/api/units/${id}`, payload)
}

export function deleteUnit(id) {
  return request('DELETE', `/api/units/${id}`)
}

export function getAllPrices(params = {}) {
  return request('GET', `/api/prices/all${qs(params)}`)
}

export function createPrice(payload) {
  return request('POST', '/api/prices', payload)
}

export function updatePrice(id, payload) {
  return request('PUT', `/api/prices/${id}`, payload)
}

export function deletePrice(id) {
  return request('DELETE', `/api/prices/${id}`)
}

export function getAdminFarms() {
  return request('GET', '/api/farms/all')
}

export function restoreFarm(id, reason) {
  return request('PATCH', `/api/farms/${id}/restore`, reason ? { reason } : undefined)
}

export function getAdminAudit(params = {}) {
  return request('GET', `/api/admin/audit${qs(params)}`)
}

export function getAllListings(params = {}) {
  return request('GET', `/api/listings/all${qs(params)}`)
}

export function getAdminTransactions(params = {}) {
  return request('GET', `/api/transactions/all${qs(params)}`)
}

export function markTransactionPaid(id) {
  return request('POST', `/api/transactions/${id}/pay`)
}

export function getAdminPreCommitments(params = {}) {
  return request('GET', `/api/precommitments/all${qs(params)}`)
}

export function getNotifications(params = {}) {
  return request('GET', `/api/notifications${qs(params)}`)
}

export function broadcastNotification(payload) {
  return request('POST', '/api/notifications/broadcast', payload)
}

export function getMyNotifications(limit, offset) {
  const params = {}
  if (limit) params.limit = limit
  if (offset) params.offset = offset
  return request('GET', `/api/notifications/me${qs(params)}`)
}

export function markNotificationsRead(ids = []) {
  return request('POST', '/api/notifications/me/read', { ids })
}

export function getTransportRequests(status) {
  return request('GET', `/api/transport-requests${status ? `?status=${encodeURIComponent(status)}` : ''}`)
}

export function createTransportRequest(payload) {
  return request('POST', '/api/transport-requests', payload)
}

export function getTransportRequestsForPreCommitment(precommitmentId) {
  return request('GET', `/api/transport-requests?precommitmentId=${encodeURIComponent(precommitmentId)}`)
}

export function assignTransport(id, transporterId, estimatedCost) {
  return request('POST', `/api/transport-requests/${id}/assign`, { transporterId, estimatedCost })
}

export function setTransportStatus(id, status) {
  return request('PATCH', `/api/transport-requests/${id}/status`, { status })
}

export function getListingReviews(id) {
  return request('GET', `/api/reviews/listing/${id}`)
}

export function postReview(listingId, payload) {
  return request('POST', '/api/reviews', { listingId, ...payload })
}

export function getMyPurchases() {
  return request('GET', '/api/transactions/mine')
}

export function getReceivedReviews() {
  return request('GET', '/api/reviews/received')
}

export function importPrices(rows) {
  return request('POST', '/api/prices/import', { rows })
}

export function importCrops(rows) {
  return request('POST', '/api/crops/import', { rows })
}

export function importUnits(rows) {
  return request('POST', '/api/units/import', { rows })
}

export function getCommissionSettings() {
  return request('GET', '/api/settings/commission')
}

export function saveCommissionSettings(config) {
  return request('PUT', '/api/settings/commission', { config })
}

export function getPaymentsSettings() {
  return request('GET', '/api/settings/payments')
}

export function savePaymentsSettings(config) {
  return request('PUT', '/api/settings/payments', { config })
}
