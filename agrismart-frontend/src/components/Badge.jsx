export const BADGE_CLS = {
  ok: 'bg-ok-soft text-ok',
  warn: 'bg-warn-soft text-warn',
  bad: 'bg-bad-soft text-bad-text',
  lime: 'bg-lime-soft text-leaf-dark',
  muted: 'bg-paper text-muted',
}

export default function Badge({ tone = 'muted', className = '', children }) {
  return (
    <span
      className={`inline-block whitespace-nowrap rounded-full px-2 py-0.5 font-sans text-[10px] font-bold uppercase tracking-[0.08em] ${BADGE_CLS[tone]} ${className}`}
    >
      {children}
    </span>
  )
}