import { useEffect, useRef, useState } from 'react'
import { getCurrentPrice, getWishlist, addWishlistItem, removeWishlistItem } from './api'

// Default crop used for the price signal/dashboard until the user picks one.
export function primaryCropFor(user) {
  const crops = user?.purchaseCrops || user?.primaryCrops || []
  return crops.length ? crops[0] : 'tomato'
}

// Server-side wishlist (favourite produce), persisted to the wishlist_items table.
// The DB is the source of truth; local state is an optimistic mirror that is
// reconciled from the server on failure so the UI never shows stale items.
export function useWishlist(user) {
  const [ids, setIds] = useState(() => new Set())
  const idsRef = useRef(ids)
  idsRef.current = ids

  const load = async () => {
    try {
      const list = await getWishlist()
      setIds(new Set((list || []).map((l) => l.listingId)))
    } catch {
      // network/auth issue; keep current optimistic state
    }
  }

  useEffect(() => {
    if (!user) {
      setIds(new Set())
      return
    }
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  const toggle = async (id) => {
    const current = idsRef.current
    const has = current.has(id)
    const next = new Set(current)
    if (has) next.delete(id)
    else next.add(id)
    setIds(next)
    try {
      if (has) await removeWishlistItem(id)
      else await addWishlistItem(id)
    } catch {
      setIds(current)
    }
  }

  return { ids, toggle }
}

// Latest market price for a crop/unit (used by the dashboard summary + prices page).
export function useCurrentPrice(crop, market) {
  const [price, setPrice] = useState(null)

  useEffect(() => {
    if (!crop) return
    let alive = true
    getCurrentPrice(crop, market)
      .then((p) => alive && setPrice(p))
      .catch(() => alive && setPrice(null))
    return () => {
      alive = false
    }
  }, [crop, market])

  return price
}
