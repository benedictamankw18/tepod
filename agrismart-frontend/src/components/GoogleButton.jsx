import { useCallback, useEffect, useRef, useState } from 'react'
import { googleLogin } from '../lib/api'
import { setSession } from '../lib/auth'

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID
const GIS_SRC = 'https://accounts.google.com/gsi/client'
const LOAD_TIMEOUT_MS = 12000

// google.accounts.id.initialize() must run exactly once per client ID, no matter
// how many <GoogleButton> instances mount (React StrictMode re-mounts in dev, and
// more than one button can be on screen). A per-instance ref cannot enforce that,
// so track it at module scope.
let gsiInitialized = false
const ensureInitialized = (callback) => {
  if (gsiInitialized || !window.google?.accounts?.id) return
  window.google.accounts.id.initialize({ client_id: CLIENT_ID, callback })
  gsiInitialized = true
}

// Renders a Google Sign-In button that exchanges the returned ID token for an
// NKABOM AGRILINK session via POST /api/auth/google. role/buyerType are used only when
// auto-registering a brand-new Google account.
//
// The button is shown as soon as the Google Identity Services script is available.
// If the script is slow/blocked we surface a clear message instead of a silent
// empty container, and we attempt to load it dynamically as a fallback.
export default function GoogleButton({ role, buyerType, onSuccess, onError, text = 'Continue with Google', disabled }) {
  const btnRef = useRef(null)
  // Keep the latest props available to the (long-lived) Google callback without
  // re-registering it. Stored in a ref and read inside callbacks only.
  const propsRef = useRef({ role, buyerType, onSuccess, onError })
  propsRef.current = { role, buyerType, onSuccess, onError }

  const [status, setStatus] = useState(() => (CLIENT_ID ? 'loading' : 'unconfigured'))

  const callback = useCallback(async (response) => {
    if (!response || !response.credential) return
    const p = propsRef.current
    try {
      const result = await googleLogin(response.credential, { role: p.role, buyerType: p.buyerType })
      setSession(result.user, result.token)
      p.onSuccess?.(result)
    } catch (err) {
      p.onError?.(err)
    }
  }, [])

  useEffect(() => {
    if (!CLIENT_ID) return
    let cancelled = false
    let injected = false
    let timeoutId = null

    const render = () => {
      if (cancelled || status !== 'loading') return
      if (!window.google?.accounts?.id) return
      try {
        // initialize() must only run once for the client (module-scoped guard);
        // renderButton may be called once per mounted container.
        ensureInitialized(callback)
        if (btnRef.current) {
          // Google rejects percentage widths; use a real pixel width from the container.
          const px = btnRef.current.offsetWidth || 350
          window.google.accounts.id.renderButton(btnRef.current, {
            theme: 'outline',
            size: 'large',
            width: px,
            text,
          })
        }
      } catch {
        setStatus('error')
        return
      }
      setStatus('ready')
    }

    const injectIfNeeded = () => {
      if (window.google?.accounts?.id || injected) return
      injected = true
      const s = document.createElement('script')
      s.src = GIS_SRC
      s.async = true
      s.defer = true
      s.onload = () => render()
      s.onerror = () => setStatus('error')
      document.head.appendChild(s)
    }

    if (window.google?.accounts?.id) {
      render()
    } else if (document.querySelector(`script[src="${GIS_SRC}"]`)) {
      // index.html already references the script; wait for it (it's async) then render.
      const poll = setInterval(() => {
        if (window.google?.accounts?.id) {
          clearInterval(poll)
          render()
        }
      }, 150)
      timeoutId = setTimeout(() => {
        clearInterval(poll)
        if (!window.google?.accounts?.id) injectIfNeeded()
      }, LOAD_TIMEOUT_MS)
    } else {
      injectIfNeeded()
    }

    return () => {
      cancelled = true
      if (timeoutId) clearTimeout(timeoutId)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [callback, text])

  if (status === 'unconfigured') {
    return (
      <p className="text-sm text-gold bg-lime/10 border border-line rounded-md p-2 text-center">
        Google sign-in is not configured (VITE_GOOGLE_CLIENT_ID missing).
      </p>
    )
  }

  if (status === 'error') {
    return (
      <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md p-2 text-center">
        Could not load Google sign-in. Check your connection or ad-blocker.
      </p>
    )
  }

  return (
    <>
      {status === 'loading' && (
        <p className="text-sm text-muted text-center">Preparing Google sign-in…</p>
      )}
      <div className={disabled ? 'pointer-events-none opacity-50' : status === 'ready' ? '' : 'hidden'}>
        <div ref={btnRef} />
      </div>
    </>
  )
}
