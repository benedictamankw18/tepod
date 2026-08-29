export default function StatCard({ label, value, note, accent }) {
  return (
    <div className="rounded-[18px] border border-line bg-white p-4 shadow">
      <span className="block font-sans text-[11px] uppercase tracking-wider text-muted">{label}</span>
      <strong className="mt-2 block font-serif text-[29px] font-semibold leading-none tracking-[-0.04em] text-ink">
        {value}
      </strong>
      <em className="mt-2 block font-sans text-xs italic" style={{ color: accent || 'var(--leaf)' }}>
        {note}
      </em>
    </div>
  )
}
