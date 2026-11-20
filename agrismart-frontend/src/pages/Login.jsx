import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import AuthLayout from '../components/AuthLayout'
import GoogleButton from '../components/GoogleButton'
import PasswordInput from '../components/PasswordInput'
import OtpInput from '../components/OtpInput'
import SearchableSelect from '../components/SearchableSelect'
import { login, issueOtp, verifyOtp } from '../lib/api'
import { setSession } from '../lib/auth'
import { isValidGhanaPhone } from '../lib/phone'
import { inputCls, labelCls } from '../lib/ui'

const METHODS = [
  { key: 'password', label: 'Password' },
  { key: 'otp', label: 'Phone (OTP)' },
  { key: 'google', label: 'Google' },
]

export default function Login() {
  const navigate = useNavigate()
  const [method, setMethod] = useState('password')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  // password
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')

  // otp
  const [otpPhone, setOtpPhone] = useState('')
  const [otpStep, setOtpStep] = useState('issue') // issue | code
  const [otpCode, setOtpCode] = useState('')
  const [otpInfo, setOtpInfo] = useState('')
  const [otpPhoneError, setOtpPhoneError] = useState('')
  const [otpEmail, setOtpEmail] = useState('')
  const [otpEmailError, setOtpEmailError] = useState('')
  const otpPhoneValid = otpPhone.trim() === '' || isValidGhanaPhone(otpPhone)
  const otpEmailValid = otpEmail.trim() === '' || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(otpEmail)

  // google (role/buyerType are used only when a brand-new Google account is created)
  const [gRole, setGRole] = useState('farmer')
  const [gBuyerType, setGBuyerType] = useState('')
  const gIsBuyer = gRole === 'buyer'

  const finish = (result, nextPath = '/') => {
    setSession(result.user, result.token)
    navigate(nextPath)
  }

  const submitPassword = async (e) => {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      const result = await login(identifier, password)
      finish(result)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const submitOtpFirst = async (e) => {
    e.preventDefault()
    setError('')
    setOtpInfo('')
    if (!otpPhoneValid) {
      setError('Enter a valid Ghanaian mobile number.')
      return
    }
    if (!otpEmailValid) {
      setError('Enter a valid email address.')
      return
    }
    setBusy(true)
    try {
      const res = await issueOtp(otpPhone, 'login', otpEmail.trim())
      setOtpInfo(
        res.debugCode
          ? `Code issued. Dev code: ${res.debugCode}`
          : 'A verification code has been sent to your phone.'
      )
      setOtpStep('code')
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const submitOtpVerify = async (e) => {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      const result = await verifyOtp({ phone: otpPhone, code: otpCode })
      finish(result)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthLayout title="Sign in to your account" subtitle="Choose how you want to sign in">
      {/* Method tabs */}
      <div className="flex rounded-lg bg-white border border-line p-1 mb-6">
        {METHODS.map((m) => (
          <button
            key={m.key}
            type="button"
            onClick={() => {
              setMethod(m.key)
              setError('')
            }}
            className={`flex-1 rounded-md py-2 text-sm font-medium transition ${
              method === m.key ? 'bg-lime text-ink shadow' : 'text-muted hover:text-ink'
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="mb-4 rounded-md bg-bad border border-bad/40 px-3 py-2 text-sm text-bad-text">
          {error}
        </div>
      )}

      {method === 'password' && (
        <form onSubmit={submitPassword} className="space-y-4">
          <div>
            <label className={labelCls}>Phone, email, or username</label>
            <input
              className={inputCls}
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="0241234567 / user@example.com / username"
              autoComplete="username"
            />
          </div>
          <div>
            <PasswordInput
              label="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </div>
          <div className="text-right -mt-2">
            <Link to="/forgot-password" className="text-sm text-leaf hover:underline" target="_blank" rel="noopener noreferrer">
              Forgot password?
            </Link>
          </div>
          <button
            type="submit"
            disabled={busy || !identifier || !password}
            className="w-full rounded-[10px] bg-leaf py-2.5 font-sans text-sm font-bold text-white transition hover:bg-leaf-dark disabled:opacity-50"
          >
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      )}

      {method === 'otp' && (
        otpStep === 'issue' ? (
          <form onSubmit={submitOtpFirst} className="space-y-4">
            <div>
              <label className={labelCls}>Phone number</label>
              <input
                className={inputCls}
                value={otpPhone}
                onChange={(e) => {
                  setOtpPhone(e.target.value)
                  setOtpPhoneError('')
                }}
                onBlur={() => setOtpPhoneError(otpPhone.trim() && !isValidGhanaPhone(otpPhone) ? 'invalid' : '')}
                placeholder="0241234567"
                autoComplete="tel"
              />
              {otpPhoneError && <p className="mt-1 text-xs text-bad-text">Enter a valid Ghanaian mobile number (e.g. 0241234567).</p>}
            </div>
            <div>
              <label className={labelCls}>Email (optional)</label>
              <input
                className={inputCls}
                type="email"
                value={otpEmail}
                onChange={(e) => {
                  setOtpEmail(e.target.value)
                  setOtpEmailError('')
                }}
                onBlur={() => setOtpEmailError(otpEmail.trim() && !otpEmailValid ? 'invalid' : '')}
                placeholder="you@example.com"
                autoComplete="email"
              />
              {otpEmailError && <p className="mt-1 text-xs text-bad-text">Enter a valid email address.</p>}
            </div>
            <button
              type="submit"
              disabled={busy || !otpPhone || !otpPhoneValid || !otpEmailValid}
              className="w-full rounded-[10px] bg-leaf py-2.5 font-sans text-sm font-bold text-white transition hover:bg-leaf-dark disabled:opacity-50"
            >
              {busy ? 'Sending…' : 'Send code'}
            </button>
          </form>
        ) : (
          <form onSubmit={submitOtpVerify} className="space-y-4">
            {otpInfo && <p className="text-sm text-leaf bg-lime/20 rounded-md p-2">{otpInfo}</p>}
            <div>
              <label className="block text-sm font-medium text-muted mb-2">Verification code</label>
              <OtpInput
                value={otpCode}
                onChange={setOtpCode}
                autoSubmit={(code) => {
                  setOtpCode(code)
                  submitOtpVerify()
                }}
              />
            </div>
            <button
              type="submit"
              disabled={busy || !otpCode}
              className="w-full rounded-[10px] bg-leaf py-2.5 font-sans text-sm font-bold text-white transition hover:bg-leaf-dark disabled:opacity-50"
            >
              {busy ? 'Verifying…' : 'Verify & sign in'}
            </button>
            <button
              type="button"
              onClick={() => setOtpStep('issue')}
              className="w-full text-center text-sm text-leaf hover:underline"
            >
              Use a different number
            </button>
          </form>
        )
      )}

      {method === 'google' && (
        <div className="space-y-4">
          <div>
            <label className={labelCls}>Sign in as a</label>
            <div className="flex rounded-lg bg-white border border-line p-1">
              {['farmer', 'buyer'].map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => {
                    setGRole(r)
                    setGBuyerType('')
                  }}
                  className={`flex-1 rounded-md py-2 text-sm font-medium capitalize transition ${
                    gRole === r ? 'bg-lime text-ink shadow' : 'text-muted hover:text-ink'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          {gIsBuyer && (
            <div>
              <label className={labelCls}>Buyer type</label>
              <SearchableSelect
                value={gBuyerType}
                onChange={setGBuyerType}
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

          <GoogleButton
            role={gRole}
            buyerType={gIsBuyer ? gBuyerType : undefined}
            onSuccess={() => navigate('/')}
            onError={(err) => setError(err.message)}
            disabled={gIsBuyer && !gBuyerType}
          />

          {gIsBuyer && !gBuyerType && (
            <p className="text-xs text-gold text-center">
              Select a buyer type before using Google sign-up.
            </p>
          )}
          <p className="text-xs text-muted text-center">
            Returning users simply pick a role; it is only used to create a new account.
          </p>
        </div>
      )}

      <p className="mt-6 text-center text-sm text-muted">
        Don&apos;t have an account?{' '}
        <Link to="/register" className="font-medium text-leaf hover:underline" target="_blank" rel="noopener noreferrer">
          Register
        </Link>
      </p>

      <p className="mt-4 flex items-center justify-center gap-3 text-center text-xs text-muted">
        <Link to="/about" className="hover:text-leaf hover:underline" target="_blank" rel="noopener noreferrer">
          About Us
        </Link>
        <span aria-hidden="true">·</span>
        <Link to="/terms" className="hover:text-leaf hover:underline" target="_blank" rel="noopener noreferrer">
          Terms
        </Link>
        <span aria-hidden="true">·</span>
        <Link to="/privacy" className="hover:text-leaf hover:underline" target="_blank" rel="noopener noreferrer">
          Privacy
        </Link>
      </p>
    </AuthLayout>
  )
}
