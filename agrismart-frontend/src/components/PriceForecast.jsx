import { useEffect, useState } from 'react'
import { Panel, PanelHead } from './Panel'
import Empty from './Empty'
import { ForecastChart } from './PriceSignal'
import { getPriceGuide } from '../lib/api'

const CONF_STYLE = { high: 'text-leaf', medium: 'text-gold', low: 'text-bad-text' }

function TrendPill({ direction, pct }) {
  const label = direction === 'up' ? 'Rising' : direction === 'down' ? 'Falling' : 'Steady'
  const cls =
    direction === 'down'
      ? 'bg-bad text-bad-text'
      : direction === 'up'
        ? 'bg-lime-soft text-leaf-dark'
        : 'bg-thumb text-muted'
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 font-sans text-[11px] font-bold ${cls}`}>
      {label} {pct > 0 ? '+' : ''}{pct}% · 14d
    </span>
  )
}

export default function PriceForecast({ crop }) {
  const [guide, setGuide] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let alive = true
    getPriceGuide(crop)
      .then((g) => {
        if (alive) {
          setGuide(g)
          setError('')
        }
      })
      .catch((e) => alive && setError(e.message || 'Could not load the AI price guide.'))
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [crop])

  return (
    <Panel>
      <PanelHead
        title="AI price forecast"
        sub="Current market price, a three-day estimate and where the same crop pays more."
      />

      {loading && (
        <p className="font-sans text-sm text-muted">Reading the market feed for {crop}…</p>
      )}

      {!loading && error && !guide && (
        <p className="font-sans text-sm text-bad-text">{error}</p>
      )}

      {!loading && guide && !guide.available && (
        <Empty>No price history yet for {crop} — the forecast appears once a few market signals exist.</Empty>
      )}

      {!loading && guide && guide.available && (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <span className="font-sans text-[11px] font-bold uppercase tracking-[.15em] text-muted">
                {guide.current.date} · {guide.market}
              </span>
              <p className="font-serif text-[28px] font-semibold tracking-[-.04em] text-ink">
                GHS {Number(guide.current.price).toFixed(2)}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <TrendPill direction={guide.trend.direction} pct={guide.trend.pct} />
              <span
                title={guide.confidence.reason}
                className={`inline-flex items-center rounded-full bg-surface px-2.5 py-1 font-sans text-[11px] font-bold ${CONF_STYLE[guide.confidence.level]}`}
              >
                {guide.confidence.level === 'low' ? 'Low' : guide.confidence.level === 'high' ? 'High' : 'Medium'} confidence
              </span>
            </div>
          </div>

          <ForecastChart history={guide.history} forecast={guide.forecast} tone={guide.trend.direction === 'down' ? 'down' : 'up'} />

          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 font-sans text-sm text-muted">
            <span>
              Expected in{' '}
              <strong className="text-ink">
                GHS {Number(guide.forecast.days[0].estimate).toFixed(2)} –
                {Number(guide.forecast.days[guide.forecast.days.length - 1].estimate).toFixed(2)}
              </strong>{' '}
              over the next few days
            </span>
            <span>
              Range{' '}
              <strong className="text-ink">
                GHS {Number(guide.forecast.range.low).toFixed(2)} – {Number(guide.forecast.range.high).toFixed(2)}
              </strong>
            </span>
          </div>

          {guide.comparison && guide.comparison.length > 0 && (
            <div>
              <h3 className="font-sans text-[11px] font-bold uppercase tracking-[.15em] text-muted">
                Where the same crop pays more
              </h3>
              <div className="mt-2 space-y-1.5">
                {guide.comparison.slice(0, 5).map((c) => (
                  <div
                    key={c.market}
                    className={`flex items-center justify-between gap-3 rounded-[11px] border px-3.5 py-2.5 font-sans text-sm ${
                      c.market === guide.market ? 'border-leaf/50 bg-lime-soft' : 'border-line bg-surface'
                    }`}
                  >
                    <span className="font-semibold text-ink">
                      {c.market}
                      {c.market === guide.market && (
                        <span className="ml-2 rounded-full bg-leaf px-2 py-0.5 text-[10px] font-bold text-white">
                          your market
                        </span>
                      )}
                    </span>
                    <span className="flex items-center gap-3 text-muted">
                      <span className="font-medium text-ink">GHS {Number(c.latestPrice).toFixed(2)}</span>
                      <span className={c.trendPct >= 0 ? 'text-leaf' : 'text-bad-text'}>
                        {c.trendPct > 0 ? '+' : ''}
                        {c.trendPct}%
                      </span>
                      <span className="hidden text-[11px] sm:inline">{c.samples} signals</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {guide.advice && (
            <div className="rounded-[13px] border border-leaf/30 bg-lime-soft/60 p-4">
              <div className="flex items-center justify-between gap-2">
                <span className="font-sans text-[11px] font-bold uppercase tracking-[.15em] text-leaf">
                  AI market guidance
                </span>
                <span className="rounded-full bg-leaf px-2 py-0.5 font-sans text-[10px] font-bold text-white">
                  {guide.advice.source === 'llm' ? 'AI' : 'AI · offline'}
                </span>
              </div>
              <p className="mt-2 font-serif text-[17px] font-semibold leading-snug tracking-[-.02em] text-ink">
                {guide.advice.recommendation}
              </p>
              {guide.advice.reasons && guide.advice.reasons.length > 0 && (
                <ul className="mt-3 space-y-1.5">
                  {guide.advice.reasons.map((r) => (
                    <li key={r} className="flex gap-2 font-sans text-[13px] leading-relaxed text-muted">
                      <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-lime" />
                      {r}
                    </li>
                  ))}
                </ul>
              )}
              {guide.advice.sellStrategy && (
                <p className="mt-3 font-sans text-[13px] leading-relaxed text-leaf-dark">{guide.advice.sellStrategy}</p>
              )}
              {(guide.advice.nextSteps || []).slice(0, 2).length > 0 && (
                <p className="mt-3 font-sans text-[13px] leading-relaxed text-leaf-dark">
                  {guide.advice.nextSteps.slice(0, 2).join(' ')}
                </p>
              )}
              {guide.advice.warning && (
                <p className="mt-3 rounded-[9px] bg-thumb px-3 py-2 font-sans text-[12px] leading-relaxed text-muted">
                  Note: {guide.advice.warning}
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </Panel>
  )
}