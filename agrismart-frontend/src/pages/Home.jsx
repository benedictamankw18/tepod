import { useNavigate } from 'react-router-dom'
import { getUser, logout } from '../lib/auth'
import preHarvestImg from '../assets/media/preHarvestManFemale.jpg'

export default function Home() {
  const navigate = useNavigate()
  const user = getUser()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 overflow-hidden">
      <img
        src={preHarvestImg}
        alt=""
        aria-hidden="true"
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div className="absolute inset-0 bg-ink/50" aria-hidden="true" />
      <div className="relative z-10 w-full max-w-md bg-white border border-line rounded-2xl shadow-card p-8">
        <h1 className="text-2xl font-bold text-ink">Welcome, {user?.name || 'farmer'}!</h1>
        <p className="text-muted mt-1">You are signed in to AgriSmart AI.</p>

        <dl className="mt-6 space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted">Role</dt>
            <dd className="font-medium capitalize text-ink">{user?.role}</dd>
          </div>
          {user?.email && (
            <div className="flex justify-between">
              <dt className="text-muted">Email</dt>
              <dd className="font-medium text-ink">{user.email}</dd>
            </div>
          )}
          <div className="flex justify-between">
            <dt className="text-muted">Phone</dt>
            <dd className="font-medium text-ink">{user?.phone}</dd>
          </div>
          {user?.username && (
            <div className="flex justify-between">
              <dt className="text-muted">Username</dt>
              <dd className="font-medium text-ink">{user.username}</dd>
            </div>
          )}
          {user?.buyerType && (
            <div className="flex justify-between">
              <dt className="text-muted">Buyer type</dt>
              <dd className="font-medium capitalize text-ink">{user.buyerType}</dd>
            </div>
          )}
        </dl>

        <button
          onClick={handleLogout}
          className="mt-8 w-full rounded-lg bg-ink py-2.5 text-sm font-semibold text-white hover:bg-leaf-dark"
        >
          Log out
        </button>
      </div>
    </div>
  )
}
