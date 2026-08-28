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
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-white">AgriSmart AI</h1>
          <p className="text-lime mt-1">Empowering Ghanaian farmers &amp; buyers</p>
        </div>
        <div className="bg-white border border-line rounded-2xl shadow-card p-8">
          <h2 className="text-xl font-semibold text-ink">{title}</h2>
          {subtitle && <p className="text-sm text-muted mt-1">{subtitle}</p>}
          <div className="mt-6">{children}</div>
        </div>
      </div>
    </div>
  )
}
