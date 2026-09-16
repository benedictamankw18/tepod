import { useEffect, useState } from 'react'
import AppShell, { useAppShell } from '../components/AppShell'
import { Panel, PanelHead } from '../components/Panel'
import { Tag } from '../components/ListingCard'
import Empty from '../components/Empty'
import {
  getFarmerCommitments,
  respondPrecommitment,
  fulfillPrecommitment,
  getTransaction,
  getTransportRequestsForPreCommitment,
  createTransportRequest,
} from '../lib/api'

const STATUS_TAG = {
  pending: 'pending',
  accepted: 'accepted',
  preparing: 'preparing',
  ready: 'ready',
  delivered: 'delivered',
  completed: 'completed',
  rejected: 'declined',
  countered: 'countered',
}

const ACTIVE = ['accepted', 'preparing', 'ready', 'delivered']

const ghc = (n) => `GHS ${Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`

function ActivityRow({ title, sub }) {
  const color = 'var(--coral)'
  return (
    <div className="flex items-start gap-3">
      <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: color }} />
      <div>
        <strong className="block font-serif text-sm font-semibold text-ink">{title}</strong>
        <span className="mt-0.5 block font-sans text-[11px] text-muted">{sub}</span>
      </div>
    </div>
  )
}

function CommitmentCard({ c, onRespond, onFulfill, busy }) {
  const { flashToast } = useAppShell()
  const [counter, setCounter] = useState('')
  const [readyForm, setReadyForm] = useState(false)
  const [actualQty, setActualQty] = useState('')
  const [condition, setCondition] = useState('')
  const [tx, setTx] = useState(null)
  const [transport, setTransport] = useState(null)
  const [working, setWorking] = useState(false)

  const inActive = ACTIVE.includes(c.status)

  const line = `Offer from ${c.buyer?.name || 'Local buyer'}`
  const priceLine =
    c.status === 'countered'
      ? `Your counter: ${ghc(c.counterPrice)} · waiting for the buyer`
      : c.agreedPrice != null
        ? `Agreed at ${ghc(c.agreedPrice)} per unit`
        : `${ghc(c.offeredPrice)} per unit`

  useEffect(() => {
    if (!inActive) return
    let live = true
    if (c.transactionId) {
      getTransaction(c.transactionId)
        .then((t) => live && setTx(t))
        .catch(() => live && setTx(null))
    }
    getTransportRequestsForPreCommitment(c.id)
      .then((list) => live && setTransport(Array.isArray(list) && list.length ? list[0] : null))
      .catch(() => live && setTransport(null))
    return () => {
      live = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [c.transactionId, c.id, c.status])

  const fulfill = async (step, data = {}) => {
    setWorking(true)
    try {
      await onFulfill(c, step, data)
    } catch {
      // toast handled upstream
    } finally {
      setWorking(false)
    }
  }

  const arrangeTransport = async () => {
    setWorking(true)
    try {
      const r = await createTransportRequest({ precommitmentId: c.id })
      setTransport(r)
      flashToast('Transport request sent.')
    } catch (err) {
      flashToast(err.message || 'Could not arrange transport.')
    } finally {
      setWorking(false)
    }
  }

  return (
    <div className="rounded-[13px] border border-line bg-surface p-3.5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <strong className="block font-serif text-[15px] font-semibold capitalize text-ink sm:truncate">
            {c.buyer?.name || 'Buyer'} · {c.listing?.cropType || 'Produce'} · {c.quantity}{' '}
            {c.listing?.unit}
          </strong>
          <p className="mt-1 font-sans text-[11px] leading-snug text-muted sm:truncate">
            {line} · {priceLine}
          </p>
        </div>
        <Tag className="shrink-0">{STATUS_TAG[c.status] || c.status}</Tag>
      </div>

      {c.status === 'pending' && (
        <div className="mt-3 flex flex-col gap-2">
          <label className="flex items-center gap-2 font-sans text-[11px] text-muted">
            Counter at (GHS)
            <input
              type="number"
              min="0"
              step="0.01"
              value={counter}
              onChange={(e) => setCounter(e.target.value)}
              className="w-28 rounded-md border border-line bg-white px-2 py-1 font-sans text-sm font-semibold text-ink outline-none focus:border-leaf"
              aria-label={`Counter offer for ${c.listing?.cropType || 'listing'}`}
            />
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => onRespond(c, 'accept')}
              className="flex-1 rounded-[8px] bg-leaf px-2 py-1.5 font-sans text-xs font-bold text-white transition hover:bg-leaf-dark disabled:opacity-50"
            >
              Accept
            </button>
            <button
              type="button"
              disabled={busy || !counter}
              onClick={() => onRespond(c, 'counter', counter)}
              className="flex-1 rounded-[8px] border border-leaf px-2 py-1.5 font-sans text-xs font-bold text-leaf-dark transition hover:bg-paper disabled:opacity-50"
            >
              Counter
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => onRespond(c, 'reject')}
              className="flex-1 rounded-[8px] border border-bad/40 bg-bad px-2 py-1.5 font-sans text-xs font-bold text-bad-text transition hover:bg-bad-soft disabled:opacity-50"
            >
              Decline
            </button>
          </div>
        </div>
      )}

      {inActive && (
        <div className="mt-3 space-y-2">
          {c.status === 'ready' && (
            <p className="rounded-[8px] bg-paper px-2 py-1.5 font-sans text-[11px] text-muted">
              Ready for the buyer{c.actualQuantity != null ? ` · ${c.actualQuantity} ${c.listing?.unit || ''}` : ''}
              {c.condition ? ` · ${c.condition}` : ''} · waiting for receipt
            </p>
          )}
          {c.status === 'delivered' && (
            <p className="rounded-[8px] bg-paper px-2 py-1.5 font-sans text-[11px] text-muted">
              Buyer confirmed receipt — the sale closes once payment clears.
            </p>
          )}
          {c.status === 'completed' && (
            <p className="rounded-[8px] bg-paper px-2 py-1.5 font-sans text-[11px] text-muted">
              Sale completed
              {c.completedAt ? ` · ${new Date(c.completedAt).toLocaleDateString()}` : ''}
              {tx ? ` · payout ${ghc(tx.netAmount)}` : ''}
            </p>
          )}

          {tx && Number(tx.depositAmount) > 0 && tx.paymentStatus !== 'paid' && (
            <p className="rounded-[8px] bg-paper px-2 py-1.5 font-sans text-[11px] font-bold text-leaf-dark">
              Deposit received:{' '}
              {ghc(Number(tx.depositAmount) + Number(tx.paidAmount))} of {ghc(tx.agreedPrice)}
            </p>
          )}

          {(c.status === 'accepted' || c.status === 'preparing') && (
            <>
              {c.status === 'accepted' && (
                <button
                  type="button"
                  disabled={busy || working}
                  onClick={() => fulfill('prepare')}
                  className="w-full rounded-[8px] border border-leaf px-2 py-1.5 font-sans text-xs font-bold text-leaf-dark transition hover:bg-paper disabled:opacity-50"
                >
                  Mark as preparing
                </button>
              )}
              {!readyForm ? (
                <button
                  type="button"
                  disabled={busy || working}
                  onClick={() => {
                    setActualQty(String(c.quantity ?? ''))
                    setCondition('')
                    setReadyForm(true)
                  }}
                  className="w-full rounded-[8px] bg-leaf px-2 py-1.5 font-sans text-xs font-bold text-white transition hover:bg-leaf-dark disabled:opacity-50"
                >
                  Mark as ready
                </button>
              ) : (
                <div className="flex flex-col gap-2 rounded-[8px] border border-line bg-white p-2">
                  <label className="flex items-center gap-2 font-sans text-[11px] text-muted">
                    Actual quantity ({c.listing?.unit || 'units'})
                    <input
                      type="number"
                      min="0"
                      max={c.quantity ?? undefined}
                      step="1"
                      value={actualQty}
                      onChange={(e) => setActualQty(e.target.value)}
                      className="w-20 rounded-md border border-line bg-white px-2 py-1 font-sans text-xs text-ink outline-none focus:border-leaf"
                    />
                  </label>
                  <p className="font-sans text-[11px] text-muted">
                    Buyer requested {c.quantity} {c.listing?.unit || 'units'} — you can deliver up to that amount.
                  </p>
                  <label className="flex items-center gap-2 font-sans text-[11px] text-muted">
                    Condition
                    <input
                      type="text"
                      value={condition}
                      maxLength="200"
                      placeholder="e.g. fresh, graded"
                      onChange={(e) => setCondition(e.target.value)}
                      className="w-full rounded-md border border-line bg-white px-2 py-1 font-sans text-xs text-ink outline-none focus:border-leaf"
                    />
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={busy || working}
                      onClick={() => {
                        const qty = actualQty === '' ? null : Number(actualQty)
                        if (qty != null && qty > c.quantity) {
                          flashToast(`Can't deliver more than the buyer's requested ${c.quantity} ${c.listing?.unit || 'units'}.`)
                          return
                        }
                        fulfill('ready', {
                          actualQuantity: qty,
                          condition: condition.trim() || null,
                        })
                        setReadyForm(false)
                      }}
                      className="flex-1 rounded-[8px] bg-leaf px-2 py-1.5 font-sans text-xs font-bold text-white transition hover:bg-leaf-dark disabled:opacity-50"
                    >
                      Confirm ready
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => setReadyForm(false)}
                      className="flex-1 rounded-[8px] border border-line px-2 py-1.5 font-sans text-xs font-bold text-muted transition hover:bg-paper"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          {transport ? (
            <p className="border-t border-line pt-2 font-sans text-[11px] text-muted sm:truncate">
              Transport: {transport.status}
              {transport.pickupLocation ? ` · ${transport.pickupLocation}` : ''}
            </p>
          ) : (
            <button
              type="button"
              disabled={busy || working}
              onClick={arrangeTransport}
              className="w-full rounded-[8px] border border-line bg-paper px-2 py-1 font-sans text-[11px] font-bold text-ink transition hover:bg-paper/70 disabled:opacity-50"
            >
              Arrange shared transport
            </button>
          )}
        </div>
      )}
    </div>
  )
}

function ActivityContent() {
  const { user, isFarmer, flashToast } = useAppShell()
  const [commitments, setCommitments] = useState(null)
  const [busy, setBusy] = useState(false)

  const load = () =>
    getFarmerCommitments(user.id)
      .then((c) => setCommitments(c))
      .catch(() => setCommitments([]))

  useEffect(() => {
    if (!isFarmer) return
    load()
    const t = setInterval(load, 20000)
    return () => clearInterval(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.id, isFarmer])

  const respond = async (c, action, counter) => {
    setBusy(true)
    try {
      await respondPrecommitment(c.id, {
        action,
        ...(action === 'counter' ? { counterPrice: Number(counter) } : {}),
      })
      flashToast(
        action === 'accept'
          ? 'Offer accepted. Ask the buyer for a deposit.'
          : action === 'reject'
            ? 'Offer declined. The listing is open again.'
            : 'Counter sent to the buyer.',
      )
      await load()
    } catch (err) {
      flashToast(err.message || 'Could not respond to the offer.')
    } finally {
      setBusy(false)
    }
  }

  const fulfill = async (c, step, data = {}) => {
    try {
      await fulfillPrecommitment(c.id, { step, ...data })
      flashToast(
        step === 'prepare'
          ? 'Marked as preparing — the buyer now sees the progress.'
          : step === 'ready'
            ? "Marked as ready for pickup. We'll let the buyer know."
            : 'Updated.',
      )
      await load()
    } catch (err) {
      flashToast(err.message || 'Could not update.')
    }
  }

  if (!isFarmer) {
    return (
      <div className="space-y-5">
        <header>
          <span className="font-sans text-[11px] font-bold uppercase tracking-[.15em] text-leaf">
            My activity
          </span>
          <h1 className="mt-2 font-serif text-[clamp(28px,3.6vw,40px)] font-semibold leading-none tracking-[-.05em] text-ink">
            Buyer commitments
          </h1>
          <p className="mt-2 font-sans text-sm text-muted">
            This page is for growers tracking buyer interest in their harvest.
          </p>
        </header>
        <Empty>Activity is available to growers once they list produce.</Empty>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <header>
        <span className="font-sans text-[11px] font-bold uppercase tracking-[.15em] text-leaf">
          My activity
        </span>
        <h1 className="mt-2 font-serif text-[clamp(28px,3.6vw,40px)] font-semibold leading-none tracking-[-.05em] text-ink">
          Your buyer commitments
        </h1>
        <p className="mt-2 font-sans text-sm text-muted">
          Accept, counter, or decline offers — then prepare the produce and record the deposit once
          a sale is agreed.
        </p>
      </header>

      <Panel>
        <PanelHead title="Buyer offers" sub="Review and respond to offers on your produce." />
        {!commitments ? (
          <Empty>Loading commitments…</Empty>
        ) : commitments.length === 0 ? (
          <Empty>Your latest buyer commitments will appear here.</Empty>
        ) : (
          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
            {commitments.slice(0, 8).map((c) => (
              <CommitmentCard key={c.id} c={c} onRespond={respond} onFulfill={fulfill} busy={busy} />
            ))}
          </div>
        )}
      </Panel>

      <Panel>
        <PanelHead title="Recent activity" sub="Small steps toward a better sale." />
        {!commitments || commitments.length === 0 ? (
          <div className="space-y-3">
            <ActivityRow
              title="Your harvest workspace is ready"
              sub="Create a listing to start receiving buyer commitments."
            />
          </div>
        ) : (
          <div className="space-y-3">
            {commitments.slice(0, 3).map((c) => (
              <ActivityRow
                key={c.id}
                title={`${c?.listing?.cropType || 'Produce'} offer ${c.status}`}
                sub={`${c.quantity} ${c?.listing?.unit || 'units'} · ${ghc(
                  c.agreedPrice != null ? c.agreedPrice : c.offeredPrice,
                )} · ${new Date(c.createdAt).toLocaleDateString()}`}
              />
            ))}
          </div>
        )}
      </Panel>
    </div>
  )
}

export default function ActivityPage() {
  return (
    <AppShell activeId="requests">
      <ActivityContent />
    </AppShell>
  )
}