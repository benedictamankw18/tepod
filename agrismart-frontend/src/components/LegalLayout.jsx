import { Link } from 'react-router-dom'

export default function LegalLayout({ title, updatedAt, children }) {
  return (
    <div className="min-h-screen bg-paper px-4 py-10">
      <div className="mx-auto w-full max-w-3xl">
        <Link to="/login" className="font-sans text-sm font-medium text-leaf hover:underline">
          ← Back
        </Link>
        <h1 className="mt-3 font-serif text-3xl font-semibold tracking-[-.04em] text-ink">{title}</h1>
        {updatedAt && <p className="mt-1 font-sans text-xs text-muted">Last updated: {updatedAt}</p>}
        <div className="mt-6 space-y-6 rounded-[18px] border border-line bg-white p-6 shadow md:p-8">{children}</div>
      </div>
    </div>
  )
}

export function LSection({ title, children }) {
  return (
    <section>
      <h2 className="font-serif text-xl font-semibold text-ink">{title}</h2>
      <div className="mt-1.5 space-y-2 font-sans text-sm leading-relaxed text-ink">{children}</div>
    </section>
  )
}

export function LList({ items }) {
  return (
    <ul className="list-inside list-disc space-y-1">
      {items.map((it, i) => (
        <li key={i}>{it}</li>
      ))}
    </ul>
  )
}