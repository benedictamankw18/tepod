import { Link } from 'react-router-dom'
import { logout } from '../lib/auth'
import { ICONS, LogoutIcon } from './icons'
import logo from '../assets/media/logo.jpeg'
import navBg from '../assets/media/infrontMaizeFarm.jpg'
import NotificationBell from './NotificationBell'

// Horizontal icon-only navigation bar, used for buyer accounts.
export default function HorizontalNav({ links = [], activeId }) {
  return (
    <header className="relative sticky top-0 z-30 flex items-center justify-between gap-2 bg-leaf-dark px-3 py-2 text-fog shadow">
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <img src={navBg} alt="" className="h-full w-full object-cover opacity-20" />
        <div className="absolute inset-0 bg-leaf-dark/85" />
        <div className="absolute inset-0 bg-gradient-to-b from-leaf-dark/10 via-transparent to-leaf-dark/40" />
      </div>
      <Link
          to="/"
          title="NKABOM AGRILINK"
          aria-label="NKABOM AGRILINK"
          className="relative z-10 grid h-9 w-9 shrink-0 place-items-center rounded-lg transition hover:opacity-90 sm:h-10 sm:w-10"
        >
          <img src={logo} alt="" className="h-8 w-8 object-contain" />
        </Link>

      <nav
        className="relative z-10 flex items-center gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        aria-label="Main navigation"
      >
        {links.map((l) => {
          const Icon = ICONS[l.id]
          const active = activeId === l.id
          return (
            <Link
              key={l.id}
              to={l.to}
              title={l.label}
              aria-label={l.label}
              className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg transition sm:h-10 sm:w-10 ${
                active ? 'bg-lime text-ink' : 'text-fern hover:bg-white/10 hover:text-white'
              }`}
            >
              {Icon && <Icon />}
            </Link>
          )
        })}

        <NotificationBell />
         <button
          onClick={() => {
            logout()
            window.location.assign('/login')
          }}
          aria-label="Log out"
          title="Log out"
          className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-fern transition hover:bg-white/10 hover:text-white sm:h-10 sm:w-10"
        >
          <LogoutIcon />
        </button>

      </nav>

    </header>
  )
}