export const inputCls =
  'w-full rounded-[10px] border border-line bg-[#fbfcfa] px-3 py-2.5 font-sans text-sm text-ink outline-none focus:border-leaf focus:shadow-[0_0_0_3px_rgba(29,101,79,.12)]'
export const labelCls = 'mb-1 block font-sans text-[11px] uppercase tracking-[.06em] text-muted'

export function Page({ kicker = 'Admin workspace', title, subtitle, actions }) {
  return (
    <header className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-end">
      <div>
        <span className="font-sans text-[11px] font-bold uppercase tracking-[.15em] text-leaf">{kicker}</span>
        <h1 className="mt-2 font-serif text-[clamp(28px,3.8vw,40px)] font-semibold leading-none tracking-[-.05em] text-ink">
          {title}
        </h1>
        {subtitle && <p className="mt-2 max-w-[640px] font-sans text-sm leading-relaxed text-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </header>
  )
}

export function Loader() {
  return <div className="py-12 text-center font-sans text-sm text-muted">Loading…</div>
}

export function Empty({ title = 'Nothing here yet', hint }) {
  return (
    <div className="rounded-2xl border border-dashed border-line bg-white py-14 text-center">
      <p className="font-serif text-lg text-ink">{title}</p>
      {hint && <p className="mt-1 font-sans text-sm text-muted">{hint}</p>}
    </div>
  )
}

export function Badge({ children, tone = 'muted' }) {
  const tones = {
    green: 'bg-[#e8f0c5] text-leaf-dark',
    amber: 'bg-amber-50 text-amber-700',
    red: 'bg-red-50 text-red-700',
    muted: 'bg-paper text-muted',
  }
  return (
    <span className={`inline-block whitespace-nowrap rounded-full px-2 py-0.5 font-sans text-[10px] font-bold ${tones[tone] || tones.muted}`}>
      {children}
    </span>
  )
}

export function Btn({ children, onClick, disabled = false, className = '', tone = 'ghost', submit = false }) {
  const tones = {
    ghost: 'border border-line bg-white text-ink hover:bg-paper',
    green: 'bg-leaf text-white hover:bg-leaf-dark',
    danger: 'border border-red-200 bg-white text-red-600 hover:bg-red-50',
  }
  return (
    <button
      type={submit ? 'submit' : 'button'}
      onClick={onClick}
      disabled={disabled}
      className={`rounded-[10px] px-3 py-2 font-sans text-xs font-bold transition disabled:opacity-50 ${tones[tone]} ${className}`}
    >
      {children}
    </button>
  )
}

export function Table({ head, children }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-line bg-white shadow-sm">
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