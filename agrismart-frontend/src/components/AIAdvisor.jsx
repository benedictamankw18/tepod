import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAppShell } from './AppShell'
import { Panel } from './Panel'
import { getWeatherGuide, getPriceGuide } from '../lib/api'

const RISK_STYLE = {
  high: 'border-bad/40 bg-bad text-bad-text',
  medium: 'border-gold/50 bg-gold/25 text-ink',
  low: 'border-leaf/30 bg-lime-soft text-leaf-dark',
}

// Compact farmer dashboard card: what the field looks like right now.
export function WeatherRiskCard() {
  const { isFarmer } = useAppShell()
  const [data, setData] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let alive = true
    getWeatherGuide()
      .then((d) => alive && setData(d))
      .catch((e) => alive && setError(e.message || 'Weather is unavailable right now.'))
    return () => {
      alive = false
    }
  }, [])

  const style = data && RISK_STYLE[data.risk.level]

  return (
    <Panel className="h-full">
      <div className="flex items-center justify-between gap-3">
        <span className="font-sans text-[11px] font-bold uppercase tracking-[.15em] text-leaf">AI weather</span>
        <Link to="/weather" className="font-sans text-[11px] font-bold text-leaf hover:underline">
          Full guide →
        </Link>
      </div>

      {error || !data ? (
        <>
          <h2 className="mt-2 font-serif text-[21px] font-semibold tracking-[-.04em] text-ink">
            {error ? 'Weather looks unclear.' : 'Checking the sky…'}
          </h2>
          <p className="mt-1 font-sans text-xs leading-relaxed text-muted">
            {error}
          </p>
          {isFarmer && (
            <Link to="/farms" className="mt-3 inline-block rounded-[9px] bg-leaf px-3 py-1.5 font-sans text-[11px] font-bold text-white hover:bg-leaf-dark">
              Add a farm location
            </Link>
          )}
        </>
      ) : (
        <>
          <h2 className="mt-2 font-serif text-[21px] font-semibold tracking-[-.04em] text-ink">
            {data.farm && data.farm.name ? data.farm.name : 'Your area'} — next two days
          </h2>
          <span className={`mt-2 inline-block rounded-full px-2.5 py-1 font-sans text-[11px] font-bold ${style.box}`}>
            {data.risk.level === 'high' ? 'Rain risk · protect the field' : data.risk.level === 'medium' ? 'Some rain expected' : 'Clear weather ahead'}
          </span>
          {data.risk.reasons && data.risk.reasons.length > 0 && (
            <p className="mt-2 font-sans text-xs leading-relaxed text-muted">{data.risk.reasons[0]}</p>
          )}
          {data.bestWindow && (
            <p className="mt-2 font-sans text-[11px] text-fern">
              Driest window {data.bestWindow.date} · {data.bestWindow.chanceOfRain}% rain
            </p>
          )}
        </>
      )}
    </Panel>
  )
}

function composeVerdict(weather, price) {
  const dir = price && price.trend && price.trend.direction
  const wRisk = weather && weather.risk && weather.risk.level
  const confidence = price && price.confidence && price.confidence.level
  const harvest = weather && weather.farm && weather.farm.expectedHarvestDate
  const soon =
    harvest &&
    Math.round((new Date(`${harvest}T00:00:00Z`) - new Date()) / 864e5) <= 7

  let verdict
  if (!price || !price.available) {
    verdict = 'Add price history for your crop to get a harvest-and-sell recommendation.'
  } else if (dir === 'down' && wRisk === 'high') {
    verdict = 'Sell now — prices are slipping and rain threatens spoilage.'
  } else if (dir === 'down') {
    verdict = 'Sell soon while prices still hold.'
  } else if (dir === 'up' && confidence === 'high') {
    verdict = 'Holding could pay — but line up a committed buyer first.'
  } else if (dir === 'up') {
    verdict = 'Prices are rising; decide quickly before the window closes.'
  } else if (soon && wRisk !== 'low') {
    verdict = 'Harvest is near and rain is coming — bring it in early.'
  } else {
    verdict = 'Steady prices — your main risk is freshness and transport, not price.'
  }

  const reasons = []
  if (price && price.trend && price.available) {
    reasons.push(price.trend.label)
    if (price.forecast && price.forecast.days) {
      const last = price.forecast.days[price.forecast.days.length - 1]
      reasons.push(`Expect around GHS ${Number(last.estimate).toFixed(2)} in the next few days (${confidence} confidence).`)
    }
  } else if (weather && weather.advice) {
    reasons.push(weather.advice.recommendation)
  }
  if (weather && weather.advice && weather.advice.recommendation && reasons.length < 2) {
    reasons.push(weather.advice.recommendation)
  }
  const warning =
    (price && price.advice && price.advice.warning) ||
    (weather && weather.advice && weather.advice.warning) ||
    ''
  return { verdict, reasons: reasons.slice(0, 2), warning }
}

// Farmer dashboard card: one short "harvest vs hold" verdict across weather + price.
export function AIRecommendCard({ crop }) {
  const [plan, setPlan] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let alive = true
    Promise.allSettled([getWeatherGuide(), getPriceGuide(crop)])
      .then(([w, p]) => {
        if (!alive) return
        const weather = w.status === 'fulfilled' && w.value
        const price = p.status === 'fulfilled' && p.value
        setPlan(composeVerdict(weather, price))
      })
      .catch((e) => alive && setError(e.message || 'Could not load your AI recommendation.'))
    return () => {
      alive = false
    }
  }, [crop])

  return (
    <div className="relative h-full overflow-hidden rounded-[18px] bg-leaf-dark p-6 text-white">
      <div className="flex items-center justify-between gap-3">
        <span className="font-sans text-[11px] font-bold uppercase tracking-[.15em] text-lime">AI recommendation</span>
        <span className="rounded-full bg-white/10 px-2 py-0.5 font-sans text-[9px] font-bold text-fern">for {crop}</span>
      </div>
      {error || !plan ? (
        <>
          <h2 className="mt-3 font-serif text-[21px] font-semibold leading-tight tracking-[-.04em]">
            {error ? 'Hold on — we could not reach the guide.' : 'Crunching weather + market…'}
          </h2>
          <p className="mt-1 font-sans text-xs leading-relaxed text-fern">{error}</p>
        </>
      ) : (
        <>
          <h2 className="mt-3 font-serif text-[21px] font-semibold leading-tight tracking-[-.04em]">{plan.verdict}</h2>
          {plan.reasons.length > 0 && (
            <ul className="mt-3 space-y-1.5">
              {plan.reasons.map((r) => (
                <li key={r} className="flex gap-2 font-sans text-xs leading-relaxed text-fern">
                  <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-lime" />
                  {r}
                </li>
              ))}
            </ul>
          )}
          {plan.warning && (
            <p className="mt-3 rounded-[9px] bg-white/10 px-3 py-2 font-sans text-[11px] leading-relaxed text-fog">
              Note: {plan.warning}
            </p>
          )}
        </>
      )}
      <div className="mt-4 flex gap-2">
        <Link to="/weather" className="rounded-[9px] bg-white/10 px-3 py-1.5 font-sans text-[11px] font-bold text-white transition hover:bg-white/20">
          Weather guide
        </Link>
        <Link to="/prices" className="rounded-[9px] bg-lime px-3 py-1.5 font-sans text-[11px] font-bold text-leaf-dark transition hover:bg-lime-soft">
          Price guide
        </Link>
      </div>
    </div>
  )
}