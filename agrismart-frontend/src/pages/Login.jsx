import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import AuthLayout from '../components/AuthLayout'
import GoogleButton from '../components/GoogleButton'
import PasswordInput from '../components/PasswordInput'
import OtpInput from '../components/OtpInput'
import { login, issueOtp, verifyOtp } from '../lib/api'
import { setSession } from '../lib/auth'

const METHODS = [
  { key: 'password', label: 'Password' },
  { key: 'otp', label: 'Phone (OTP)' },
  { key: 'google', label: 'Google' },
]

const inputCls =
  'w-full rounded-lg border border-line px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-leaf text-ink'

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
    setBusy(true)
    try {
      const res = await issueOtp(otpPhone)
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
        <div className="mb-4 rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      {method === 'password' && (
        <form onSubmit={submitPassword} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-muted mb-1">Phone, email, or username</label>
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
            <Link to="/forgot-password" className="text-sm text-leaf hover:underline">
              Forgot password?
            </Link>
          </div>
          <button
            type="submit"
            disabled={busy || !identifier || !password}
            className="w-full rounded-lg bg-leaf py-2.5 text-sm font-semibold text-white hover:bg-leaf-dark disabled:opacity-50"
          >
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      )}

      {method === 'otp' && (
        otpStep === 'issue' ? (
          <form onSubmit={submitOtpFirst} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-muted mb-1">Phone number</label>
              <input
                className={inputCls}
                value={otpPhone}
                onChange={(e) => setOtpPhone(e.target.value)}
                placeholder="0241234567"
                autoComplete="tel"
              />
            </div>
            <button
              type="submit"
              disabled={busy || !otpPhone}
              className="w-full rounded-lg bg-leaf py-2.5 text-sm font-semibold text-white hover:bg-leaf-dark disabled:opacity-50"
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
              className="w-full rounded-lg bg-leaf py-2.5 text-sm font-semibold text-white hover:bg-leaf-dark disabled:opacity-50"
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
            <label className="block text-sm font-medium text-muted mb-1">Sign in as a</label>
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
              <label className="block text-sm font-medium text-muted mb-1">Buyer type</label>
              <select
                className={inputCls}
                value={gBuyerType}
                onChange={(e) => setGBuyerType(e.target.value)}
              >
                <option value="">Select buyer type…</option>
                <option value="wholesale">Wholesale</option>
                <option value="retail">Retail</option>
                <option value="processor">Processor</option>
              </select>
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
        <Link to="/register" className="font-medium text-leaf hover:underline">
          Register
        </Link>
      </p>
    </AuthLayout>
  )
}
