import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import AppShell, { useAppShell } from '../components/AppShell'
import { Panel, PanelHead } from '../components/Panel'
import Empty from '../components/Empty'
import {
  getMyPreCommitments,
  respondPrecommitment,
  fulfillPrecommitment,
  depositTransaction,
  payTransaction,
  getTransaction,
  getTransportRequestsForPreCommitment,
  createTransportRequest,
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

function BuyerCommitmentCard({ pc, busy, onAct, onMutate }) {
  const { flashToast } = useAppShell()
  const [tx, setTx] = useState(null)
  const [transport, setTransport] = useState(null)
  const [deposit, setDeposit] = useState('')
  const [working, setWorking] = useState(false)

  const inActive = ACTIVE.includes(pc.status)
  const depositShort = pc.agreedPrice ? Math.max(0, Math.round(pc.agreedPrice * 0.25 * 100) / 100) : 0

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
                {tx.paymentStatus === 'paid' && (
                  <p className="pt-0.5 text-[11px] font-bold text-leaf-dark">
                    Fully paid{tx.paidAt ? ` · ${new Date(tx.paidAt).toLocaleDateString()}` : ''}
                  </p>
                )}
              </div>
            )}
          </div>

          {tx && tx.paymentStatus !== 'paid' && (
            <div className="mt-1 flex items-center gap-2">
              <input
                type="number"
                min="0"
                step="0.01"
                value={deposit}
                placeholder={`Deposit (e.g. ${ghc(depositShort)})`}
                onChange={(e) => setDeposit(e.target.value)}
                className="w-full rounded-md border border-line bg-white px-2 py-1 font-sans text-xs text-ink outline-none focus:border-leaf"
                aria-label="Deposit amount"
              />
              <button
                type="button"
                disabled={busy || working || !deposit}
                onClick={() => act(() => depositTransaction(tx.id, Number(deposit)).then(setTx), 'Deposit recorded.')}
                className="shrink-0 rounded-[8px] border border-leaf px-2 py-1.5 font-sans text-xs font-bold text-leaf-dark transition hover:bg-paper disabled:opacity-50"
              >
                Deposit
              </button>
              <button
                type="button"
                disabled={busy || working}
                onClick={() => act(() => payTransaction(tx.id).then(setTx), 'Payment confirmed. Thanks!')}
                className="shrink-0 rounded-[8px] bg-leaf px-2 py-1.5 font-sans text-xs font-bold text-white transition hover:bg-leaf-dark disabled:opacity-50"
              >
                Pay balance
              </button>
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
                  <BuyerCommitmentCard key={pc.id} pc={pc} busy={busy} onAct={actOnPc} onMutate={load} />
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