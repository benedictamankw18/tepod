export default function PageHead({ kicker, title, sub, actions, className = '' }) {
  return (
    <div className={`flex flex-wrap items-end justify-between gap-3 ${className}`}>
      <div className="min-w-0">
        {kicker && (
          <p className="font-sans text-[11px] font-bold uppercase tracking-[.15em] text-leaf">
            {kicker}
          </p>
        )}
        <h1 className="mt-2 font-serif text-[clamp(28px,3.6vw,40px)] font-semibold leading-none tracking-[-.05em] text-ink">
          {title}
        </h1>
        {sub && (
          <p className="mt-2 max-w-prose font-sans text-sm leading-relaxed text-muted">{sub}</p>
        )}
      </div>
      {actions}
    </div>
  )
}