import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getSummary } from '../../lib/api'
import { Page, Loader } from './_ui'
import StatCard from '../../components/StatCard'

const CARDS = [
  { label: 'Users', key: 'users', to: '/admin/users', note: 'registered accounts' },
  { label: 'Listings', key: 'listings', to: '/admin/listings', note: 'total listed' },
  { label: 'Open listings', key: 'openListings', to: '/admin/listings', note: 'currently live' },
  { label: 'Pre-commitments', key: 'preCommitments', to: '/admin/precommitments', note: 'offers from buyers' },
  { label: 'Transactions', key: 'transactions', to: '/admin/transactions', note: 'sale agreements' },
  { label: 'Overdue payments', key: 'overduePayments', to: '/admin/transactions', note: 'needs follow-up', accent: 'red' },
  { label: 'Transport requests', key: 'transportRequests', to: '/admin/transport', note: 'shared pickups' },
  { label: 'Notifications sent', key: 'notificationsSent', to: '/admin/notifications', note: 'sms / in-app' },
]

export default function AdminOverview() {
  const [summary, setSummary] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    getSummary().then(setSummary).catch((e) => setError(e.message))
  }, [])

  return (
    <>
      <Page
        title="Overview"
        subtitle="A high-level snapshot of activity on the platform. Tap a card to open its management section."
      />

      {error && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 font-sans text-sm text-red-700">
          {error}
        </div>
      )}

      {!summary ? (
        <Loader />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {CARDS.map((c) => (
            <Link
              key={c.key}
              to={c.to}
              className="block transition hover:-translate-y-0.5 hover:shadow-md"
              aria-label={`Manage ${c.label.toLowerCase()}`}
            >
              <StatCard label={c.label} value={summary[c.key] ?? 0} note={c.note} accent={c.accent} />
            </Link>
          ))}
        </div>
      )}
    </>
  )
}