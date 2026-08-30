export default function Empty({ children, title, hint, action }) {
  return (
    <div className="py-10 text-center">
      {title && <p className="font-serif text-lg text-ink">{title}</p>}
      <p className="mt-1 font-sans text-[13px] text-muted">{children}</p>
      {hint && <p className="mt-1 font-sans text-xs text-muted">{hint}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}