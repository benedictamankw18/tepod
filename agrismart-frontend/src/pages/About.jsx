import { Link } from 'react-router-dom'
import { getToken } from '../lib/auth'
import logo from '../assets/media/logo.jpeg'
import { SproutIcon, CartIcon, TruckIcon, SupportIcon, InfoIcon, MoneyIcon, BadgeCheckIcon } from '../components/icons'

const steps = [
  {
    icon: 'sprout',
    title: '1 · Growers list their harvest',
    text: 'Farmers publish what they are growing, how much, and at what price — at pre- and post-harvest stage.',
  },
  {
    icon: 'cart',
    title: '2 · Buyers commit early',
    text: 'Retailers, wholesalers and processors place pre-commitments before harvest, locking in supply and a fair price.',
  },
  {
    icon: 'check',
    title: '3 · Farmers confirm the sale',
    text: 'An accepted pre-commitment becomes a binding sale, so less produce goes to waste for want of a buyer.',
  },
  {
    icon: 'money',
    title: '4 · Payment is tracked',
    text: 'Deposits and balances are charged securely through Paystack and held in escrow — farmers are paid automatically once you confirm delivery.',
  },
  {
    icon: 'truck',
    title: '5 · Transport is arranged',
    text: 'Farmers and buyers coordinate pickup with transport providers, tracked to market and home.',
  },
  {
    icon: 'bell',
    title: '6 · Everyone stays informed',
    text: 'Offers, confirmations, payments and pickup updates arrive by in-app inbox, SMS and email.',
  },
]

