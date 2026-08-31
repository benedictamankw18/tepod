import { useEffect, useState } from 'react'
import AppShell, { useAppShell } from '../components/AppShell'
import { Panel } from '../components/Panel'
import StatCard from '../components/StatCard'
import SalesTrend from '../components/SalesTrend'
import { getMyReport } from '../lib/api'

const BUCKETS = [
  { id: 'week', label: 'Weekly' },
  { id: 'month', label: 'Monthly' },
  { id: 'year', label: 'Yearly' },
]

const STATUS_META = {
  paid: { label: 'Paid', emoji: '✅', cls: 'bg-lime-soft text-leaf-dark' },
  deposited: { label: 'Deposited', emoji: '💳', cls: 'bg-sky-100 text-sky-800' },
  pending: { label: 'Pending', emoji: '⏳', cls: 'bg-amber-100 text-amber-800' },
  overdue: { label: 'Overdue', emoji: '⚠️', cls: 'bg-rose-100 text-rose-800' },
  disputed: { label: 'Disputed', emoji: '💬', cls: 'bg-purple-100 text-purple-800' },
}

const MEDALS = ['🥇', '🥈', '🥉']

function money(n) {
  return `GHS ${(Number(n) || 0).toLocaleString('en-GH', { maximumFractionDigits: 0 })}`
}

function qty(n) {
  return `${(Number(n) || 0).toLocaleString('en-GH', { maximumFractionDigits: 1 })}`
}

function ReportsContent() {
  const { user, isFarmer } = useAppShell()
  const [bucket, setBucket] = useState('month')
  const [report, setReport] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let alive = true
    setError('')
    getMyReport({ bucket })
      .then((r) => alive && setReport(r))
      .catch((e) => alive && setError(e.message))
    return () => {
      alive = false
    }
  }, [bucket, user.id])

  const o = report?.overview || {}
  const statuses = report?.statuses || []
  const crops = report?.topCrops || []
  const trend = report?.trend || []
  const hasSales = o.items > 0

  return (
    <div className="space-y-6">
      <header>
        <span className="font-sans text-[11px] font-bold uppercase tracking-[.15em] text-leaf">
          AgriSmart AI · Sales &amp; performance
        </span>
        <h1 className="mt-2 font-serif text-[clamp(28px,3.6vw,40px)] font-semibold leading-none tracking-[-.05em] text-ink">
          Sales report
        </h1>
        <p className="mt-2 max-w-[600px] font-sans text-sm leading-relaxed text-muted">
          {isFarmer
            ? 'How much you have earned, what is selling, and who is buying — at a glance.'
            : 'How much you are spending, what you buy most, and how your sourcing is trending.'}
        </p>
      </header>

      {error && (
        <div className="rounded-[10px] bg-rose-50 px-4 py-3 font-sans text-xs text-rose-700">{error}</div>
      )}

      {!report && !error && (
        <Panel>
          <p className="font-sans text-xs text-muted">Loading your report…</p>
        </Panel>
      )}

      {report && (
        <>
          {hasSales && (
            <section>
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <StatCard
                  label={isFarmer ? 'Total earned' : 'Total spent'}
                  value={money(o.totalAmount)}
                  note={isFarmer ? 'net of commission' : 'every sale, paid or not'}
                />
                <StatCard label="Confirmed (paid)" value={money(o.paidAmount)} note="money actually received" />
                <StatCard
                  label={isFarmer ? 'Goods sold' : 'Goods bought'}
                  value={qty(o.totalQuantity)}
                  note={`${qty(o.paidQuantity)} on paid sales`}
                />
                <StatCard label="Outstanding" value={money(o.outstandingAmount)} note="still owed" />
                <StatCard label="Transactions" value={o.items} note={`${o.paidItems} paid`} />
                <StatCard
                  label={isFarmer ? 'Active buyers' : 'Suppliers'}
                  value={o.counterparties}
                  note="people you traded with"
                />
                <StatCard label="Avg unit price" value={money(o.avgPrice)} note="paid sales" />
                <StatCard label="Avg order value" value={money(o.avgOrder)} note="per paid sale" />
              </div>
            </section>
          )}

          {!hasSales && (
            <Panel>
              <p className="font-sans text-sm leading-relaxed text-ink">
                No sales yet on this account. Once a buyer accepts your offer — or you complete a purchase — your
                earnings, top goods, and trend will appear here.
              </p>
            </Panel>
          )}

          <section>
            <Panel>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="font-serif text-[19px] font-semibold tracking-[-.04em] text-ink">Sales trend</h2>
                  <p className="mt-0.5 font-sans text-xs text-muted">
                    {isFarmer ? 'Amount earned' : 'Amount spent'} per period, on every sale.
                  </p>
                </div>
                <div className="flex rounded-[10px] bg-thumb p-1">
                  {BUCKETS.map((b) => (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => setBucket(b.id)}
                      className={`rounded-[8px] px-3 py-1.5 font-sans text-xs font-bold transition ${
                        bucket === b.id ? 'bg-white text-ink shadow' : 'text-muted hover:text-ink'
                      }`}
                    >
                      {b.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="mt-4">
                <SalesTrend series={trend} />
              </div>
            </Panel>
          </section>

          <section>
            <Panel>
              <h2 className="mb-3 font-serif text-[19px] font-semibold tracking-[-.04em] text-ink">Top goods</h2>
              {crops.length ? (
                <ol className="space-y-3">
                  {crops.map((c, i) => (
                    <li key={c.cropType} className="flex items-center gap-3">
                      <span className="w-7 text-center text-lg" aria-hidden="true">
                        {MEDALS[i] || i + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="truncate font-serif text-[15px] font-semibold capitalize text-ink">
                            {c.cropType}
                          </span>
                          <span className="shrink-0 font-sans text-[11px] text-muted">
                            {qty(c.quantity)} · {money(c.amount)}
                          </span>
                        </div>
                        <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-thumb">
                          <div className="h-full rounded-full bg-lime" style={{ width: `${c.sharePct}%` }} />
                        </div>
                      </div>
                      <span className="w-9 shrink-0 text-right font-sans text-[11px] font-bold text-leaf-dark">
                        {c.sharePct}%
                      </span>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="font-sans text-xs text-muted">Top goods will appear once you make a sale.</p>
              )}
            </Panel>
          </section>

          <section>
            <Panel>
              <h2 className="mb-3 font-serif text-[19px] font-semibold tracking-[-.04em] text-ink">Status split</h2>
              <div className="flex flex-wrap gap-2">
                {statuses.map((s) => {
                  const meta = STATUS_META[s.status] || { label: s.status, emoji: '·', cls: 'bg-thumb text-ink/70' }
                  return (
                    <div
                      key={s.status}
                      className={`flex items-center gap-2 rounded-full px-3 py-1.5 font-sans text-xs font-semibold ${meta.cls}`}
                    >
                      <span aria-hidden="true">{meta.emoji}</span>
                      {meta.label}
                      <span className="opacity-80">
                        {s.count} · {money(s.amount)}
                      </span>
                    </div>
                  )
                })}
              </div>
            </Panel>
          </section>

          <footer>
            <p className="font-sans text-[11px] leading-relaxed text-muted">
              Amounts include every sale whether paid or still pending — the status split shows what has actually been
              received. Goods quantities come from the confirmed pre-commitment; manual records without one count 0.
            </p>
          </footer>
        </>
      )}
    </div>
  )
}

export default function ReportsPage() {
  return (
    <AppShell activeId="reports">
      <ReportsContent />
    </AppShell>
  )
}