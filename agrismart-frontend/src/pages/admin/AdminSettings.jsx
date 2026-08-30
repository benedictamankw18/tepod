import { useEffect, useState } from 'react'
import { getCommissionSettings, saveCommissionSettings, getPaymentsSettings, savePaymentsSettings } from '../../lib/api'
import { useAdmin } from '../../components/AdminShell'
import { Page, Btn, Loader, inputCls, labelCls, money } from './_ui'

const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100

// Client-side mirror of the backend computeCommission so the preview updates live.
function commission(tiers, total) {
  if (total == null || total === '' || Number.isNaN(Number(total))) return null
  const amount = Number(total)
  const sorted = tiers.slice().sort((a, b) => Number(a.min) - Number(b.min))
  let tier = sorted[0]
  for (const t of sorted) if (amount >= Number(t.min)) tier = t
  return tier
}

function preview(cfg, total) {
  const amount = Number(total)
  if (!cfg.enabled) return { commission: 0, net: amount }
  let raw
  if (cfg.strategy === 'tiered') {
    const t = commission(cfg.tiers, amount)
    raw = cfg.mode === 'percent' ? amount * (Number(t?.value || 0) / 100) : Number(t?.value || 0)
  } else {
    raw = cfg.mode === 'percent' ? amount * ((Number(cfg.flatValue) || 0) / 100) : (Number(cfg.flatValue) || 0)
  }
  const fee = round2(Math.max(0, raw))
  return { commission: fee, net: round2(Math.max(0, amount - fee)) }
}

const SAMPLES = [250, 800, 1500, 2500, 3500, 8000]
const blank = { enabled: false, mode: 'percent', strategy: 'flat', flatValue: 0, tiers: [] }
const blankPayments = { escrowEnabled: false, provider: 'paystack', currency: 'GHS', payoutMode: 'auto', depositPercent: 30 }

