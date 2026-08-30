import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { getMyNotifications, markNotificationsRead } from '../lib/api'
import { BellIcon } from './icons'
import { getUser } from '../lib/auth'

// How often the unread badge is refreshed while the inbox is closed.
const POLL_MS = 20000

function timeAgo(iso) {
  if (!iso) return ''
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.max(1, Math.round(diff / 60000))
  if (m < 60) return `${m}m ago`
  const h = Math.round(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.round(h / 24)}d ago`
}

// In-app notification bell: unread badge + dropdown inbox. Opening the dropdown
// marks the user's in-app notifications as read. Used in the Sidebar and
// HorizontalNav (both dark backgrounds).
export default function NotificationBell({ className = '', iconSize = 'h-10 w-10' }) {
  const [open, setOpen] = useState(false)
  const [list, setList] = useState([])
  const [unread, setUnread] = useState(0)
  const [loading, setLoading] = useState(false)
  const [pos, setPos] = useState(null)
  const rootRef = useRef(null)
  const user = getUser()
  const isBuyer = user?.role === 'buyer'

  const refreshUnread = () =>
    getMyNotifications()
      .then((r) => {
        setUnread(r.unread || 0)
        if (!open) setList(r.notifications || [])
      })
      .catch(() => {})

  useEffect(() => {
    refreshUnread()
    const t = setInterval(refreshUnread, POLL_MS)
    return () => clearInterval(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!open) return undefined
    const onDoc = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  // Viewport-anchored position for the portaled dropdown, measured from the
  // bell. It lives on body so no overflow-clipped chrome (sidebar rail, nav)
  // can cage or bury it; fixed positioning keeps it glued to the bell while
  // the header/rail stay put on scroll.
  const measurePos = () => {
    const r = rootRef.current?.getBoundingClientRect()
    if (!r) return null
    const top = Math.max(8, Math.min(r.bottom + 8, window.innerHeight - 420))
    const maxOffset = Math.max(8, window.innerWidth - 328)
    if (isBuyer) {
      return { top, right: Math.max(8, Math.min(window.innerWidth - r.right, maxOffset)) }
    }
    return { top, left: Math.max(8, Math.min(r.left, maxOffset)) }
  }

  useEffect(() => {
    if (!open) {
      setPos(null)
      return undefined
    }
    const update = () => setPos(measurePos())
    update()
    window.addEventListener('resize', update)
    window.addEventListener('scroll', update, { capture: true, passive: true })
    return () => {
      window.removeEventListener('resize', update)
      window.removeEventListener('scroll', update, { capture: true, passive: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const openInbox = async () => {
    const wasOpen = open
    setOpen(!wasOpen)
    if (wasOpen) return
    setLoading(true)
    try {
      const r = await getMyNotifications()
      setList(r.notifications || [])
      if ((r.unread || 0) > 0) await markNotificationsRead()
      setUnread(0)
    } catch {
      /* keep whatever we have */
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={`relative ${className}`} ref={rootRef}>
      <button
        type="button"
        onClick={openInbox}
        aria-label={`Notifications${unread ? ` (${unread} unread)` : ''}`}
        className={`relative grid place-items-center rounded-lg text-fern transition hover:bg-white/10 hover:text-white ${iconSize}`}
      >
        <BellIcon />
        {unread > 0 && (
          <span className="absolute right-0 top-0 grid h-4 min-w-[16px] -translate-y-1/2 translate-x-1/2 items-center rounded-full bg-coral px-1 font-sans text-[10px] font-bold text-white">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      {open &&
        pos &&
        createPortal(
          <div
            className="toast-enter w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-card border border-line bg-white shadow-lg"
            style={{ position: 'fixed', zIndex: 50, ...pos }}
          >
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <h3 className="font-serif text-base font-semibold text-ink">Notifications</h3>
              <span className="font-sans text-[10px] uppercase tracking-wide text-muted">
                {list.length} in this inbox
              </span>
            </div>
            <div className="max-h-80 overflow-y-auto">
              {loading && (
                <p className="px-4 py-8 text-center font-sans text-sm text-muted">Loading…</p>
              )}
              {!loading && list.length === 0 && (
                <p className="px-4 py-8 text-center font-sans text-sm text-muted">
                  No in-app notifications yet.
                </p>
              )}
              {!loading &&
                list.map((n) => (
                  <div key={n.id} className="border-b border-paper px-4 py-3 last:border-0 hover:bg-paper/40">
                    {n.title && <p className="font-sans text-sm font-semibold text-ink">{n.title}</p>}
                    {n.message && (
                      <p className="mt-0.5 break-words font-sans text-[13px] leading-relaxed text-muted">
                        {n.message}
                      </p>
                    )}
                    <p className="mt-1 font-sans text-[11px] text-muted/80">{timeAgo(n.sentAt)}</p>
                  </div>
                ))}
            </div>
          </div>,
          document.body,
        )}
    </div>
  )
}