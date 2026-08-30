export { inputCls, labelCls } from '../../lib/ui'

import PageHead from '../../components/PageHead'
import Button from '../../components/Button'

export function Page({ kicker = 'Admin workspace', title, subtitle, actions }) {
  return (
    <div className="mb-6">
      <PageHead kicker={kicker} title={title} sub={subtitle} actions={actions} />
    </div>
  )
}

export function Loader() {
  return <div className="py-12 text-center font-sans text-sm text-muted">Loading…</div>
}

export function Empty({ title = 'Nothing here yet', hint }) {
  return (
    <div className="rounded-card border border-dashed border-line bg-white py-14 text-center">
      <p className="font-serif text-lg text-ink">{title}</p>
      {hint && <p className="mt-1 font-sans text-sm text-muted">{hint}</p>}
    </div>
  )
}

export function Badge({ children, tone = 'muted' }) {
  const tones = {
    green: 'bg-lime-soft text-leaf-dark',
    amber: 'bg-warn-soft text-warn',
    red: 'bg-bad-soft text-bad-text',
    muted: 'bg-paper text-muted',
  }
  return (
    <span
      className={`inline-block whitespace-nowrap rounded-full px-2 py-0.5 font-sans text-[10px] font-bold uppercase tracking-[0.08em] ${tones[tone] || tones.muted}`}
    >
      {children}
    </span>
  )
}

const BTN_TONES = { ghost: 'secondary', green: 'primary', danger: 'danger' }

export function Btn({ children, onClick, disabled = false, className = '', tone = 'ghost', submit = false }) {
  return (
    <Button
      type={submit ? 'submit' : 'button'}
      onClick={onClick}
      disabled={disabled}
      variant={BTN_TONES[tone] || 'secondary'}
      size="sm"
      className={className}
    >
      {children}
    </Button>
  )
}

export function Table({ head, children }) {
  return (
    <div className="overflow-x-auto rounded-card border border-line bg-white shadow">
      <table className="w-full min-w-[760px] text-left">
        <thead>
          <tr className="border-b border-line bg-paper/60 font-sans text-[11px] uppercase tracking-wider text-muted">
            {head.map((h) => (
              <th key={h} className="px-4 py-3">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line font-sans text-sm text-ink">{children}</tbody>
      </table>
    </div>
  )
}

export function Td({ children, className = '' }) {
  return <td className={`px-4 py-3 align-middle ${className}`}>{children}</td>
}

export function money(v) {
  const n = Number(v)
  return Number.isFinite(n) ? `GHS ${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}` : '—'
}

export function dateOnly(iso) {
  return iso ? new Date(iso).toISOString().slice(0, 10) : '—'
}

export function shortId(id = '') {
  return id ? `${id.slice(0, 8)}…` : '—'
}