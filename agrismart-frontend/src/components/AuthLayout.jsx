import harvestImg from '../assets/media/african-female-farmers-preparing-successful-harvest_1105604-80888.jpg'

export default function AuthLayout({ title, subtitle, children }) {
  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 overflow-hidden">
      <img
        src={harvestImg}
        alt=""
        aria-hidden="true"
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div className="absolute inset-0 bg-ink/50" aria-hidden="true" />
      <div className="relative z-10 w-full max-w-md">
        <div className="mb-6 text-center">
          <span className="mx-auto mb-3 grid h-11 w-11 place-items-center rounded-xl bg-lime font-sans text-xl font-extrabold text-leaf-dark">
            A
          </span>
          <h1 className="font-serif text-3xl font-bold text-white">AgriSmart</h1>
          <p className="mt-1 font-sans text-sm text-lime">Empowering Ghanaian farmers &amp; buyers</p>
        </div>
        <div className="rounded-[18px] border border-line bg-white p-8 shadow">
          <h2 className="font-serif text-[24px] font-semibold tracking-[-.04em] text-ink">{title}</h2>
          {subtitle && <p className="mt-1 font-sans text-sm text-muted">{subtitle}</p>}
          <div className="mt-6">{children}</div>
        </div>
      </div>
    </div>
  )
}
