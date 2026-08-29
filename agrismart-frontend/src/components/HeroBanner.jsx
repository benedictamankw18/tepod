export default function HeroBanner({ banner }) {
  const eyebrow = banner?.eyebrow || 'Harvest marketplace'
  const title = banner?.title || 'Fresh from the farm, straight to you.'
  const subtitle =
    banner?.subtitle || 'Browse produce from nearby growers, pick your quantity, and lock in your order.'

  const inner = (
    <div
      className="relative mb-5 flex min-h-[150px] flex-col justify-center overflow-hidden rounded-[18px] bg-leaf-dark p-6 text-white"
      style={banner?.imageUrl ? { backgroundImage: `url(${banner.imageUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}
    >
      {banner?.imageUrl && <div className="absolute inset-0 bg-leaf-dark/60" aria-hidden="true" />}
      <div className="relative">
        {eyebrow && (
          <span className="font-sans text-[11px] font-bold uppercase tracking-[.15em] text-lime">{eyebrow}</span>
        )}
        <h2 className="mt-2 max-w-[420px] font-serif text-[clamp(24px,3.4vw,34px)] font-semibold leading-tight tracking-[-.04em]">
          {title}
        </h2>
        {subtitle && (
          <p className="relative z-10 mt-2 max-w-[360px] font-sans text-xs leading-relaxed text-[#c8d9d0]">
            {subtitle}
          </p>
        )}
      </div>
    </div>
  )

  if (banner?.linkUrl) {
    return (
      <a href={banner.linkUrl} target="_blank" rel="noreferrer" className="block">
        {inner}
      </a>
    )
  }
  return inner
}
