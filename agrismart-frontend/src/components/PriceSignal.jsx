import { useEffect, useState } from 'react'
import { getPriceHistory } from '../lib/api'

export function TrendBars({ history }) {
  const buckets = []
  for (const row of history) {
    const d = new Date(row.date)
    const key = Math.floor(d.getTime() / (7 * 864e5))
    if (!buckets[key]) buckets[key] = { sum: 0, n: 0 }
    buckets[key].sum += row.price
    buckets[key].n += 1
  }
  const weeks = Object.keys(buckets)
    .sort((a, b) => a - b)
    .map((k) => buckets[k].sum / buckets[k].n)
    .slice(-7)
  if (!weeks.length) return null
  const max = Math.max(...weeks)
  return (
    <div className="mt-5 flex h-[62px] items-end gap-1.5" aria-label="Price trend">
      {weeks.map((v, i) => (
        <span
          key={i}
          className="flex-1 self-end rounded-t bg-lime/90"
          style={{ height: `${Math.max(8, (v / max) * 100)}%` }}
        />
      ))}
    </div>
  )
}

export default function PriceSignal({ crop, market }) {
  const [info, setInfo] = useState(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    let alive = true
    if (!crop) return
    getPriceHistory(crop, market)
      .then(async (history) => {
        if (!alive || !history.length) return
        const rows = (history || []).filter(Boolean)
        const first = rows[0]
        const last = rows[rows.length - 1]
        const pct =
          first && first.price
            ? Math.round(((last.price - first.price) / first.price) * 100)
            : null
        setInfo({ history: rows, current: last, pct })
      })
      .catch(() => alive && setError(true))
    return () => {
      alive = false
    }
  }, [crop, market])

  if (error || !info) {
    return (
      <div className="relative overflow-hidden rounded-[18px] bg-leaf-dark p-6 text-white">
        <span className="font-sans text-[11px] font-bold uppercase tracking-[.15em] text-lime">
          Price signal
        </span>
        <h2 className="mt-2 font-serif text-2xl font-semibold tracking-[-.04em]">
          {error ? 'Prices are quiet right now.' : 'Loading price signal…'}
        </h2>
        <p className="relative z-10 mt-2 max-w-[275px] font-sans text-xs leading-relaxed text-[#c8d9d0]">
          {error
            ? 'We could not reach the price feed. Check back soon for the latest market signal.'
            : 'Tuning in to the market for you.'}
        </p>
      </div>
    )
  }

  const label = crop.charAt(0).toUpperCase() + crop.slice(1)
  const up = info.pct >= 0
  const copy = up
    ? `${label} is moving upward. Recent prices are stronger this week.`
    : `${label} eased a little this week.`
  return (
    <div className="relative overflow-hidden rounded-[18px] bg-leaf-dark p-6 text-white">
      <span className="font-sans text-[11px] font-bold uppercase tracking-[.15em] text-lime">
        Price signal
      </span>
      <h2 className="mt-2 max-w-[230px] font-serif text-2xl font-semibold leading-tight tracking-[-.04em]">
        {up ? `${label} is moving upward.` : `${label} eased a little.`}
      </h2>
      <p className="relative z-10 mt-2 max-w-[275px] font-sans text-xs leading-relaxed text-[#c8d9d0]">
        {copy} Holding may improve your return if your crop is not yet fully ripe.
      </p>
      <div className="relative z-10 mt-5 flex items-baseline gap-2">
        <strong className={`font-serif text-[31px] ${up ? 'text-lime' : 'text-[#e97f63]'}`}>
          {up ? '+' : ''}
          {info.pct}%
        </strong>
        <span className="font-sans text-xs text-[#c8d9d0]">over the trend period</span>
      </div>
      <TrendBars history={info.history} />
    </div>
  )
}
