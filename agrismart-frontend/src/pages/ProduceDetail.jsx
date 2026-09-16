import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { getUser } from '../lib/auth'
import { getProduceById, getListing, deleteListing, setListingStatus, getSimilarProduce, getListingReviews, postReview } from '../lib/api'
import { productArt, productGradient } from '../lib/productArt'
import { STATUS_LABELS } from '../lib/statusLabels'
import AppShell, { useAppShell } from '../components/AppShell'
import ProductCard from '../components/ProductCard'
import { Panel } from '../components/Panel'
import Modal from '../components/Modal'
import VerifyProfileModal from '../components/VerifyProfileModal'
import Reveal from '../components/Reveal'
import Button from '../components/Button'
import ListingForm from '../components/ListingForm'
import ListingPhotoManager from '../components/ListingPhotoManager'
import { CameraIcon } from '../components/icons'
import { inputCls } from '../lib/ui'

function ProduceDetailContent() {
  const { id } = useParams()
  const user = getUser()
  const navigate = useNavigate()
  const [item, setItem] = useState(null)
  const [error, setError] = useState('')
  const [active, setActive] = useState(0)
  const [qty] = useState(1)
  const [editing, setEditing] = useState(false)
  const [verifyOpen, setVerifyOpen] = useState(false)
  const [photosOpen, setPhotosOpen] = useState(false)
  const [similar, setSimilar] = useState([])
  const [reviewData, setReviewData] = useState(null)
  const isBuyerLike = ['buyer', 'market_seller'].includes(user?.role)
  const { cart, flashToast } = useAppShell()
  const cartLine = item ? (cart.items.find((l) => l.listingId === item.id) || null) : null

  const isOwner = user?.role === 'farmer' && user?.verified && item && String(item.farmerId) === String(user.id)
  const isUnverifiedOwner = user?.role === 'farmer' && !user?.verified && item && String(item.farmerId) === String(user.id)

  // Reviews load independently of the produce fetch so purchasers can reach a sold
  // listing's reviews (and their own write form) even when the item itself errored.
  useEffect(() => {
    let alive = true
    getListingReviews(id)
      .then((rd) => {
        if (alive) setReviewData(rd)
      })
      .catch(() => {
        if (alive) setReviewData(null)
      })
    return () => {
      alive = false
    }
  }, [id])

  useEffect(() => {
    let alive = true
    const load = async () => {
      try {
        setItem(await getProduceById(id))
      } catch (produceErr) {
        if (user?.role === 'farmer') {
          try {
            const raw = await getListing(id)
            if (raw && raw.farmerId === user.id) {
              if (alive) setItem(raw)
              return
            }
          } catch (_) {
            // fall through to the original error
          }
        }
        if (alive) setError(produceErr.message || 'Could not load this produce.')
      }
    }
    load()
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  // Buyers see "Similar produce" below — same crop, open listings, excluding this one.
  useEffect(() => {
    let alive = true
    if (!item || !isBuyerLike || !item.cropType) {
      setSimilar([])
      return
    }
    getSimilarProduce(item.id, item.cropType, user?.lat, user?.lng)
      .then((list) => {
        if (alive) setSimilar(Array.isArray(list) ? list.slice(0, 4) : [])
      })
      .catch(() => {
        if (alive) setSimilar([])
      })
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item?.id, item?.cropType, isBuyerLike])

  const refresh = async () => {
    try {
      const fresh = await (user?.role === 'farmer'
        ? getListing(id).then((l) => (l.farmerId === user.id ? l : getProduceById(id)))
        : getProduceById(id))
      setItem(fresh)
    } catch (e) {
      flashToast(e.message || 'Could not refresh the listing.')
    }
  }

  const onDelete = async () => {
    if (!window.confirm('Delete this listing? It will be hidden from the market (your records are kept).')) return
    try {
      await deleteListing(id)
      navigate('/marketplace')
    } catch (e) {
      flashToast(e.message || 'Could not delete the listing.')
    }
  }

  const onDeactivate = async () => {
    try {
      await setListingStatus(id, 'deactivated')
      flashToast('Listing deactivated. It is hidden from the market.')
      setEditing(false)
      refresh()
    } catch (e) {
      flashToast(e.message || 'Could not deactivate the listing.')
    }
  }

  const onActivate = async () => {
    try {
      await setListingStatus(id, 'open')
      flashToast('Listing activated — buyers can see it again.')
      refresh()
    } catch (e) {
      flashToast(e.message || 'Could not activate the listing.')
    }
  }

  if (error) {
    return (
      <div className="mx-auto w-full max-w-3xl py-12 text-center">
        <p className="font-serif text-2xl font-semibold text-ink">Produce not available</p>
        <p className="mt-2 font-sans text-sm text-muted">{error}</p>
        <Link to="/" className="mt-6 inline-block rounded-[10px] bg-leaf px-5 py-2.5 font-sans text-xs font-bold text-white transition hover:bg-leaf-dark">
          Back to Home
        </Link>
      </div>
    )
  }

  if (!item) {
    return (
      <div className="py-12 text-center font-sans text-sm text-muted">Loading produce…</div>
    )
  }

  const gallery = Array.isArray(item.imageUrls) && item.imageUrls.length ? item.imageUrls : []
  const photos = gallery.length ? gallery : item.imageUrl ? [item.imageUrl] : []
  const safeActive = photos.length ? Math.min(active, photos.length - 1) : 0
  const { emoji } = productArt(item.cropType)
  const title = item.cropType ? item.cropType.charAt(0).toUpperCase() + item.cropType.slice(1) : 'Produce'

  const statusInfo =
    isBuyerLike && item.status === 'pre_committed' && !item.committedByMe
      ? null
      : item.status
        ? STATUS_LABELS[item.status] || { label: item.status, cls: 'bg-paper text-muted' }
        : null

  const locParts = [item.location, item.region, item.district].filter(Boolean)

  const lineSub =
    [
      item.farmerName || 'Local grower',
      item.farmName ? `From ${item.farmName}` : null,
      locParts.length ? locParts.join(', ') : 'Central Region',
      item.distanceKm != null ? `${item.distanceKm.toFixed(1)} km` : null,
    ]
      .filter(Boolean)
      .join(' · ')

  return (
    <div className="w-full">
      <Link
        to="/marketplace"
          className="mb-5 inline-block rounded-[10px] border border-line bg-white px-3.5 py-2 font-sans text-xs font-bold text-ink transition hover:bg-paper"
        >
          ← Back
        </Link>

        <div className="grid items-start gap-6 lg:grid-cols-2">
          <Reveal delay={0}>
          {/* Gallery */}
          <div>
            <div className="relative aspect-[4/3] w-full overflow-hidden rounded-[18px] border border-line bg-surface">
              {photos.length ? (
                <img src={photos[safeActive]} alt={title} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center" style={{ background: productGradient(item.cropType) }}>
                  <span className="text-8xl drop-shadow-sm" aria-hidden="true">
                    {emoji}
                  </span>
                </div>
              )}
              {item.matchesPrefs && (
                <span className="absolute left-3 top-3 rounded-full bg-lime px-2.5 py-1 font-sans text-[10px] font-bold text-leaf-dark">
                  Your interest
                </span>
              )}
              {isOwner && (
                <button
                  type="button"
                  onClick={() => setPhotosOpen((o) => !o)}
                  aria-label={photosOpen ? 'Close photo manager' : 'Add or change photos'}
                  className={`absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full text-ink shadow transition hover:scale-105 ${
                    photosOpen ? 'bg-lime' : 'bg-white/90 hover:bg-white'
                  }`}
                >
                  <CameraIcon />
                </button>
              )}
            </div>
            {photos.length > 1 && (
              <div className="mt-3 flex gap-2">
                {photos.map((u, i) => (
                  <button
                    key={u + i}
                    type="button"
                    onClick={() => setActive(i)}
                    aria-label={`View image ${i + 1}`}
                    className={`h-16 w-20 overflow-hidden rounded-lg border-2 transition ${
                      i === safeActive ? 'border-leaf' : 'border-line opacity-70 hover:opacity-100'
                    }`}
                  >
                    <img src={u} alt="" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            )}
            {photosOpen && (
              <ListingPhotoManager
                listing={item}
                onDone={() => {
                  setPhotosOpen(false)
                  refresh()
                }}
              />
            )}
          </div>
          </Reveal>

          {/* Info */}
          <div className="space-y-4">
            <div>
              <span className="font-sans text-[11px] font-bold uppercase tracking-[.15em] text-leaf">Harvest marketplace</span>
              <h1 className="mt-2 font-serif text-[clamp(30px,4vw,44px)] font-semibold leading-none tracking-[-.05em] text-ink">
                {title}
              </h1>
              <p className="mt-2 font-sans text-sm text-muted">{lineSub}</p>
              {(item.details || item.gpsAddress) && (
                <div className="mt-3 rounded-lg border border-line bg-surface px-4 py-3">
                  {item.details && (
                    <>
                      <span className="block font-sans text-[11px] uppercase tracking-[.06em] text-muted">Details</span>
                      <p className="mt-1 whitespace-pre-line font-sans text-sm leading-relaxed text-ink/80">{item.details}</p>
                    </>
                  )}
                  {item.gpsAddress && (
                    <p className={`font-sans text-[11px] uppercase tracking-[.06em] text-muted ${item.details ? 'mt-2 border-t border-line pt-2' : ''}`}>
                      GPS · {item.gpsAddress}
                    </p>
                  )}
                </div>
              )}
            </div>

            <Panel>
              <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
                <div>
                  <span className="block font-sans text-[11px] uppercase tracking-[.06em] text-muted">Price</span>
                  <strong className="font-serif text-2xl font-semibold text-ink">
                    GHS {item.askingPrice ?? '—'}
                  </strong>
                  <span className="ml-1 font-sans text-xs text-muted">per {item.unit || 'unit'}</span>
                </div>
                <div>
                  <span className="block font-sans text-[11px] uppercase tracking-[.06em] text-muted">Available</span>
                  <strong className="font-serif text-xl font-semibold text-ink">
                    {item.quantity ?? '—'} {item.unit || ''}
                  </strong>
                </div>
                <div>
                  <span className="block font-sans text-[11px] uppercase tracking-[.06em] text-muted">Harvest</span>
                  <strong className="font-serif text-xl font-semibold capitalize text-ink">
                    {item.harvestDate ? new Date(item.harvestDate).toLocaleDateString() : 'To confirm'}
                  </strong>
                </div>
                {item.maturity && (
                  <div>
                    <span className="block font-sans text-[11px] uppercase tracking-[.06em] text-muted">Maturity</span>
                    <strong className="font-serif text-xl font-semibold capitalize text-ink">{item.maturity}</strong>
                  </div>
                )}
              </div>
            </Panel>

            {isUnverifiedOwner ? (
               <VerifyProfileModal open={verifyOpen} onClose={() => setVerifyOpen(false)} />
            ) : isOwner ? (
              <>
                {item.status === 'deactivated' ? (
                  <span className="inline-block rounded-full bg-warn-soft px-3 py-1 font-sans text-[11px] font-bold text-warn">
                    Deactivated — hidden from the market
                  </span>
                ) : (
                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setEditing(true)}
                      className="rounded-[10px] bg-leaf px-5 py-3 font-sans text-sm font-bold text-white transition hover:bg-leaf-dark"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={onDeactivate}
                      className="rounded-[10px] border border-line bg-white px-5 py-3 font-sans text-sm font-bold text-ink transition hover:bg-paper"
                    >
                      Deactivate
                    </button>
                    <button
                      type="button"
                      onClick={onDelete}
                      className="rounded-[10px] border border-bad/40 bg-bad px-5 py-3 font-sans text-sm font-bold text-bad-text transition hover:bg-bad-soft"
                    >
                      Delete
                    </button>
                  </div>
                )}
                {item.status === 'deactivated' && (
                  <button
                    type="button"
                    onClick={onActivate}
                    className="rounded-[10px] bg-leaf px-5 py-3 font-sans text-sm font-bold text-white transition hover:bg-leaf-dark"
                  >
                    Activate listing
                  </button>
                )}
              </>
            ) : isBuyerLike && ['open', 'pre_committed'].includes(item.status) ? (
              <>
                {cartLine ? (
                  <div className="w-min flex items-center gap-1.5 rounded-[10px] border border-line bg-white p-1.5">
                    <button
                      type="button"
                      onClick={() => cart.setQty(item.id, -1)}
                      aria-label="Decrease quantity"
                      className="h-8 w-8 rounded-md text-ink transition hover:bg-paper"
                    >
                      −
                    </button>
                    <span className="min-w-[2.5rem] text-center font-sans text-base font-bold text-ink">{cartLine.qty}</span>
                    <button
                      type="button"
                      onClick={() => cart.setQty(item.id, 1)}
                      aria-label="Increase quantity"
                      className="h-8 w-8 rounded-md text-ink transition hover:bg-paper"
                    >
                      +
                    </button>
                  </div>
                ) : (
                  <Button
                    variant="primary"
                    size="lg"
                    onClick={() => {
                      if (!user?.verified) {
                        setVerifyOpen(true)
                        navigate('/verify')
                        return
                      }
                      cart.add(item, qty)
                      flashToast(`${title} added to cart`)
                    }}
                  >
                    Add {qty} to cart · GHS {((item.askingPrice || 0) * qty).toFixed(2).replace(/\.00$/, '')}
                  </Button>
                )}
                {!user?.verified && (
                  <p className="font-sans text-xs text-muted">
                    <Link to="/verify" className="font-semibold text-leaf hover:underline">
                      Verify your profile
                    </Link>{' '}
                    to place an order.
                  </p>
                )}
              </>
            ) : (
              <p className="font-sans text-sm text-muted">
                {item.status === 'open'
                  ? 'Browse the market to place an order on your verified buyer account.'
                  : 'This listing is not currently available.'}
              </p>
            )}

           
            <Modal open={editing} onClose={() => setEditing(false)} title="Edit listing">
              <ListingForm
                listing={item}
                defaultLocation={item.location || ''}
                onCancel={() => setEditing(false)}
                onDone={() => {
                  setEditing(false)
                  refresh()
                }}
              />
            </Modal>
          </div>

          
        </div>

           <Panel className="mb-3 mt-10">
              <h2 className="mb-3 font-serif text-[25px] font-semibold tracking-[-.02em] text-ink">Listing details</h2>
              <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
                <div>
                  <dt className="font-sans text-sm font-bold uppercase tracking-[.04em] text-ink/80">Status</dt>
                  <dd className="mt-1">
                    {statusInfo ? (
                      <span className={`inline-block rounded-full px-2.5 py-1 font-sans text-[11px] font-bold ${statusInfo.cls}`}>
                        {statusInfo.label}
                      </span>
                    ) : (
                      <span className="font-sans text-sm font-medium text-muted">—</span>
                    )}
                  </dd>
                </div>
                <div>
                  <dt className="font-sans text-sm font-bold uppercase tracking-[.04em] text-ink/80">Farmer</dt>
                  <dd className="mt-0.5 font-sans text-sm font-medium text-ink">{item.farmerName || '—'}</dd>
                </div>
                <div>
                  <dt className="font-sans text-sm font-bold uppercase tracking-[.04em] text-ink/80">Farm</dt>
                  <dd className="mt-0.5 font-sans text-sm font-medium text-ink">{item.farmName || '—'}</dd>
                </div>
                <div>
                  <dt className="font-sans text-sm font-bold uppercase tracking-[.04em] text-ink/80">Crop</dt>
                  <dd className="mt-0.5 font-sans text-sm font-medium text-ink">{title}</dd>
                </div>
                <div>
                  <dt className="font-sans text-sm font-bold uppercase tracking-[.04em] text-ink/80">Quantity</dt>
                  <dd className="mt-0.5 font-sans text-sm font-medium text-ink">
                    {item.quantity != null ? `${item.quantity}${item.unit ? ` ${item.unit}` : ''}` : '—'}
                  </dd>
                </div>
                <div>
                  <dt className="font-sans text-sm font-bold uppercase tracking-[.04em] text-ink/80">Unit</dt>
                  <dd className="mt-0.5 font-sans text-sm font-medium text-ink">{item.unit || '—'}</dd>
                </div>
                <div>
                  <dt className="font-sans text-sm font-bold uppercase tracking-[.04em] text-ink/80">Harvest date</dt>
                  <dd className="mt-0.5 font-sans text-sm font-medium text-ink">
                    {item.harvestDate ? new Date(item.harvestDate).toLocaleDateString() : 'To confirm'}
                  </dd>
                </div>
                <div>
                  <dt className="font-sans text-sm font-bold uppercase tracking-[.04em] text-ink/80">Asking price</dt>
                  <dd className="mt-0.5 font-sans text-sm font-medium text-ink">
                    {item.askingPrice != null ? `GHS ${item.askingPrice}` : '—'}
                  </dd>
                </div>
                <div>
                  <dt className="font-sans text-sm font-bold uppercase tracking-[.04em] text-ink/80">Maturity</dt>
                  <dd className="mt-0.5 font-sans text-sm font-medium text-ink capitalize">{item.maturity || '—'}</dd>
                </div>
                <div>
                  <dt className="font-sans text-sm font-bold uppercase tracking-[.04em] text-ink/80">Location</dt>
                  <dd className="mt-0.5 font-sans text-sm font-medium text-ink">{item.location || '—'}</dd>
                </div>
                <div>
                  <dt className="font-sans text-sm font-bold uppercase tracking-[.04em] text-ink/80">Region</dt>
                  <dd className="mt-0.5 font-sans text-sm font-medium text-ink">{item.region || '—'}</dd>
                </div>
                <div>
                  <dt className="font-sans text-sm font-bold uppercase tracking-[.04em] text-ink/80">District</dt>
                  <dd className="mt-0.5 font-sans text-sm font-medium text-ink">{item.district || '—'}</dd>
                </div>
                <div>
                  <dt className="font-sans text-sm font-bold uppercase tracking-[.04em] text-ink/80">GPS address</dt>
                  <dd className="mt-0.5 font-sans text-sm font-medium text-ink">{item.gpsAddress || '—'}</dd>
                </div>
              </dl>
              <div className="mt-4 border-t border-line pt-3">
                <span className="font-sans text-sm font-bold uppercase tracking-[.04em] text-ink/80">Details</span>
                <p className="mt-1 whitespace-pre-line font-sans text-sm leading-relaxed text-ink/80">{item.details || '—'}</p>
              </div>
            </Panel>

        {reviewData && (reviewData.reviews.length > 0 || reviewData.canReview || reviewData.myReview) && (
          <ReviewsPanel
            data={reviewData}
            listingId={item.id}
            flashToast={flashToast}
            onSaved={async () => {
              const rd = await getListingReviews(item.id)
              setReviewData(rd)
            }}
          />
        )}

        {isBuyerLike && similar.length > 0 && (
          <section className="mt-10">
            <h2 className="font-serif text-xl font-semibold tracking-[-.03em] text-ink">Similar produce</h2>
            <p className="mt-1 font-sans text-xs text-muted">More {title.toLowerCase()} in the market</p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {similar.map((p, i) => (
                <Reveal key={p.id} delay={Math.min(i, 6)}>
                  <ProductCard item={p} viewOnly onView={() => navigate(`/produce/${p.id}`)} />
                </Reveal>
              ))}
            </div>
          </section>
        )}
      </div>
    )
  }

function StarRow({ value = 0, onChange, interactive = false }) {
  const [hover, setHover] = useState(0)
  const shown = interactive ? hover || value : value
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          aria-label={`${n} star${n === 1 ? '' : 's'}`}
          disabled={!interactive}
          onClick={() => onChange?.(n)}
          onMouseEnter={() => interactive && setHover(n)}
          onMouseLeave={() => interactive && setHover(0)}
          className={`text-2xl leading-none transition ${
            n <= shown ? 'text-gold' : 'text-line'
          } ${interactive ? 'cursor-pointer' : 'cursor-default'}`}
        >
          ★
        </button>
      ))}
    </div>
  )
}

