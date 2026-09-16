import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import AppShell, { useAppShell } from '../components/AppShell'
import StatCard from '../components/StatCard'
import { Panel } from '../components/Panel'
import Empty from '../components/Empty'
import Reveal from '../components/Reveal'
import { WeatherRiskCard, AIRecommendCard } from '../components/AIAdvisor'
import { getMyFarms, getFarmerCommitments, getReceivedReviews } from '../lib/api'
import { primaryCropFor, useCurrentPrice } from '../lib/app'
import { SERVICE_CATEGORIES } from '../lib/services'

function greetingFor(date = new Date()) {
  const h = date.getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

function DashboardContent() {
  const { user, isFarmer, isAdmin, isBuyer, market, refreshMarket, flashToast } = useAppShell()
  const navigate = useNavigate()
  const price = useCurrentPrice(primaryCropFor(user))
  const [farms, setFarms] = useState(null)
  const [commitments, setCommitments] = useState(null)
  const [reviews, setReviews] = useState([])
  const [error, setError] = useState('')

  useEffect(() => {
    if (!isFarmer) return
    let alive = true
    Promise.all([getMyFarms(), getFarmerCommitments(user.id), getReceivedReviews()])
      .then(([f, c, rv]) => {
        if (!alive) return
        setFarms(f)
        setCommitments(c)
        setReviews(Array.isArray(rv) ? rv : [])
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
              {greetingFor()}, {firstName}.
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
        <div className="rounded-lg border border-bad/40 bg-bad px-3 py-2 font-sans text-sm text-bad-text">
          {error}
        </div>
      )}

      <div className="mt-5 grid items-start gap-5 lg:grid-cols-[minmax(0,1.45fr),minmax(300px,.75fr)]">
        <div className="space-y-5">
          {isFarmer ? (
            <>
              <section className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Your summary">
                {[
                  <StatCard key="open" label="Open listings" value={ownOpenCount} note="in the market now" />,
                  <StatCard key="offers" label="Offers received" value={offers} note="waiting for a response" />,
                  <StatCard key="price" label="Market price" value={avgPrice} note={`${primaryCropFor(user)} / unit`} />,
                  <StatCard key="farms" label="Your farms" value={farmCount == null ? '…' : farmCount} note="pre and post harvest" />,
                ].map((card, i) => (
                  <Reveal key={card.key} delay={0.08 + i * 0.07}>
                    {card}
                  </Reveal>
                ))}
              </section>

              <div className="grid gap-3 lg:grid-cols-2">
                <WeatherRiskCard />
                <AIRecommendCard crop={primaryCropFor(user)} />
              </div>

              <Panel>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="font-serif text-[19px] font-semibold tracking-[-.04em] text-ink">
                      What do you need today?
                    </h2>
                    <p className="mt-1 font-sans text-xs text-muted">
                      Loans, inputs, equipment, transport or storage — we connect you with verified providers.
                    </p>
                  </div>
                  <Link
                    to="/services"
                    className="shrink-0 rounded-[10px] bg-leaf px-4 py-2.5 text-center font-sans text-xs font-bold text-white transition hover:bg-leaf-dark"
                  >
                    Explore services →
                  </Link>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-6">
                  {SERVICE_CATEGORIES.map((s) => (
                    <Link
                      key={s.id}
                      to="/services"
                      className="rounded-[12px] border border-line bg-white px-2 py-2.5 text-center font-sans text-[11px] font-semibold text-ink transition hover:border-leaf hover:text-leaf"
                    >
                      <span className="block text-lg" aria-hidden="true">
                        {s.emoji}
                      </span>
                      {s.label}
                    </Link>
                  ))}
                </div>
              </Panel>

              <div className="grid gap-3 sm:grid-cols-2">
                <QuickLink to="/marketplace" title="Market place" sub="Browse produce and create listings." />
                <QuickLink to="/activity" title="My activity" sub="Review buyer commitments on your harvest." />
                <QuickLink to="/farms" title="My farms" sub="Manage pre and post-harvest farms." />
                <QuickLink to="/weather" title="Weather guide" sub="7-day field forecast and risk for your farm." />
                <QuickLink to="/reports" title="Sales report" sub="Earnings, top goods and your sales trend." />
              </div>

              {!user?.verified && (
                <Panel className="border-leaf/40">
                  <h2 className="font-serif text-[23px] font-semibold tracking-[-.04em] text-ink">
                    Finish setting up your account
                  </h2>
                  <p className="mt-1 font-sans text-sm text-muted">
                    Verify your farmer profile before you can list produce or manage farms.
                  </p>
                  <Link
                    to="/verify"
                    className="mt-4 inline-block rounded-[10px] bg-leaf px-4 py-2.5 font-sans text-sm font-bold text-white transition hover:bg-leaf-dark"
                  >
                    Verify my profile
                  </Link>
                </Panel>
              )}

              {reviews.length > 0 && <FarmerReviews reviews={reviews} />}
            </>
          ) : (
            <div className="space-y-5">
              <Panel>
                <h2 className="font-serif text-[23px] font-semibold tracking-[-.04em] text-ink">
                  {greetingFor()}, {firstName}.
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
                    Finish setting up your account
                  </h2>
                  <p className="mt-1 font-sans text-sm text-muted">
                    Verify your account before you can trade, list produce, or manage farms.
                  </p>
                  <Link
                    to="/verify"
                    className="mt-4 inline-block rounded-[10px] bg-leaf px-4 py-2.5 font-sans text-sm font-bold text-white transition hover:bg-leaf-dark"
                  >
                    Verify my profile
                  </Link>
                </Panel>
              )}

              <div className="rounded-[10px] border border-line bg-surface px-4 py-3.5">
                <Empty>Your order history and saved favourites live on the Market place page.</Empty>
              </div>

              <Panel>
                <h2 className="font-serif text-[19px] font-semibold tracking-[-.04em] text-ink">Farm services</h2>
                <p className="mt-1 font-sans text-xs leading-relaxed text-muted">
                  Need financing, supplies, equipment, transport, or storage for a sourcing run? We connect you with
                  verified providers.
                </p>
                <Link
                  to="/services"
                  className="mt-3 inline-block rounded-[10px] bg-leaf px-4 py-2.5 font-sans text-xs font-bold text-white transition hover:bg-leaf-dark"
                >
                  Explore services →
                </Link>
              </Panel>
            </div>
          )}
        </div>

        <div className="space-y-5">
          <Panel>
            <h2 className="font-serif text-[19px] font-semibold tracking-[-.04em] text-ink">Need a hand?</h2>
            <p className="mb-3 mt-1 font-sans text-[13px] leading-relaxed text-muted">
              Ask about listings, offers, payments, or transport on the Support page.
            </p>
            <button
              type="button"
              onClick={requestSupport}
              className="rounded-[10px] bg-lime-soft px-4 py-2.5 font-sans text-xs font-bold text-leaf-dark transition hover:bg-lime"
            >
              Request support
            </button>
          </Panel>
        </div>
      </div>
    </div>
  )
}

