import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { getUser, updateUser } from '../lib/auth'
import { verifyBuyer, uploadImage } from '../lib/api'
import { useCrops } from '../lib/crops'
import Sidebar from '../components/Sidebar'
import HorizontalNav from '../components/HorizontalNav'
import CropPicker from '../components/CropPicker'
import SearchableSelect from '../components/SearchableSelect'
import RegionDistrictSelects from '../components/RegionDistrictSelects'
import CameraCapture from '../components/CameraCapture'
import AgreementCheckbox from '../components/AgreementCheckbox'
import { inputCls, labelCls } from '../lib/ui'

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
    purchaseCrops: user?.purchaseCrops || [],
    community: '',
    region: '',
    district: '',
    gpsAddress: '',
    address: '',
    idType: '',
    idNumber: '',
  })
  const [photo, setPhoto] = useState(null)
  const [coords, setCoords] = useState({ lat: '', lng: '' })
  const [detecting, setDetecting] = useState(false)
  const [locError, setLocError] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [agreed, setAgreed] = useState(false)
  const isFarmer = user?.role === 'farmer'
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))
  const setValue = (key) => (value) => setForm((f) => ({ ...f, [key]: value }))

  const captureLocation = () => {
    if (!window.confirm("Use your device's current location to confirm where you are now?")) return
    if (!navigator.geolocation) {
      setLocError("Location detection isn't supported on this device.")
      return
    }
    setLocError('')
    setDetecting(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({
          lat: pos.coords.latitude.toFixed(6),
          lng: pos.coords.longitude.toFixed(6),
        })
        setDetecting(false)
      },
      (err) => {
        setDetecting(false)
        const msg =
          err.code === err.PERMISSION_DENIED
            ? "Location access was denied. Enable it in your browser or you can still finish using your community and GPS address."
            : err.code === err.TIMEOUT
              ? "Timed out getting your location. Try again or you can still finish using your community and GPS address."
              : "Your location is unavailable right now. Try again or you can still finish using your community and GPS address."
        setLocError(msg)
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    )
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
    if (!agreed) {
      setError('You must agree to the Terms of Service and Privacy Policy to continue.')
      return
    }
    if (!form.gpsAddress.trim()) {
      setError('GPS address is required.')
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
        lat: coords.lat === '' ? undefined : Number(coords.lat),
        lng: coords.lng === '' ? undefined : Number(coords.lng),
        idType: form.idType,
        idNumber: form.idNumber.trim(),
        photoUrl: up.url,
        acceptedTerms: true,
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
    <div className={isFarmer ? "flex min-h-screen bg-paper" : "min-h-screen bg-paper"}>
      {isFarmer ? (
        <Sidebar user={user} activeId="" />

      ) : (
        <HorizontalNav user={user} />

      )}
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-6 md:py-8">
        <header className="mb-6">
          <span className="font-sans text-[11px] font-bold uppercase tracking-[.15em] text-leaf">
            Account verification
          </span>
          <h1 className="mt-1 font-serif text-3xl font-semibold tracking-[-.04em] text-ink">
            Verify your account
          </h1>
          <p className="mt-1.5 font-sans text-sm text-muted">
            {isFarmer
              ? 'You must be verified before you can list produce or manage farms.'
              : 'You must be verified before you can request or commit to produce.'}
          </p>
        </header>

        <div className="rounded-[18px] border border-line bg-white p-6 shadow md:p-8">
          {error && (
            <div className="mb-4 rounded-md bg-bad border border-bad/40 px-3 py-2 text-sm text-bad-text">
              {error}
            </div>
          )}

          <form onSubmit={submit} className="space-y-5">
            {!isFarmer && (
              <div>
                <label className={labelCls}>What are you interested in buying?</label>
                <CropPicker
                  crops={crops}
                  selected={form.purchaseCrops}
                  onChange={(list) => setForm((f) => ({ ...f, purchaseCrops: list }))}
                  placeholder="e.g. Tiger nuts"
                />
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={labelCls}>Community / town</label>
                <input className={inputCls} value={form.community} onChange={set('community')} placeholder="e.g. Teso" />
              </div>
              <div>
                <label className={labelCls}>GPS Address</label>
                <input
                  className={inputCls}
                  value={form.gpsAddress}
                  onChange={set('gpsAddress')}
                  placeholder="e.g. GA-123-4567"
                  required
                />
              </div>
              <RegionDistrictSelects
                region={form.region}
                district={form.district}
                onRegion={setValue('region')}
                onDistrict={setValue('district')}
                regionLabel="Region"
                districtLabel="District"
              />
            </div>

            <div className="rounded-[12px] border border-line bg-paper p-4">
              <label className={labelCls}>Your current location<span className="normal-case text-muted"> (optional)</span></label>
              {coords.lat ? (
                <div className="flex items-center justify-between gap-3">
                  <p className="font-sans text-sm text-ink">
                    Live location captured: <span className="font-semibold text-leaf">{coords.lat}, {coords.lng}</span>
                  </p>
                  <button
                    type="button"
                    onClick={captureLocation}
                    className="shrink-0 rounded-full border border-leaf bg-white px-3 py-1.5 font-sans text-xs font-bold text-leaf transition hover:bg-lime"
                  >
                    Recapture
                  </button>
                </div>
              ) : detecting ? (
                <p className="font-sans text-sm text-muted">Detecting your location…</p>
              ) : (
                <button
                  type="button"
                  onClick={captureLocation}
                  className="rounded-full border border-leaf bg-white px-3 py-1.5 font-sans text-sm font-bold text-leaf transition hover:bg-lime"
                >
                  Use my device location
                </button>
              )}
              {(locError || !coords.lat) && !detecting && (
                <p className="mt-2 font-sans text-xs text-muted">
                  Live coordinates confirm where you verified. If you can't capture them, your community and GPS address still work.
                </p>
              )}
              {locError && <p className="mt-2 font-sans text-xs text-bad-text">{locError}</p>}
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
              <CameraCapture value={photo} onChange={setPhoto} />
            </div>

            <AgreementCheckbox checked={agreed} onChange={setAgreed} />

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
