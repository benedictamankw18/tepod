import { useState } from 'react'
import { Link } from 'react-router-dom'
import { logout } from '../lib/auth'
import { MenuIcon, ICONS, LogoutIcon } from './icons'

function NavItem({ link, activeId, open }) {
  const Icon = ICONS[link.id]
  const active = activeId === link.id
  const cls = `flex items-center gap-3 rounded-lg px-2.5 py-2 text-[13px] font-normal transition ${
    active ? 'bg-lime text-ink' : 'text-[#c8d9d0] hover:bg-white/10 hover:text-white'
  }`
  const inner = (
    <>
      {Icon && <Icon />}
      {open && <span className="whitespace-nowrap">{link.label}</span>}
    </>
  )
  return (
    <Link
      to={link.to}
      aria-label={link.label}
      title={open ? undefined : link.label}
      className={cls}
    >
      {inner}
    </Link>
  )
}

export default function Sidebar({ user, links = [], activeId, onNavigate, iconOnly = false }) {
  const [open, setOpen] = useState(
    () => !iconOnly && typeof window !== 'undefined' && window.innerWidth >= 768,
  )
  const handleToggle = () => {
    if (iconOnly) return
    setOpen((o) => !o)
  }

  const handleLogout = () => {
    logout()
    window.location.assign('/login')
  }

  return (
    <aside
      className={`sticky top-0 flex h-screen shrink-0 flex-col bg-leaf-dark text-[#eff5e9] transition-[width] duration-200 ${
        open ? 'w-60' : 'w-16'
      }`}
    >
      <div className={`flex items-center ${open ? 'justify-between px-3 py-3' : 'justify-center py-3'}`}>
        {!iconOnly && (
          <button
            onClick={handleToggle}
            className="rounded-lg p-2 text-[#c8d9d0] hover:bg-white/10 hover:text-white"
            aria-label={open ? 'Collapse menu' : 'Expand menu'}
          >
            <MenuIcon />
          </button>
        )}
        {open && (
          <Link to="/" className="flex min-w-0 items-center gap-2.5 px-1">
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-lime font-sans text-sm font-extrabold text-leaf-dark">
              A
            </span>
            <span className="min-w-0">
              <span className="block truncate font-serif text-lg font-bold tracking-tight text-[#eff5e9]">
                AgriSmart
              </span>
              {user?.name && (
                <span className="block truncate text-[11px] text-[#b6cbc0] capitalize">
                  {user.name} · {user.role.replace('_', ' ')}
                </span>
              )}
            </span>
          </Link>
        )}
        {iconOnly && (
          <Link to="/" className="grid h-7 w-7 place-items-center rounded-lg bg-lime font-sans text-sm font-extrabold text-leaf-dark">
            A
          </Link>
        )}
      </div>

      {open && user?.name && (
        <div className="mx-3 mb-2 flex items-center gap-3 rounded-xl border border-white/15 bg-white/5 p-3 text-[#eff5e9]">
          {user.photoUrl ? (
            <img
              src={user.photoUrl}
              alt=""
              className="h-9 w-9 shrink-0 rounded-full border border-white/20 object-cover"
            />
          ) : (
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-lime font-sans text-sm font-bold text-leaf-dark">
              {(user.name || '?').charAt(0).toUpperCase()}
            </span>
          )}
          <span className="min-w-0">
            <span className="block font-sans text-[10px] uppercase tracking-widest text-[#b6cbc0]">
              Signed in as
            </span>
            <span className="mt-0.5 block truncate font-serif text-base font-semibold">{user.name}</span>
          </span>
        </div>
      )}

      <nav
        className={`flex-1 space-y-1 overflow-y-auto ${open ? 'px-3 py-2' : 'px-2 py-2'}`}
        aria-label="Main navigation"
      >
        {links.map((l) => (
          <NavItem key={l.id} link={l} activeId={activeId} onNavigate={onNavigate} open={open} />
        ))}
      </nav>

      {open && (
        <p className="px-4 pb-3 font-sans text-[11px] leading-relaxed text-[#b6cbc0]">
          Better timing. Fairer prices. Less produce lost between harvest and home.
        </p>
      )}

      <div className={`border-t border-white/10 py-2 ${open ? 'px-3' : 'px-2'}`}>
        <button
          onClick={handleLogout}
          aria-label="Log out"
          title={open ? undefined : 'Log out'}
          className="flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-[13px] font-normal text-[#c8d9d0] transition hover:bg-red-500/20 hover:text-red-200"
        >
          <LogoutIcon />
          {open && <span>Log out</span>}
        </button>
      </div>
    </aside>
  )
}