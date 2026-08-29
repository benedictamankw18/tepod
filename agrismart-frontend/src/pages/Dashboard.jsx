import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import AppShell, { useAppShell } from '../components/AppShell'
import StatCard from '../components/StatCard'
import { Panel } from '../components/Panel'
import PriceSignal from '../components/PriceSignal'
import Empty from '../components/Empty'
import { getMyFarms, getFarmerCommitments } from '../lib/api'
import { primaryCropFor, useCurrentPrice } from '../lib/app'

function DashboardContent() {
  const { user, isFarmer, isAdmin, isBuyer, market, refreshMarket, flashToast } = useAppShell()
  const navigate = useNavigate()
  const price = useCurrentPrice(primaryCropFor(user))
  const [farms, setFarms] = useState(null)
  const [commitments, setCommitments] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!isFarmer) return
    let alive = true
    Promise.all([getMyFarms(), getFarmerCommitments(user.id)])
      .then(([f, c]) => {
        if (!alive) return
        setFarms(f)
        setCommitments(c)
      })
      .catch((e) => alive && setError(e.message))
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.id, isFarmer])

  const openListings = market || []
  const ownOpenCount = (market || []).filter((l) => String(l.farmerId) === String(user.id)).length
  const offers = (commitments || []).filter((c) => c.status === 'pending').length
  const farmCount = farms ? farms.preHarvest.length + farms.postHarvest.length : null
  const avgPrice = price && price.averagePrice != null ? `GHS ${price.averagePrice}` : '—'

  const firstName = (user?.name || '').trim().split(/\s+/)[0] || (isFarmer ? 'Ama' : 'Kwame')

  const requestSupport = () => flashToast('Support request noted. A field facilitator will contact you.')

  return (
    <div className="space-y-6">
      {!isBuyer && (
        <header className="mb-2 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <span className="font-sans text-[11px] font-bold uppercase tracking-[.15em] text-leaf">
              {user?.location ? `${user.location} · ` : ''}Pilot workspace
            </span>
            <h1 className="mt-2 font-serif text-[clamp(30px,4.2vw,46px)] font-semibold leading-none tracking-[-.05em] text-ink">
              Good morning, {firstName}.
            </h1>
            <p className="mt-2 max-w-[580px] font-sans text-sm leading-relaxed text-muted">
              {isFarmer
                ? 'See what is moving near you, and turn your next harvest into a confirmed sale.'
                : 'Find reliable produce, make an offer, and keep your next delivery predictable.'}
            </p>
          </div>
          <div className="flex shrink-0 gap-2">
            <button
              type="button"
              onClick={refreshMarket}
              className="rounded-[10px] border border-line bg-white px-4 py-2.5 font-sans text-xs font-bold text-ink transition hover:bg-paper"
            >
              Refresh
            </button>
            {isAdmin && (
              <Link
                to="/admin/banners"
                className="rounded-[10px] bg-leaf px-4 py-2.5 font-sans text-xs font-bold text-white transition hover:bg-leaf-dark"
              >
                Manage banners
              </Link>
            )}
            {isFarmer && (
              <button
                type="button"
                onClick={() => navigate('/marketplace?create=1')}
                className="rounded-[10px] bg-leaf px-4 py-2.5 font-sans text-xs font-bold text-white transition hover:bg-leaf-dark"
              >
                + New listing
              </button>
            )}
          </div>
        </header>
      )}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 font-sans text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="mt-5 grid items-start gap-5 lg:grid-cols-[minmax(0,1.45fr),minmax(300px,.75fr)]">
        <div className="space-y-5">
          {isFarmer ? (
            <>
              <section className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Your summary">
                <StatCard label="Open listings" value={ownOpenCount} note="in the market now" />
                <StatCard label="Offers received" value={offers} note="waiting for a response" />
                <StatCard label="Market price" value={avgPrice} note={`${primaryCropFor(user)} / unit`} />
                <StatCard label="Your farms" value={farmCount == null ? '…' : farmCount} note="pre and post harvest" />
              </section>

              <div className="grid gap-3 sm:grid-cols-2">
                <QuickLink to="/marketplace" title="Market place" sub="Browse produce and create listings." />
                <QuickLink to="/activity" title="My activity" sub="Review buyer commitments on your harvest." />
                <QuickLink to="/farms" title="My farms" sub="Manage pre and post-harvest farms." />
                <QuickLink to="/prices" title="Price guide" sub="See the latest market signals." />
              </div>
            </>
          ) : (
            <div className="space-y-5">
              <Panel>
                <h2 className="font-serif text-[23px] font-semibold tracking-[-.04em] text-ink">
                  Good morning, {firstName}.
                </h2>
                <p className="mt-1 font-sans text-sm text-muted">
                  Discover fresh produce from nearby growers and lock in your order.
                </p>
                <Link
                  to="/marketplace"
                  className="mt-4 inline-block rounded-[10px] bg-leaf px-4 py-2.5 font-sans text-sm font-bold text-white transition hover:bg-leaf-dark"
                >
                  Browse the market
                </Link>
              </Panel>

              {!user?.verified && (
                <Panel className="border-leaf/40">
                  <h2 className="font-serif text-[23px] font-semibold tracking-[-.04em] text-ink">
                    Finish setting up your buyer account
                  </h2>
                  <p className="mt-1 font-sans text-sm text-muted">
                    Verify your buyer profile before you can place an order.
                  </p>
                  <Link
                    to="/verify"
                    className="mt-4 inline-block rounded-[10px] bg-leaf px-4 py-2.5 font-sans text-sm font-bold text-white transition hover:bg-leaf-dark"
                  >
                    Verify my profile
                  </Link>
                </Panel>
              )}

              <div className="rounded-[10px] border border-line bg-[#fbfcfa] px-4 py-3.5">
                <Empty>Your order history and saved favourites live on the Market place page.</Empty>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-5">
          <PriceSignal crop={primaryCropFor(user)} />
          <Panel>
            <h2 className="font-serif text-[19px] font-semibold tracking-[-.04em] text-ink">Need a hand?</h2>
            <p className="mb-3 mt-1 font-sans text-[13px] leading-relaxed text-muted">
              Ask about listings, offers, payments, or transport on the Support page.
            </p>
            <button
              type="button"
              onClick={requestSupport}
              className="rounded-[10px] bg-[#e8f0c5] px-4 py-2.5 font-sans text-xs font-bold text-leaf-dark transition hover:bg-lime"
            >
              Request support
            </button>
          </Panel>
        </div>
      </div>
    </div>
  )
}

function QuickLink({ to, title, sub }) {
  return (
    <Link to={to} className="rounded-[18px] border border-line bg-white p-5 shadow transition hover:border-leaf">
      <h3 className="font-serif text-[19px] font-semibold tracking-[-.04em] text-ink">{title}</h3>
      <p className="mt-1 font-sans text-xs text-muted">{sub}</p>
    </Link>
  )
}

export default function DashboardPage() {
  return (
    <AppShell activeId="dashboard">
      <DashboardContent />
    </AppShell>
  )
}
