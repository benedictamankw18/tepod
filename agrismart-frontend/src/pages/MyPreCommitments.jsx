import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import AppShell, { useAppShell } from '../components/AppShell'
import { Panel, PanelHead } from '../components/Panel'
import Empty from '../components/Empty'
import {
  getMyPreCommitments,
  respondPrecommitment,
  fulfillPrecommitment,
  getTransaction,
  getTransportRequestsForPreCommitment,
  createTransportRequest,
  getPaymentsConfig,
  chargeTransaction,
  confirmPayment,
} from '../lib/api'

const STATUS_TAG = {
  pending: 'pending',
  accepted: 'accepted',
  preparing: 'preparing',
  ready: 'ready to pick up',
  delivered: 'delivered',
  completed: 'completed',
  rejected: 'declined',
  countered: 'a counter is waiting',
}

// Action-required offers first, then un-responded offers, then the live fulfilment
// band, with settled ones last.
const STATUS_RANK = { countered: 0, pending: 1, accepted: 2, preparing: 3, ready: 4, delivered: 5, completed: 6, rejected: 7 }

const ACTIVE = ['accepted', 'preparing', 'ready', 'delivered']

const ghc = (n) => `GHS ${Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`

const ESCROW_LABEL = {
  funds_collected: 'Funds collected — held in escrow',
  held: 'Funds held in escrow — released on delivery',
  released: 'Escrow released to farmer',
  refunded: 'Escrow refunded',
}

