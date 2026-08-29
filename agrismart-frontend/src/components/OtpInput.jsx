import { useEffect, useRef } from 'react'

const DEFAULT_LENGTH = 6

export default function OtpInput({ length = DEFAULT_LENGTH, value = '', onChange, autoSubmit }) {
  const refs = useRef([])

  useEffect(() => {
    refs.current[0]?.focus()
  }, [])

  const handleBoxChange = (i, raw) => {
    const digit = raw.replace(/\D/g, '').slice(-1)
    const digits = value.split('')
    digits[i] = digit
    const next = digits.join('').slice(0, length)
    onChange(next)
    if (digit && i < length - 1) {
      refs.current[i + 1]?.focus()
    } else if (digit && i === length - 1 && autoSubmit && next.length === length) {
      autoSubmit(next)
    }
  }

  const handleKeyDown = (i, e) => {
    if (e.key === 'Backspace' && !value[i] && i > 0) {
      refs.current[i - 1]?.focus()
    }
    if (e.key === 'ArrowLeft' && i > 0) refs.current[i - 1]?.focus()
    if (e.key === 'ArrowRight' && i < length - 1) refs.current[i + 1]?.focus()
  }

  const handlePaste = (e) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length)
    if (!pasted) return
    onChange(pasted)
    refs.current[Math.min(pasted.length, length - 1)]?.focus()
    if (pasted.length === length && autoSubmit) autoSubmit(pasted)
  }

  return (
    <div className="flex gap-2 justify-between">
      {Array.from({ length }).map((_, i) => (
        <input
          key={i}
          ref={(el) => (refs.current[i] = el)}
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={1}
          value={value[i] || ''}
          onChange={(e) => handleBoxChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={handlePaste}
          aria-label={`Digit ${i + 1}`}
          className="h-12 w-12 rounded-[10px] border border-line bg-[#fbfcfa] text-center font-serif text-xl font-semibold text-ink outline-none focus:border-leaf focus:shadow-[0_0_0_3px_rgba(29,101,79,.12)]"
        />
      ))}
    </div>
  )
}
