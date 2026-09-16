import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import AppShell, { useAppShell } from '../components/AppShell'
import { Panel } from '../components/Panel'
import Chip from '../components/Chip'
import Reveal from '../components/Reveal'
import { getMyFarms, getWeatherGuide } from '../lib/api'
<<<<<<< HEAD
import { weatherIconMeta } from '../lib/weatherIcons'
import { WindIcon } from '../components/icons'
=======
>>>>>>> origin/development

const RISK_META = {
  high: { label: 'High risk', box: 'border-bad/40 bg-bad text-bad-text' },
  medium: { label: 'Some risk', box: 'border-gold/50 bg-gold/25 text-ink' },
  low: { label: 'Low risk', box: 'border-leaf/30 bg-lime-soft text-leaf-dark' },
}

function riskMetaFor(day) {
  if (day.rainSum >= 15 || day.rainProbMax >= 70) return RISK_META.high
  if (day.rainSum >= 5 || day.rainProbMax >= 50) return RISK_META.medium
  return RISK_META.low
}

function dayTitle(dateStr) {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric' })
}

function WeatherContent() {
  const { isFarmer } = useAppShell()
  const [farms, setFarms] = useState(null)
  const [farmId, setFarmId] = useState(null)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!isFarmer) return
    let alive = true
    getMyFarms()
      .then((f) => {
        if (!alive) return
        setFarms(f)
        const all = (f.preHarvest || []).concat(f.postHarvest || [])
        if (all.length && !farmId) setFarmId(all[0].id)
      })
      .catch(() => {})
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFarmer])

  useEffect(() => {
    let alive = true
    setLoading(true)
    setError('')
    getWeatherGuide(farmId)
      .then((d) => alive && setData(d))
      .catch((e) => alive && setError(e.message || 'Could not load the weather guide.'))
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [farmId])

  const risk = data && RISK_META[data.risk.level]
<<<<<<< HEAD
  const todayMeta = data && data.daily && data.daily[0] ? weatherIconMeta(data.daily[0].condition) : null
  const TodayIcon = todayMeta && todayMeta.icon
=======
>>>>>>> origin/development

  return (
    <div className="space-y-5">
      <header>
        <span className="font-sans text-[11px] font-bold uppercase tracking-[.15em] text-leaf">
          AI weather guide
        </span>
        <h1 className="mt-2 font-serif text-[clamp(28px,3.6vw,40px)] font-semibold leading-none tracking-[-.05em] text-ink">
          Field weather &amp; risk
        </h1>
        <p className="mt-2 max-w-[560px] font-sans text-sm leading-relaxed text-muted">
          A 7-day outlook for your farm with the risk to harvest, spraying and transport — plus advice in plain language.
        </p>
      </header>

      {isFarmer && farms && (farms.preHarvest || []).concat(farms.postHarvest || []).length > 1 && (
        <Panel>
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-sans text-[11px] font-bold uppercase tracking-[.15em] text-muted">Farm</span>
            {(farms.preHarvest || [])
              .concat(farms.postHarvest || [])
              .map((f) => (
                <Chip key={f.id} active={f.id === farmId} onClick={() => setFarmId(f.id)}>
                  {f.name}
                </Chip>
              ))}
          </div>
        </Panel>
      )}

      {loading && (
        <Panel>
          <p className="font-sans text-sm text-muted">Checking the sky over your farm…</p>
        </Panel>
      )}

      {!loading && error && !data && (
        <Panel>
          <p className="font-sans text-sm text-bad-text">{error}</p>
          <Link
            to={isFarmer ? '/farms' : '/settings'}
            className="mt-3 inline-block rounded-[10px] bg-leaf px-4 py-2.5 font-sans text-xs font-bold text-white transition hover:bg-leaf-dark"
          >
            {isFarmer ? 'Add a farm location' : 'Set your location'}
          </Link>
        </Panel>
      )}

      {!loading && data && data.daily && (
        <>
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.35fr),minmax(0,.65fr)]">
            <div className={`relative overflow-hidden rounded-[18px] border p-6 ${risk.box}`}>
              <span className="font-sans text-[11px] font-bold uppercase tracking-[.15em]">
                {data.farm && data.farm.name ? data.farm.name : 'Outlook'} · {data.risk.level === 'high' ? 'take cover' : data.risk.level === 'medium' ? 'plan around the rain' : 'clear sailing'}
              </span>
<<<<<<< HEAD
              <div className="mt-2 flex items-center gap-3">
                {TodayIcon && <TodayIcon className={`h-8 w-8 shrink-0 ${todayMeta.color}`} />}
                <div>
                  <h2 className="font-serif text-2xl font-semibold leading-tight tracking-[-.04em]">
                    {risk.label} over the next two days
                  </h2>
                  {todayMeta && (
                    <p className="mt-0.5 font-sans text-[13px] capitalize text-muted">
                      {data.daily[0].condition} today · {data.daily[0].tMin}°–{data.daily[0].tMax}°
                    </p>
                  )}
                </div>
              </div>
=======
              <h2 className="mt-2 font-serif text-2xl font-semibold leading-tight tracking-[-.04em]">
                {risk.label} over the next two days
              </h2>
>>>>>>> origin/development
              {data.risk.reasons && data.risk.reasons.length > 0 && (
                <ul className="mt-3 space-y-1.5">
                  {data.risk.reasons.map((r) => (
                    <li key={r} className="flex gap-2 font-sans text-[13px] leading-relaxed">
                      <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-current opacity-60" />
                      {r}
                    </li>
                  ))}
                </ul>
              )}
<<<<<<< HEAD
              {data.bestWindow ? (
                <p className="mt-3 font-sans text-[13px] leading-relaxed">
                  Driest window: <strong>{data.bestWindow.date}</strong> ({data.bestWindow.label}) · {data.bestWindow.chanceOfRain}% chance of rain.
                </p>
              ) : (
                <p className="mt-3 font-sans text-[13px] leading-relaxed text-muted">
                  No dry window in the next 3 days — every day has a real chance of rain.
                </p>
=======
              {data.bestWindow && (
                <p className="mt-3 font-sans text-[13px] leading-relaxed">
                  Driest window: <strong>{data.bestWindow.date}</strong> ({data.bestWindow.label}) · {data.bestWindow.chanceOfRain}% chance of rain.
                </p>
>>>>>>> origin/development
              )}
            </div>

            <div className="space-y-4">
              <Panel className="h-full">
                <h2 className="font-serif text-[19px] font-semibold tracking-[-.04em] text-ink">AI field guidance</h2>
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
              <h2 className="font-serif text-[19px] font-semibold tracking-[-.04em] text-ink">Next 7 days</h2>
              <span className="font-sans text-[11px] text-muted">{data.attribution}</span>
            </div>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-7">
              {data.daily.map((d, i) => {
                const meta = riskMetaFor(d)
                const isBest = data.bestWindow && data.bestWindow.date === d.date
<<<<<<< HEAD
                const wx = weatherIconMeta(d.condition)
                const WxIcon = wx.icon
                const gusty = d.windMax >= 35
=======
>>>>>>> origin/development
                return (
                  <Reveal key={d.date} delay={0.05 + i * 0.05}>
                    <div className={`flex h-full flex-col rounded-[15px] border p-3.5 ${isBest ? 'border-leaf/50 bg-lime-soft/60' : 'border-line bg-surface'}`}>
                      <div className="flex items-center justify-between">
                        <span className="font-sans text-[11px] font-bold uppercase tracking-[.1em] text-ink">
                          {dayTitle(d.date)}
                        </span>
                        {isBest && (
                          <span className="rounded-full bg-leaf px-1.5 py-0.5 font-sans text-[9px] font-bold text-white">
                            driest
                          </span>
                        )}
                      </div>
<<<<<<< HEAD
                      <div className="mt-1.5 flex items-center gap-1.5">
                        <WxIcon className={`h-6 w-6 shrink-0 ${wx.color}`} />
                        <span className={`font-sans text-[11px] capitalize ${gusty ? 'text-muted' : ''}`}>{d.condition}</span>
                        {gusty && (
                          <span
                            className="ml-auto inline-flex items-center gap-0.5 font-sans text-[9px] font-bold uppercase tracking-wide text-slate-500"
                            title={`Wind gusts up to ${d.windMax} km/h`}
                          >
                            <WindIcon className="h-3.5 w-3.5" />
                            {d.windMax}
                          </span>
                        )}
                      </div>
=======
                      <p className="mt-1 font-sans text-[11px] capitalize text-muted">{d.condition}</p>
>>>>>>> origin/development
                      <p className="mt-2 font-serif text-[19px] font-semibold tracking-[-.04em] text-ink">
                        {d.tMin}° – {d.tMax}°
                      </p>
                      <dl className="mt-2 space-y-1 font-sans text-[11px] text-muted">
                        <div className="flex justify-between">
                          <dt>Rain</dt>
                          <dd className="font-semibold text-ink">{d.rainProbMax}% · {d.rainSum}mm</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt>Humidity</dt>
                          <dd className="font-semibold text-ink">{d.humidityAvg}%</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt>Wind</dt>
                          <dd className="font-semibold text-ink">{d.windMax} km/h</dd>
                        </div>
                      </dl>
                      <span className={`mt-auto inline-block w-fit rounded-full px-2 py-0.5 font-sans text-[9px] font-bold ${meta.box}`}>
                        {meta.label}
                      </span>
                    </div>
                  </Reveal>
                )
              })}
            </div>
          </section>

          </>
      )}
    </div>
  )
}

export default function WeatherGuidePage() {
  return (
    <AppShell activeId="weather">
      <WeatherContent />
    </AppShell>
  )
}