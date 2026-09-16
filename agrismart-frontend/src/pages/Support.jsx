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
          <div key={it.title} className="rounded-[13px] border border-line bg-surface p-4">
            <strong className="font-serif text-[15px] font-semibold text-ink">{it.title}</strong>
            <p className="mt-1.5 font-sans text-xs leading-relaxed text-muted">{it.copy}</p>
          </div>
        ))}
      </div>

      <Panel>
        <PanelHead
          title="How payments work"
          sub="Funds are collected securely and only released once a sale completes."
        />
        <ul className="mb-4 list-inside list-disc space-y-1.5 font-sans text-sm leading-relaxed text-ink">
          <li>
            <strong>Deposit at checkout:</strong> when you take an offer you put down a deposit
            (30% by default) before the farmer prepares your order.
          </li>
          <li>
            <strong>Balance on readiness:</strong> once the produce is weighed and confirmed ready,
            you pay the remaining balance.
          </li>
          <li>
            <strong>Held in escrow:</strong> your money stays with the platform until you confirm
            you have received the produce.
          </li>
          <li>
            <strong>Farmer paid out automatically:</strong> on delivery confirmation the farmer
            receives their earnings (minus commission) to the bank account or mobile-money wallet
            saved in their settings.
          </li>
        </ul>
        <p className="mb-4 font-sans text-xs leading-relaxed text-muted">
          Payments run through Paystack and can be made by mobile money, bank or card. If a payout
          looks off, raise it here and a facilitator will investigate the ledger before anything
          is released.
        </p>
      </Panel>

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
          className="rounded-[10px] bg-lime-soft px-4 py-2.5 font-sans text-xs font-bold text-leaf-dark transition hover:bg-lime"
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
