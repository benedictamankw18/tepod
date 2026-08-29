import { useRegions } from '../lib/regions'
import SearchableSelect from './SearchableSelect'

const labelCls = 'mb-1 block font-sans text-[11px] uppercase tracking-[.06em] text-muted'

// Cascading Region + District selects driven by the backend regions registry.
// Values are the display names (matches the free-text region/district stored on
// users and listings); changing the region clears a district that no longer belongs.
export default function RegionDistrictSelects({
  region,
  district,
  onRegion,
  onDistrict,
  regionLabel = 'Region (optional)',
  districtLabel = 'District (optional)',
  className = '',
}) {
  const { regions } = useRegions()

  const activeRegion = regions.find((r) => r.id === region || r.name === region)
  const districts = activeRegion ? activeRegion.districts : []

  const handleRegion = (value) => {
    const next = regions.find((r) => r.id === value || r.name === value)
    const stillValid = next && (next.id === region || next.name === region)
    onRegion(value)
    if (!stillValid && district) onDistrict('')
  }

  const regionOptions = [
    { value: '', label: '(none)' },
    ...regions.map((r) => ({ value: r.name, label: r.name })),
    ...(region && !regions.some((r) => r.id === region || r.name === region)
      ? [{ value: region, label: region }]
      : []),
  ]
  const districtOptions = [
    { value: '', label: activeRegion ? '(none)' : 'Select a region first' },
    ...districts.map((d) => ({ value: d.name, label: d.name })),
    ...(district && !districts.some((d) => d.name === district)
      ? [{ value: district, label: district }]
      : []),
  ]

  return (
    <div className={`w-full sm:col-span-2 ${className}`}>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="mb-3">
          <label className={labelCls}>{regionLabel}</label>
          <SearchableSelect value={region} onChange={handleRegion} options={regionOptions} placeholder="(none)" />
        </div>
        <div className="mb-3">
          <label className={labelCls}>{districtLabel}</label>
          <SearchableSelect
            value={district}
            onChange={onDistrict}
            options={districtOptions}
            placeholder={activeRegion ? '(none)' : 'Select a region first'}
            disabled={!activeRegion && !district}
          />
        </div>
      </div>
    </div>
  )
}