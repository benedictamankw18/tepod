import AppShell, { useAppShell } from '../components/AppShell'
import { Panel, PanelHead } from '../components/Panel'

function SupportContent() {
  const { flashToast } = useAppShell()

  const items = [
    {
      title: 'Listing produce',
      copy: 'Stuck creating a listing, adding photos, or setting a price? We can walk you through it.',
    },
    {
      title: 'Offers & commitments',
      copy: 'Questions about buyer offers, requests, or commitment status.',
    },
    {
      title: 'Payments',
      copy: 'Momo transfer timing, payment confirmations, or a payout that looks off.',
    },
    {
      title: 'Transport',
      copy: 'Help arranging movement of produce between farm, market, and buyer.',
    },
  ]

  return (
    <div className="space-y-5">
      <header>
        <span className="font-sans text-[11px] font-bold uppercase tracking-[.15em] text-leaf">
          Support
        </span>
        <h1 className="mt-2 font-serif text-[clamp(28px,3.6vw,40px)] font-semibold leading-none tracking-[-.05em] text-ink">
          Need a hand?
        </h1>
        <p className="mt-2 font-sans text-sm text-muted">
          Our pilot support team responds during field hours. Keep your phone nearby for a quick
          callback.
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        {items.map((it) => (
          <div key={it.title} className="rounded-[13px] border border-line bg-[#fbfcfa] p-4">
            <strong className="font-serif text-[15px] font-semibold text-ink">{it.title}</strong>
            <p className="mt-1.5 font-sans text-xs leading-relaxed text-muted">{it.copy}</p>
          </div>
        ))}
      </div>

      <Panel>
        <PanelHead
          title="Open a support request"
          sub="Tell us what you need help with and a field facilitator will reach out."
        />
        <button
          type="button"
          onClick={() =>
            flashToast('Support request noted. A field facilitator will contact you within field hours.')
          }
          className="rounded-[10px] bg-[#e8f0c5] px-4 py-2.5 font-sans text-xs font-bold text-leaf-dark transition hover:bg-lime"
        >
          Request support
        </button>
      </Panel>
    </div>
  )
}

export default function SupportPage() {
  return (
    <AppShell activeId="support">
      <SupportContent />
    </AppShell>
  )
}
