export function Panel({ children, className = '' }) {
  return (
    <div className={`rounded-[18px] border border-line bg-white p-6 shadow ${className}`}>
      {children}
    </div>
  )
}

export function PanelHead({ title, sub, actions }) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3">
      <div>
        <h2 className="font-serif text-[23px] font-semibold tracking-[-0.04em] text-ink">{title}</h2>
        {sub && <p className="mt-1 font-sans text-xs text-muted">{sub}</p>}
      </div>
      {actions}
    </div>
  )
}
