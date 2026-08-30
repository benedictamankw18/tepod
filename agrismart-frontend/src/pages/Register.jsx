import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import AuthLayout from '../components/AuthLayout'
import GoogleButton from '../components/GoogleButton'
import PasswordInput from '../components/PasswordInput'
import { register, checkAvailability } from '../lib/api'
import { setSession } from '../lib/auth'
import { isValidGhanaPhone } from '../lib/phone'
import { inputCls, labelCls } from '../lib/ui'
import { useCrops } from '../lib/crops'
import CropPicker from '../components/CropPicker'
import SearchableSelect from '../components/SearchableSelect'
import AgreementCheckbox from '../components/AgreementCheckbox'

const initialChecks = { phone: 'idle', email: 'idle', username: 'idle' }

const looksFree = {
  phone: 'This phone is available.',
  email: 'This email is available.',
  username: 'This username is available.',
}
const looksTaken = {
  phone: 'This phone number is already registered.',
  email: 'This email is already registered.',
  username: 'This username is already taken.',
}

// Build 3 candidate usernames from a full name. Kept to letters/numbers/_/. (the same
// rules the backend enforces) and clipped to 30 chars.
function buildSuggestions(name) {
  const parts = String(name || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
  const first = parts[0] || ''
  const last = parts[parts.length - 1] || ''
  if (!first || first.length < 3) return []

  const rand = 100 + Math.floor(Math.random() * 900)
  const seen = new Set()
  const add = (u) => {
    const clean = String(u || '').replace(/[^a-zA-Z0-9_.]/g, '').slice(0, 30)
    if (clean.length >= 3) seen.add(clean)
  }

  add(first)
  if (last && last !== first) {
    add(`${first}.${last}`)
    add(`${first}_${last}`)
  }
  add(`${first}${rand}`)
  add(`${first}_farmer`)
  if (last && last !== first) add(`${last}${rand}`)

  let guard = 0
  while (seen.size < 3 && guard < 20) {
    guard++
    add(`${first}${guard * 111 + rand}`)
  }
  return [...seen].slice(0, 3)
}

export default function Register() {
  const navigate = useNavigate()
  const { crops } = useCrops()
  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    username: '',
    password: '',
    confirmPassword: '',
    role: 'farmer',
    buyerType: '',
    primaryCrops: [],
    purchaseCrops: [],
  })
  const [checks, setChecks] = useState(initialChecks)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [suggestions, setSuggestions] = useState([])
  const [agreed, setAgreed] = useState(false)

  // Whenever the name changes, generate 3 candidate usernames and check each one
  // for availability, tagging them so the user can pick a free one. State is only
  // updated in the async callback (results resolve) so we don't set state during render.
  useEffect(() => {
    const candidates = buildSuggestions(form.name)
    if (!candidates.length) return
    let cancelled = false
    Promise.all(
      candidates.map((value) =>
        checkAvailability({ username: value })
          .then((res) => ({ value, available: res.available }))
          .catch(() => ({ value, available: true }))
      )
    ).then((results) => {
      if (cancelled) return
      setSuggestions(results.map((r) => ({ value: r.value, status: r.available ? 'available' : 'taken' })))
    })
    return () => {
      cancelled = true
    }
  }, [form.name])

  const onNameChange = (e) => {
    setForm((f) => ({ ...f, name: e.target.value }))
    setSuggestions([])
  }

  const applySuggestion = (value, status) => {
    setForm((f) => ({ ...f, username: value }))
    setChecks((c) => ({ ...c, username: status }))
  }

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))
  const setValue = (key) => (value) => setForm((f) => ({ ...f, [key]: value }))
  const isBuyer = form.role === 'buyer'

  // Run a uniqueness check for phone/email/username when the field loses focus and
  // has a value. Matching is normalized server-side (E.164 for phone, case-insensitive
  // for email/username), mirroring the register endpoint. A stale response is ignored
  // if the value changed while the request was in flight. For phone we first enforce
  // a valid Ghanaian mobile format; an invalid number never hits the availability check.
  const checkField = async (field, value) => {
    const v = value.trim()
    if (!v) {
      setChecks((c) => ({ ...c, [field]: 'idle' }))
      return
    }
    setChecks((c) => ({ ...c, [field]: 'checking' }))
    if (field === 'phone' && !isValidGhanaPhone(value)) {
      setChecks((c) => ({ ...c, phone: 'format' }))
      return
    }
    try {
      const res = await checkAvailability({ [field]: v })
      setChecks((c) => (form[field] === value ? { ...c, [field]: res.available ? 'available' : 'taken' } : c))
    } catch {
      setChecks((c) => ({ ...c, [field]: 'idle' }))
    }
  }

  const onToggleField = (field) => (e) => {
    setForm((f) => ({ ...f, [field]: e.target.value }))
    setChecks((c) => ({ ...c, [field]: 'idle' }))
  }

  const fieldMsg = (field) => {
    if (checks[field] === 'checking') return { text: 'Checking…', cls: 'text-muted' }
    if (checks[field] === 'available') return { text: looksFree[field], cls: 'text-leaf' }
    if (checks[field] === 'taken') return { text: looksTaken[field], cls: 'text-bad-text' }
    if (checks[field] === 'format') {
      return { text: 'Enter a valid Ghanaian mobile number (e.g. 0241234567).', cls: 'text-bad-text' }
    }
    return null
  }

  const anyTaken = ['phone', 'email', 'username'].some((f) => form[f].trim() && checks[f] === 'taken')
  const phoneFormatOk = !form.phone.trim() || isValidGhanaPhone(form.phone)
  const passwordMismatch = form.confirmPassword.length > 0 && form.confirmPassword !== form.password

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    if (!form.name || !form.password) {
      setError('Name and password are required.')
      return
    }
    if (passwordMismatch) {
      setError('Passwords do not match.')
      return
    }
    if (!form.phone && !form.email) {
      setError('At least one of phone or email is required.')
      return
    }
    if (!phoneFormatOk) {
      setError('Enter a valid Ghanaian mobile number.')
      return
    }
    if (isBuyer && !form.buyerType) {
      setError('Buyer type is required for a buyer account.')
      return
    }
    if (anyTaken) {
      setError('Please use a different phone, email, or username.')
      return
    }
    if (!agreed) {
      setError('You must agree to the Terms of Service and Privacy Policy to continue.')
      return
    }
    setBusy(true)
    try {
      const result = await register({
        name: form.name,
        phone: form.phone || undefined,
        email: form.email || undefined,
        username: form.username || undefined,
        password: form.password,
        role: form.role,
        buyerType: isBuyer ? form.buyerType : undefined,
        primaryCrops: !isBuyer && form.primaryCrops.length ? form.primaryCrops : undefined,
        purchaseCrops: isBuyer && form.purchaseCrops.length ? form.purchaseCrops : undefined,
        acceptedTerms: true,
      })
      setSession(result.user, result.token)
      navigate('/verify')
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthLayout title="Create your account" subtitle="Join as a farmer or a buyer">
      {error && (
        <div className="mb-4 rounded-md bg-bad border border-bad/40 px-3 py-2 text-sm text-bad-text">
          {error}
        </div>
      )}

      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className={labelCls}>I am a</label>
          <div className="flex rounded-lg bg-white border border-line p-1">
            {['farmer', 'buyer'].map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setForm((f) => ({ ...f, role: r, buyerType: '' }))}
                className={`flex-1 rounded-md py-2 text-sm font-medium capitalize transition ${
                  form.role === r ? 'bg-lime text-ink shadow' : 'text-muted hover:text-ink'
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className={labelCls}>Full name</label>
          <input className={inputCls} value={form.name} onChange={onNameChange} placeholder="Ama Mensah" />
        </div>

        {isBuyer && (
          <div>
            <label className={labelCls}>Buyer type</label>
            <SearchableSelect
              value={form.buyerType}
              onChange={setValue('buyerType')}
              options={[
                { value: '', label: 'Select buyer type…' },
                { value: 'wholesale', label: 'Wholesale' },
                { value: 'retail', label: 'Retail' },
                { value: 'processor', label: 'Processor' },
              ]}
              placeholder="Select buyer type…"
            />
          </div>
        )}

        {isBuyer && (
          <div>
            <label className={labelCls}>Interested in buying (optional)</label>
            <CropPicker
              crops={crops}
              selected={form.purchaseCrops}
              onChange={(list) => setForm((f) => ({ ...f, purchaseCrops: list }))}
              placeholder="e.g. Tiger nuts"
            />
          </div>
        )}

        {!isBuyer && (
          <div>
            <label className={labelCls}>Primary crops (optional)</label>
            <CropPicker
              crops={crops}
              selected={form.primaryCrops}
              onChange={(list) => setForm((f) => ({ ...f, primaryCrops: list }))}
              placeholder="e.g. Tiger nuts"
            />
          </div>
        )}

        <div>
          <label className={labelCls}>
            Phone <span className="text-muted">(or email below)</span>
          </label>
          <input
            className={inputCls}
            value={form.phone}
            onChange={onToggleField('phone')}
            onBlur={() => checkField('phone', form.phone)}
            placeholder="0241234567"
            autoComplete="tel"
          />
          {fieldMsg('phone') && (
            <p className={`mt-1 text-xs ${fieldMsg('phone').cls}`}>{fieldMsg('phone').text}</p>
          )}
        </div>

        <div>
          <label className={labelCls}>Email (optional)</label>
          <input
            className={inputCls}
            type="email"
            value={form.email}
            onChange={onToggleField('email')}
            onBlur={() => checkField('email', form.email)}
            placeholder="you@example.com"
            autoComplete="email"
          />
          {fieldMsg('email') && (
            <p className={`mt-1 text-xs ${fieldMsg('email').cls}`}>{fieldMsg('email').text}</p>
          )}
        </div>

        <div>
          <label className={labelCls}>Username (optional)</label>
          <input
            className={inputCls}
            value={form.username}
            onChange={onToggleField('username')}
            onBlur={() => checkField('username', form.username)}
            placeholder="3-30 chars, letters/numbers/_/."
            autoComplete="username"
          />
          {fieldMsg('username') && (
            <p className={`mt-1 text-xs ${fieldMsg('username').cls}`}>{fieldMsg('username').text}</p>
          )}

          {suggestions.length > 0 && (
            <div className="mt-2">
              <p className="text-xs text-muted mb-1">Suggested usernames</p>
              <div className="flex flex-wrap gap-2">
                {suggestions.map((s) => (
                  <button
                    key={s.value}
                    type="button"
                    disabled={s.status === 'taken'}
                    onClick={() => applySuggestion(s.value, s.status)}
                    className={`rounded-full border px-2.5 py-1 text-xs font-medium transition ${
                      s.status === 'taken'
                        ? 'border-line text-muted line-through cursor-not-allowed'
                        : s.status === 'available'
                          ? 'border-line bg-white text-ink hover:bg-lime hover:border-lime'
                          : 'border-line text-muted'
                    }`}
                  >
                    {s.value}
                    {s.status === 'available' && <span className="ml-1 text-leaf">•</span>}
                    {s.status === 'taken' && <span className="ml-1">×</span>}
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-muted mt-1">Tap a suggestion to use it.</p>
            </div>
          )}
        </div>

        <PasswordInput
          label="Password"
          value={form.password}
          onChange={set('password')}
          placeholder="••••••••"
          autoComplete="new-password"
        />

        <div>
          <PasswordInput
            label="Confirm password"
            value={form.confirmPassword}
            onChange={set('confirmPassword')}
            placeholder="••••••••"
            autoComplete="new-password"
          />
          {passwordMismatch && (
            <p className="mt-1 text-xs text-bad-text">Passwords do not match.</p>
          )}
        </div>

        <AgreementCheckbox checked={agreed} onChange={setAgreed} />

        <button
          type="submit"
          disabled={busy || anyTaken || passwordMismatch || !phoneFormatOk || !agreed}
          className="w-full rounded-[10px] bg-leaf py-2.5 font-sans text-sm font-bold text-white transition hover:bg-leaf-dark disabled:opacity-50"
        >
          {busy ? 'Creating…' : 'Create account'}
        </button>
      </form>

      <div className="flex items-center justify-center gap-3 my-4">
        <div className="h-px flex-1 bg-line" />
        <span className="text-xs text-muted">or</span>
        <div className="h-px flex-1 bg-line" />
      </div>

      <GoogleButton
        role={form.role}
        buyerType={isBuyer ? form.buyerType : undefined}
        onSuccess={(result) => navigate(result.user && !result.user.verified ? '/verify' : '/')}
        onError={(err) => setError(err.message)}
      />

      {isBuyer && !form.buyerType && (
        <p className="mt-2 text-xs text-gold text-center">
          Select a buyer type above before using Google sign-up.
        </p>
      )}

      <p className="mt-6 text-center text-sm text-muted">
        Already have an account?{' '}
        <Link to="/login" className="font-medium text-leaf hover:underline">
          Sign in
        </Link>
      </p>
    </AuthLayout>
  )
}
