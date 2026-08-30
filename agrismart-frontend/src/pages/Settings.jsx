import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { getUser, updateUser } from '../lib/auth'
import { updateAccount, updatePhoto, changePassword, uploadImage, updatePayoutAccount } from '../lib/api'
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

  const [payout, setPayout] = useState(() => ({
    method: user?.bankAccountNumber || user?.bankCode ? 'bank' : 'momo',
    bankName: user?.bankName || '',
    bankCode: user?.bankCode || '',
    bankAccountNumber: user?.bankAccountNumber || '',
    bankAccountName: user?.bankAccountName || '',
    momoProvider: user?.momoProvider || '',
    momoNumber: user?.momoNumber || '',
  }))
  const [payoutBusy, setPayoutBusy] = useState(false)
  const [payoutError, setPayoutError] = useState('')
  const [payoutSaved, setPayoutSaved] = useState(false)

  const [contact, setContact] = useState(() => ({
    email: user?.email || '',
    phone: user?.phone || '',
  }))
  const [usernameDraft, setUsernameDraft] = useState(user?.username || '')
  const [contactPw, setContactPw] = useState('')
  const [contactBusy, setContactBusy] = useState(false)
  const [contactError, setContactError] = useState('')
  const [contactSaved, setContactSaved] = useState(false)

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

  const setPayoutField = (key) => (v) => {
    const value = v && v.target ? v.target.value : v
    setPayoutSaved(false)
    setPayout((p) => ({ ...p, [key]: value }))
  }

  const savePayout = async (e) => {
    e.preventDefault()
    setPayoutError('')
    setPayoutSaved(false)
    setPayoutBusy(true)
    try {
      const payload =
        payout.method === 'bank'
          ? {
              bankName: payout.bankName.trim() || undefined,
              bankCode: payout.bankCode.trim() || undefined,
              bankAccountNumber: payout.bankAccountNumber.trim() || undefined,
              bankAccountName: payout.bankAccountName.trim() || undefined,
            }
          : {
              momoProvider: payout.momoProvider || undefined,
              momoNumber: payout.momoNumber.replace(/[\s-]/g, '') || undefined,
            }
      const { user: fresh } = await updatePayoutAccount(payload)
      syncUser(fresh)
      setPayoutSaved(true)
    } catch (err) {
      setPayoutError(err.message)
    } finally {
      setPayoutBusy(false)
    }
  }

  const normPhone = (p) => {
    const d = String(p || '').replace(/[^\d+]/g, '')
    if (d.startsWith('+')) return d
    if (d.startsWith('0')) return '+233' + d.slice(1)
    return d
  }

  const setContactField = (key) => (e) => {
    setContactSaved(false)
    setContact((c) => ({ ...c, [key]: e.target.value }))
  }

  // Email and phone are login identifiers, so changing them re-asks for the current
  // password. Only fields the user actually edited are sent; a cleared field is sent
  // as an empty value so it can be removed (as long as one identifier remains). A
  // username may be claimed in this same step when the account has none yet — that
  // doesn't need the password since it's a one-time add, not a change.
  const saveContact = async (e) => {
    e.preventDefault()
    setContactError('')
    setContactSaved(false)
    const payload = {}
    const email = contact.email.trim().toLowerCase()
    const phone = normPhone(contact.phone)
    if ((user?.email || '') !== email) payload.email = email || null
    if ((user?.phone || '') !== phone) payload.phone = phone || null
    const claimUsername = (user?.username || '').trim()
      ? ''
      : usernameDraft.trim()
    if (claimUsername) {
      if (!/^[a-zA-Z0-9_.]{3,30}$/.test(claimUsername)) {
        setContactError('Username must be 3–30 characters using letters, numbers, _ or .')
        return
      }
      payload.username = claimUsername.toLowerCase()
    }
    if (!Object.keys(payload).length) return
    if (payload.email !== undefined || payload.phone !== undefined) payload.currentPassword = contactPw
    setContactBusy(true)
    try {
      const { user: fresh } = await updateAccount(payload)
      syncUser(fresh)
      setContactPw('')
      setContactSaved(true)
    } catch (err) {
      setContactError(err.message)
    } finally {
      setContactBusy(false)
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

        {/* Verification */}
        <section className="mb-5 rounded-2xl border border-line bg-white p-5 shadow-sm">
          <h2 className="mb-2 font-serif text-lg font-semibold tracking-[-.03em] text-ink">Verification</h2>
          {user?.verified ? (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="font-sans text-sm text-muted">Your profile is verified and you can trade.</p>
              <span className="rounded-full bg-leaf/10 px-3 py-1 font-sans text-xs font-bold text-leaf-dark">
                Verified
              </span>
            </div>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="font-sans text-sm text-muted">
                Verify your profile before you can list produce or place orders.
              </p>
              <Link
                to="/verify"
                className="inline-block rounded-[10px] bg-leaf px-4 py-2 font-sans text-xs font-bold text-white transition hover:bg-leaf-dark"
              >
                Verify my profile
              </Link>
            </div>
          )}
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

        {/* Escrow payout account (farmers) */}
        {user?.role === 'farmer' && (
          <section className="mb-5 rounded-2xl border border-line bg-white p-5 shadow-sm">
            <h2 className="mb-1 font-serif text-lg font-semibold tracking-[-.03em] text-ink">Escrow payout account</h2>
            <p className="mb-3 font-sans text-sm text-muted">
              When a sale completes, your earnings are paid out to this bank account or mobile-money
              wallet. The money is released as soon as the buyer confirms delivery.
            </p>
            <form onSubmit={savePayout}>
              <div className="mb-3 flex gap-2">
                {['bank', 'momo'].map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => {
                      setPayoutSaved(false)
                      setPayout((p) => ({ ...p, method: m }))
                    }}
                    className={`rounded-full px-4 py-1.5 font-sans text-xs font-bold transition ${
                      payout.method === m ? 'bg-leaf text-white' : 'border border-line bg-paper text-muted hover:bg-white'
                    }`}
                  >
                    {m === 'bank' ? 'Bank account' : 'Mobile money'}
                  </button>
                ))}
              </div>

              {payout.method === 'bank' ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className={fieldCls}>
                    <label className={labelCls}>Bank name</label>
                    <input className={inputCls} value={payout.bankName} onChange={setPayoutField('bankName')} placeholder="e.g. GCB" />
                  </div>
                  <div className={fieldCls}>
                    <label className={labelCls}>Bank code</label>
                    <input className={inputCls} value={payout.bankCode} onChange={setPayoutField('bankCode')} placeholder="e.g. 040" />
                  </div>
                  <div className={fieldCls}>
                    <label className={labelCls}>Account number</label>
                    <input className={inputCls} value={payout.bankAccountNumber} onChange={setPayoutField('bankAccountNumber')} placeholder="Account number" />
                  </div>
                  <div className={fieldCls}>
                    <label className={labelCls}>Account name</label>
                    <input className={inputCls} value={payout.bankAccountName} onChange={setPayoutField('bankAccountName')} placeholder="Name on the account" />
                  </div>
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className={fieldCls}>
                    <label className={labelCls}>Mobile money provider</label>
                    <SearchableSelect value={payout.momoProvider} onChange={setPayoutField('momoProvider')} options={[{ value: '', label: 'Select provider' }, ...MOBILE_MONEY]} placeholder="Select provider" />
                  </div>
                  <div className={fieldCls}>
                    <label className={labelCls}>Mobile money number</label>
                    <input className={inputCls} value={payout.momoNumber} onChange={setPayoutField('momoNumber')} placeholder="e.g. 0241234567" />
                  </div>
                </div>
              )}

              {payoutError && <p className="mb-3 font-sans text-xs text-red-600">{payoutError}</p>}
              <div className="flex items-center justify-end gap-3">
                {payoutSaved && <span className="font-sans text-xs font-semibold text-leaf">Saved ✓</span>}
                <button
                  type="submit"
                  disabled={payoutBusy}
                  className="rounded-[10px] bg-leaf px-5 py-2.5 font-sans text-xs font-bold text-white transition hover:bg-leaf-dark disabled:opacity-50"
                >
                  {payoutBusy ? 'Saving…' : 'Save payout account'}
                </button>
              </div>
            </form>
          </section>
        )}

        {/* Login & contact */}
        <section className="mb-5 rounded-2xl border border-line bg-white p-5 shadow-sm">
          <h2 className="mb-1 font-serif text-lg font-semibold tracking-[-.03em] text-ink">Login &amp; contact</h2>
          <p className="mb-3 font-sans text-sm text-muted">
            Your email and phone are how you sign in, and payment links and notifications go to them.
          </p>
          <form onSubmit={saveContact}>
            <div className="mb-3">
              <label className={labelCls}>Username</label>
              {user?.username ? (
                <>
                  <div className="rounded-[10px] border border-line bg-paper px-3 py-2.5 font-sans text-sm text-muted">
                    {user.username}
                  </div>
                  <p className="mt-1 font-sans text-[11px] text-muted">Chosen at sign-up and can't be changed.</p>
                </>
              ) : (
                <>
                  <input
                    className={inputCls}
                    type="text"
                    value={usernameDraft}
                    onChange={(e) => {
                      setContactSaved(false)
                      setUsernameDraft(e.target.value)
                    }}
                    placeholder="Choose a username (e.g. kwame24)"
                    maxLength="30"
                  />
                  <p className="mt-1 font-sans text-[11px] text-muted">
                    Letters, numbers, _ or . — 3–30 characters. You can only set this once.
                  </p>
                </>
              )}
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className={fieldCls}>
                <label className={labelCls}>Email</label>
                <input
                  className={inputCls}
                  type="email"
                  value={contact.email}
                  onChange={setContactField('email')}
                  placeholder="you@example.com"
                />
              </div>
              <div className={fieldCls}>
                <label className={labelCls}>Phone</label>
                <input
                  className={inputCls}
                  type="tel"
                  value={contact.phone}
                  onChange={setContactField('phone')}
                  placeholder="024 123 4567"
                />
                <p className="mt-1 font-sans text-[11px] text-muted">Stored as +233… so you can sign in with either.</p>
              </div>
              <div className="sm:col-span-2">
                <label className={labelCls}>Current password</label>
                <input
                  className={inputCls}
                  type="password"
                  value={contactPw}
                  onChange={(e) => {
                    setContactSaved(false)
                    setContactPw(e.target.value)
                  }}
                  placeholder="Required to change email or phone"
                />
              </div>
            </div>
            {contactError && <p className="mb-3 font-sans text-xs text-red-600">{contactError}</p>}
            <div className="flex items-center justify-end gap-3">
              {contactSaved && <span className="font-sans text-xs font-semibold text-leaf">Saved ✓</span>}
              <button
                type="submit"
                disabled={contactBusy}
                className="rounded-[10px] bg-leaf px-5 py-2.5 font-sans text-xs font-bold text-white transition hover:bg-leaf-dark disabled:opacity-50"
              >
                {contactBusy ? 'Saving…' : 'Save contact details'}
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
    <AppShell activeId="settings" hideCartFloating>
      <SettingsContent />
    </AppShell>
  )
}