function FarmerReviews({ reviews }) {
  const avg = reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
  const recent = reviews.slice(0, 3)
  return (
    <Panel className="mt-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="font-serif text-[19px] font-semibold tracking-[-.04em] text-ink">Customer reviews</h2>
          <p className="mt-0.5 font-sans text-xs text-muted">
            {reviews.length} verified customer{reviews.length === 1 ? '' : 's'} have reviewed you
          </p>
        </div>
        <div className="shrink-0 rounded-xl bg-thumb px-4 py-2 text-center">
          <span className="block font-serif text-2xl font-semibold leading-none text-ink">{avg.toFixed(1)}</span>
          <span className="mt-1 block text-sm leading-none text-gold" aria-label="Average rating">
            {'★'.repeat(Math.round(avg))}
            <span className="text-line">{'★'.repeat(5 - Math.round(avg))}</span>
          </span>
        </div>
      </div>
      <ul className="mt-4 space-y-3">
        {recent.map((r) => (
          <li key={r.id} className="rounded-lg border border-line bg-white p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="truncate font-sans text-sm font-bold capitalize text-ink">
                {r.cropType || 'Produce'}
              </span>
              <span className="shrink-0 text-[13px] leading-none text-gold" aria-label={`${r.rating} stars`}>
                {'★'.repeat(r.rating)}
                <span className="text-line">{'★'.repeat(5 - r.rating)}</span>
              </span>
            </div>
            {r.comment && <p className="mt-1.5 line-clamp-2 font-sans text-[13px] leading-relaxed text-ink/80">{r.comment}</p>}
            <span className="mt-1.5 block font-sans text-[11px] text-muted">
              {r.buyerName || 'Verified buyer'} · {new Date(r.createdAt).toLocaleDateString()}
            </span>
          </li>
        ))}
      </ul>
    </Panel>
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