function ReviewForm({ listingId, initial, onSaved, flashToast }) {
  const [rating, setRating] = useState(initial?.rating ?? 0)
  const [comment, setComment] = useState(initial?.comment ?? '')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const submit = async (e) => {
    e.preventDefault()
    if (!rating) {
      setErr('Pick a star rating.')
      return
    }
    setBusy(true)
    setErr('')
    try {
      await postReview(listingId, { rating, comment })
      await onSaved()
      flashToast(initial ? 'Review updated.' : 'Review posted. Thanks!')
    } catch (e2) {
      setErr(e2.message || 'Could not save your review.')
    } finally {
      setBusy(false)
    }
  }
  return (
    <form onSubmit={submit} className="mt-4 rounded-[10px] border border-line bg-surface p-4">
      <div className="flex items-center justify-between">
        <span className="font-sans text-[11px] font-bold uppercase tracking-[.06em] text-leaf">
          {initial ? 'Update your review' : 'Verified purchase · write a review'}
        </span>
      </div>
      <div className="mt-2">
        <StarRow value={rating} interactive onChange={setRating} />
      </div>
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        maxLength={500}
        rows={3}
        placeholder="How was the quality, freshness, and packaging?"
        className={`mt-2 w-full ${inputCls}`}
      />
      <div className="mt-2 flex items-center justify-between gap-3">
        <span className="font-sans text-[11px] text-muted">{comment.length}/500</span>
        {err && <span className="flex-1 text-right font-sans text-xs text-bad-text">{err}</span>}
        <Button type="submit" disabled={busy} size="sm" className="px-4">
          {busy ? 'Saving…' : initial ? 'Update review' : 'Post review'}
        </Button>
      </div>
    </form>
  )
}

