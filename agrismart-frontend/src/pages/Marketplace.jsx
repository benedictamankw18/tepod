import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import AppShell, { useAppShell } from '../components/AppShell'
import ProductCard from '../components/ProductCard'
import HeroBanner from '../components/HeroBanner'
import Chip from '../components/Chip'
import Empty from '../components/Empty'
import Modal from '../components/Modal'
import Reveal from '../components/Reveal'
import ListingForm from '../components/ListingForm'
import SearchableSelect from '../components/SearchableSelect'
import { getBanners, getListings, getProduce, getMyPurchases } from '../lib/api'
import { STATUS_LABELS } from '../lib/statusLabels'
import { useWishlist } from '../lib/app'
import { useCrops } from '../lib/crops'

function FarmerMarketplace() {
  const { user, flashToast } = useAppShell()
  const { crops } = useCrops()
  const navigate = useNavigate()
  const [mine, setMine] = useState(null)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [cropFilter, setCropFilter] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [searchParams, setSearchParams] = useSearchParams()

  const loadMine = () =>
    getListings()
      .then((list) => setMine(Array.isArray(list) ? list.filter((l) => String(l.farmerId) === String(user.id)) : []))
      .catch((e) => setError(e.message))

  useEffect(() => {
    loadMine()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (searchParams.get('create') === '1') {
      setSearchParams({}, { replace: true })
      if (user?.verified) setShowForm(true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const openListings = mine || []
  const filtered = openListings.filter(
    (l) =>
      (!query || `${l.cropType} ${l.location}`.toLowerCase().includes(query.toLowerCase())) &&
      (!cropFilter || (l.cropType || '').toLowerCase() === cropFilter.toLowerCase()),
  )

  const openCreate = () => {
    if (!user?.verified) {
      flashToast('Verify your farmer profile before listing produce.')
      return
    }
    setShowForm(true)
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <span className="font-sans text-[11px] font-bold uppercase tracking-[.15em] text-leaf">
            Market place
          </span>
          <h1 className="mt-2 font-serif text-[clamp(28px,3.6vw,40px)] font-semibold leading-none tracking-[-.05em] text-ink">
            Your produce
          </h1>
          <p className="mt-2 max-w-[560px] font-sans text-sm leading-relaxed text-muted">
            Produce you've listed for sale. Track each listing and manage buyer interest.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="shrink-0 rounded-[10px] bg-leaf px-4 py-2.5 font-sans text-xs font-bold text-white transition hover:bg-leaf-dark"
        >
          + New listing
        </button>
      </header>

      {!user?.verified && (
        <div className="rounded-[18px] border border-leaf/40 bg-white p-6">
          <h2 className="font-serif text-[23px] font-semibold tracking-[-.04em] text-ink">
            Finish setting up your farmer account
          </h2>
          <p className="mt-1 font-sans text-sm text-muted">
            Verify your farmer profile before you can list produce.
          </p>
          <Link
            to="/verify"
            className="mt-4 inline-block rounded-[10px] bg-leaf px-4 py-2.5 font-sans text-sm font-bold text-white transition hover:bg-leaf-dark"
          >
            Verify my profile
          </Link>
        </div>
      )}

      <div className="mb-1 flex flex-col gap-2 sm:flex-row">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search tomato, Kasoa…"
          className="w-full flex-1 rounded-[10px] border border-line bg-surface px-3 py-2.5 font-sans text-sm text-ink outline-none focus:border-leaf focus:shadow-[0_0_0_3px_rgba(29,101,79,.12)]"
        />
        <SearchableSelect
          value={cropFilter}
          onChange={setCropFilter}
          options={[{ value: '', label: 'All crops' }, ...crops.map((c) => ({ value: c.id, label: c.name }))]}
          placeholder="All crops"
          className="w-full sm:w-52"
        />
      </div>

      {error && (
        <div className="rounded-lg border border-bad/40 bg-bad px-3 py-2 font-sans text-sm text-bad-text">
          {error}
        </div>
      )}

      {!mine ? (
        <Empty>Loading your produce…</Empty>
      ) : !openListings.length ? (
        <Empty>You haven't listed any produce yet. Use + New listing to publish your first harvest.</Empty>
      ) : filtered.length ? (
        <div className="grid grid-cols-2 gap-3.5 md:grid-cols-3 xl:grid-cols-4">
          {filtered.map((l, i) => (
            <Reveal key={l.id} delay={Math.min(i, 8)}>
              <ProductCard
                item={l}
                viewOnly
                onView={() => navigate(`/produce/${l.id}`)}
                statusChip={l.status !== 'open' ? STATUS_LABELS[l.status]?.label : null}
              />
            </Reveal>
          ))}
        </div>
      ) : (
        <Empty>No produce matches that search yet.</Empty>
      )}

      <Modal open={showForm} onClose={() => setShowForm(false)}>
        <ListingForm
          defaultLocation={user.location}
          onCancel={() => setShowForm(false)}
          onDone={() => {
            setShowForm(false)
            loadMine()
            flashToast('Listing published')
          }}
        />
      </Modal>
    </div>
  )
}

function BuyerMarketplace() {
  const { user, cart, flashToast } = useAppShell()
  const navigate = useNavigate()
  const [produce, setProduce] = useState(null)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('')
  const [sort, setSort] = useState('nearest')
  const { ids: wished, toggle: toggleWishlist } = useWishlist(user)
  const [showWishlistOnly, setShowWishlistOnly] = useState(false)
  const [banners, setBanners] = useState(null)
  const [purchases, setPurchases] = useState([])

  useEffect(() => {
    let alive = true
    getMyPurchases()
      .then((list) => alive && setPurchases(Array.isArray(list) ? list : []))
      .catch(() => alive && setPurchases([]))
    return () => {
      alive = false
    }
  }, [])

  useEffect(() => {
    let alive = true
    getBanners()
      .then((list) => alive && setBanners(list || []))
      .catch(() => alive && setBanners([]))
    return () => {
      alive = false
    }
  }, [])

  useEffect(() => {
    let alive = true
    getProduce(
      typeof user.lat === 'number' ? user.lat : undefined,
      typeof user.lng === 'number' ? user.lng : undefined,
    )
      .then((list) => alive && setProduce(list))
      .catch((e) => alive && setError(e.message))
    return () => {
      alive = false
    }
  }, [user.lat, user.lng])

  const feed = produce || []
  const categories = [...new Set(feed.map((p) => String(p.cropType || '').toLowerCase()).filter(Boolean))]

  let filtered = feed.filter(
    (p) =>
      (!query || `${p.cropType} ${p.location}`.toLowerCase().includes(query.toLowerCase())) &&
      (!category || (p.cropType || '').toLowerCase() === category) &&
      (!showWishlistOnly || wished.has(p.id)),
  )

  filtered = [...filtered].sort((a, b) => {
    if (sort === 'price_asc') return Number(a.askingPrice) - Number(b.askingPrice)
    if (sort === 'price_desc') return Number(b.askingPrice) - Number(a.askingPrice)
    if (sort === 'newest') return new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
    const da = a.distanceKm ?? null
    const db = b.distanceKm ?? null
    if (da === null && db === null) return 0
    if (da === null) return 1
    if (db === null) return -1
    return da - db
  })

  const cartQtyOf = (id) => cart.items.find((l) => l.listingId === id)?.qty || 0
  const verifyPrompt = () => flashToast('Verify your buyer profile to place an order')

  return (
    <div className="space-y-5">
      <HeroBanner banners={banners || []} />

      <header className="flex items-end justify-between gap-4">
        <Reveal as="div" className="min-w-0">
          <span className="font-sans text-[11px] font-bold uppercase tracking-[.15em] text-leaf">
            Market place
          </span>
          <h1 className="mt-2 font-serif text-[clamp(28px,3.6vw,40px)] font-semibold leading-none tracking-[-.05em] text-ink">
            Fresh produce, nearby
          </h1>
          <p className="mt-2 font-sans text-sm text-muted">Pick your quantity and lock in your order.</p>
        </Reveal>
        <span className="shrink-0 font-sans text-xs text-muted">
          {filtered.length} product{filtered.length === 1 ? '' : 's'}
        </span>
      </header>

      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search tomato, Kasoa…"
            className="w-full flex-1 rounded-[10px] border border-line bg-white px-3 py-2.5 font-sans text-sm text-ink outline-none focus:border-leaf focus:shadow-[0_0_0_3px_rgba(29,101,79,.12)]"
          />
          <SearchableSelect
            value={sort}
            onChange={setSort}
            options={[
              { value: 'nearest', label: 'Nearest' },
              { value: 'newest', label: 'Newest' },
              { value: 'price_asc', label: 'Price: low to high' },
              { value: 'price_desc', label: 'Price: high to low' },
            ]}
            placeholder="Sort…"
            className="w-full sm:w-auto"
            aria-label="Sort products"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Chip
            active={category === '' && !showWishlistOnly}
            onClick={() => {
              setCategory('')
              setShowWishlistOnly(false)
            }}
          >
            All
          </Chip>
          {categories.map((c) => (
            <Chip
              key={c}
              active={category === c && !showWishlistOnly}
              onClick={() => {
                setCategory(c)
                setShowWishlistOnly(false)
              }}
            >
              {c.charAt(0).toUpperCase() + c.slice(1)}
            </Chip>
          ))}
          <Chip
            active={showWishlistOnly}
            onClick={() => {
              setShowWishlistOnly(true)
              setCategory('')
            }}
          >
            ♥ Wishlist ({wished.size})
          </Chip>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-bad/40 bg-bad px-3 py-2 font-sans text-sm text-bad-text">
          {error}
        </div>
      )}

      {!produce ? (
        <Empty>Loading produce…</Empty>
      ) : filtered.length === 0 ? (
        <div className="py-10 text-center font-sans text-sm text-muted">
          {feed.length === 0
            ? 'No produce available right now.'
            : showWishlistOnly
              ? 'No items in your wishlist yet.'
              : 'No produce matches that search yet.'}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3.5 md:grid-cols-3 xl:grid-cols-4">
          {filtered.map((p, i) => (
            <Reveal key={p.id} delay={Math.min(i, 8)}>
              <ProductCard
                item={p}
                qty={cartQtyOf(p.id)}
                inCart={cartQtyOf(p.id) > 0}
                onQty={(item, d) => (!user.verified ? verifyPrompt() : cart.setQty(item.id, d))}
                onAdd={(item) => {
                  if (!user.verified) return verifyPrompt()
                  cart.add(item)
                  flashToast(`${item.cropType} added to cart`)
                }}
                onWishlist={toggleWishlist}
                wished={wished.has(p.id)}
                verified={user.verified}
                onVerifyPrompt={verifyPrompt}
                onView={(item) => navigate(`/produce/${item.id}`)}
              />
            </Reveal>
          ))}
        </div>
      )}

      {purchases.length > 0 && (
        <section className="mt-8">
          <h2 className="font-serif text-xl font-semibold tracking-[-.03em] text-ink">My purchases</h2>
          <p className="mt-1 font-sans text-xs text-muted">
            Items you bought. You can review a product once its payment has been confirmed.
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {purchases.map((tx) => {
              const pic = Array.isArray(tx.imageUrls) ? tx.imageUrls[0] : null
              const paid = tx.paymentStatus === 'paid'
              const status = STATUS_LABELS[tx.paymentStatus] || { label: tx.paymentStatus, cls: 'bg-paper text-muted' }
              return (
                <div key={tx.id} className="flex gap-3 rounded-[12px] border border-line bg-white p-3">
                  <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-thumb">
                    {pic ? (
                      <img src={pic} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <span className="grid h-full w-full place-items-center text-2xl" aria-hidden="true">
                        🥬
                      </span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <strong
                      className="block cursor-pointer truncate font-sans text-sm font-bold text-ink hover:text-leaf"
                      onClick={() => navigate(`/produce/${tx.listingId}`)}
                    >
                      {String(tx.cropType || 'Produce').charAt(0).toUpperCase() + String(tx.cropType || '').slice(1)}
                      {tx.quantity != null && ` · ${tx.quantity}${tx.unit ? ` ${tx.unit}` : ''}`}
                    </strong>
                    <span className="block truncate font-sans text-xs text-muted">
                      {tx.farmerName || 'Farmer'} · GHS {tx.agreedPrice}
                    </span>
                    <div className="mt-1 flex items-center justify-between gap-2">
                      <span className={`inline-block rounded-full px-2 py-0.5 font-sans text-[10px] font-bold capitalize ${status.cls}`}>
                        {status.label}
                      </span>
                      {paid ? (
                        <button
                          type="button"
                          onClick={() => navigate(`/produce/${tx.listingId}`)}
                          className="rounded-[7px] bg-leaf px-2.5 py-1 font-sans text-[11px] font-bold text-white transition hover:bg-leaf-dark"
                        >
                          Review
                        </button>
                      ) : (
                        <span className="font-sans text-[11px] text-muted">Review after payment</span>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {!user.verified && (
        <div className="rounded-[18px] border border-leaf/40 bg-white p-6">
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
        </div>
      )}
    </div>
  )
}

function MarketplaceContent() {
  const { isFarmer } = useAppShell()
  return isFarmer ? <FarmerMarketplace /> : <BuyerMarketplace />
}

export default function MarketplacePage() {
  return (
    <AppShell activeId="marketplace">
      <MarketplaceContent />
    </AppShell>
  )
}
