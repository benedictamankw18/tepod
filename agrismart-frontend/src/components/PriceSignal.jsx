import { useId } from 'react'

const W = 400
const H = 150
const PAD = 20
const LINE_COLOR = { up: '#c6dc58', down: '#e97f63' }

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

// History (solid) plus a dashed 3-day estimate on one scaled axis, with a dot on
// today. `history` is an ascending [{ date, value }] series; `forecast` carries
// { days: [{ date, estimate }] }.
export function ForecastChart({ history, forecast, tone = 'up' }) {
  const gradientId = useId()
  const pts = history.map((p) => ({ date: p.date, value: Number(p.value) }))
  if (!pts.length) return null
  const estimatePts = (forecast?.days || []).map((d) => ({ date: d.date, value: Number(d.estimate) }))
  const values = pts.concat(estimatePts).map((p) => p.value)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1
  const usableH = H - PAD * 2
  const all = pts.concat(estimatePts)
  const xFor = (i) => (all.length === 1 ? W / 2 : PAD + (i * (W - PAD * 2)) / (all.length - 1))
  const yFor = (v) => H - PAD - ((v - min) / range) * usableH
  const hPts = pts.map((p, i) => ({ x: xFor(i), y: yFor(p.value) }))
  const ePts = estimatePts.map((p, i) => ({ x: xFor(pts.length + i), y: yFor(p.value) }))
  const last = hPts[hPts.length - 1]
  const line = hPts.length === 1 ? `M ${last.x} ${last.y} L ${last.x} ${last.y}` : smoothPath(hPts)
  const area = `${line} L ${last.x} ${H - PAD} L ${hPts[0].x} ${H - PAD} Z`
  const forePath = ePts.length ? smoothPath([last, ...ePts]) : null
  const color = LINE_COLOR[tone] || LINE_COLOR.up
  const firstDate = pts[0].date
  const lastDate = ePts.length ? ePts[ePts.length - 1].date : pts[pts.length - 1].date

  return (
    <div className="mt-5">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="block w-full"
        role="img"
        aria-label={`Price history with a ${estimatePts.length} day forecast`}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={color} stopOpacity="0.28" />
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
            strokeOpacity="0.12"
            strokeDasharray="3 5"
          />
        ))}
        <path d={area} fill={`url(#${gradientId})`} className="chart-area" />
        <path d={line} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="chart-line" />
        {forePath && (
          <path
            d={forePath}
            fill="none"
            stroke={color}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="6 4"
            className="chart-line"
          />
        )}
        <circle cx={last.x} cy={last.y} r="5" fill={color} opacity="0.25" />
        <circle cx={last.x} cy={last.y} r="3" fill="#0f1f16" stroke={color} strokeWidth="1.5" />
        {ePts.map((p, i) => (
          <circle key={`est-${i}`} cx={p.x} cy={p.y} r="2.5" fill="none" stroke={color} strokeWidth="1.5" />
        ))}
      </svg>
      <div className="mt-2 flex justify-between font-sans text-[9px] font-medium uppercase tracking-[.12em] text-fern/70">
        <span>{firstDate}</span>
        <span>Estimate through {lastDate || '…'}</span>
      </div>
    </div>
  )
}