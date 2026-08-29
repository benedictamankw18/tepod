import { useRef, useState } from 'react'
import { uploadImage, updateListingImages } from '../lib/api'

const MAX_IMAGES = 5

export default function ListingPhotoManager({ listing, onDone }) {
  const initial = Array.isArray(listing.imageUrls) && listing.imageUrls.length
    ? listing.imageUrls
    : listing.imageUrl
      ? [listing.imageUrl]
      : []
  const [images, setImages] = useState(initial)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  const fileRef = useRef(null)

  const pick = async (e) => {
    const files = Array.from(e.target.files || [])
    const room = MAX_IMAGES - images.length
    const take = files.slice(0, room)
    e.target.value = ''
    if (!take.length) {
      setError(`You can attach up to ${MAX_IMAGES} images.`)
      return
    }
    setError('')
    setBusy(true)
    try {
      const urls = []
      for (const f of take) {
        const { url } = await uploadImage(f)
        urls.push(url)
      }
      setImages((prev) => [...prev, ...urls].slice(0, MAX_IMAGES))
      setSaved(false)
    } catch (err) {
      setError(err.message || 'Image upload failed.')
    } finally {
      setBusy(false)
    }
  }

  const remove = (url) => {
    setImages((prev) => prev.filter((u) => u !== url))
    setSaved(false)
  }

  const dirty = JSON.stringify(images) !== JSON.stringify(initial)

  const save = async () => {
    setError('')
    setBusy(true)
    try {
      await updateListingImages(listing.id, images)
      setSaved(true)
      onDone?.(images)
    } catch (err) {
      setError(err.message || 'Could not save photos.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mt-3 rounded-xl border border-line bg-white p-3">
      <p className="mb-2 font-sans text-[11px] uppercase tracking-[.06em] text-muted">
        Photos ({images.length}/{MAX_IMAGES})
      </p>
      <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={pick} />
      <div className="flex flex-wrap gap-2">
        {images.map((url) => (
          <div key={url} className="relative h-16 w-16 overflow-hidden rounded-lg border border-line">
            <img src={url} alt="" className="h-full w-full object-cover" />
            <button
              type="button"
              onClick={() => remove(url)}
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
            disabled={busy}
            className="grid h-16 w-16 place-items-center rounded-lg border border-dashed border-line bg-[#fbfcfa] font-sans text-xs text-muted transition hover:border-leaf hover:text-leaf disabled:opacity-50"
          >
            {busy ? '…' : '+ Add'}
          </button>
        )}
      </div>
      {error && <p className="mt-2 font-sans text-xs text-red-600">{error}</p>}
      <div className="mt-3 flex items-center justify-end gap-2">
        {saved && <span className="mr-auto font-sans text-xs text-leaf">Saved</span>}
        {dirty && (
          <button
            type="button"
            onClick={save}
            disabled={busy}
            className="rounded-[10px] bg-leaf px-4 py-2 font-sans text-xs font-bold text-white transition hover:bg-leaf-dark disabled:opacity-50"
          >
            {busy ? 'Saving…' : 'Save photos'}
          </button>
        )}
      </div>
    </div>
  )
}
