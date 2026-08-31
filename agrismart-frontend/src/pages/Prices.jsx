import { useMemo, useState } from 'react'
import AppShell, { useAppShell } from '../components/AppShell'
import { Panel, PanelHead } from '../components/Panel'
import Chip from '../components/Chip'
import PriceForecast from '../components/PriceForecast'
import Empty from '../components/Empty'
import { primaryCropFor } from '../lib/app'
import { useCrops } from '../lib/crops'

function PricesContent() {
  const { user, market } = useAppShell()
  const { crops } = useCrops()
  const [crop, setCrop] = useState(() => primaryCropFor(user))

  const byCrop = useMemo(() => {
    const map = {}
    for (const l of market || []) {
      const key = (l.cropType || '').toLowerCase()
      if (!key) continue
      const price = Number(l.askingPrice)
      if (Number.isNaN(price) || price <= 0) continue
      if (!map[key]) map[key] = { low: Infinity, high: -Infinity, samples: 0, units: new Set() }
      map[key].low = Math.min(map[key].low, price)
      map[key].high = Math.max(map[key].high, price)
      map[key].samples += 1
      if (l.unit) map[key].units.add(l.unit)
    }
    for (const k of Object.keys(map)) {
      map[k].mid = Math.round(((map[k].low + map[k].high) / 2) * 100) / 100
    }
    return map
  }, [market])

  const rows = crops.map((c) => ({ crop: c.id, ...(byCrop[c.id] || {}) })).filter((r) => r.samples)

  return (
    <div className="space-y-5">
      <header>
        <span className="font-sans text-[11px] font-bold uppercase tracking-[.15em] text-leaf">
          Price guide
        </span>
        <h1 className="mt-2 font-serif text-[clamp(28px,3.6vw,40px)] font-semibold leading-none tracking-[-.05em] text-ink">
          Market price signals
        </h1>
        <p className="mt-2 font-sans text-sm text-muted">
          Recent asking prices across active listings, with a three-day forecast for the crop you follow.
        </p>
      </header>

      <Panel>
        <PanelHead title="Follow a crop" sub="Choose a crop to see its trend signal." />
        <div className="flex flex-wrap gap-2">
          {crops.map((c) => (
            <Chip key={c.id} active={c.id === crop} onClick={() => setCrop(c.id)}>
              {c.name}
            </Chip>
          ))}
        </div>
      </Panel>

      <PriceForecast crop={crop} />

      <Panel>
        <PanelHead title="Current prices" sub="Low / mid / high asking prices across open listings." />
        {rows.length === 0 ? (
          <Empty>No active listings to price yet. Check back when growers list produce.</Empty>
        ) : (
          <div className="grid grid-cols-2 gap-3.5 md:grid-cols-3 xl:grid-cols-4">
            {rows.map((r) => (
              <div key={r.crop} className="rounded-[13px] border border-line bg-surface p-3.5">
                <strong className="block font-serif text-[15px] font-semibold capitalize text-ink">
                  {r.crop}
                </strong>
                <p className="mt-1 font-sans text-[11px] text-muted">
                  GHS {r.low} – GHS {r.high} per {[...r.units][0] || 'unit'}
                </p>
                <p className="mt-1 font-sans text-[11px] text-leaf">
                  Mid GHS {r.mid} · {r.samples} listing{r.samples === 1 ? '' : 's'}
                </p>
              </div>
            ))}
          </div>
        )}
      </Panel>
    </div>
  )
}

export default function PricesPage() {
  return (
    <AppShell activeId="prices">
      <PricesContent />
    </AppShell>
  )
}
