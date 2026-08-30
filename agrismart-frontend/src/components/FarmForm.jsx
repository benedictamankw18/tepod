import { useRef, useState } from 'react'
import { createFarm, updateFarm, uploadImage } from '../lib/api'
import { useCrops, cropKey, displayName } from '../lib/crops'
import { Panel, PanelHead } from './Panel'
import SearchableSelect from './SearchableSelect'

const inputCls =
  'w-full rounded-[10px] border border-line bg-[#fbfcfa] px-3 py-2.5 font-sans text-sm text-ink outline-none focus:border-leaf focus:shadow-[0_0_0_3px_rgba(29,101,79,.12)]'
const labelCls = 'mb-1 block font-sans text-[11px] uppercase tracking-[.06em] text-muted'
const fieldCls = 'mb-3'
const STAGE_OPTIONS = [
  { value: 'pre_harvest', label: 'Pre-harvest' },
  { value: 'post_harvest', label: 'Post-harvest' },
]
const STATUS_OPTIONS = [
  { value: 'growing', label: 'Growing' },
  { value: 'ready', label: 'Ready' },
  { value: 'harvested', label: 'Harvested' },
]

export default function FarmForm({ defaultLocation = '', farm, onDone, onCancel }) {
  const isEdit = Boolean(farm)
  const { crops } = useCrops()
  const [form, setForm] = useState({
    name: farm?.name || '',
    cropType: farm?.cropType || 'tomato',
    stage: farm?.stage || 'pre_harvest',
    status: farm?.status || 'growing',
    expectedHarvestDate: farm?.expectedHarvestDate || '',
    location: farm?.location || defaultLocation,
    lat: farm?.lat != null ? String(farm.lat) : '',
    lng: farm?.lng != null ? String(farm.lng) : '',
  })
  const [imageUrl, setImageUrl] = useState(farm?.imageUrl || '')
  const [uploading, setUploading] = useState(false)
  const [detecting, setDetecting] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef(null)

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  const detectLocation = () => {
    if (!window.confirm("Are you currently at the farm? We'll use your device's GPS to fill in the coordinates.")) return
    if (!navigator.geolocation) {
      setError("Location detection isn't supported on this device.")
      return
    }
    setError('')
    setDetecting(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setForm((f) => ({
          ...f,
          lat: pos.coords.latitude.toFixed(6),
          lng: pos.coords.longitude.toFixed(6),
        }))
        setDetecting(false)
      },
      (err) => {
        setDetecting(false)
        const msg =
          err.code === err.PERMISSION_DENIED
            ? 'Location access was denied. Enable it in your browser or enter the coordinates manually.'
            : err.code === err.TIMEOUT
              ? 'Timed out getting your location. Try again or enter the coordinates manually.'
              : 'Your location is unavailable right now. Try again or enter the coordinates manually.'
        setError(msg)
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 },
    )
  }

  const cropOptions = [
    ...crops.map((c) => ({ value: c.id, label: c.name })),
    ...(form.cropType &&
    form.cropType !== '__custom__' &&
    !crops.some((c) => c.id === form.cropType)
      ? [{ value: form.cropType, label: displayName(form.cropType) }]
      : []),
  ]

  const pickFile = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setUploading(true)
    setError('')
    try {
      const { url } = await uploadImage(file)
      setImageUrl(url)
    } catch (err) {
      setError(err.message || 'Image upload failed.')
    } finally {
      setUploading(false)
    }
  }

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      const payload = {
        name: form.name.trim() || undefined,
        cropType: cropKey(form.cropType),
        stage: form.stage,
        status: form.status.trim() || undefined,
        expectedHarvestDate: form.expectedHarvestDate || undefined,
        location: form.location.trim() || undefined,
        lat: form.lat === '' ? undefined : Number(form.lat),
        lng: form.lng === '' ? undefined : Number(form.lng),
        imageUrl: imageUrl || undefined,
      }
      if (isEdit) {
        await updateFarm(farm.id, payload)
      } else {
        await createFarm(payload)
      }
      onDone?.()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const canSubmit = !!cropKey(form.cropType) && !uploading

  return (
    <Panel>
      <PanelHead
        title={isEdit ? 'Edit farm' : 'Add a farm'}
        sub={isEdit ? 'Update the details of this plot.' : 'Track a pre- or post-harvest plot you grow.'}
      />
      {error && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 font-sans text-sm text-red-700">
          {error}
        </div>
      )}
      <form onSubmit={submit}>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className={fieldCls}>
            <label className={labelCls}>Farm name</label>
            <input className={inputCls} value={form.name} onChange={set('name')} placeholder="e.g. North plot" />
          </div>
          <div className={fieldCls}>
            <label className={labelCls}>Crop</label>
            <SearchableSelect
              value={form.cropType}
              onChange={(v) => setForm((f) => ({ ...f, cropType: v }))}
              options={cropOptions}
              placeholder="Select a crop or type a new one"
              allowNew
            />
          </div>
          <div className={fieldCls}>
            <label className={labelCls}>Stage</label>
            <div className="grid grid-cols-2 gap-1 rounded-[10px] border border-line bg-[#fbfcfa] p-1">
              {STAGE_OPTIONS.map((s) => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, stage: s.value }))}
                  className={`rounded-[8px] px-3 py-2 font-sans text-xs font-bold transition ${
                    form.stage === s.value ? 'bg-leaf text-white' : 'text-muted hover:bg-paper'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
          <div className={fieldCls}>
            <label className={labelCls}>Status</label>
            <SearchableSelect
              value={form.status}
              onChange={(v) => setForm((f) => ({ ...f, status: v }))}
              options={STATUS_OPTIONS}
              placeholder="Growing, Ready, Harvested — or type a new one"
              allowNew
            />
          </div>
          <div className={fieldCls}>
            <label className={labelCls}>Expected harvest</label>
            <input className={inputCls} type="date" value={form.expectedHarvestDate} onChange={set('expectedHarvestDate')} />
          </div>
          <div className={fieldCls}>
            <label className={labelCls}>Location</label>
            <input className={inputCls} value={form.location} onChange={set('location')} placeholder="e.g. Kasoa" />
          </div>
          <div className={fieldCls}>
            <label className={labelCls}>Latitude (optional)</label>
            <input className={inputCls} type="number" step="any" value={form.lat} onChange={set('lat')} placeholder="e.g. 5.86" />
          </div>
          <div className={fieldCls}>
            <label className={labelCls}>Longitude (optional)</label>
            <input className={inputCls} type="number" step="any" value={form.lng} onChange={set('lng')} placeholder="e.g. -1.56" />
          </div>
          <div className="mb-3 sm:col-span-2">
            <button
              type="button"
              onClick={detectLocation}
              disabled={detecting}
              className="w-full rounded-[10px] border border-dashed border-line bg-[#fbfcfa] px-3 py-2.5 font-sans text-xs font-bold text-leaf transition hover:border-leaf hover:bg-paper disabled:opacity-50"
            >
              {detecting ? 'Detecting…' : 'Auto-detect my location (I am at the farm)'}
            </button>
          </div>
        </div>

        <div className={fieldCls}>
          <label className={labelCls}>Photo (optional)</label>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={pickFile} />
          <div className="flex flex-wrap items-center gap-2">
            {imageUrl ? (
              <div className="relative h-20 w-20 overflow-hidden rounded-lg border border-line">
                <img src={imageUrl} alt="" className="h-full w-full object-cover" />
                <button
                  type="button"
                  onClick={() => setImageUrl('')}
                  aria-label="Remove photo"
                  className="absolute right-1 top-1 grid h-5 w-5 place-items-center rounded-full bg-ink/60 font-sans text-[10px] font-bold text-white hover:bg-ink"
                >
                  ×
                </button>
              </div>
            ) : null}
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="grid h-20 w-20 place-items-center rounded-lg border border-dashed border-line bg-[#fbfcfa] font-sans text-xs text-muted transition hover:border-leaf hover:text-leaf disabled:opacity-50"
            >
              {uploading ? 'Uploading…' : imageUrl ? 'Change' : '+ Add'}
            </button>
          </div>
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
            {busy ? 'Saving…' : isEdit ? 'Save changes' : 'Add farm'}
          </button>
        </div>
      </form>
    </Panel>
  )
}