import { useId } from 'react'

const W = 420
const H = 170
const PAD = 24

// Catmull-Rom → cubic-bezier so the trend line reads as one smooth stroke
// (same technique as PriceSignal.ForecastChart).
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

// `series` is an ascending [{ label, amount, ... }] list. Draws the signed user's
// value per bucket as one smooth area line with x-axis labels beneath.
export default function SalesTrend({ series = [] }) {
  const gradientId = useId()
  const values = series.map((s) => Number(s.amount))
  if (!values.length) {
    return (
      <div className="rounded-[12px] border border-dashed border-line bg-white px-4 py-8 text-center font-sans text-xs text-muted">
        Nothing to plot yet — your sales trend will appear here.
      </div>
    )
  }

  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1
  const usableH = H - PAD * 2
  const pts = series.map((s, i) => ({
    x: values.length === 1 ? W / 2 : PAD + (i * (W - PAD * 2)) / (values.length - 1),
    y: H - PAD - ((Number(s.amount) - min) / range) * usableH,
    label: s.label,
  }))
  const last = pts[pts.length - 1]
  const line = pts.length === 1 ? `M ${last.x} ${last.y} L ${last.x} ${last.y}` : smoothPath(pts)
  const area = `${line} L ${last.x} ${H - PAD} L ${pts[0].x} ${H - PAD} Z`

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="block w-full" role="img" aria-label="Sales trend chart">
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#6b8f3f" stopOpacity="0.22" />
            <stop offset="1" stopColor="#6b8f3f" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0, 1, 2].map((g) => (
          <line
            key={g}
            x1={PAD}
            x2={W - PAD}
            y1={PAD + (g * usableH) / 2}
            y2={PAD + (g * usableH) / 2}
            stroke="#ebebd6"
            strokeWidth="1"
          />
        ))}
        <path d={area} fill={`url(#${gradientId})`} />
        <path d={line} fill="none" stroke="#6b8f3f" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        {pts.map((p) => (
          <circle key={p.label} cx={p.x} cy={p.y} r="3.5" fill="#477018" stroke="white" strokeWidth="1.5" />
        ))}
      </svg>
      <div className="mt-1 flex justify-between px-1 font-sans text-[10px] font-semibold text-muted">
        {pts.map((p) => (
          <span key={p.label}>{p.label}</span>
        ))}
      </div>
    </div>
  )
}