function ReviewsPanel({ data, listingId, flashToast, onSaved }) {
  const count = data.reviewCount ?? data.reviews.length
  return (
    <Panel className="mt-6">
      <div className="flex items-center gap-5">
        <div className="text-center">
          <span className="block font-serif text-4xl font-semibold leading-none text-ink">
            {data.rating != null ? data.rating.toFixed(1) : '—'}
          </span>
          <div className="mt-1">
            <StarRow value={Math.round(data.rating ?? 0)} />
          </div>
        </div>
        <div>
          <h2 className="font-serif text-[22px] font-semibold tracking-[-.02em] text-ink">Reviews</h2>
          <p className="font-sans text-xs text-muted">
            {count} review{count === 1 ? '' : 's'} from verified purchases
          </p>
        </div>
      </div>

      {data.canReview && (
        <ReviewForm listingId={listingId} initial={data.myReview} onSaved={onSaved} flashToast={flashToast} />
      )}

      {data.reviews.length > 0 && (
        <ul className="mt-4 space-y-3">
          {data.reviews.map((rv) => (
            <li key={rv.id} className="rounded-lg border border-line bg-white p-3.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-leaf/10 font-sans text-sm font-bold text-leaf">
                    {rv.buyerName ? rv.buyerName.charAt(0).toUpperCase() : '✓'}
                  </span>
                  <span className="truncate font-sans text-sm font-bold text-ink">{rv.buyerName || 'Verified buyer'}</span>
                </div>
                <span className="shrink-0 font-sans text-[11px] text-muted">
                  {new Date(rv.createdAt).toLocaleDateString()}
                </span>
              </div>
              <div className="mt-1.5">
                <StarRow value={rv.rating} />
              </div>
              {rv.comment && (
                <p className="mt-1.5 whitespace-pre-line font-sans text-sm leading-relaxed text-ink/80">{rv.comment}</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </Panel>
  )
}

export default function ProduceDetail() {
  return (
    <AppShell activeId="marketplace">
      <ProduceDetailContent />
    </AppShell>
  )
}
