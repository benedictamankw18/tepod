import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import AppShell from '../components/AppShell'
import { Panel } from '../components/Panel'
import Chip from '../components/Chip'
import Reveal from '../components/Reveal'
import { getCropGuide } from '../lib/api'

const MONTHS = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const LEVEL_META = {
  high: { label: 'High demand', box: 'border-bad/40 bg-bad text-bad-text' },
  medium: { label: 'Medium demand', box: 'border-gold/50 bg-gold/25 text-ink' },
  low: { label: 'Low demand', box: 'border-line bg-surface text-muted' },
}

const DIR_META = {
  up: { glyph: '▲', cls: 'text-leaf' },
  steady: { glyph: '▶', cls: 'text-muted' },
  down: { glyph: '▼', cls: 'text-bad-text' },
}

function signPct(n) {
  return `${n > 0 ? '+' : ''}${Number(n).toFixed(1)}%`
}

function DemandContent() {
  const [region, setRegion] = useState('all')
  const [plantMonth, setPlantMonth] = useState('')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [retry, setRetry] = useState(0)

  useEffect(() => {
    let alive = true
    setLoading(true)
    setError('')
    getCropGuide({ region, plantMonth: plantMonth ? Number(plantMonth) : '' })
      .then((d) => alive && setData(d))
      .catch((e) => alive && setError(e.message || 'Could not load the demand guide.'))
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [region, plantMonth, retry])

  const regions = data ? data.availableRegions || [] : []
  const noRegion = plantMonth && plantMonth !== ''

  return (
    <div className="space-y-5">
      <header>
        <span className="font-sans text-[11px] font-bold uppercase tracking-[.15em] text-leaf">
          AI crop demand guide
        </span>
        <h1 className="mt-2 font-serif text-[clamp(28px,3.6vw,40px)] font-semibold leading-none tracking-[-.05em] text-ink">
          What to plant
        </h1>
        <p className="mt-2 max-w-[560px] font-sans text-sm leading-relaxed text-muted">
          Which crops are selling most right now — ranked from real regional market surveys, plus a seasonal
          check if you share a planting month. The AI reads the same figures you see here.
        </p>
      </header>

      {regions.length > 0 && (
        <Panel>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-sans text-[11px] font-bold uppercase tracking-[.15em] text-muted">Region</span>
              <Chip active={region === 'all'} onClick={() => setRegion('all')}>
                All regions
              </Chip>
              {regions.map((r) => (
                <Chip key={r} active={region === r} onClick={() => setRegion(r)}>
                  {r}
                </Chip>
              ))}
            </div>
            <label className="flex items-center gap-2">
              <span className="font-sans text-[11px] font-bold uppercase tracking-[.15em] text-muted">
                Planting month
              </span>
              <select
                value={plantMonth}
                onChange={(e) => setPlantMonth(e.target.value)}
                className="rounded-[10px] border border-line bg-white px-3 py-1.5 font-sans text-xs font-semibold text-ink outline-none transition focus:border-leaf"
              >
                <option value="">No planting month</option>
                {MONTHS.slice(1).map((m, i) => (
                  <option key={m} value={i + 1}>
                    {m} (plant)
                  </option>
                ))}
              </select>
            </label>
          </div>
        </Panel>
      )}

      {loading && (
        <Panel>
          <p className="font-sans text-sm text-muted">Reading the latest market surveys…</p>
        </Panel>
      )}

      {!loading && error && (
        <Panel>
          <p className="font-sans text-sm text-bad-text">{error}</p>
          <button
            type="button"
            onClick={() => setRetry((n) => n + 1)}
            className="mt-3 rounded-[10px] bg-leaf px-4 py-2.5 font-sans text-xs font-bold text-white transition hover:bg-leaf-dark"
          >
            Try again
          </button>
        </Panel>
      )}

      {!loading && !error && data && !data.available && (
        <Panel>
          <p className="font-sans text-sm text-muted">
            {data.region
              ? `No survey data has been imported for ${data.region} yet — pick another region above.`
              : 'Market survey data has not been imported yet. Check back soon.'}
          </p>
        </Panel>
      )}

      {!loading && !error && data && data.available && data.commodities.length > 0 && (
        <>
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.35fr),minmax(0,.65fr)]">
            <div className="rounded-[18px] border border-line bg-surface p-6">
              <span className="font-sans text-[11px] font-bold uppercase tracking-[.15em] text-ink">
                {data.regionLabel} · surveys {data.observed}
                {noRegion ? ` · planting ${MONTHS[Number(plantMonth)]}` : ''}
              </span>
              <h2 className="mt-2 font-serif text-2xl font-semibold leading-tight tracking-[-.04em] text-ink">
                {data.commodities[0].name} leads demand right now
              </h2>
              <ul className="mt-3 space-y-1.5">
                {data.commodities.slice(0, 3).map((c) => (
                  <li key={c.cropType} className="flex gap-2 font-sans text-[13px] leading-relaxed">
                    <span className={`mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full ${DIR_META[c.direction].cls}`} />
                    {c.name} · {c.demandLevel} demand · {c.price.trendPct > 0 ? 'prices rising' : c.price.trendPct < 0 ? 'prices easing' : 'prices steady'} the last month
                    {c.seasonal ? ` · harvest ${c.seasonal.name} ${signPct(c.seasonal.liftPct)} vs usual` : ''}
                  </li>
                ))}
              </ul>
              <p className="mt-4 font-sans text-[12px] leading-relaxed text-muted">
                Score is 0–100 from recorded momentum, current level vs usual and (when you plan a planting) the
                harvest season — not a guess.
              </p>
            </div>

            <div className="space-y-4">
              <Panel className="h-full">
                <h2 className="font-serif text-[19px] font-semibold tracking-[-.04em] text-ink">AI planting advice</h2>
                <p className="mt-2 font-sans text-[13px] leading-relaxed text-muted">{data.advice.recommendation}</p>
                {data.advice.reasons && data.advice.reasons.length > 0 && (
                  <ul className="mt-3 space-y-1.5">
                    {data.advice.reasons.map((r) => (
                      <li key={r} className="flex gap-2 font-sans text-[12px] leading-relaxed text-muted">
                        <span className="mt-[6px] h-1.5 w-1.5 shrink-0 rounded-full bg-lime" />
                        {r}
                      </li>
                    ))}
                  </ul>
                )}
                {data.advice.nextSteps && data.advice.nextSteps.length > 0 && (
                  <div className="mt-3 rounded-[9px] bg-lime-soft/70 px-3 py-2.5">
                    {data.advice.nextSteps.map((s) => (
                      <p key={s} className="font-sans text-[12px] leading-relaxed text-leaf-dark">{s}</p>
                    ))}
                  </div>
                )}
                {data.advice.warning && (
                  <p className="mt-3 rounded-[9px] bg-thumb px-3 py-2 font-sans text-[12px] leading-relaxed text-muted">
                    Note: {data.advice.warning}
                  </p>
                )}
                <p className="mt-3 font-sans text-[10px] uppercase tracking-[.12em] text-fern/70">
                  {data.advice.source === 'llm' ? 'Explained by our AI guide' : 'AI guide · offline'}
                </p>
              </Panel>
            </div>
          </div>

          <section>
            <div className="mb-3 flex items-end justify-between gap-3">
              <h2 className="font-serif text-[19px] font-semibold tracking-[-.04em] text-ink">Demand by crop</h2>
              <span className="font-sans text-[11px] text-muted">{data.attribution}</span>
            </div>
            <div className="space-y-3">
              {data.commodities.map((c, i) => {
                const level = LEVEL_META[c.demandLevel] || LEVEL_META.low
                const dir = DIR_META[c.direction] || DIR_META.steady
                return (
                  <Reveal key={c.cropType} delay={0.04 * i}>
                    <div className="rounded-[15px] border border-line bg-surface p-4">
                      <div className="flex items-start gap-3 sm:gap-4">
                        <span className="mt-0.5 text-2xl" aria-hidden="true">
                          {c.emoji || '🌱'}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-serif text-[17px] font-semibold tracking-[-.03em] text-ink">
                              {c.name}
                            </h3>
                            <span className={`rounded-full border px-2 py-0.5 font-sans text-[10px] font-bold ${level.box}`}>
                              {level.label}
                            </span>
                            <span className={`font-sans text-[11px] font-bold ${dir.cls}`} aria-label={`prices ${c.direction}`}>
                              {dir.glyph}
                            </span>
                          </div>
                          <dl className="mt-2 flex flex-wrap gap-x-4 gap-y-1 font-sans text-[12px] text-muted">
                            <div className="flex gap-1"><dt className="font-bold text-ink">Score</dt><dd>{c.score}/100</dd></div>
                            <div className="flex gap-1"><dt className="font-bold text-ink">Now</dt><dd>GH₵{c.price.avg.toFixed(2)}/kg</dd></div>
                            <div className="flex gap-1"><dt className="font-bold text-ink">Last month</dt><dd>{signPct(c.price.trendPct)}</dd></div>
                            <div className="flex gap-1"><dt className="font-bold text-ink">Vs usual</dt><dd>{signPct(c.price.levelPct)}</dd></div>
                            {c.seasonal && (
                              <div className="flex gap-1">
                                <dt className="font-bold text-ink">Harvest {c.seasonal.name}</dt>
                                <dd>{signPct(c.seasonal.liftPct)} vs usual</dd>
                              </div>
                            )}
                            {c.areaTrend && (
                              <div className="flex gap-1">
                                <dt className="font-bold text-ink">Area</dt>
                                <dd>{signPct(c.areaTrend.pct)} since 2019</dd>
                              </div>
                            )}
                          </dl>
                          <ul className="mt-2.5 space-y-1 font-sans text-[12px] leading-relaxed text-muted">
                            {c.drivers.map((d) => (
                              <li key={d} className="flex gap-2">
                                <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-fern" />
                                {d}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  </Reveal>
                )
              })}
            </div>
          </section>

          <Panel>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="font-serif text-[16px] font-semibold tracking-[-.03em] text-ink">How this is read</h2>
                <p className="mt-1 max-w-[560px] font-sans text-[12px] leading-relaxed text-muted">
                  Demand here means recorded retail prices in {data.regionLabel} between {data.observed}, compared
                  crop-by-crop with their own seasonal average, plus national planting statistics. It shows which
                  crops buyers are paying most for — treat it as guidance, not a guarantee.
                </p>
              </div>
              <Link
                to="/prices"
                className="shrink-0 rounded-[10px] border border-leaf px-4 py-2.5 font-sans text-xs font-bold text-leaf transition hover:bg-leaf hover:text-white"
              >
                View price analysis →
              </Link>
            </div>
          </Panel>
        </>
      )}
    </div>
  )
}

export default function CropDemandPage() {
  return (
    <AppShell activeId="demand">
      <DemandContent />
    </AppShell>
  )
}