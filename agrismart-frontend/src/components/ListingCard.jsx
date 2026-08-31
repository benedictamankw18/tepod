import CropGlyph from './CropGlyph'

export function Tag({ children, className = '' }) {
  return (
    <span
      className={`inline-block rounded-full bg-lime-soft px-2 py-0.5 font-sans text-[10px] font-bold text-leaf-dark ${className}`}
    >
      {children}
    </span>
  )
}

export function CropListingCard({ item, actionLabel = 'Make offer', onAction, onCardClick, showFarmer = true }) {
  const title = `${item.cropType || 'Produce'} harvest`
  const meta = [
    `${item.quantity ?? ''} ${item.unit || ''}`.trim(),
    item.location || 'Central Region',
    showFarmer ? item.farmerName || 'Local grower' : null,
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <article
      className={`grid grid-cols-[58px,1fr,auto] items-center gap-3.5 rounded-2xl border border-line bg-surface p-3.5 ${
        onCardClick ? 'cursor-pointer hover-lift' : ''
      }`}
      onClick={onCardClick ? () => onCardClick(item) : undefined}
      role={onCardClick ? 'button' : undefined}
      tabIndex={onCardClick ? 0 : undefined}
      onKeyDown={
        onCardClick
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onCardClick(item)
              }
            }
          : undefined
      }
    >
      <CropGlyph cropType={item.cropType} />
      <div className="min-w-0">
        <h3 className="truncate font-serif text-[17px] font-semibold text-ink">{title}</h3>
        <p className="truncate font-sans text-xs leading-snug text-muted">{meta}</p>
        <Tag className="mt-1.5">Harvest {item.harvestDate || 'date to confirm'}</Tag>
      </div>
      <div className="text-right">
        <strong className="block font-serif text-lg font-semibold text-ink">GHS {item.askingPrice ?? '—'}</strong>
        <small className="block font-sans text-[11px] text-muted">per {item.unit || 'unit'}</small>
        {actionLabel && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onAction?.(item)
            }}
            className="mt-1.5 rounded-[10px] bg-lime-soft px-3 py-2 font-sans text-xs font-bold text-leaf-dark transition hover:bg-lime"
          >
            {actionLabel}
          </button>
        )}
      </div>
    </article>
  )
}
