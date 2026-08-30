import { useState } from 'react'
import { productArt, productGradient } from '../lib/productArt'

function Heart({ filled }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="h-4 w-4"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      fill={filled ? 'currentColor' : 'none'}
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"
      />
    </svg>
  )
}

export default function ProductCard({
  item,
  qty,
  inCart = false,
  onQty,
  onAdd,
  onWishlist,
  onView,
  wished,
  verified = true,
  onVerifyPrompt,
  viewOnly = false,
  statusChip = null,
  onManagePhotos,
  photosActive = false,
}) {
  const gallery = Array.isArray(item.imageUrls) && item.imageUrls.length ? item.imageUrls : []
  const photos = gallery.length ? gallery : item.imageUrl ? [item.imageUrl] : []
  const [active, setActive] = useState(0)
  const safeActive = photos.length ? Math.min(active, photos.length - 1) : 0
  const { emoji } = productArt(item.cropType)
  const title = item.cropType ? item.cropType.charAt(0).toUpperCase() + item.cropType.slice(1) : 'Produce'
  const distance = item.distanceKm != null ? ` · ${item.distanceKm.toFixed(1)} km` : ''

  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-line bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div
        className="relative aspect-[4/3] w-full cursor-pointer overflow-hidden"
        onClick={() => onView?.(item)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            onView?.(item)
          }
        }}
      >
        {photos.length ? (
          <img
            src={photos[safeActive]}
            alt={title}
            className="h-full w-full object-cover"
            onError={() => photos.length > 1 && setActive((i) => (i + 1) % photos.length)}
          />
        ) : (
          <div
            className="flex h-full w-full items-center justify-center"
            style={{ background: productGradient(item.cropType) }}
          >
            <span className="text-6xl drop-shadow-sm" aria-hidden="true">
              {emoji}
            </span>
          </div>
        )}
        {photos.length > 1 && (
          <div className="absolute bottom-2 left-2 right-2 flex gap-1.5">
            {photos.map((u, i) => (
              <button
                key={u + i}
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  setActive(i)
                }}
                aria-label={`View image ${i + 1}`}
                className={`h-10 flex-1 overflow-hidden rounded-md border-2 transition ${
                  i === safeActive ? 'border-white' : 'border-transparent opacity-70 hover:opacity-100'
                }`}
              >
                <img src={u} alt="" className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        )}
        {!viewOnly && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onWishlist?.(item.id)
            }}
            aria-label={wished ? 'Remove from wishlist' : 'Add to wishlist'}
            className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-white/90 text-ink shadow transition hover:scale-105"
          >
            <Heart filled={wished} />
          </button>
        )}
        {item.matchesPrefs && (
          <span className="absolute left-2 top-2 rounded-full bg-lime px-2 py-0.5 font-sans text-[10px] font-bold text-leaf-dark">
            Your interest
          </span>
        )}
        {viewOnly && onManagePhotos && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onManagePhotos(item)
            }}
            className="absolute left-2 top-2 rounded-full bg-white/90 px-3 py-1.5 font-sans text-[10px] font-bold text-ink shadow transition hover:bg-white"
          >
            {photosActive ? 'Close photos' : 'Photos'}
          </button>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-2 p-3.5">
        <div>
          <h3
            className="truncate font-serif text-[17px] font-semibold text-ink hover:text-leaf"
            onClick={() => onView?.(item)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onView?.(item)
              }
            }}
          >
            {title}
          </h3>
          <p className="truncate font-sans text-xs text-muted">
            {item.farmerName || 'Local grower'}
            <span className="mx-1">·</span>
            {item.location || 'Central Region'}
            {distance}
            {item.farmName && <span> · From {item.farmName}</span>}
          </p>
          {item.maturity && (
            <span className="mt-1 inline-block rounded-full bg-[#e8f0c5] px-2 py-0.5 font-sans text-[10px] font-bold capitalize text-leaf-dark">
              {item.maturity}
            </span>
          )}
          {item.status === 'pre_committed' && item.committedByMe && (
            <span className="mt-1 inline-block rounded-full bg-amber-100 px-2 py-0.5 font-sans text-[10px] font-bold text-amber-800">
              Pre-committed
            </span>
          )}
          {statusChip && (
            <span className="mt-1 inline-block rounded-full bg-paper px-2 py-0.5 font-sans text-[10px] font-bold text-muted">
              {statusChip}
            </span>
          )}
          {item.rating != null && (
            <span className="mt-1 block font-sans text-[11px] font-semibold text-ink">
              <span className="text-amber-500" aria-hidden="true">★</span>{' '}
              {item.rating.toFixed(1)} · {item.reviewCount} review{item.reviewCount === 1 ? '' : 's'}
            </span>
          )}
        </div>

        <div className="mt-auto flex items-end justify-between gap-2">
          <div>
            <strong className="block font-serif text-lg font-semibold leading-none text-ink">
              GHS {item.askingPrice ?? '—'}
            </strong>
            <span className="text-[11px] text-muted">per {item.unit || 'unit'}</span>
          </div>
          {viewOnly ? (
            <button
              type="button"
              onClick={() => onView?.(item)}
              className="rounded-[10px] border border-line bg-[#fbfcfa] px-3.5 py-2 font-sans text-xs font-bold text-leaf transition hover:bg-paper hover:text-leaf-dark"
            >
              Details
            </button>
          ) : inCart ? (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => onQty?.(item, -1)}
                aria-label="Decrease quantity"
                className="h-7 w-7 rounded-md border border-line text-ink transition hover:bg-paper"
              >
                −
              </button>
              <span className="min-w-[1.5rem] text-center font-sans text-sm font-bold text-ink">{qty}</span>
              <button
                type="button"
                onClick={() => onQty?.(item, 1)}
                aria-label="Increase quantity"
                className="h-7 w-7 rounded-md border border-line text-ink transition hover:bg-paper"
              >
                +
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => {
                if (!verified) {
                  onVerifyPrompt?.()
                  return
                }
                onAdd?.(item)
              }}
              className="rounded-[10px] border border-line bg-[#fbfcfa] px-3.5 py-2 font-sans text-xs font-bold text-leaf transition hover:bg-paper hover:text-leaf-dark"
            >
              Add to cart
            </button>
          )}
        </div>
      </div>
    </article>
  )
}
