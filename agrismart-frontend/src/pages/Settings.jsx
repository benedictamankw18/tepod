import { useRef, useState } from 'react'
import { getUser, updateUser } from '../lib/auth'
import { updateAccount, updatePhoto, changePassword, uploadImage } from '../lib/api'
import { useCrops } from '../lib/crops'
import AppShell from '../components/AppShell'
import CropPicker from '../components/CropPicker'
import RegionDistrictSelects from '../components/RegionDistrictSelects'
import SearchableSelect from '../components/SearchableSelect'

const inputCls =
  'w-full rounded-[10px] border border-line bg-[#fbfcfa] px-3 py-2.5 font-sans text-sm text-ink outline-none focus:border-leaf focus:shadow-[0_0_0_3px_rgba(29,101,79,.12)]'
const labelCls = 'mb-1 block font-sans text-[11px] uppercase tracking-[.06em] text-muted'
const fieldCls = 'mb-3'

const LANGS = [
  { value: 'en', label: 'English' },
  { value: 'tw', label: 'Twi' },
]

const BUYER_TYPES = [
  { value: 'wholesale', label: 'Wholesale' },
  { value: 'retail', label: 'Retail' },
  { value: 'processor', label: 'Processor' },
]

const MOBILE_MONEY = [
  { value: 'mtn', label: 'MTN MoMo' },
  { value: 'vodafone_cash', label: 'Vodafone Cash' },
  { value: 'airteltigo', label: 'AirtelTigo' },
]