export default function About() {
  const signedIn = Boolean(getToken())
  return (
    <div className="min-h-screen bg-paper px-4 py-10">
      <div className="mx-auto w-full max-w-3xl">
        <Link
          to={signedIn ? '/' : '/login'}
          className="font-sans text-sm font-medium text-leaf hover:underline"
<<<<<<< HEAD
         target="_blank" rel="noopener noreferrer">
=======
        >
>>>>>>> origin/development
          ← Back
        </Link>

        <header className="mt-4 rounded-[18px] border border-line bg-leaf-dark px-6 py-8 text-center text-fog shadow md:px-10">
          <img src={logo} alt="NKABOM AGRILINK logo" className="mx-auto mb-3 h-14 w-14 rounded-lg object-contain" />
          <p className="font-sans text-[11px] font-bold uppercase tracking-[.15em] text-lime">
            About us
          </p>
          <h1 className="mt-2 font-serif text-[clamp(28px,4.5vw,44px)] font-semibold leading-none tracking-[-.05em]">
            About NKABOM AGRILINK
          </h1>
          <p className="mx-auto mt-3 max-w-xl font-sans text-sm leading-relaxed text-fern">
            Better timing. Fairer prices. Less produce lost between harvest and home.
          </p>
        </header>

        <div className="mt-6 space-y-6 rounded-[18px] border border-line bg-white p-6 shadow md:p-8">
          <section>
            <div className="flex items-center gap-2">
              <InfoIcon />
              <h2 className="font-serif text-xl font-semibold text-ink">The platform</h2>
            </div>
            <p className="mt-2 font-sans text-sm leading-relaxed text-ink">
              NKABOM AGRILINK is a marketplace connecting Ghanaian smallholder farmers with
              wholesale, retail and processor buyers — plus the price signals, payment tracking,
              transport coordination and SMS/USSD access that a modern food value chain needs.
            </p>
            <p className="mt-2 font-sans text-sm leading-relaxed text-ink">
              Farmers get buyers for their harvest before it spoils. Buyers get reliable supply at
              a fair price. Both sides stay connected from offer to pickup to payment, wherever
              they are — on the app or offline by SMS.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl font-semibold text-ink">Our mission</h2>
            <p className="mt-2 font-sans text-sm leading-relaxed text-ink">
              We exist to end the middle of the cycle that wastes Ghana&apos;s harvest: the gap
              between produce being ready and a buyer showing up. By helping farmers and buyers
              commit to each other early, agree on a fair price, and track the sale through to
              delivery and payment, we put more of the value where it belongs — in the hands of
              the people who grow and feed our communities.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl font-semibold text-ink">How it works</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {steps.map((s) => (
                <div key={s.title} className="rounded-[12px] border border-paper bg-paper/40 p-4">
                  <StepIcon icon={s.icon} />
                  <h3 className="mt-2.5 font-sans text-sm font-bold text-ink">{s.title}</h3>
                  <p className="mt-1 font-sans text-[13px] leading-relaxed text-muted">{s.text}</p>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h2 className="font-serif text-xl font-semibold text-ink">Payments &amp; escrow</h2>
            <ul className="mt-2 list-inside list-disc space-y-1.5 font-sans text-sm leading-relaxed text-ink">
              <li>Buyers pay by mobile money, bank or card through Paystack.</li>
              <li>A deposit (30% by default) locks in the order before the farmer prepares it.</li>
              <li>Money is held in escrow until the buyer confirms delivery.</li>
              <li>The farmer is then paid out automatically — commission is taken off the top.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-serif text-xl font-semibold text-ink">Who it&apos;s for</h2>
            <ul className="mt-2 list-inside list-disc space-y-1 font-sans text-sm leading-relaxed text-ink">
              <li>Smallholder farmers wanting committed buyers for their harvest.</li>
              <li>Wholesalers, retailers and processors needing reliable supply at fair prices.</li>
              <li>Market sellers buying produce for resale.</li>
              <li>Transport providers moving produce from farm to market.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-serif text-xl font-semibold text-ink">About us</h2>
            <p className="mt-2 font-sans text-sm leading-relaxed text-ink">
              NKABOM AGRILINK is built by a team of developers, agriculture specialists and
              market facilitators working to make Ghana&apos;s food systems work for everyone in the
              chain.
            </p>
            <div className="mt-4 rounded-[12px] border border-dashed border-line bg-paper/40 p-4">
              <p className="font-sans text-[11px] font-bold uppercase tracking-[.12em] text-muted">
                Your team details — replace these placeholders
              </p>
              <ul className="mt-2 space-y-1 font-sans text-sm text-ink">
                <li><strong>Organisation:</strong> [Organisation name]</li>
                <li><strong>Founders / team:</strong> [Founder one — role], [Founder two — role]</li>
                <li><strong>Based in:</strong> [Town / region, Ghana]</li>
                <li><strong>Contact:</strong> [support email] · [support phone]</li>
              </ul>
            </div>
            <p className="mt-3 font-sans text-sm leading-relaxed text-ink">
              Have a question or want to partner with us? Reach out through the in-app Support page
              once you sign in.
            </p>
          </section>

          {!signedIn && (
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                to="/login"
                className="rounded-[10px] bg-leaf px-5 py-2.5 text-center font-sans text-sm font-bold text-white transition hover:bg-leaf-dark"
<<<<<<< HEAD
               target="_blank" rel="noopener noreferrer">
=======
              >
>>>>>>> origin/development
                Sign in
              </Link>
              <Link
                to="/register"
                className="rounded-[10px] border border-leaf bg-white px-5 py-2.5 text-center font-sans text-sm font-bold text-leaf transition hover:bg-paper"
<<<<<<< HEAD
               target="_blank" rel="noopener noreferrer">
=======
              >
>>>>>>> origin/development
                Create an account
              </Link>
            </div>
          )}
        </div>

        <p className="mt-6 text-center font-sans text-xs text-muted">
          © {new Date().getFullYear()} NKABOM AGRILINK ·{' '}
<<<<<<< HEAD
          <Link to="/terms" className="text-leaf hover:underline" target="_blank" rel="noopener noreferrer">
            Terms
          </Link>{' '}
          ·{' '}
          <Link to="/privacy" className="text-leaf hover:underline" target="_blank" rel="noopener noreferrer">
=======
          <Link to="/terms" className="text-leaf hover:underline">
            Terms
          </Link>{' '}
          ·{' '}
          <Link to="/privacy" className="text-leaf hover:underline">
>>>>>>> origin/development
            Privacy
          </Link>
        </p>
      </div>
    </div>
  )
}

function StepIcon({ icon }) {
  if (icon === 'sprout') return <SproutIcon />
  if (icon === 'cart') return <CartIcon />
  if (icon === 'check') return <BadgeCheckIcon />
  if (icon === 'money') return <MoneyIcon />
  if (icon === 'truck') return <TruckIcon />
  return <SupportIcon />
}