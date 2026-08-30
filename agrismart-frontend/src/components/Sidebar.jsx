import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { logout } from '../lib/auth'
import { MenuIcon, ArrowLeftIcon, ICONS, LogoutIcon } from './icons'
import logo from '../assets/media/logo.jpeg'
import navBg from '../assets/media/infrontMaizeFarm.jpg'
import NotificationBell from './NotificationBell'

const BACKDROP_CLS =
  'pointer-events-none absolute inset-0 overflow-hidden'

// Subtle textural field photo under a dark leaf overlay, so the nav stays legible.
function Backdrop() {
  return (
    <div className={BACKDROP_CLS} aria-hidden="true">
      <img src={navBg} alt="" className="h-full w-full object-cover opacity-20" />
      <div className="absolute inset-0 bg-leaf-dark/85" />
      <div className="absolute inset-0 bg-gradient-to-t from-leaf-dark/60 via-transparent to-transparent" />
    </div>
  )
}

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== 'undefined' && window.innerWidth < 768,
  )
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])
  return isMobile
}

function NavItem({ link, activeId, open, onNavigate }) {
  const Icon = ICONS[link.id]
  const active = activeId === link.id
  const cls = `flex items-center gap-3 rounded-lg px-2.5 py-2 text-[13px] font-normal transition ${
    active ? 'bg-lime text-ink' : 'text-fern hover:bg-white/10 hover:text-white'
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
      onClick={() => onNavigate?.()}
      className={cls}
    >
      {inner}
    </Link>
  )
}

function UserChip({ user, compact = false }) {
  if (!user?.name) return null
  return (
    <div className="mx-3 mb-2 flex items-center gap-3 rounded-xl border border-white/15 bg-white/5 p-3 text-fog">
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
        {!compact && (
          <span className="block font-sans text-[10px] uppercase tracking-widest text-moss">
            Signed in as
          </span>
        )}
        <span className="mt-0.5 block truncate font-serif text-base font-semibold">{user.name}</span>
      </span>
    </div>
  )
}

export default function Sidebar({ user, links = [], activeId, onNavigate, iconOnly = false }) {
  const [open, setOpen] = useState(
    () => !iconOnly && typeof window !== 'undefined' && window.innerWidth >= 768,
  )
  const [drawerOpen, setDrawerOpen] = useState(false)
  const isMobile = useIsMobile()
  const handleToggle = () => {
    if (iconOnly) return
    setOpen((o) => !o)
  }
  const handleLogout = () => {
    logout()
    window.location.assign('/login')
  }
  const closeDrawer = () => setDrawerOpen(false)

  // On phones the sidebar becomes a sticky top bar with an off-canvas drawer so
  // nav never steals width from the content. On md+ it's the classic rail.
  if (isMobile) {
    return (
      <>
        <header className="relative sticky top-0 z-40 flex items-center justify-between gap-2 bg-leaf-dark px-3 py-2 text-fog shadow md:hidden">
          <Backdrop />
          <div className="relative z-10 flex items-center gap-1">
            <button
              onClick={() => setDrawerOpen(true)}
              aria-label="Open menu"
              className="grid h-9 w-9 place-items-center rounded-lg text-fern transition hover:bg-white/10 hover:text-white"
            >
              <MenuIcon />
            </button>
            <Link
              to="/"
              aria-label="NKABOM AGRILINK"
              className="grid h-9 w-9 place-items-center rounded-lg transition hover:opacity-90"
            >
              <img src={logo} alt="" className="h-8 w-8 object-contain" />
            </Link>
          </div>
          <div className="relative z-10">
            <NotificationBell iconSize="h-8 w-8" />
          </div>
        </header>

        {drawerOpen && (
          <div className="modal-overlay-in fixed inset-0 z-40 bg-ink/40 md:hidden" onClick={closeDrawer} aria-hidden="true" />
        )}

        <aside
          className={`fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] flex-col overflow-hidden bg-leaf-dark text-fog shadow-2xl transition-transform duration-mid ease-drawer md:hidden ${
            drawerOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
          aria-label="Main navigation"
        >
          <Backdrop />
          <div className="relative z-10 flex min-h-0 flex-1 flex-col">
            <div className="flex items-center justify-between px-3 py-3">
              <Link to="/" onClick={closeDrawer} className="flex min-w-0 items-center gap-2.5 p-1">
                <img
                  src={logo}
                  alt="NKABOM AGRILINK logo"
                  className="h-7 w-7 shrink-0 rounded-lg object-contain"
                />
                <span className="min-w-0">
                  <span className="block truncate font-serif text-lg font-bold tracking-tight text-fog">
                    NKABOM AGRILINK
                  </span>
                  {user?.name && (
                    <span className="block truncate text-[11px] text-moss capitalize">
                      {user.name} · {user.role.replace('_', ' ')}
                    </span>
                  )}
                </span>
              </Link>
              <button
                onClick={closeDrawer}
                aria-label="Close menu"
                className="rounded-lg p-2 text-fern transition hover:bg-white/10 hover:text-white"
              >
                <ArrowLeftIcon />
              </button>
            </div>

            <UserChip user={user} />

            <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-2" aria-label="Main navigation">
              {links.map((l) => (
                <NavItem key={l.id} link={l} activeId={activeId} onNavigate={closeDrawer} open />
              ))}
            </nav>

            <div className="border-t border-white/10 px-3 py-2">
              <button
                onClick={handleLogout}
                className="flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-[13px] font-normal text-fern transition hover:bg-white/10 hover:text-white"
              >
                <LogoutIcon />
                <span>Log out</span>
              </button>
            </div>
          </div>
        </aside>
      </>
    )
  }

  return (
    <>
      <div
        aria-hidden="true"
        className={`hidden shrink-0 transition-[width] duration-200 md:block ${open ? 'w-60' : 'w-16'}`}
      />
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex flex-col overflow-hidden bg-leaf-dark text-fog transition-[width] duration-200 ${
          open ? 'w-60' : 'w-16'
        }`}
      >
      <Backdrop />
      <div className="relative z-10 flex min-h-0 flex-1 flex-col">
        <div className={`flex items-center ${open ? 'justify-between px-3 py-3' : 'justify-center py-3'}`}>
          {!iconOnly && (
            <button
              onClick={handleToggle}
              className="rounded-lg p-2 text-fern hover:bg-white/10 hover:text-white"
              aria-label={open ? 'Collapse menu' : 'Expand menu'}
            >
              <MenuIcon />
            </button>
          )}
          {open && (
            <Link to="/" className="flex min-w-0 items-center gap-2.5 px-1">
              <img
                src={logo}
                alt="NKABOM AGRILINK logo"
                className="h-7 w-7 shrink-0 rounded-lg object-contain"
              />
              <span className="min-w-0">
                <span className="block truncate font-serif text-lg font-bold tracking-tight text-fog">
                  NKABOM AGRILINK
                </span>
                {user?.name && (
                  <span className="block truncate text-[11px] text-moss capitalize">
                    {user.name} · {user.role.replace('_', ' ')}
                  </span>
                )}
              </span>
            </Link>
          )}
          {iconOnly && (
            <Link
              to="/"
              aria-label="NKABOM AGRILINK"
              className="grid h-7 w-7 place-items-center rounded-lg"
            >
              <img src={logo} alt="" className="h-7 w-7 object-contain" />
            </Link>
          )}
          {open && <NotificationBell iconSize="h-8 w-8" />}
          {iconOnly && <NotificationBell iconSize="h-8 w-8" className="mt-1" />}
        </div>

        {open && user?.name && <UserChip user={user} />}

        <nav
          className={`flex-1 space-y-1 overflow-y-auto ${open ? 'px-3 py-2' : 'px-2 py-2'}`}
          aria-label="Main navigation"
        >
          {links.map((l) => (
            <NavItem key={l.id} link={l} activeId={activeId} onNavigate={onNavigate} open={open} />
          ))}
        </nav>

        {open && (
          <p className="px-4 pb-3 font-sans text-[11px] leading-relaxed text-moss">
            Better timing. Fairer prices. Less produce lost between harvest and home.
          </p>
        )}

        <div className={`border-t border-white/10 py-2 ${open ? 'px-3' : 'px-2'}`}>
          <button
            onClick={handleLogout}
            aria-label="Log out"
            title={open ? undefined : 'Log out'}
            className="flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-[13px] font-normal text-fern transition hover:bg-white/10 hover:text-white"
          >
            <LogoutIcon />
            {open && <span>Log out</span>}
          </button>
        </div>
      </div>
    </aside>
    </>
  )
}