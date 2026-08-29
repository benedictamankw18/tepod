// Thin wrappers around the AgriSmart backend API.
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

export function deleteListing(listingId) {
  return request('DELETE', `/api/listings/${listingId}`)
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

function numeric(v) {
  return typeof v === 'number' && Number.isFinite(v)
}
