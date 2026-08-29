// Mirror the backend's phone normalization (usersRepo.normalizeE164) so the
// frontend and server agree on what a valid Ghanaian mobile number looks like.
// Accepted: "024 123 4567" (local, starts with 0) or "+233241234567" (E.164).
// Everything else (empty, too short, non-digit) is considered invalid.

export function normalizePhone(raw) {
  const digits = String(raw || '').replace(/[^\d+]/g, '')
  if (digits.startsWith('+')) return digits
  if (digits.startsWith('0')) return '+233' + digits.slice(1)
  return digits
}

// A valid number normalizes to +233 followed by exactly 9 subscriber digits.
export function isValidGhanaPhone(raw) {
  return /^\+233\d{9}$/.test(normalizePhone(raw))
}
