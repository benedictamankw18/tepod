import { useCallback, useEffect, useState } from 'react'
import AppShell from '../components/AppShell'
import { Panel, PanelHead } from '../components/Panel'
import Empty from '../components/Empty'
import Reveal from '../components/Reveal'
import { BellIcon } from '../components/icons'
import { getMyNotifications, markNotificationsRead } from '../lib/api'

const PAGE = 25

function timeAgo(iso) {
  if (!iso) return ''
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.max(1, Math.round(diff / 60000))
  if (m < 60) return `${m}m ago`
  const h = Math.round(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.round(h / 24)}d ago`
}

function NotificationsContent() {
  const [list, setList] = useState(null)
  const [loading, setLoading] = useState(false)
  const [reachedEnd, setReachedEnd] = useState(false)

  const load = useCallback(async (offset) => {
    setLoading(true)
    try {
      const r = await getMyNotifications(PAGE, offset)
      setList((prev) =>
        offset > 0 ? [...(prev || []), ...(r.notifications || [])] : r.notifications || [],
      )
      setReachedEnd((r.notifications || []).length < PAGE)
      if ((r.unread || 0) > 0) {
        await markNotificationsRead()
        setList((prev) => prev.map((n) => ({ ...n, read: true })))
      }
    } catch {
      setList((prev) => prev || [])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load(0)
    const t = setInterval(() => load(0), 20000)
    return () => clearInterval(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const showMore = () => {
    if (reachedEnd || loading) return
    if (Array.isArray(list)) load(list.length)
  }

  return (
    <div className="space-y-5">
      <header>
        <span className="font-sans text-[11px] font-bold uppercase tracking-[.15em] text-leaf">
          Your inbox
        </span>
        <h1 className="mt-2 font-serif text-[clamp(28px,3.6vw,40px)] font-semibold leading-none tracking-[-.05em] text-ink">
          Notifications
        </h1>
        <p className="mt-2 font-sans text-sm text-muted">
          Everything we have sent you — sale updates, payments, transport and price alerts —
          newest first.
        </p>
      </header>

      <Panel>
        <PanelHead
          title="All notifications"
          sub={list && list.length > 0 ? `${list.length} shown · auto-marked as read` : undefined}
        />
        {list === null ? (
          <Empty>Loading your notifications…</Empty>
        ) : list.length === 0 ? (
          <Empty>No notifications yet. When something happens on your market activity, it shows up here.</Empty>
        ) : (
          <>
            <div className="mt-3 divide-y divide-paper overflow-hidden rounded-card border border-line bg-white">
              {list.map((n, i) => (
                <Reveal key={n.id} delay={Math.min(i, 6)}>
                  <div className="flex items-start gap-3 px-4 py-3">
                  <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-[8px] bg-paper text-leaf-dark">
                    <BellIcon />
                  </span>
                  <div className="min-w-0 flex-1">
                    {n.title && <p className="font-sans text-sm font-bold text-ink">{n.title}</p>}
                    {n.message && (
                      <p className="mt-0.5 break-words font-sans text-[13px] leading-relaxed text-muted">
                        {n.message}
                      </p>
                    )}
                    <p className="mt-1 font-sans text-[11px] text-muted/80" title={n.sentAt}>
                      {timeAgo(n.sentAt)}
                    </p>
                  </div>
                </div>
                </Reveal>
              ))}
            </div>
            {!reachedEnd && (
              <div className="mt-4 text-center">
                <button
                  type="button"
                  disabled={loading}
                  onClick={showMore}
                  className="rounded-[8px] border border-line bg-white px-4 py-2 font-sans text-xs font-bold text-ink transition hover:bg-paper disabled:opacity-50"
                >
                  {loading ? 'Loading…' : 'Show more'}
                </button>
              </div>
            )}
          </>
        )}
      </Panel>
    </div>
  )
}

export default function NotificationsPage() {
  return (
    <AppShell activeId="notifications">
      <NotificationsContent />
    </AppShell>
  )
}