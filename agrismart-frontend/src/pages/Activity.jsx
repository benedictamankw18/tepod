import { useEffect, useState } from 'react'
import AppShell, { useAppShell } from '../components/AppShell'
import { Panel, PanelHead } from '../components/Panel'
import { Tag } from '../components/ListingCard'
import Empty from '../components/Empty'
import { getFarmerCommitments } from '../lib/api'

function ActivityRow({ title, sub }) {
  const color = 'var(--coral)'
  return (
    <div className="flex items-start gap-3">
      <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: color }} />
      <div>
        <strong className="block font-serif text-sm font-semibold text-ink">{title}</strong>
        <span className="mt-0.5 block font-sans text-[11px] text-muted">{sub}</span>
      </div>
    </div>
  )
}

function ActivityContent() {
  const { user, isFarmer } = useAppShell()
  const [commitments, setCommitments] = useState(null)

  useEffect(() => {
    if (!isFarmer) return
    let alive = true
    getFarmerCommitments(user.id)
      .then((c) => alive && setCommitments(c))
      .catch(() => alive && setCommitments([]))
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.id, isFarmer])

  if (!isFarmer) {
    return (
      <div className="space-y-5">
        <header>
          <span className="font-sans text-[11px] font-bold uppercase tracking-[.15em] text-leaf">
            My activity
          </span>
          <h1 className="mt-2 font-serif text-[clamp(28px,3.6vw,40px)] font-semibold leading-none tracking-[-.05em] text-ink">
            Buyer commitments
          </h1>
          <p className="mt-2 font-sans text-sm text-muted">
            This page is for growers tracking buyer interest in their harvest.
          </p>
        </header>
        <Empty>Activity is available to growers once they list produce.</Empty>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <header>
        <span className="font-sans text-[11px] font-bold uppercase tracking-[.15em] text-leaf">
          My activity
        </span>
        <h1 className="mt-2 font-serif text-[clamp(28px,3.6vw,40px)] font-semibold leading-none tracking-[-.05em] text-ink">
          Your buyer commitments
        </h1>
        <p className="mt-2 font-sans text-sm text-muted">Buyers showing interest in your harvest.</p>
      </header>

      <Panel>
        <PanelHead title="Recent commitments" sub="Buyers showing interest in your harvest." />
        {!commitments ? (
          <Empty>Loading commitments…</Empty>
        ) : commitments.length === 0 ? (
          <Empty>Your latest buyer commitments will appear here.</Empty>
        ) : (
          <div className="grid grid-cols-2 gap-3.5 md:grid-cols-3 xl:grid-cols-4">
            {commitments.slice(0, 8).map((c) => (
              <div
                key={c.id}
                className="flex items-center justify-between gap-3 rounded-[13px] border border-line bg-[#fbfcfa] p-3.5"
              >
                <div className="min-w-0">
                  <strong className="block truncate font-serif text-[15px] font-semibold capitalize text-ink">
                    {c.buyer?.name || 'Buyer'} · {c.listing?.cropType || 'Produce'} · {c.quantity}{' '}
                    {c.listing?.unit}
                  </strong>
                  <p className="mt-1 truncate font-sans text-[11px] leading-snug text-muted">
                    Offer from {c.buyer?.name || 'Local buyer'} · GHS {c.offeredPrice} per unit
                  </p>
                </div>
                <Tag className="shrink-0">{c.status}</Tag>
              </div>
            ))}
          </div>
        )}
      </Panel>

      <Panel>
        <PanelHead title="Recent activity" sub="Small steps toward a better sale." />
        {!commitments || commitments.length === 0 ? (
          <div className="space-y-3">
            <ActivityRow
              title="Your harvest workspace is ready"
              sub="Create a listing to start receiving buyer commitments."
            />
          </div>
        ) : (
          <div className="space-y-3">
            {commitments.slice(0, 3).map((c) => (
              <ActivityRow
                key={c.id}
                title={`${c?.listing?.cropType || 'Produce'} offer ${c.status}`}
                sub={`${c.quantity} ${c?.listing?.unit || 'units'} · GHS ${c.offeredPrice} · ${new Date(
                  c.createdAt,
                ).toLocaleDateString()}`}
              />
            ))}
          </div>
        )}
      </Panel>
    </div>
  )
}

export default function ActivityPage() {
  return (
    <AppShell activeId="requests">
      <ActivityContent />
    </AppShell>
  )
}