function BuyerCommitmentCard({ pc, payConfig, busy, onAct, onMutate }) {
  const { flashToast } = useAppShell()
  const [tx, setTx] = useState(null)
  const [transport, setTransport] = useState(null)
  const [deposit, setDeposit] = useState('')
  const [pendingPayment, setPendingPayment] = useState(null)
  const [working, setWorking] = useState(false)
  const [gaveUp, setGaveUp] = useState(false)

  const inActive = ACTIVE.includes(pc.status)
  const depositShort = pc.agreedPrice
    ? Math.max(0, Math.round((pc.agreedPrice * (pc.quantity || 1)) * (payConfig?.escrowEnabled ? (payConfig.depositPercent || 0) : 0.25) * 100) / 100)
    : 0

  // The pending paystack checkout survives page reloads in localStorage so the poll
  // below can resume on the next visit and still settle the sale automatically.
  const storageKey = pc.transactionId ? `nkabom:pending-payment:${pc.transactionId}` : null
  const savePending = (paymentId) => {
    if (!storageKey || !paymentId) return
    try {
      window.localStorage.setItem(storageKey, JSON.stringify({ paymentId }))
    } catch {
      /* storage unavailable - poll still works while the tab stays open */
    }
  }
  const clearPending = () => {
    if (!storageKey) return
    try {
      window.localStorage.removeItem(storageKey)
    } catch {
      /* noop */
    }
  }
  const readPending = () => {
    if (!storageKey) return null
    try {
      const raw = window.localStorage.getItem(storageKey)
      const parsed = raw ? JSON.parse(raw) : null
      return parsed && parsed.paymentId ? parsed : null
    } catch {
      return null
    }
  }

  useEffect(() => {
    if (!inActive) return
    let live = true
    if (pc.transactionId) {
      getTransaction(pc.transactionId)
        .then((t) => live && setTx(t))
        .catch(() => live && setTx(null))
    }
    getTransportRequestsForPreCommitment(pc.id)
      .then((list) => live && setTransport(Array.isArray(list) && list.length ? list[0] : null))
      .catch(() => live && setTransport(null))
    return () => {
      live = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pc.transactionId, pc.id, pc.status])

  const act = async (fn, okMsg) => {
    setWorking(true)
    try {
      await fn()
      flashToast(okMsg)
      onMutate()
    } catch (err) {
      flashToast(err.message || 'Something went wrong.')
    } finally {
      setWorking(false)
    }
  }

  // Start a Paystack charge. Simulated mode settles instantly; live mode opens the
  // Paystack checkout in a new tab and leaves a pending payment to confirm.
  const startCharge = async (kind, amount) => {
    setWorking(true)
    try {
      const res = await chargeTransaction(tx.id, {
        kind,
        ...(kind === 'deposit' ? { amount: amount || undefined } : {}),
      })
      if (res.simulated) {
        setTx(res.transaction)
        flashToast(kind === 'deposit' ? 'Deposit paid. Thanks!' : 'Payment confirmed. Thanks!')
        if (res.transaction?.paymentStatus === 'paid') onMutate()
        return
      }
      setPendingPayment(res.payment)
      setGaveUp(false)
      if (res.payment?.authorizationUrl) {
        savePending(res.payment.id)
        window.open(res.payment.authorizationUrl, '_blank', 'noopener,noreferrer')
      }
      flashToast('Checkout opened — complete the payment, then confirm here.')
    } catch (err) {
      flashToast(err.message || 'Could not start the payment.')
    } finally {
      setWorking(false)
    }
  }

  // Live payments: once a Paystack checkout is open, poll confirmPayment so the
  // sale settles automatically the moment Paystack reports success. The pending id
  // is also read back from localStorage so the poll resumes after a page reload.
  // A 202 { status: "pending" } response just means "keep waiting" - only a settled
  // payment (200) or a terminal error ends the loop.
  useEffect(() => {
    if (payConfig?.simulated) return
    const resumed = pendingPayment || readPending()
    if (!resumed?.id) return
    let stop = false
    let attempts = 0
    const MAX_ATTEMPTS = 30
    const tick = async () => {
      if (stop) return
      attempts += 1
      try {
        const res = await confirmPayment(resumed.id)
        if (stop) return
        if (res?.status === 'pending') {
          if (attempts >= MAX_ATTEMPTS) {
            setGaveUp(true)
            return
          }
          setTimeout(tick, 3000)
          return
        }
        clearPending()
        setGaveUp(false)
        setTx(res.tx)
        setPendingPayment(null)
        flashToast('Payment confirmed. Thanks!')
        if (res.tx?.paymentStatus === 'paid') onMutate()
      } catch {
        if (!stop && attempts < MAX_ATTEMPTS) {
          setTimeout(tick, 3000)
        } else if (!stop) {
          setGaveUp(true)
        }
      }
    }
    const timer = setTimeout(tick, 3000)
    return () => {
      stop = true
      clearTimeout(timer)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingPayment, payConfig?.simulated])

  const finishPending = async () => {
    if (!pendingPayment) return
    setWorking(true)
    try {
      const res = await confirmPayment(pendingPayment.id)
      if (res?.status === 'pending') {
        setGaveUp(true)
        flashToast('Payment hasn\'t cleared yet — keep the checkout window open, then try again.')
        return
      }
      clearPending()
      setGaveUp(false)
      setTx(res.tx)
      setPendingPayment(null)
      flashToast('Payment confirmed. Thanks!')
      if (res.tx?.paymentStatus === 'paid') onMutate()
    } catch (err) {
      flashToast(err.message || 'Payment not confirmed yet. Please complete it in the checkout window.')
    } finally {
      setWorking(false)
    }
  }

  const name = String(pc.listing?.cropType || 'Produce')
  const status = STATUS_TAG[pc.status] || pc.status
  const paid = tx ? Number(tx.paidAmount) + Number(tx.depositAmount) : 0
  const unpaid = tx ? Number(tx.agreedPrice) - paid : 0

  return (
    <div className="flex flex-col gap-2 rounded-[12px] border border-line bg-white p-3">
      <div className="flex items-start justify-between gap-2">
        <strong className="truncate font-sans text-sm font-bold capitalize text-ink">
          {name.charAt(0).toUpperCase() + name.slice(1)} · {pc.quantity}
          {pc.listing?.unit ? ` ${pc.listing.unit}` : ''}
        </strong>
        <span className="shrink-0 rounded-full bg-paper px-2 py-0.5 font-sans text-[10px] font-bold capitalize text-muted">
          {status}
        </span>
      </div>

      <p className="font-sans text-xs text-muted">
        {pc.farmer?.name || 'Farmer'}
        {pc.agreedPrice != null
          ? ` · agreed at ${ghc(pc.agreedPrice)} per unit`
          : ` · your offer ${ghc(pc.offeredPrice)} per unit`}
      </p>

      {pc.status === 'countered' && (
        <>
          <p className="font-sans text-xs font-bold text-leaf-dark">
            Farmer counter: {ghc(pc.counterPrice)} per unit
          </p>
          <div className="mt-1 flex gap-2">
            <button
              type="button"
              disabled={busy || working}
              onClick={() => onAct(pc, 'accept')}
              className="flex-1 rounded-[8px] bg-leaf px-2 py-1.5 font-sans text-xs font-bold text-white transition hover:bg-leaf-dark disabled:opacity-50"
            >
              Accept {ghc(pc.counterPrice)}
            </button>
            <button
              type="button"
              disabled={busy || working}
              onClick={() => onAct(pc, 'decline')}
              className="flex-1 rounded-[8px] border border-red-200 bg-red-50 px-2 py-1.5 font-sans text-xs font-bold text-red-700 transition hover:bg-red-100 disabled:opacity-50"
            >
              Decline
            </button>
          </div>
        </>
      )}

      {inActive && (
        <>
          {pc.status === 'ready' && (
            <p className="rounded-[8px] bg-paper px-2 py-1.5 font-sans text-xs text-muted">
              Produce is ready
              {pc.actualQuantity != null ? ` · weighed ${pc.actualQuantity} ${pc.listing?.unit || ''}` : ''}
              {pc.condition ? ` · ${pc.condition}` : ''}
            </p>
          )}

          <div className="rounded-[8px] border border-line bg-paper/50 p-2 font-sans text-xs text-muted">
            {!tx ? (
              <span>Loading payment details…</span>
            ) : (
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span>Agreed</span>
                  <strong className="font-sans text-ink">{ghc(tx.agreedPrice)}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Paid (deposit + payments)</span>
                  <strong className="font-sans text-ink">{ghc(paid)}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Balance</span>
                  <strong className="font-sans text-ink">{ghc(unpaid)}</strong>
                </div>
                {tx.escrowStatus && tx.escrowStatus !== 'none' && (
                  <p className="pt-0.5 text-[11px] font-bold text-leaf-dark">
                    {ESCROW_LABEL[tx.escrowStatus] || tx.escrowStatus}
                  </p>
                )}
                {tx.paymentStatus === 'paid' && (
                  <p className="pt-0.5 text-[11px] font-bold text-leaf-dark">
                    Fully paid{tx.paidAt ? ` · ${new Date(tx.paidAt).toLocaleDateString()}` : ''}
                  </p>
                )}
              </div>
            )}
          </div>

          {pendingPayment && (
            <div className="mt-1 rounded-[8px] border border-line bg-paper p-2 font-sans text-xs text-muted">
              <p>
                {payConfig?.simulated
                  ? 'Payment started. Confirmed automatically once it clears.'
                  : gaveUp
                    ? 'Payment still pending — complete it in the Paystack window that opened, then tap Confirm below. Your payment clears the moment Paystack reports it.'
                    : `Waiting for Paystack to confirm your ${ghc(pendingPayment.amount)} payment…`}
              </p>
              <button
                type="button"
                disabled={busy || working}
                onClick={finishPending}
                className="mt-1.5 rounded-[8px] bg-leaf px-2 py-1.5 font-sans text-xs font-bold text-white transition hover:bg-leaf-dark disabled:opacity-50"
              >
                Confirm {payConfig?.simulated ? 'payment' : 'completed payment'}
              </button>
            </div>
          )}

          {tx && tx.paymentStatus !== 'paid' && !pendingPayment && (
            <div className="mt-1 space-y-2">
              {payConfig?.escrowEnabled && (
                <p className="rounded-[8px] bg-paper px-2 py-1.5 font-sans text-[11px] leading-snug text-leaf-dark">
                  Your {payConfig.depositPercent}% deposit is held securely in escrow and only released to
                  the farmer after you confirm delivery.
                </p>
              )}
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={deposit}
                  placeholder={`Deposit (e.g. ${ghc(depositShort)})`}
                  onChange={(e) => setDeposit(e.target.value)}
                  className="w-full rounded-md border border-line bg-white px-2 py-1 font-sans text-xs text-ink outline-none focus:border-leaf sm:min-w-0 sm:flex-1"
                  aria-label="Deposit amount"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={busy || working || !deposit}
                    onClick={() => startCharge('deposit', Number(deposit))}
                    className="flex-1 rounded-[8px] border border-leaf px-2 py-1.5 font-sans text-xs font-bold text-leaf-dark transition hover:bg-paper disabled:opacity-50 sm:flex-none"
                  >
                    Deposit
                  </button>
                  <button
                    type="button"
                    disabled={busy || working}
                    onClick={() => startCharge('balance')}
                    className="flex-1 rounded-[8px] bg-leaf px-2 py-1.5 font-sans text-xs font-bold text-white transition hover:bg-leaf-dark disabled:opacity-50 sm:flex-none"
                  >
                    Pay balance
                  </button>
                </div>
              </div>
            </div>
          )}

          {pc.status === 'ready' && (
            <button
              type="button"
              disabled={busy || working}
              onClick={() => act(() => fulfillPrecommitment(pc.id, { step: 'delivered' }), 'Receipt confirmed.')}
              className="rounded-[8px] bg-leaf px-2 py-1.5 font-sans text-xs font-bold text-white transition hover:bg-leaf-dark disabled:opacity-50"
            >
              Confirm receipt
            </button>
          )}

          <div className="mt-0.5 flex items-center justify-between gap-2">
            {transport ? (
              <span className="truncate font-sans text-[11px] text-muted">
                Transport: {transport.status}
                {transport.pickupLocation ? ` · ${transport.pickupLocation}` : ''}
              </span>
            ) : (
              <button
                type="button"
                disabled={busy || working}
                onClick={() =>
                  act(
                    () => createTransportRequest({ precommitmentId: pc.id }).then((r) => setTransport(r)),
                    'Transport request sent.',
                  )
                }
                className="rounded-[8px] border border-line bg-paper px-2 py-1 font-sans text-[11px] font-bold text-ink transition hover:bg-paper/70 disabled:opacity-50"
              >
                Arrange transport
              </button>
            )}
          </div>
        </>
      )}

      {pc.status === 'completed' && (
        <>
          <p className="rounded-[8px] bg-paper px-2 py-1.5 font-sans text-xs text-muted">
            Sale completed{pc.completedAt ? ` · ${new Date(pc.completedAt).toLocaleDateString()}` : ''}
          </p>
          {pc.listing?.id && (
            <Link
              to={`/produce/${pc.listing.id}`}
              className="mt-0.5 inline-block rounded-[8px] border border-leaf px-2 py-1.5 text-center font-sans text-xs font-bold text-leaf-dark transition hover:bg-paper"
            >
              Leave a review
            </Link>
          )}
        </>
      )}
    </div>
  )
}

function MyPreCommitmentsContent() {
  const { user, flashToast } = useAppShell()
  const isBuyerAccount = user?.role === 'buyer' || user?.role === 'market_seller'
  const [myPcs, setMyPcs] = useState(null)
  const [busy, setBusy] = useState(false)
  const [payConfig, setPayConfig] = useState(null)

  useEffect(() => {
    getPaymentsConfig().then(setPayConfig).catch(() => setPayConfig(null))
  }, [])

  const load = () =>
    getMyPreCommitments()
      .then((list) => setMyPcs(Array.isArray(list) ? list : []))
      .catch(() => setMyPcs([]))

  useEffect(() => {
    if (!isBuyerAccount) return
    load()
    const t = setInterval(load, 20000)
    return () => clearInterval(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isBuyerAccount])

  const actOnPc = async (pc, action) => {
    setBusy(true)
    try {
      await respondPrecommitment(pc.id, { action })
      flashToast(action === 'accept' ? 'Counter accepted. Sale confirmed.' : 'Counter declined.')
      await load()
    } catch (err) {
      flashToast(err.message || 'Could not respond.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-5">
      <header>
        <span className="font-sans text-[11px] font-bold uppercase tracking-[.15em] text-leaf">
          My market activity
        </span>
        <h1 className="mt-2 font-serif text-[clamp(28px,3.6vw,40px)] font-semibold leading-none tracking-[-.05em] text-ink">
          My pre-commitments
        </h1>
        <p className="mt-2 font-sans text-sm text-muted">
          Offers you have placed. Respond to a farmer's counter, pay your deposit, and confirm
          receipt to close the sale.
        </p>
      </header>

      {!isBuyerAccount ? (
        <Panel>
          <PanelHead title="Pre-commitments" sub="Offers you place on farmers' produce." />
          <Empty
            title="This page is for buyers"
            hint="Only buyers and market sellers can submit pre-commitments."
          >
            <Link
              to="/"
              className="mt-3 inline-block rounded-[8px] bg-leaf px-3 py-1.5 font-sans text-xs font-bold text-white transition hover:bg-leaf-dark"
            >
              Browse the market
            </Link>
          </Empty>
        </Panel>
      ) : (
        <Panel>
          <PanelHead title="My offers" sub="Live commitments are acted on first, newest first." />
          {!myPcs ? (
            <Empty>Loading your pre-commitments…</Empty>
          ) : myPcs.length === 0 ? (
            <Empty
              title="No pre-commitments yet"
              hint="When you offer to buy produce, your commitments show up here."
            >
              <Link
                to="/"
                className="mt-3 inline-block rounded-[8px] bg-leaf px-3 py-1.5 font-sans text-xs font-bold text-white transition hover:bg-leaf-dark"
              >
                Browse the market
              </Link>
            </Empty>
          ) : (
            <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {[...myPcs]
                .sort((a, b) => {
                  const rank = (STATUS_RANK[a.status] ?? 9) - (STATUS_RANK[b.status] ?? 9)
                  return rank !== 0 ? rank : new Date(b.createdAt) - new Date(a.createdAt)
                })
                .map((pc) => (
                  <BuyerCommitmentCard key={pc.id} pc={pc} payConfig={payConfig} busy={busy} onAct={actOnPc} onMutate={load} />
                ))}
            </div>
          )}
        </Panel>
      )}
    </div>
  )
}

export default function MyPreCommitmentsPage() {
  return (
    <AppShell activeId="precommitments">
      <MyPreCommitmentsContent />
    </AppShell>
  )
}