import { Link } from 'react-router-dom'
import AppShell, { useAppShell } from '../components/AppShell'
import { Panel } from '../components/Panel'
import Reveal from '../components/Reveal'
import { SERVICE_CATEGORIES, SERVICE_STEPS } from '../lib/services'

function ServicesContent() {
  const { flashToast } = useAppShell()

  const request = (label) =>
    flashToast(`Noted. A field facilitator will connect you with a verified ${label} provider within field hours.`)

  return (
    <div className="space-y-6">
      <header>
        <span className="font-sans text-[11px] font-bold uppercase tracking-[.15em] text-leaf">
          AgriSmart AI · financial &amp; farm support
        </span>
        <h1 className="mt-2 font-serif text-[clamp(28px,3.6vw,40px)] font-semibold leading-none tracking-[-.05em] text-ink">
          Beyond the market place
        </h1>
        <p className="mt-2 max-w-[600px] font-sans text-sm leading-relaxed text-muted">
          AgriSmart connects farmers and buyers with verified financial institutions and service providers — loans,
          fertilizer, equipment, transport, and storage — so you can produce and trade with fewer gaps.
        </p>
      </header>

      <Panel className="border-leaf/40">
        <p className="font-sans text-[13px] leading-relaxed text-ink">
          <strong className="font-serif text-[15px]">What we are — and are not.</strong>
          <br />
          We connect, we don&rsquo;t lend or sell. The loan, fertilizer sale, transport, or storage is arranged with
          an established partner who is verified by our team. AgriSmart&rsquo;s job is opening the door to the right
          provider near you.
        </p>
      </Panel>

      <section>
        <div className="mb-3">
          <h2 className="font-serif text-[19px] font-semibold tracking-[-.04em] text-ink">Services available</h2>
          <p className="mt-0.5 font-sans text-xs text-muted">
            Tap a service to tell us what you need — a field facilitator follows up with a verified provider.
          </p>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {SERVICE_CATEGORIES.map((s, i) => (
            <Reveal key={s.id} delay={0.05 + i * 0.04}>
              <div className="flex h-full flex-col rounded-[15px] border border-line bg-surface p-4 hover-lift">
                <div className="flex items-center gap-2.5">
                  <span className="text-2xl" aria-hidden="true">
                    {s.emoji}
                  </span>
                  <h3 className="font-serif text-[17px] font-semibold tracking-[-.03em] text-ink">{s.title}</h3>
                </div>
                <p className="mt-2 font-sans text-[13px] leading-relaxed text-muted">{s.copy}</p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {s.providers.map((p) => (
                    <span
                      key={p}
                      className="rounded-full bg-thumb px-2.5 py-1 font-sans text-[10px] font-semibold text-ink/70"
                    >
                      {p}
                    </span>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => request(s.title)}
                  className="mt-4 w-fit rounded-[10px] bg-leaf px-4 py-2.5 font-sans text-xs font-bold text-white transition hover:bg-leaf-dark"
                >
                  Request service
                </button>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 font-serif text-[19px] font-semibold tracking-[-.04em] text-ink">How it works</h2>
        <Panel>
          <ol className="space-y-4">
            {SERVICE_STEPS.map((st, i) => (
              <li key={st.title} className="flex gap-4">
                <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-lime-soft font-serif text-sm font-bold text-leaf-dark">
                  {i + 1}
                </span>
                <div>
                  <strong className="block font-serif text-[15px] font-semibold text-ink">{st.title}</strong>
                  <p className="mt-0.5 font-sans text-[13px] leading-relaxed text-muted">{st.copy}</p>
                </div>
              </li>
            ))}
          </ol>
        </Panel>
      </section>

      <section>
        <h2 className="mb-3 font-serif text-[19px] font-semibold tracking-[-.04em] text-ink">Why it matters</h2>
        <Panel>
          <ul className="space-y-2.5 font-sans text-[13px] leading-relaxed text-muted">
            <li className="flex gap-3">
              <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-lime" />
              Built around what farmers told us in field interviews — access to money, inputs, water, labour,
              transport, and storage.
            </li>
            <li className="flex gap-3">
              <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-lime" />
              One place for financing, inputs, equipment, haulage, and storage, instead of hunting each service
              separately.
            </li>
            <li className="flex gap-3">
              <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-lime" />
              Providers are verified before they are offered, so you deal with established partners.
            </li>
            <li className="flex gap-3">
              <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-lime" />
              Demand is pooled across farmers, which helps providers serve rural areas fairly.
            </li>
          </ul>
        </Panel>
      </section>

      <Panel>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-serif text-[16px] font-semibold tracking-[-.03em] text-ink">
              During the pilot, your field facilitator hands you vetted contacts.
            </h2>
            <p className="mt-1 max-w-[560px] font-sans text-[12px] leading-relaxed text-muted">
              A full provider directory opens as more partners join. Need something else, like help with an existing
              listing or payment?
            </p>
          </div>
          <Link
            to="/support"
            className="shrink-0 rounded-[10px] border border-leaf px-4 py-2.5 font-sans text-xs font-bold text-leaf transition hover:bg-leaf hover:text-white"
          >
            Open support →
          </Link>
        </div>
      </Panel>
    </div>
  )
}

export default function ServicesPage() {
  return (
    <AppShell activeId="services">
      <ServicesContent />
    </AppShell>
  )
}