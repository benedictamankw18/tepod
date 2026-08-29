// Crop type + unit registries. Crop/unit pickers across the app draw from the
// backend's crop_types and unit_of_measure tables via useCrops(); DEFAULT_CROPS
// and DEFAULT_UNITS are sync fallbacks (offline / before the API responds) that
// mirror the seeded rows so the UI never blocks on the fetch.
import { useEffect, useState } from 'react'
import { getCrops, getUnits } from './api'

export const DEFAULT_CROPS = [
  'tomato',
  'pepper',
  'maize',
  'plantain',
  'yam',
  'cassava',
  'cocoa',
  'rice',
  'groundnut',
  'mango',
  'banana',
  'cabbage',
  'onion',
  'pineapple',
  'garden eggs',
  'cocoyam',
]

export const DEFAULT_UNITS = [
  { id: 'bag', name: 'Bag', plural: 'bags', displayOrder: 1 },
  { id: 'bags', name: 'Bags', plural: 'bags', displayOrder: 2 },
  { id: 'basket', name: 'Basket', plural: 'baskets', displayOrder: 3 },
  { id: 'crate', name: 'Crate', plural: 'crates', displayOrder: 4 },
  { id: 'crates', name: 'Crates', plural: 'crates', displayOrder: 5 },
  { id: 'kg', name: 'Kilogram', plural: 'kg', displayOrder: 6 },
  { id: 'box', name: 'Box', plural: 'boxes', displayOrder: 7 },
  { id: 'bunch', name: 'Bunch', plural: 'bunches', displayOrder: 8 },
  { id: 'tubers', name: 'Tubers', plural: 'tubers', displayOrder: 9 },
  { id: 'heads', name: 'Heads', plural: 'heads', displayOrder: 10 },
  { id: 'pieces', name: 'Pieces', plural: 'pieces', displayOrder: 11 },
]

export function displayName(id) {
  return String(id || '')
    .trim()
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

// Normalize a label into the lowercase crop key convention used by crop_types.id
// (mirrors the backend's cropKey). Returns '' for invalid input.
export function cropKey(value) {
  const key = String(value || '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase()
  if (!/[a-z]/.test(key) || key.length > 50) return ''
  return key
}

const FALLBACK_CROPS = DEFAULT_CROPS.map((id, i) => ({
  id,
  name: displayName(id),
  defaultUnit: 'bags',
  emoji: null,
  gradientFrom: null,
  gradientTo: null,
  displayOrder: i + 1,
}))

// Shared, cached fetch: the first component to call useCrops() kicks it off and
// every mount resolves from the same promise, so the registries are fetched once.
let registryPromise = null

function fetchRegistry() {
  if (!registryPromise) {
    registryPromise = Promise.all([
      getCrops().catch(() => FALLBACK_CROPS),
      getUnits().catch(() => DEFAULT_UNITS),
    ]).then(([crops, units]) => ({
      crops: Array.isArray(crops) && crops.length ? crops : FALLBACK_CROPS,
      units: Array.isArray(units) && units.length ? units : DEFAULT_UNITS,
    }))
  }
  return registryPromise
}

export function useCrops() {
  const [data, setData] = useState({ crops: FALLBACK_CROPS, units: DEFAULT_UNITS })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    fetchRegistry().then((list) => {
      if (!alive) return
      setData(list)
      setLoading(false)
    })
    return () => {
      alive = false
    }
  }, [])

  return { ...data, loading }
}