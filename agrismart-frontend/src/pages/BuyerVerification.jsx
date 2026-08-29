import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { getUser, updateUser } from '../lib/auth'
import { verifyBuyer, uploadImage } from '../lib/api'
import { useCrops } from '../lib/crops'
import Sidebar from '../components/Sidebar'
import CropPicker from '../components/CropPicker'
import SearchableSelect from '../components/SearchableSelect'

const inputCls =
  'w-full rounded-[10px] border border-line bg-[#fbfcfa] px-3 py-2.5 font-sans text-sm text-ink outline-none focus:border-leaf focus:shadow-[0_0_0_3px_rgba(29,101,79,.12)]'
const labelCls = 'mb-1 block font-sans text-[11px] uppercase tracking-[.06em] text-muted'

const ID_TYPES = [
  { value: 'ghana_card', label: 'Ghana Card' },
  { value: 'voter_card', label: 'Voter Card' },
  { value: 'passport', label: 'Passport' },
]

export default function BuyerVerification() {
  const navigate = useNavigate()
  const user = getUser()
  const { crops } = useCrops()

  const [form, setForm] = useState({
    purchaseCrops: [],
    community: '',
    region: '',
    district: '',
    gpsAddress: '',
    address: '',
    idType: '',
    idNumber: '',
  })
  const [photo, setPhoto] = useState(null)
  const [photoPreview, setPhotoPreview] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))
  const setValue = (key) => (value) => setForm((f) => ({ ...f, [key]: value }))

  const onPhoto = (e) => {
    const file = e.target.files && e.target.files[0]
    if (!file) return
    setPhoto(file)
    setPhotoPreview(URL.createObjectURL(file))
  }

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    if (!form.idType || !form.idNumber.trim()) {
      setError('Provide your identification type and card number.')
      return
    }
    if (!photo) {
      setError('A live photo is required for verification.')
      return
    }
    setBusy(true)
    try {
      const up = await uploadImage(photo)
      const result = await verifyBuyer({
        purchaseCrops: form.purchaseCrops,
        community: form.community || undefined,
        region: form.region || undefined,
        district: form.district || undefined,
        gpsAddress: form.gpsAddress || undefined,
        address: form.address || undefined,
        idType: form.idType,
        idNumber: form.idNumber.trim(),
        photoUrl: up.url,
      })
      const freshUser = { ...user, ...result.user }
      updateUser(freshUser)
      navigate('/')
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-screen bg-paper">
      <Sidebar user={user} />

      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-6 md:py-8">
        <header className="mb-6">
          <span className="font-sans text-[11px] font-bold uppercase tracking-[.15em] text-leaf">
            Buyer on-boarding
          </span>
          <h1 className="mt-1 font-serif text-3xl font-semibold tracking-[-.04em] text-ink">
            Verify your buyer profile
          </h1>
          <p className="mt-1.5 font-sans text-sm text-muted">
            You must be verified before you can request or commit to produce.
          </p>
        </header>

        <div className="rounded-[18px] border border-line bg-white p-6 shadow md:p-8">
          {error && (
            <div className="mb-4 rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={submit} className="space-y-5">
            <div>
              <label className={labelCls}>What are you interested in buying?</label>
              <CropPicker
                crops={crops}
                selected={form.purchaseCrops}
                onChange={(list) => setForm((f) => ({ ...f, purchaseCrops: list }))}
                placeholder="e.g. Tiger nuts"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={labelCls}>Community / town</label>
                <input className={inputCls} value={form.community} onChange={set('community')} placeholder="e.g. Teso" />
              </div>
              <div>
                <label className={labelCls}>Region</label>
                <input className={inputCls} value={form.region} onChange={set('region')} placeholder="e.g. Central Region" />
              </div>
              <div>
                <label className={labelCls}>District</label>
                <input className={inputCls} value={form.district} onChange={set('district')} placeholder="e.g. Awutu Senya East" />
              </div>
              <div>
                <label className={labelCls}>GPS Address (optional)</label>
                <input className={inputCls} value={form.gpsAddress} onChange={set('gpsAddress')} placeholder="e.g. GA-123-4567" />
              </div>
            </div>

            <div>
              <label className={labelCls}>Address</label>
              <input className={inputCls} value={form.address} onChange={set('address')} placeholder="Street / area address" />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={labelCls}>Identification type</label>
                <SearchableSelect
                  value={form.idType}
                  onChange={setValue('idType')}
                  options={[{ value: '', label: 'Select…' }, ...ID_TYPES]}
                  placeholder="Select…"
                />
              </div>
              <div>
                <label className={labelCls}>Identification number</label>
                <input className={inputCls} value={form.idNumber} onChange={set('idNumber')} placeholder="Card / passport number" />
              </div>
            </div>

            <div>
              <label className={labelCls}>Live photo</label>
              <label className="flex items-center gap-3 cursor-pointer rounded-[10px] border border-dashed border-line bg-[#fbfcfa] px-3 py-3 hover:border-leaf">
                {photoPreview ? (
                  <img src={photoPreview} alt="Live photo preview" className="h-14 w-14 rounded-md object-cover" />
                ) : (
                  <span className="flex h-14 w-14 items-center justify-center rounded-md bg-lime/30 text-2xl text-leaf">+</span>
                )}
                <span className="text-sm text-muted">
                  {photo ? photo.name : 'Upload a clear photo of yourself (JPG/PNG)'}
                </span>
                <input type="file" accept="image/*" className="hidden" onChange={onPhoto} />
              </label>
            </div>

            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-[10px] bg-leaf py-2.5 font-sans text-sm font-bold text-white transition hover:bg-leaf-dark disabled:opacity-50"
            >
              {busy ? 'Verifying…' : 'Complete verification'}
            </button>
          </form>

          <p className="mt-4 text-center text-xs text-muted">
            Your card number is stored in redacted form (last 4 digits visible only).
          </p>
        </div>

        <p className="mt-4 text-center text-sm text-muted">
          Changed your mind?{' '}
          <Link to="/" className="font-medium text-leaf hover:underline">
            Go to home
          </Link>
        </p>
      </main>
    </div>
  )
}
