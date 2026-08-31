import { Link } from 'react-router-dom'
import { ICONS } from './icons'
import navBg from '../assets/media/infrontMaizeFarm.jpg'

// Mobile bottom navigation for buyer accounts: the same icon-only destination
// links live in a fixed bar pinned to the bottom edge on phones. On md+ screens
// the links sit in the strip under the top brand bar (see HorizontalNav), so
// this bar is hidden there.
export default function BottomNav({ links = [], activeId }) {
  if (!links.length) return null
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 bg-leaf-dark pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_16px_rgba(15,40,34,0.25)] md:hidden"
      aria-label="Main navigation"
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <img src={navBg} alt="" className="h-full w-full object-cover opacity-20" />
        <div className="absolute inset-0 bg-leaf-dark/85" />
      </div>
      <div className="relative z-10 flex h-16 items-center gap-1 overflow-x-auto px-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {links.map((l) => {
          const Icon = ICONS[l.id]
          const active = activeId === l.id
          return (
            <Link
              key={l.id}
              to={l.to}
              title={l.label}
              aria-label={l.label}
              className={`grid h-10 w-12 shrink-0 place-items-center rounded-lg transition ${
                active ? 'bg-lime text-ink' : 'text-fern hover:bg-white/10 hover:text-white'
              }`}
            >
              {Icon && <Icon />}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}