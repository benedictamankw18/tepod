import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import AuthLayout from '../components/AuthLayout'
import OtpInput from '../components/OtpInput'
import PasswordInput from '../components/PasswordInput'
import { issueOtp, resetPassword } from '../lib/api'

const inputCls =
  'w-full rounded-lg border border-line px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-leaf text-ink'

export default function ForgotPassword() {
  const navigate = useNavigate()
  const [step, setStep] = useState('phone') // phone | code
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [info, setInfo] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const sendCode = async (e) => {
    e.preventDefault()
    setError('')
    setInfo('')
    setBusy(true)
    try {
      const res = await issueOtp(phone, 'reset')
      setInfo(
        res.debugCode
          ? `Reset code issued. Dev code: ${res.debugCode}`
          : 'A reset code has been sent to your phone.'
      )
      setStep('code')
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const doReset = async (e) => {
    if (e) e.preventDefault()
    setError('')
    setBusy(true)
    try {
      await resetPassword({ phone, code, password })
      navigate('/login')
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const canSubmit = code.length === 6 && password.length >= 6

  return (
    <AuthLayout title="Reset your password" subtitle="We'll text a code to your phone">
      {error && (
        <div className="mb-4 rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      {step === 'phone' ? (
        <form onSubmit={sendCode} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-muted mb-1">Phone number</label>
            <input
              className={inputCls}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="0241234567"
              autoComplete="tel"
            />
          </div>
          <button
            type="submit"
            disabled={busy || !phone}
            className="w-full rounded-lg bg-leaf py-2.5 text-sm font-semibold text-white hover:bg-leaf-dark disabled:opacity-50"
          >
            {busy ? 'Sending…' : 'Send reset code'}
          </button>
        </form>
      ) : (
        <form onSubmit={doReset} className="space-y-4">
          {info && <p className="text-sm text-leaf bg-lime/20 rounded-md p-2">{info}</p>}
          <div>
            <label className="block text-sm font-medium text-muted mb-2">Enter the 6-digit code</label>
            <OtpInput value={code} onChange={setCode} />
          </div>
          <PasswordInput
            label="New password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            autoComplete="new-password"
          />
          <button
            type="submit"
            disabled={busy || !canSubmit}
            className="w-full rounded-lg bg-leaf py-2.5 text-sm font-semibold text-white hover:bg-leaf-dark disabled:opacity-50"
          >
            {busy ? 'Resetting…' : 'Reset password'}
          </button>
          <button
            type="button"
            onClick={() => setStep('phone')}
            className="w-full text-center text-sm text-leaf hover:underline"
          >
            Use a different number
          </button>
        </form>
      )}

      <p className="mt-6 text-center text-sm text-muted">
        Remembered it?{' '}
        <Link to="/login" className="font-medium text-leaf hover:underline">
          Back to sign in
        </Link>
      </p>
    </AuthLayout>
  )
}
