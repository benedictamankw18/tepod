import { useEffect, useMemo, useRef, useState } from 'react'

// Type-to-filter combobox. Drop-in replacement for a native <select>: takes the
// same value/onChange(string) contract, but the field is an editable input that
// filters the options as you type. With allowNew, typing a value that isn't an
// existing option commits it as a custom entry on Enter. options may be plain
// strings or { value, label } objects.
export default function SearchableSelect({
  value,
  onChange,
  options = [],
  placeholder = 'Select…',
  className = '',
  disabled = false,
  allowNew = false,
}) {
  const opts = useMemo(
    () =>
      (Array.isArray(options) ? options : []).map((o) =>
        typeof o === 'object' && o !== null && o.value !== undefined
          ? { value: String(o.value), label: String(o.label ?? o.value) }
          : { value: String(o), label: String(o) }
      ),
    [options]
  )

  const selected = opts.find((o) => o.value === value) || null
  const [text, setText] = useState(selected ? selected.label : '')
  const [open, setOpen] = useState(false)
  const [highlight, setHighlight] = useState(0)
  const rootRef = useRef(null)
  const inputRef = useRef(null)

  // Keep the field in sync when the value changes from outside (e.g. selecting a
  // region clears a district) while the list is closed. A custom value typed in
  // (allowNew) isn't in options, so preserve it as-is.
  const activeValue = selected ? selected.value : ''
  useEffect(() => {
    if (!open) {
      setText(selected ? selected.label : value ? String(value) : '')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeValue, value, open])

  useEffect(() => {
    if (!open) return undefined
    const onDocMouseDown = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onDocMouseDown)
    return () => document.removeEventListener('mousedown', onDocMouseDown)
  }, [open])

  const filtered = useMemo(() => {
    const q = text.trim().toLowerCase()
    if (!q) return opts
    return opts.filter(
      (o) => o.label.toLowerCase().includes(q) || o.value.toLowerCase().includes(q)
    )
  }, [opts, text])

  // With allowNew, typing a value that isn't an existing option (exact label or
  // value match) exposes an "Add" row so users can create custom entries.
  const trimmedText = text.trim()
  const exactMatch = Boolean(trimmedText) && opts.some(
    (o) => o.label.toLowerCase() === trimmedText.toLowerCase() || o.value.toLowerCase() === trimmedText.toLowerCase()
  )
  const showAdd = allowNew && Boolean(trimmedText) && !exactMatch
  const addIndex = filtered.length

  useEffect(() => {
    setHighlight(0)
  }, [text, open])

  const pick = (o) => {
    onChange(o.value)
    setOpen(false)
    setText(o.label)
  }

  const commitNew = () => {
    const v = trimmedText
    if (!v) return
    onChange(v)
    setOpen(false)
    setText(v)
  }

  const onKeyDown = (e) => {
    if (disabled) return
    if (!open) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault()
        setOpen(true)
      }
      return
    }
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setHighlight((h) => Math.min(addIndex - (showAdd ? 0 : 1), h + 1))
        break
      case 'ArrowUp':
        e.preventDefault()
        setHighlight((h) => Math.max(0, h - 1))
        break
      case 'Enter':
        e.preventDefault()
        if (showAdd && highlight >= addIndex) commitNew()
        else if (filtered[highlight]) pick(filtered[highlight])
        else setOpen(false)
        break
      case 'Escape':
        e.preventDefault()
        setOpen(false)
        setText(selected ? selected.label : value ? String(value) : '')
        break
      case 'Tab':
        setOpen(false)
        break
      default:
        break
    }
  }

  const onBlur = () => {
    // Defer so a click on an option registers before the list closes.
    setTimeout(() => {
      setOpen(false)
      setText(selected ? selected.label : value ? String(value) : '')
    }, 120)
  }

  if (disabled) {
    return (
      <div className={`relative ${className}`}>
        <input
          aria-disabled="true"
          tabIndex={-1}
          readOnly
          value={selected ? selected.label : placeholder}
          className="w-full cursor-not-allowed rounded-[10px] border border-line bg-[#f2f4f1] px-3 py-2.5 font-sans text-sm text-ink/60 outline-none"
        />
      </div>
    )
  }

  return (
    <div className={`relative ${className}`} ref={rootRef}>
      <input
        ref={inputRef}
        role="combobox"
        aria-expanded={open}
        aria-autocomplete="list"
        aria-activedescendant={
          open
            ? highlight < addIndex
              ? `sso-${highlight}`
              : showAdd
                ? 'sso-add'
                : undefined
            : undefined
        }
        value={text}
        placeholder={placeholder}
        autoComplete="off"
        onFocus={(e) => {
          e.target.select()
          setOpen(true)
        }}
        onChange={(e) => {
          setText(e.target.value)
          setOpen(true)
        }}
        onKeyDown={onKeyDown}
        onBlur={onBlur}
        className="w-full rounded-[10px] border border-line bg-surface px-3 py-2.5 font-sans text-sm text-ink outline-none focus:border-leaf focus:shadow-[0_0_0_3px_rgba(29,101,79,.12)]"
      />
      <button
        type="button"
        tabIndex={-1}
        aria-hidden="true"
        onClick={() => {
          if (open) {
            setOpen(false)
          } else {
            setOpen(true)
            inputRef.current?.focus()
          }
        }}
        className="pointer-events-none absolute right-1 top-1/2 -translate-y-1/2 grid h-7 w-7 place-items-center rounded-md text-muted"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </button>

      {open && (
        <ul
          role="listbox"
          className="absolute left-0 right-0 top-full z-20 mt-1 max-h-64 overflow-y-auto rounded-[10px] border border-line bg-white py-1 shadow-lg"
        >
          {filtered.map((o, i) => (
            <li key={o.value} id={`sso-${i}`}>
              <button
                type="button"
                role="option"
                aria-selected={o.value === activeValue}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick(o)}
                onMouseEnter={() => setHighlight(i)}
                className={`block w-full px-3 py-2 text-left font-sans text-sm ${
                  i === highlight ? 'bg-ok-soft text-leaf-dark' : 'text-ink'
                } ${o.value === activeValue ? 'font-semibold' : ''}`}
              >
                {o.label}
              </button>
            </li>
          ))}
          {showAdd && (
            <li id="sso-add">
              <button
                type="button"
                role="option"
                aria-selected={false}
                onMouseDown={(e) => e.preventDefault()}
                onClick={commitNew}
                onMouseEnter={() => setHighlight(addIndex)}
                className={`block w-full px-3 py-2 text-left font-sans text-sm ${
                  highlight === addIndex ? 'bg-ok-soft text-leaf-dark' : 'text-ink'
                }`}
              >
                Add “{trimmedText}”
                <span className="ml-1.5 font-sans text-[10px] uppercase tracking-wide text-muted">
                  Press Enter ↵
                </span>
              </button>
            </li>
          )}
          {!filtered.length && !showAdd && (
            <li className="px-3 py-2 font-sans text-sm text-muted">No matches</li>
          )}
        </ul>
      )}
    </div>
  )
}