function SettingsContent() {
  const user = getUser()
  const { crops } = useCrops()
  const [form, setForm] = useState(() => ({
    name: user?.name || '',
    location: user?.location || '',
    language: user?.language || 'en',
    buyerType: user?.buyerType || '',
    mobileMoneyProvider: user?.mobileMoneyProvider || '',
    farmSize: user?.farmSize == null ? '' : String(user.farmSize),
    primaryCrops: user?.primaryCrops || [],
    purchaseCrops: user?.purchaseCrops || [],
    community: user?.community || '',
    region: user?.region || '',
    district: user?.district || '',
    address: user?.address || '',
  }))
  const [photo, setPhoto] = useState(user?.photoUrl || '')
  const [pw, setPw] = useState({ current: '', next: '', confirm: '' })
  const [error, setError] = useState('')
  const [photoError, setPhotoError] = useState('')
  const [pwError, setPwError] = useState('')
  const [busy, setBusy] = useState(false)
  const [photoBusy, setPhotoBusy] = useState(false)
  const [pwBusy, setPwBusy] = useState(false)
  const [saved, setSaved] = useState(false)
  const fileRef = useRef(null)

  const set = (key) => (e) => {
    setSaved(false)
    setForm((f) => ({ ...f, [key]: e.target.value }))
  }

  const setCrops = (key, list) => {
    setSaved(false)
    setForm((f) => ({ ...f, [key]: list }))
  }

  const setValue = (key) => (value) => {
    setSaved(false)
    setForm((f) => ({ ...f, [key]: value }))
  }

  const syncUser = (fresh) => {
    updateUser({ ...(getUser() || {}), ...fresh })
  }

  const saveProfile = async (e) => {
    e.preventDefault()
    setError('')
    setSaved(false)
    setBusy(true)
    try {
      const { user: fresh } = await updateAccount({
        name: form.name.trim() || undefined,
        location: form.location.trim() || undefined,
        language: form.language,
        buyerType: form.buyerType || undefined,
        mobileMoneyProvider: form.mobileMoneyProvider || undefined,
        farmSize: form.farmSize === '' ? undefined : Number(form.farmSize),
        primaryCrops: form.primaryCrops.length ? form.primaryCrops : undefined,
        purchaseCrops: form.purchaseCrops.length ? form.purchaseCrops : undefined,
        community: form.community.trim() || undefined,
        region: form.region.trim() || undefined,
        district: form.district.trim() || undefined,
        address: form.address.trim() || undefined,
      })
      syncUser(fresh)
      setSaved(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const onPhoto = async (e) => {
    const file = e.target.files && e.target.files[0]
    e.target.value = ''
    if (!file) return
    setPhotoError('')
    setPhotoBusy(true)
    try {
      const { url } = await uploadImage(file)
      const { user: fresh } = await updatePhoto(url)
      setPhoto(url)
      syncUser(fresh)
    } catch (err) {
      setPhotoError(err.message || 'Photo upload failed.')
    } finally {
      setPhotoBusy(false)
    }
  }

  const savePassword = async (e) => {
    e.preventDefault()
    setPwError('')
    if (pw.next.length < 6) {
      setPwError('New password must be at least 6 characters.')
      return
    }
    if (pw.next !== pw.confirm) {
      setPwError('New passwords do not match.')
      return
    }
    setPwBusy(true)
    try {
      await changePassword(pw.current, pw.next)
      setPw({ current: '', next: '', confirm: '' })
    } catch (err) {
      setPwError(err.message)
    } finally {
      setPwBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <header className="mb-6">
          <span className="font-sans text-[11px] font-bold uppercase tracking-[.15em] text-leaf">
            Account settings
          </span>
          <h1 className="mt-1 font-serif text-[clamp(28px,3.8vw,38px)] font-semibold leading-none tracking-[-.05em] text-ink">
            Profile &amp; preferences
          </h1>
          <p className="mt-2 font-sans text-sm leading-relaxed text-muted">
            Keep your details up to date across the marketplace.
          </p>
        </header>

        {/* Profile photo */}
        <section className="mb-5 rounded-2xl border border-line bg-white p-5 shadow-sm">
          <h2 className="mb-3 font-serif text-lg font-semibold tracking-[-.03em] text-ink">Profile photo</h2>
          <div className="flex items-center gap-4">
            {photo ? (
              <img src={photo} alt="profile" className="h-16 w-16 rounded-full border border-line object-cover" />
            ) : (
              <span className="grid h-16 w-16 place-items-center rounded-full bg-lime font-serif text-2xl font-bold text-leaf-dark">
                {(form.name || '?').charAt(0).toUpperCase()}
              </span>
            )}
            <div className="flex items-center gap-2">
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onPhoto} />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={photoBusy}
                className="rounded-[10px] bg-leaf px-4 py-2 font-sans text-xs font-bold text-white transition hover:bg-leaf-dark disabled:opacity-50"
              >
                {photoBusy ? 'Uploading…' : photo ? 'Change photo' : 'Add photo'}
              </button>
            </div>
          </div>
          {photoError && <p className="mt-2 font-sans text-xs text-red-600">{photoError}</p>}
        </section>

        {error && (
          <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 font-sans text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Profile info + role-specific */}
        <section className="mb-5 rounded-2xl border border-line bg-white p-5 shadow-sm">
          <h2 className="mb-3 font-serif text-lg font-semibold tracking-[-.03em] text-ink">Profile info</h2>
          <form onSubmit={saveProfile}>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className={fieldCls}>
                <label className={labelCls}>Full name</label>
                <input className={inputCls} value={form.name} onChange={set('name')} placeholder="Your name" />
              </div>
              <div className={fieldCls}>
                <label className={labelCls}>Location / area</label>
                <input className={inputCls} value={form.location} onChange={set('location')} placeholder="e.g. Kasoa" />
              </div>
              <div className={fieldCls}>
                <label className={labelCls}>Language</label>
                <SearchableSelect value={form.language} onChange={setValue('language')} options={LANGS} placeholder="Select language" />
              </div>

              {user?.role === 'farmer' ? (
                <>
                  <div className={fieldCls}>
                    <label className={labelCls}>Farm size (acres)</label>
                    <input
                      className={inputCls}
                      type="number"
                      min="0"
                      value={form.farmSize}
                      onChange={set('farmSize')}
                      placeholder="e.g. 12"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className={labelCls}>Primary crops</label>
                    <CropPicker
                      crops={crops}
                      selected={form.primaryCrops}
                      onChange={(list) => setCrops('primaryCrops', list)}
                      variant="soft"
                      placeholder="e.g. Tiger nuts"
                    />
                  </div>
                </>
              ) : (
                <>
                  <div className={fieldCls}>
                    <label className={labelCls}>Buyer type</label>
                    <SearchableSelect value={form.buyerType} onChange={setValue('buyerType')} options={[{ value: '', label: 'Select type' }, ...BUYER_TYPES]} placeholder="Select type" />
                  </div>
                  <div className={fieldCls}>
                    <label className={labelCls}>Mobile money</label>
                    <SearchableSelect value={form.mobileMoneyProvider} onChange={setValue('mobileMoneyProvider')} options={[{ value: '', label: 'Select provider' }, ...MOBILE_MONEY]} placeholder="Select provider" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className={labelCls}>Purchase crops</label>
                    <CropPicker
                      crops={crops}
                      selected={form.purchaseCrops}
                      onChange={(list) => setCrops('purchaseCrops', list)}
                      variant="soft"
                      placeholder="e.g. Tiger nuts"
                    />
                  </div>
                </>
              )}

              <div className={fieldCls}>
                <label className={labelCls}>Community</label>
                <input className={inputCls} value={form.community} onChange={set('community')} placeholder="e.g. Odorkor" />
              </div>
              <RegionDistrictSelects
                region={form.region}
                district={form.district}
                onRegion={setValue('region')}
                onDistrict={setValue('district')}
                regionLabel="Region"
                districtLabel="District"
              />
              <div className={fieldCls}>
                <label className={labelCls}>Street / address</label>
                <input className={inputCls} value={form.address} onChange={set('address')} placeholder="e.g. 45 Market Rd" />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3">
              {saved && <span className="font-sans text-xs font-semibold text-leaf">Saved ✓</span>}
              <button
                type="submit"
                disabled={busy}
                className="rounded-[10px] bg-leaf px-5 py-2.5 font-sans text-xs font-bold text-white transition hover:bg-leaf-dark disabled:opacity-50"
              >
                {busy ? 'Saving…' : 'Save changes'}
              </button>
            </div>
          </form>
        </section>

        {/* Change password */}
        <section className="rounded-2xl border border-line bg-white p-5 shadow-sm">
          <h2 className="mb-3 font-serif text-lg font-semibold tracking-[-.03em] text-ink">Change password</h2>
          <form onSubmit={savePassword}>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className={fieldCls}>
                <label className={labelCls}>Current password</label>
                <input className={inputCls} type="password" value={pw.current} onChange={(e) => setPw((p) => ({ ...p, current: e.target.value }))} />
              </div>
              <div className={fieldCls}>
                <label className={labelCls}>New password</label>
                <input className={inputCls} type="password" value={pw.next} onChange={(e) => setPw((p) => ({ ...p, next: e.target.value }))} />
              </div>
              <div className={fieldCls}>
                <label className={labelCls}>Confirm new password</label>
                <input className={inputCls} type="password" value={pw.confirm} onChange={(e) => setPw((p) => ({ ...p, confirm: e.target.value }))} />
              </div>
            </div>
            {pwError && <p className="mb-3 font-sans text-xs text-red-600">{pwError}</p>}
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={pwBusy}
                className="rounded-[10px] border border-line bg-white px-5 py-2.5 font-sans text-xs font-bold text-ink transition hover:bg-paper disabled:opacity-50"
              >
                {pwBusy ? 'Updating…' : 'Update password'}
              </button>
            </div>
          </form>
        </section>
    </div>
  )
}

export default function SettingsPage() {
  return (
    <AppShell activeId="settings">
      <SettingsContent />
    </AppShell>
  )
}
