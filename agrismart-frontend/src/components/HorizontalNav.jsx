import { Link } from 'react-router-dom'
import { logout } from '../lib/auth'
import { ICONS, LogoutIcon } from './icons'

// Horizontal icon-only navigation bar, used for buyer accounts.
export default function HorizontalNav({ links = [], activeId }) {
  return (
    <header className="sticky top-0 z-30 flex items-center justify-between gap-2 bg-leaf-dark px-3 py-2 text-[#eff5e9] shadow">
      <div className="flex items-center gap-1">
      
      <Link
          to="/"
          title="AgriSmart"
          aria-label="AgriSmart"
          className="grid h-10 w-10 place-items-center rounded-lg bg-lime font-sans text-sm font-extrabold text-leaf-dark transition hover:opacity-90"
        >
          A
        </Link>
        </div>
       
      
      <nav className="flex items-center gap-1" aria-label="Main navigation">
        {links.map((l) => {
          const Icon = ICONS[l.id]
          const active = activeId === l.id
          return (
            <Link
              key={l.id}
              to={l.to}
              title={l.label}
              aria-label={l.label}
              className={`grid h-10 w-10 place-items-center rounded-lg transition ${
                active ? 'bg-lime text-ink' : 'text-[#c8d9d0] hover:bg-white/10 hover:text-white'
              }`}
            >
              {Icon && <Icon />}
            </Link>
          )
        })}
        
         <button
          onClick={() => {
            logout()
            window.location.assign('/login')
          }}
          aria-label="Log out"
          title="Log out"
          className="grid h-10 w-10 place-items-center rounded-lg text-[#c8d9d0] transition hover:bg-red-500/20 hover:text-red-200"
        >
          <LogoutIcon />
        </button>

      </nav>
            
    </header>
  )
}