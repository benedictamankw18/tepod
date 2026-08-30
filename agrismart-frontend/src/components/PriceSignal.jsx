import { useEffect, useId, useState } from 'react'
import { getPriceHistory } from '../lib/api'

const W = 400
const H = 150
const PAD = 20
const LINE_COLOR = { up: '#c6dc58', down: '#e97f63' }

function weeklyAverages(history) {
  const buckets = {}
  for (const row of history) {
    const d = new Date(row.date)
    const key = Math.floor(d.getTime() / (7 * 864e5))
    if (!buckets[key]) buckets[key] = { sum: 0, n: 0 }
    buckets[key].sum += row.price
    buckets[key].n += 1
  }
  return Object.keys(buckets)
    .sort((a, b) => a - b)
    .map((k) => ({ date: new Date(Number(k) * 7 * 864e5), value: buckets[k].sum / buckets[k].n }))
    .slice(-7)
}

// Catmull-Rom → cubic-bezier so the trend line reads as one smooth stroke.
function smoothPath(points) {
  let d = `M ${points[0].x} ${points[0].y}`
  for (let i = 0; i < points.length - 1; i += 1) {
    const p0 = points[i - 1] || points[i]
    const p1 = points[i]
    const p2 = points[i + 1]
    const p3 = points[i + 2] || p2
    const c1x = p1.x + (p2.x - p0.x) / 6
    const c1y = p1.y + (p2.y - p0.y) / 6
    const c2x = p2.x - (p3.x - p1.x) / 6
    const c2y = p2.y - (p3.y - p1.y) / 6
    d += ` C ${c1x.toFixed(1)} ${c1y.toFixed(1)}, ${c2x.toFixed(1)} ${c2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`
  }
  return d
}

export function TrendChart({ history, tone = 'up' }) {
  const gradientId = useId()
  const weeks = weeklyAverages(history)
  if (!weeks.length) return null
  const color = LINE_COLOR[tone] || LINE_COLOR.up
  const values = weeks.map((w) => w.value)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1
  const usableH = H - PAD * 2
  const xFor = (i) => (weeks.length === 1 ? W / 2 : PAD + (i * (W - PAD * 2)) / (weeks.length - 1))
  const yFor = (v) => H - PAD - ((v - min) / range) * usableH
  const pts = weeks.map((w, i) => ({ x: xFor(i), y: yFor(w.value) }))
  const last = pts[pts.length - 1]
  const line = weeks.length === 1 ? `M ${last.x} ${last.y} L ${last.x} ${last.y}` : smoothPath(pts)
  const area = `${line} L ${last.x} ${H - PAD} L ${pts[0].x} ${H - PAD} Z`
  const firstDate = weeks[0].date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
  const lastDate = weeks[weeks.length - 1].date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })

  return (
    <div className="mt-5">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="block w-full"
        role="img"
        aria-label={`Price trend over the last ${weeks.length} week${weeks.length === 1 ? '' : 's'}`}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={color} stopOpacity="0.34" />
            <stop offset="1" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0, 1, 2].map((g) => (
          <line
            key={g}
            x1={PAD}
            x2={W - PAD}
            y1={PAD + (g * usableH) / 2}
            y2={PAD + (g * usableH) / 2}
            stroke="#ffffff"
            strokeOpacity="0.14"
            strokeDasharray="3 5"
          />
        ))}
        <path d={area} fill={`url(#${gradientId})`} className="chart-area" />
        <path
          d={line}
          fill="none"
          stroke={color}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="chart-line"
        />
        {weeks.length > 1 && (
          <>
            <circle cx={pts[0].x} cy={pts[0].y} r="2.5" fill={color} />
            <circle cx={last.x} cy={last.y} r="5" fill={color} opacity="0.25" />
            <circle cx={last.x} cy={last.y} r="3" fill="#0f1f16" stroke={color} strokeWidth="1.5" />
          </>
        )}
      </svg>
      <div className="mt-2 flex justify-between font-sans text-[9px] font-medium uppercase tracking-[.12em] text-fern/70">
        <span>{firstDate}</span>
        <span>Latest · {lastDate}</span>
      </div>
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
        <p className="relative z-10 mt-2 max-w-[275px] font-sans text-xs leading-relaxed text-fern">
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
      <p className="relative z-10 mt-2 max-w-[275px] font-sans text-xs leading-relaxed text-fern">
        {copy} Holding may improve your return if your crop is not yet fully ripe.
      </p>
      <div className="relative z-10 mt-5 flex items-baseline gap-2">
        <strong className={`font-serif text-[31px] ${up ? 'text-lime' : 'text-coral'}`}>
          {up ? '+' : ''}
          {info.pct}%
        </strong>
        <span className="font-sans text-xs text-fern">over the trend period</span>
      </div>
      <TrendChart history={info.history} tone={up ? 'up' : 'down'} />
    </div>
  )
}
