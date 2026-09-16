export default function Chip({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3 py-1.5 font-sans text-xs font-semibold capitalize transition ${
        active
          ? 'border-leaf bg-leaf text-white'
          : 'border-line bg-white text-muted hover:border-leaf hover:text-leaf'
      }`}
    >
      {children}
    </button>
  )
}
