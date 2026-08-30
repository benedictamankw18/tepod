import { createContext, useContext, useState } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { getUser } from '../lib/auth'
import Sidebar from './Sidebar'

const AdminContext = createContext(null)

export function useAdmin() {
  return useContext(AdminContext)
}

const LINKS = [
  { id: 'overview', label: 'Overview', to: '/admin' },
  { id: 'users', label: 'Users', to: '/admin/users' },
  { id: 'verifications', label: 'Verifications', to: '/admin/verifications' },
  { id: 'crops', label: 'Crops', to: '/admin/crops' },
  { id: 'units', label: 'Units', to: '/admin/units' },
  { id: 'pricing', label: 'Pricing', to: '/admin/pricing' },
  { id: 'user-croptype', label: 'User crops', to: '/admin/user-croptype' },
  { id: 'farms', label: 'Farms', to: '/admin/farms' },
  { id: 'listings', label: 'Listings', to: '/admin/listings' },
  { id: 'banners', label: 'Banners', to: '/admin/banners' },
  { id: 'notifications', label: 'Notifications', to: '/admin/notifications' },
  { id: 'transport', label: 'Transport', to: '/admin/transport' },
  { id: 'transactions', label: 'Transactions', to: '/admin/transactions' },
  { id: 'precommitments', label: 'Pre-commitments', to: '/admin/precommitments' },
  { id: 'settings', label: 'Settings', to: '/admin/settings' },
  { id: 'activity', label: 'Activity', to: '/admin/activity' },
  { id: 'back', label: 'Back to app', to: '/' },
]

export default function AdminShell() {
  const user = getUser()
  const location = useLocation()
  const [toast, setToast] = useState('')

  if (user?.role !== 'admin') {
    return <Navigate to="/" replace />
  }

  const flash = (msg) => {
    setToast('')
    requestAnimationFrame(() => setToast(msg))
  }

  const seg = location.pathname.split('/').filter(Boolean)
  const activeId = seg.length >= 2 ? seg[1] : 'overview'

  return (
    <AdminContext.Provider value={{ flash, toast, setToast }}>
      <div className="flex min-h-screen bg-paper">
        <Sidebar user={user} links={LINKS} activeId={activeId} onNavigate={() => {}} />
        <main className="mx-auto w-full max-w-[1320px] flex-1 px-4 py-6 md:px-8 md:py-7">
          <Outlet />
        </main>
        {toast && (
          <div className="fixed bottom-24 right-6 z-50 max-w-xs rounded-[10px] bg-leaf-dark px-4 py-3.5 font-sans text-xs text-white shadow">
            {toast}
          </div>
        )}
      </div>
    </AdminContext.Provider>
  )
}