export default function AdminSettings() {
  const { flash } = useAdmin()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [cfg, setCfg] = useState(blank)
  const [pay, setPay] = useState(blankPayments)
  const [payBusy, setPayBusy] = useState(false)

  useEffect(() => {
    getCommissionSettings()
      .then((r) => setCfg({ ...blank, ...r.config, tiers: r.config?.tiers || [] }))
      .catch((e) => setError(e.message))
    getPaymentsSettings()
      .then((r) => setPay({ ...blankPayments, ...r.config }))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  const set = (patch) => setCfg((c) => ({ ...c, ...patch }))
  const setTier = (i, patch) => setCfg((c) => ({ ...c, tiers: c.tiers.map((t, j) => (j === i ? { ...t, ...patch } : t)) }))
  const addTier = () => {
    const last = [...cfg.tiers].sort((a, b) => Number(a.min) - Number(b.min)).pop()
    setCfg((c) => ({ ...c, tiers: [...c.tiers, { min: (Number(last?.min) || 0) + 1000, value: 0 }] }))
  }
  const removeTier = (i) => setCfg((c) => ({ ...c, tiers: c.tiers.filter((_, j) => j !== i) }))

  const save = async () => {
    setBusy(true)
    setError('')
    try {
      await saveCommissionSettings({
        enabled: cfg.enabled,
        mode: cfg.mode,
        strategy: cfg.strategy,
        flatValue: cfg.flatValue === '' ? 0 : Number(cfg.flatValue) || 0,
        tiers: cfg.tiers.map((t) => ({ min: t.min === '' ? 0 : Number(t.min) || 0, value: t.value === '' ? 0 : Number(t.value) || 0 })),
      })
      flash('Commission settings saved.')
      getCommissionSettings()
        .then((r) => setCfg({ ...blank, ...r.config, tiers: r.config?.tiers || [] }))
        .catch(() => {})
    } catch (err) {
      setError(err.message || 'Could not save commission settings.')
    } finally {
      setBusy(false)
    }
  }

  const savePayments = async () => {
    setPayBusy(true)
    setError('')
    try {
      await savePaymentsSettings({
        escrowEnabled: pay.escrowEnabled,
        depositPercent: pay.depositPercent === '' ? 0 : Number(pay.depositPercent) || 0,
        payoutMode: pay.payoutMode,
        currency: pay.currency || 'GHS',
      })
      flash('Payment settings saved.')
      getPaymentsSettings()
        .then((r) => setPay({ ...blankPayments, ...r.config }))
        .catch(() => {})
    } catch (err) {
      setError(err.message || 'Could not save payment settings.')
    } finally {
      setPayBusy(false)
    }
  }

  return (
    <>
      <Page
        title="Settings"
        subtitle="Commission taken from each produce transaction. The buyer pays the full agreed amount; the farmer receives the amount minus commission."
      />

      {error && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 font-sans text-sm text-red-700">{error}</div>
      )}

      {loading ? (
        <Loader />
      ) : (
        <div className="max-w-2xl">
          <div className="grid gap-4 rounded-2xl border border-line bg-white p-5 shadow-sm">
            <label className="flex items-center gap-2 font-sans text-sm text-ink">
              <input type="checkbox" checked={cfg.enabled} onChange={(e) => set({ enabled: e.target.checked })} />
              Enable commission on transactions
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={labelCls}>Mode</label>
                <select className={inputCls} value={cfg.mode} onChange={(e) => set({ mode: e.target.value })}>
                  <option value="percent">Percent (%)</option>
                  <option value="fixed">Fixed (GHS)</option>
                </select>
              </div>
              <div>
                <label className={labelCls}>Strategy</label>
                <select className={inputCls} value={cfg.strategy} onChange={(e) => set({ strategy: e.target.value })}>
                  <option value="flat">Flat — same on every amount</option>
                  <option value="tiered">Tiered — per amount bracket</option>
                </select>
              </div>
            </div>

            {cfg.strategy === 'flat' ? (
              <div>
                <label className={labelCls}>{cfg.mode === 'percent' ? 'Flat percentage' : 'Flat amount (GHS)'}</label>
                <input
                  className={inputCls}
                  type="number"
                  min="0"
                  step={cfg.mode === 'percent' ? '0.1' : '0.01'}
                  value={cfg.flatValue}
                  onChange={(e) => set({ flatValue: e.target.value })}
                  placeholder={cfg.mode === 'percent' ? 'e.g. 3' : 'e.g. 100'}
                />
              </div>
            ) : (
              <div>
                <label className={labelCls}>Tiers — amount from (GHS) to {cfg.mode === 'percent' ? 'percentage' : 'amount (GHS)'}</label>
                <div className="grid gap-2">
                  {cfg.tiers.map((t, i) => (
                    <div key={i} className="flex flex-col gap-2 sm:flex-row sm:items-center">
                      <input
                        className={`${inputCls} sm:flex-1`}
                        type="number"
                        min="0"
                        value={t.min}
                        onChange={(e) => setTier(i, { min: e.target.value })}
                        placeholder="Min amount"
                      />
                      <input
                        className={`${inputCls} sm:flex-1`}
                        type="number"
                        min="0"
                        step={cfg.mode === 'percent' ? '0.1' : '0.01'}
                        value={t.value}
                        onChange={(e) => setTier(i, { value: e.target.value })}
                        placeholder={cfg.mode === 'percent' ? 'Percent' : 'Amount'}
                      />
                      <Btn tone="danger" disabled={cfg.tiers.length === 1} onClick={() => removeTier(i)}>
                        Remove
                      </Btn>
                    </div>
                  ))}
                  <Btn onClick={addTier}>+ Add tier</Btn>
                </div>
                <p className="mt-1 font-sans text-[11px] text-muted">
                  A total uses the last row whose minimum it meets; rows must be in ascending order.
                </p>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Btn tone="green" disabled={busy} onClick={save}>
                {busy ? 'Saving…' : 'Save settings'}
              </Btn>
            </div>
          </div>

          {cfg.enabled && (
            <div className="mt-6 rounded-2xl border border-line bg-white p-5 shadow-sm">
              <h2 className="font-serif text-xl font-semibold text-ink">Preview</h2>
              <p className="mt-1 font-sans text-sm text-muted">
                {cfg.mode === 'percent' ? 'Percent' : 'Fixed'} {cfg.strategy} commission on sample transaction totals.
              </p>
              <div className="mt-3 overflow-x-auto">
                <table className="w-full min-w-[420px] text-left">
                  <thead>
                    <tr className="border-b border-line font-sans text-[11px] uppercase tracking-wider text-muted">
                      <th className="px-3 py-2">Amount</th>
                      <th className="px-3 py-2">Commission</th>
                      <th className="px-3 py-2">Farmer receives</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line font-sans text-sm text-ink">
                    {SAMPLES.map((s) => {
                      const p = preview(cfg, s)
                      return (
                        <tr key={s}>
                          <td className="px-3 py-2">{money(s)}</td>
                          <td className="px-3 py-2">{money(p.commission)}</td>
                          <td className="px-3 py-2 font-semibold">{money(p.net)}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="mt-6 rounded-2xl border border-line bg-white p-5 shadow-sm">
            <h2 className="font-serif text-xl font-semibold text-ink">Payments &amp; escrow</h2>
            <p className="mt-1 font-sans text-sm text-muted">
              Buyers pay through Paystack into platform escrow; farmers are paid out when the sale
              completes. Live Paystack keys switch on real money — without them the flow runs simulated.
            </p>

            <label className="mt-4 flex items-center gap-2 font-sans text-sm text-ink">
              <input
                type="checkbox"
                checked={pay.escrowEnabled}
                onChange={(e) => setPay((p) => ({ ...p, escrowEnabled: e.target.checked }))}
              />
              Enable escrow (hold buyer payments, release on delivery)
            </label>

            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <div>
                <label className={labelCls}>Deposit floor (%)</label>
                <input
                  className={inputCls}
                  type="number"
                  min="0"
                  max="100"
                  value={pay.depositPercent}
                  onChange={(e) => setPay((p) => ({ ...p, depositPercent: e.target.value }))}
                  placeholder="e.g. 30"
                />
              </div>
              <div>
                <label className={labelCls}>Payout</label>
                <select
                  className={inputCls}
                  value={pay.payoutMode}
                  onChange={(e) => setPay((p) => ({ ...p, payoutMode: e.target.value }))}
                >
                  <option value="auto">Auto — release on completion</option>
                  <option value="manual">Manual — admin initiates</option>
                </select>
              </div>
              <div>
                <label className={labelCls}>Provider</label>
                <input className={inputCls} value={pay.provider} readOnly />
              </div>
            </div>

            <div className="mt-4 flex justify-end">
              <Btn tone="green" disabled={payBusy} onClick={savePayments}>
                {payBusy ? 'Saving…' : 'Save payment settings'}
              </Btn>
            </div>
          </div>
        </div>
      )}
    </>
  )
}