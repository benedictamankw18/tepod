import { useEffect, useRef, useState } from 'react'
import { createListing, updateListing, uploadImage, getMyFarms } from '../lib/api'
import { useCrops, cropKey, displayName } from '../lib/crops'
import { Panel, PanelHead } from './Panel'
import RegionDistrictSelects from './RegionDistrictSelects'
import SearchableSelect from './SearchableSelect'
import { inputCls, labelCls } from '../lib/ui'

const fieldCls = 'mb-3'
const MAX_IMAGES = 5
const MATURITY_OPTIONS = ['Mature / Ready', 'Partially mature', 'Unripe / Green']

export default function ListingForm({ defaultLocation = '', listing, onDone, onCancel }) {
  const isEdit = Boolean(listing)
  const { crops, units } = useCrops()
  const initialImages = (listing?.imageUrls || (listing?.imageUrl ? [listing.imageUrl] : [])) || []
  const initialCrop = listing?.cropType || 'tomato'
  const initialDefaultUnit = crops.find((c) => c.id === initialCrop)?.defaultUnit || 'bag'
  const [form, setForm] = useState({
    cropType: initialCrop,
    quantity: listing?.quantity != null ? String(listing.quantity) : '',
    unit: listing?.unit || initialDefaultUnit,
    unitEdited: false,
    askingPrice: listing?.askingPrice != null ? String(listing.askingPrice) : '',
    minimumPrice: listing?.minimumPrice != null ? String(listing.minimumPrice) : '',
    harvestDate: listing?.harvestDate || '',
    location: listing?.location || defaultLocation,
    region: listing?.region || '',
    district: listing?.district || '',
    gpsAddress: listing?.gpsAddress || '',
    details: listing?.details || '',
    maturity: MATURITY_OPTIONS.includes(listing?.maturity)
      ? listing.maturity
      : listing?.maturity
        ? '__custom__'
        : '',
    customMaturity: MATURITY_OPTIONS.includes(listing?.maturity) ? '' : listing?.maturity || '',
  })
  const [images, setImages] = useState(initialImages)
  const [uploading, setUploading] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [farms, setFarms] = useState([])
  const [farmId, setFarmId] = useState(listing?.farmId || '')
  const fileRef = useRef(null)

  // The farmer's own farm plots, so a listing can be linked to the plot it was grown on.
  useEffect(() => {
    let alive = true
    getMyFarms()
      .then((res) => {
        if (!alive) return
        setFarms([...(res?.preHarvest || []), ...(res?.postHarvest || [])])
      })
      .catch(() => {
        if (alive) setFarms([])
      })
    return () => {
      alive = false
    }
  }, [])

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))
  const setValue = (key) => (value) => setForm((f) => ({ ...f, [key]: value }))

  // Choosing a crop helps buyers by defaulting the unit to the crop's suggested unit
  // (e.g. tomatoes ship in crates), as long as the user hasn't already picked one.
  const setCrop = (id) => {
    setForm((f) => {
      const base = { ...f, cropType: id }
      if (id === '__custom__' || f.unitEdited) return base
      const unit = crops.find((c) => c.id === id)?.defaultUnit || f.unit
      return { ...base, unit }
    })
  }

  const setUnit = (id) => setForm((f) => ({ ...f, unit: id, unitEdited: true }))

  const setMaturity = (v) =>
    setForm((f) => ({ ...f, maturity: v === '__custom__' ? '__custom__' : v }))
  const setCustomMaturity = (e) => setForm((f) => ({ ...f, customMaturity: e.target.value }))

  const cropOptions = [
    ...crops.map((c) => ({ value: c.id, label: c.name })),
    ...(form.cropType &&
    form.cropType !== '__custom__' &&
    !crops.some((c) => c.id === form.cropType)
      ? [{ value: form.cropType, label: displayName(form.cropType) }]
      : []),
  ]
  const unitOptions = [
    ...units.map((u) => ({ value: u.id, label: u.name })),
    ...(form.unit && !units.some((u) => u.id === form.unit)
      ? [{ value: form.unit, label: form.unit }]
      : []),
  ]
  const maturityOptions = [
    ...MATURITY_OPTIONS,
    { value: '__custom__', label: '+ Custom…' },
  ]
  const farmOptions = [
    { value: '', label: '(none)' },
    ...farms.map((f) => ({ value: f.id, label: `${f.name}${f.cropType ? ` (${f.cropType})` : ''}` })),
  ]

  const pickFiles = (e) => {
    const files = Array.from(e.target.files || [])
    addFiles(files)
    e.target.value = ''
  }

  const addFiles = async (files) => {
    const room = MAX_IMAGES - images.length
    const take = files.slice(0, room)
    if (!take.length) {
      setError(`You can attach up to ${MAX_IMAGES} images.`)
      return
    }
    setError('')
    setUploading(true)
    try {
      const urls = []
      for (const f of take) {
        const { url } = await uploadImage(f)
        urls.push(url)
      }
      setImages((prev) => [...prev, ...urls].slice(0, MAX_IMAGES))
    } catch (err) {
      setError(err.message || 'Image upload failed.')
    } finally {
      setUploading(false)
    }
  }

  const removeImage = (url) => setImages((prev) => prev.filter((u) => u !== url))

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      const cropType = cropKey(form.cropType)
      const payload = {
        cropType,
        quantity: Number(form.quantity),
        unit: form.unit,
        askingPrice: Number(form.askingPrice),
        minimumPrice: form.minimumPrice === '' || form.minimumPrice == null ? undefined : Number(form.minimumPrice),
        harvestDate: form.harvestDate || undefined,
        location: form.location.trim() || undefined,
        region: form.region.trim() || undefined,
        district: form.district.trim() || undefined,
        gpsAddress: form.gpsAddress.trim() || undefined,
        details: form.details.trim() || undefined,
        maturity:
          (form.maturity === '__custom__' ? form.customMaturity : form.maturity).trim() || undefined,
        farmId: farmId || undefined,
        imageUrls: images,
      }
      if (isEdit) {
        await updateListing(listing.id, payload)
      } else {
        await createListing(payload)
      }
      onDone?.()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const finalCrop = cropKey(form.cropType)
  const canSubmit =
    !!finalCrop && Number(form.quantity) > 0 && Number(form.askingPrice) >= 0 && !uploading && !(form.minimumPrice !== '' && form.minimumPrice != null && Number(form.minimumPrice) < 0)

  return (
    <Panel>
      <PanelHead
        title={isEdit ? 'Edit listing' : 'Create a listing'}
        sub={isEdit ? 'Update the details buyers see for this listing.' : 'Give buyers the details they need to commit with confidence.'}
      />
      {error && (
        <div className="mb-4 rounded-md border border-bad/40 bg-bad px-3 py-2 font-sans text-sm text-bad-text">
          {error}
        </div>
      )}
      <form onSubmit={submit}>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className={fieldCls}>
            <label className={labelCls}>Crop</label>
            <SearchableSelect
              value={form.cropType}
              onChange={setCrop}
              options={cropOptions}
              placeholder="Select a crop or type a new one"
              allowNew
            />
          </div>
          <div className={fieldCls}>
            <label className={labelCls}>Quantity</label>
            <input
              className={inputCls}
              type="number"
              min="1"
              value={form.quantity}
              onChange={set('quantity')}
              placeholder="e.g. 10"
            />
          </div>
          <div className={fieldCls}>
            <label className={labelCls}>Unit</label>
            <SearchableSelect
              value={form.unit}
              onChange={setUnit}
              options={unitOptions}
              placeholder="Select a unit or type a new one"
              allowNew
            />
          </div>
          <div className={fieldCls}>
            <label className={labelCls}>Asking price (GHS)</label>
            <input
              className={inputCls}
              type="number"
              min="0"
              value={form.askingPrice}
              onChange={set('askingPrice')}
              placeholder="e.g. 450"
            />
          </div>
          <div className={fieldCls}>
            <label className={labelCls}>Minimum acceptable price (GHS)</label>
            <input
              className={inputCls}
              type="number"
              min="0"
              value={form.minimumPrice}
              onChange={set('minimumPrice')}
              placeholder="Optional"
            />
            <p className="mt-1 font-sans text-[11px] text-muted">
              Buyer offers below this amount are declined. Blank means any offer is accepted.
            </p>
          </div>
          <div className={fieldCls}>
            <label className={labelCls}>Expected harvest</label>
            <input className={inputCls} type="date" value={form.harvestDate} onChange={set('harvestDate')} />
          </div>
          <div className={fieldCls}>
            <label className={labelCls}>Maturity (optional)</label>
            <SearchableSelect value={form.maturity} onChange={setMaturity} options={maturityOptions} placeholder="(not set)" />
            {form.maturity === '__custom__' && (
              <input
                className={`${inputCls} mt-2`}
                value={form.customMaturity}
                onChange={setCustomMaturity}
                placeholder="e.g. Near full ripeness"
              />
            )}
          </div>
          <div className={fieldCls}>
            <label className={labelCls}>Location</label>
            <input className={inputCls} value={form.location} onChange={set('location')} placeholder="e.g. Kasoa" />
          </div>
          <RegionDistrictSelects
            region={form.region}
            district={form.district}
            onRegion={setValue('region')}
            onDistrict={setValue('district')}
          />
          <div className={`${fieldCls} sm:col-span-2`}>
            <label className={labelCls}>GPS address (optional)</label>
            <input className={inputCls} value={form.gpsAddress} onChange={set('gpsAddress')} placeholder="e.g. GA-123-4567" />
          </div>
          <div className={`${fieldCls} sm:col-span-2`}>
            <label className={labelCls}>Details (optional)</label>
            <textarea
              className={`${inputCls} min-h-[88px] resize-y`}
              rows={3}
              value={form.details}
              onChange={set('details')}
              placeholder="e.g. Freshly harvested, grade A, ready within 2 days…"
            />
          </div>
          <div className={`${fieldCls} sm:col-span-2`}>
            <label className={labelCls}>Farm (optional)</label>
            <SearchableSelect value={farmId} onChange={setFarmId} options={farmOptions} placeholder="(none)" />
          </div>
        </div>

        <div className={fieldCls}>
          <label className={labelCls}>Photos ({images.length}/{MAX_IMAGES})</label>
          <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={pickFiles} />
          <div className="flex flex-wrap gap-2">
            {images.map((url) => (
              <div key={url} className="relative h-20 w-20 overflow-hidden rounded-lg border border-line">
                <img src={url} alt="" className="h-full w-full object-cover" />
                <button
                  type="button"
                  onClick={() => removeImage(url)}
                  aria-label="Remove photo"
                  className="absolute right-1 top-1 grid h-5 w-5 place-items-center rounded-full bg-ink/60 font-sans text-[10px] font-bold text-white hover:bg-ink"
                >
                  ×
                </button>
              </div>
            ))}
            {images.length < MAX_IMAGES && (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="grid h-20 w-20 place-items-center rounded-lg border border-dashed border-line bg-surface font-sans text-xs text-muted transition hover:border-leaf hover:text-leaf disabled:opacity-50"
              >
                {uploading ? 'Uploading…' : '+ Add'}
              </button>
            )}
          </div>
          <p className="mt-1.5 font-sans text-[11px] text-muted">Add up to {MAX_IMAGES} images (JPG, PNG, or WebP).</p>
        </div>

        <div className="mt-1 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-[10px] border border-line bg-white px-4 py-2.5 font-sans text-xs font-bold text-ink hover:bg-paper"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={busy || !canSubmit}
            className="rounded-[10px] bg-leaf px-4 py-2.5 font-sans text-xs font-bold text-white transition hover:bg-leaf-dark disabled:opacity-50"
          >
            {busy ? 'Saving…' : isEdit ? 'Save changes' : 'Publish listing'}
          </button>
        </div>
      </form>
    </Panel>
  )
}
