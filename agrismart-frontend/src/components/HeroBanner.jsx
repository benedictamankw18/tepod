import { useEffect, useState } from 'react'

// Banners on the storefront rotate automatically. With one (or zero) banner the
// behaviour is a static card; with several it becomes a slider that advances every
// INTERVAL_MS and pauses while hovered. Each transition uses a different animation
// type (slide right/left/up, zoom, fade) cycled by index so consecutive changes differ.
const INTERVAL_MS = 5000

// Keep in sync with the keyframes defined in src/index.css.
const ANIMATIONS = [
  'banner-slide-right',
  'banner-slide-left',
  'banner-zoom',
  'banner-fade',
  'banner-slide-up',
]

function BannerSlide({ banner }) {
  const eyebrow = banner?.eyebrow || 'Harvest marketplace'
  const title = banner?.title || 'Fresh from the farm, straight to you.'
  const subtitle =
    banner?.subtitle || 'Browse produce from nearby growers, pick your quantity, and lock in your order.'

  const inner = (
    <div
      className="absolute inset-0 flex flex-col justify-center overflow-hidden rounded-[18px] bg-leaf-dark p-6 text-white"
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
      <a href={banner.linkUrl} target="_blank" rel="noreferrer" className="block h-full">
        {inner}
      </a>
    )
  }
  return inner
}

export default function HeroBanner({ banners = [] }) {
  const list = Array.isArray(banners) ? banners : []
  const count = list.length

  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)

  const slideable = count > 1
  const safeIndex = count > 0 ? index % count : 0

  useEffect(() => {
    if (!slideable || paused) return undefined
    const timer = setInterval(() => setIndex((i) => (i + 1) % count), INTERVAL_MS)
    return () => clearInterval(timer)
  }, [slideable, paused, count])

  if (!slideable) {
    return (
      <div className="relative mb-5 h-[170px]">
        <BannerSlide banner={count ? list[0] : null} />
      </div>
    )
  }

  const arrowCls =
    'pointer-events-auto grid h-8 w-8 place-items-center rounded-full bg-white/15 text-white backdrop-blur-sm transition hover:bg-white/30'

  return (
    <div
      className="relative mb-5"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="relative h-[170px] overflow-hidden rounded-[18px]">
        {list.map((b, i) => (
          <div
            key={i}
            className={`absolute inset-0 pointer-events-none ${i === safeIndex ? 'pointer-events-auto' : 'opacity-0'}`}
            style={{
              zIndex: i === safeIndex ? 1 : 0,
              animation: i === safeIndex ? undefined : 'none',
              visibility: i === safeIndex ? 'visible' : 'hidden',
            }}
          >
            {i === safeIndex && (
              <div className={`h-full ${ANIMATIONS[i % ANIMATIONS.length]}`}>
                <BannerSlide banner={b} />
              </div>
            )}
          </div>
        ))}
      </div>

      {count > 1 && (
        <>
          <div className="pointer-events-none absolute inset-x-0 top-1/2 z-10 flex -translate-y-1/2 justify-between px-3">
            <button
              type="button"
              aria-label="Previous banner"
              onClick={() => setIndex((i) => (i - 1 + count) % count)}
              className={arrowCls}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
              </svg>
            </button>
            <button
              type="button"
              aria-label="Next banner"
              onClick={() => setIndex((i) => (i + 1) % count)}
              className={arrowCls}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            </button>
          </div>
          <div className="absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1.5">
            {list.map((b, i) => (
              <button
                key={b.id || i}
                type="button"
                aria-label={`Go to banner ${i + 1}`}
                onClick={() => setIndex(i)}
                className={`h-2 rounded-full transition-all ${i === safeIndex ? 'w-5 bg-white' : 'w-2 bg-white/40 hover:bg-white/70'}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}