import { useEffect, useRef, useState } from 'react'
import { getCart, addToCart, setCartLineQty, removeFromCart, clearCart as apiClearCart } from './api'

// Server-side cart (cart_items table). The DB is the source of truth; local state
// is an optimistic mirror. Mutations fire the API call and reconcile from the
// server on failure so the UI never shows a stale/malformed cart.
export function useCart(enabled = true) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(enabled)
  const itemsRef = useRef(items)
  itemsRef.current = items

  const reload = async () => {
    try {
      setItems(await getCart())
    } catch {
      // network/auth issue; keep current optimistic state
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!enabled) {
      setItems([])
      setLoading(false)
      return
    }
    reload()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled])

  const apply = (next) => {
    setItems(next)
    itemsRef.current = next
  }

  const add = async (product, qty = 1) => {
    if (!enabled) return
    const current = itemsRef.current
    const existing = current.find((l) => l.listingId === product.id)
    if (existing) {
      const resolveSetQty = (delta) =>
        Promise.resolve().then(() => {
          const line = { ...existing, qty: existing.qty + delta }
          apply(current.map((l) => (l.listingId === product.id ? line : l)))
          return setCartLineQty(product.id, line.qty)
        })
      try {
        await resolveSetQty(qty)
      } catch {
        reload()
        throw Error('Could not update the cart')
      }
      return
    }
    const line = {
      listingId: product.id,
      cropType: product.cropType,
      unit: product.unit,
      askingPrice: product.askingPrice,
      minimumPrice: product.minimumPrice,
      availableQty: product.quantity,
      qty: Math.max(1, Math.min(qty, product.quantity || 999)),
    }
    apply([...current, line])
    try {
      await addToCart({ listingId: product.id, quantity: line.qty })
    } catch {
      reload()
      throw Error('Could not add to the cart')
    }
  }

  const setQty = async (listingId, delta) => {
    if (!enabled) return
    const current = itemsRef.current
    const existing = current.find((l) => l.listingId === listingId)
    if (!existing) return
    const next = existing.qty + delta
    if (next <= 0) {
      await remove(listingId)
      return
    }
    apply(current.map((l) => (l.listingId === listingId ? { ...l, qty: next } : l)))
    try {
      await setCartLineQty(listingId, next)
    } catch {
      reload()
    }
  }

  const remove = async (listingId) => {
    if (!enabled) return
    apply(itemsRef.current.filter((l) => l.listingId !== listingId))
    try {
      await removeFromCart(listingId)
    } catch {
      reload()
    }
  }

  const clear = async () => {
    if (!enabled) return
    apply([])
    try {
      await apiClearCart()
    } catch {
      reload()
    }
  }

  const count = items.length
  const subtotal = items.reduce((n, l) => n + l.qty * Number(l.askingPrice || 0), 0)

  return { items, add, setQty, remove, clear, count, subtotal, loading }
}
