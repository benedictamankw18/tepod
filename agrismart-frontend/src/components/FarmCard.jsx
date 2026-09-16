import { useState } from 'react'
import { productArt, productGradient } from '../lib/productArt'

const STAGE_LABELS = { pre_harvest: 'Pre-harvest', post_harvest: 'Post-harvest' }

export default function FarmCard({ farm, onDetails }) {
  const [imgFailed, setImgFailed] = useState(false)
  const { emoji } = productArt(farm.cropType)
  const title = farm.cropType ? farm.cropType.charAt(0).toUpperCase() + farm.cropType.slice(1) : 'Farm'
  const subtitle = [farm.name, farm.location].filter(Boolean).join(' · ') || 'Local plot'

  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-line bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div
        className="relative aspect-[4/3] w-full cursor-pointer overflow-hidden"
        onClick={() => onDetails?.(farm)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            onDetails?.(farm)
          }
        }}
      >
        {farm.imageUrl && !imgFailed ? (
          <img src={farm.imageUrl} alt={title} className="h-full w-full object-cover" onError={() => setImgFailed(true)} />
        ) : (
          <div className="flex h-full w-full items-center justify-center" style={{ background: productGradient(farm.cropType) }}>
            <span className="text-6xl drop-shadow-sm" aria-hidden="true">
              {emoji}
            </span>
          </div>
        )}
        <span className="absolute left-2 top-2 rounded-full bg-white/90 px-2.5 py-0.5 font-sans text-[10px] font-bold text-ink shadow">
          {STAGE_LABELS[farm.stage] || farm.stage}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-2 p-3.5">
        <div>
          <h3
            className="truncate font-serif text-[17px] font-semibold text-ink hover:text-leaf"
            onClick={() => onDetails?.(farm)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onDetails?.(farm)
              }
            }}
          >
            {title}
          </h3>
          <p className="truncate font-sans text-xs text-muted">{subtitle}</p>
          {farm.status && (
            <span className="mt-1 inline-block rounded-full bg-paper px-2 py-0.5 font-sans text-[10px] font-bold text-muted">
              {farm.status.charAt(0).toUpperCase() + farm.status.slice(1)}
            </span>
          )}
        </div>

        {farm.expectedHarvestDate && (
          <p className="font-sans text-[11px] text-muted">
            Harvest: {new Date(farm.expectedHarvestDate + 'T00:00:00').toLocaleDateString()}
          </p>
        )}

        <div className="mt-auto flex items-end justify-between gap-2">
          <div className="text-[11px] text-muted">
            {farm.lat != null && farm.lng != null ? `${farm.lat}, ${farm.lng}` : 'No coordinates'}
          </div>
          <button
            type="button"
            onClick={() => onDetails?.(farm)}
            className="rounded-[10px] border border-line bg-surface px-3.5 py-2 font-sans text-xs font-bold text-leaf transition hover:bg-paper hover:text-leaf-dark"
          >
            Details
          </button>
        </div>
      </div>
    </article>
  )
}