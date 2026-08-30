import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import AuthLayout from '../components/AuthLayout'
import OtpInput from '../components/OtpInput'
import PasswordInput from '../components/PasswordInput'
import { issueOtp, resetPassword } from '../lib/api'
import { isValidGhanaPhone } from '../lib/phone'
import { inputCls, labelCls } from '../lib/ui'

export default function ForgotPassword() {
  const navigate = useNavigate()
  const [step, setStep] = useState('phone') // phone | code
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [info, setInfo] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [phoneError, setPhoneError] = useState('')
  const phoneValid = phone.trim() === '' || isValidGhanaPhone(phone)
  const [email, setEmail] = useState('')
  const [emailError, setEmailError] = useState('')
  const emailValid = email.trim() === '' || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  const [confirmPassword, setConfirmPassword] = useState('')
  const passwordMismatch = confirmPassword.length > 0 && confirmPassword !== password

  const sendCode = async (e) => {
    e.preventDefault()
    setError('')
    setInfo('')
    if (!phoneValid) {
      setError('Enter a valid Ghanaian mobile number.')
      return
    }
    if (!emailValid) {
      setError('Enter a valid email address.')
      return
    }
    setBusy(true)
    try {
      const res = await issueOtp(phone, 'reset', email.trim())
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
    if (passwordMismatch) {
      setError('Passwords do not match.')
      return
    }
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

  const canSubmit = code.length === 6 && password.length >= 6 && !passwordMismatch

  return (
    <AuthLayout title="Reset your password" subtitle="We'll text a code to your phone">
      {error && (
        <div className="mb-4 rounded-md bg-bad border border-bad/40 px-3 py-2 text-sm text-bad-text">
          {error}
        </div>
      )}

      {step === 'phone' ? (
        <form onSubmit={sendCode} className="space-y-4">
          <div>
            <label className={labelCls}>Phone number</label>
            <input
              className={inputCls}
              value={phone}
              onChange={(e) => {
                setPhone(e.target.value)
                setPhoneError('')
              }}
              onBlur={() => setPhoneError(phone.trim() && !isValidGhanaPhone(phone) ? 'invalid' : '')}
              placeholder="0241234567"
              autoComplete="tel"
            />
            {phoneError && <p className="mt-1 text-xs text-bad-text">Enter a valid Ghanaian mobile number (e.g. 0241234567).</p>}
          </div>
          <div>
            <label className={labelCls}>Email (optional)</label>
            <input
              className={inputCls}
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value)
                setEmailError('')
              }}
              onBlur={() => setEmailError(email.trim() && !emailValid ? 'invalid' : '')}
              placeholder="you@example.com"
              autoComplete="email"
            />
            {emailError && <p className="mt-1 text-xs text-bad-text">Enter a valid email address.</p>}
          </div>
          <button
            type="submit"
            disabled={busy || !phone || !phoneValid || !emailValid}
            className="w-full rounded-[10px] bg-leaf py-2.5 font-sans text-sm font-bold text-white transition hover:bg-leaf-dark disabled:opacity-50"
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
          <div>
            <PasswordInput
              label="Confirm new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="new-password"
            />
            {passwordMismatch && (
              <p className="mt-1 text-xs text-bad-text">Passwords do not match.</p>
            )}
          </div>
          <button
            type="submit"
            disabled={busy || !canSubmit}
            className="w-full rounded-[10px] bg-leaf py-2.5 font-sans text-sm font-bold text-white transition hover:bg-leaf-dark disabled:opacity-50"
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
