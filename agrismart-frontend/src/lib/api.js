// Thin wrappers around the AgriSmart backend auth API.
// All requests are same-origin during development via the Vite proxy (see vite.config.js).

async function request(method, path, body) {
  const res = await fetch(path, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
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

export function issueOtp(phone, purpose = 'login') {
  return request('POST', '/api/auth/otp/issue', { phone, purpose })
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
