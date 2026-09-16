// Region + district registry. Region/district pickers across the app draw from the
// backend's regions/districts tables via useRegions(); DEFAULT_REGIONS is a sync
// fallback (offline / before the API responds) that mirrors the seeded region rows
// so the region picker never blocks on the fetch (districts load with the API).
import { useEffect, useState } from 'react'
import { getRegions } from './api'

export const DEFAULT_REGIONS = [
  'greater accra',
  'ashanti',
  'central',
  'eastern',
  'western',
  'western north',
  'northern',
  'savannah',
  'north east',
  'upper east',
  'upper west',
  'volta',
  'oti',
  'bono',
  'bono east',
  'ahafo',
].map((id) => ({ id, name: displayName(id), districts: [] }))

export function displayName(id) {
  return String(id || '')
    .trim()
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

// Districts belonging to a given region value (matched by id or display name).
export function districtsFor(regions, regionValue) {
  const r = regions.find((x) => x.id === regionValue || x.name === regionValue)
  return r ? r.districts : []
}

// Shared, cached fetch: the first component to call useRegions() kicks it off and
// every mount resolves from the same promise, so the registry is fetched once.
let regionsPromise = null

function fetchRegions() {
  if (!regionsPromise) {
    regionsPromise = getRegions().then((list) =>
      Array.isArray(list) && list.length ? list : DEFAULT_REGIONS
    )
  }
  return regionsPromise
}

export function useRegions() {
  const [regions, setRegions] = useState(DEFAULT_REGIONS)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    fetchRegions().then((list) => {
      if (!alive) return
      setRegions(list)
      setLoading(false)
    })
    return () => {
      alive = false
    }
  }, [])

  return { regions, loading }
}