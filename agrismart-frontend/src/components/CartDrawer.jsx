import { useState } from 'react'
import { createPrecommitment } from '../lib/api'
import { Link } from 'react-router-dom'

function CloseIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  )
}

export default function CartDrawer({
  open,
  onClose,
  items,
  onSetQty,
  onRemove,
  onClear,
  subtotal,
  count,
  verified,
  onVerifyPrompt,
  onSuccess,
}) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const checkout = async () => {
    setError('')
    if (!verified) {
      onVerifyPrompt?.()
      return
    }
    if (!items.length) return
    setBusy(true)
    try {
      const invalid = items.filter(
        (l) => !l.listingId || !Number.isFinite(Number(l.qty)) || Number(l.qty) <= 0,
      )
      if (invalid.length) throw new Error('Some items in your cart are missing details. Remove and re-add them.')
      await Promise.all(
        items.map((l) =>
          createPrecommitment({
            listingId: l.listingId,
            quantity: Number(l.qty),
            offeredPrice: Number(l.askingPrice ?? 0),
          }),
        ),
      )
      onClear()
      onSuccess?.()
    } catch (err) {
      setError(err.message || 'Could not place the order.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      {open && <div className="fixed inset-0 z-40 bg-ink/40" onClick={onClose} aria-hidden="true" />}
      <aside
        className={`fixed right-0 top-0 z-50 flex h-full w-full max-w-sm flex-col bg-white shadow-xl transition-transform duration-300 ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
        aria-label="Shopping cart"
      >
        <div className="flex items-center justify-between border-b border-line px-4 py-3.5">
          <div>
            <h2 className="font-serif text-xl font-semibold tracking-[-.04em] text-ink">Your cart</h2>
            <p className="font-sans text-xs text-muted">{count} item{count === 1 ? '' : 's'}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close cart"
            className="grid h-9 w-9 place-items-center rounded-lg text-muted transition hover:bg-paper hover:text-ink"
          >
            <CloseIcon />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3">
          {items.length === 0 ? (
            <div className="py-10 text-center">
              <p className="font-serif text-lg text-ink">Your cart is empty</p>
              <p className="mt-1 font-sans text-sm text-muted">Add some fresh produce to get started.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {items.map((l) => (
                <div key={l.listingId} className="rounded-xl border border-line bg-[#fbfcfa] p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-serif text-base font-semibold capitalize text-ink">
                        {l.cropType || 'Produce'}
                      </p>
                      <p className="font-sans text-xs text-muted">
                        GHS {l.askingPrice} per {l.unit || 'unit'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => onRemove(l.listingId)}
                      aria-label={`Remove ${l.cropType}`}
                      className="font-sans text-xs text-red-600 hover:underline"
                    >
                      Remove
                    </button>
                  </div>
                  <div className="mt-2.5 flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => onSetQty(l.listingId, -1)}
                        aria-label="Decrease quantity"
                        className="h-7 w-7 rounded-md border border-line text-ink hover:bg-paper"
                      >
                        −
                      </button>
                      <span className="min-w-[2rem] text-center font-sans text-sm font-bold text-ink">{l.qty}</span>
                      <button
                        type="button"
                        onClick={() => onSetQty(l.listingId, 1)}
                        aria-label="Increase quantity"
                        className="h-7 w-7 rounded-md border border-line text-ink hover:bg-paper"
                      >
                        +
                      </button>
                    </div>
                    <strong className="font-serif text-base font-semibold text-ink">
                      GHS {(l.qty * Number(l.askingPrice || 0)).toFixed(2).replace(/\.00$/, '')}
                    </strong>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {items.length > 0 && (
          <div className="border-t border-line px-4 py-3.5">
            {error && (
              <div className="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 font-sans text-xs text-red-700">
                {error}
              </div>
            )}
            <div className="mb-3 flex items-center justify-between">
              <span className="font-sans text-sm text-muted">Subtotal</span>
              <strong className="font-serif text-xl font-semibold text-ink">
                GHS {subtotal.toFixed(2).replace(/\.00$/, '')}
              </strong>
            </div>
            {!verified && (
              <p className="mb-2 font-sans text-xs text-muted">
                <Link to="/verify" className="font-semibold text-leaf hover:underline">
                  Verify your profile
                </Link>{' '}
                to place an order.
              </p>
            )}
            <button
              type="button"
              onClick={checkout}
              disabled={busy}
              className="w-full rounded-[10px] bg-leaf py-3 font-sans text-sm font-bold text-white transition hover:bg-leaf-dark disabled:opacity-50"
            >
              {busy ? 'Placing order…' : `Place order · GHS ${subtotal.toFixed(2).replace(/\.00$/, '')}`}
            </button>
          </div>
        )}
      </aside>
    </>
  )
}
