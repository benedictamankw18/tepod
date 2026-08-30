import { useState } from 'react'
import { cropKey, displayName } from '../lib/crops'

const chipCls = (selected, variant) =>
  variant === 'soft'
    ? `rounded-full px-3 py-1 font-sans text-xs font-bold transition ${
        selected ? 'bg-lime text-leaf-dark' : 'bg-paper text-muted hover:bg-line'
      }`
    : `rounded-full border px-2.5 py-1 text-xs font-medium capitalize transition ${
        selected ? 'border-lime bg-lime text-ink' : 'border-line bg-white text-muted hover:bg-lime/30 hover:border-lime'
      }`

// Crop multi-select chip picker. Draws canonical chips from the crop registry and
// renders any already-selected values that aren't canonical as custom chips. When
// allowCustom is on, users can type their own crop name and it is added as a chip.
export default function CropPicker({
  crops = [],
  selected = [],
  onChange,
  variant = 'outline',
  allowCustom = true,
  placeholder = 'e.g. Tiger nuts',
}) {
  const [adding, setAdding] = useState(false)
  const [label, setLabel] = useState('')
  const [error, setError] = useState('')

  const known = new Set(crops.map((c) => c.id))
  const customSelected = selected.filter((id) => !known.has(id)).map((id) => ({ id, name: displayName(id) }))

  const toggle = (id) => {
    onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id])
  }

  const startAdd = () => {
    setError('')
    setLabel('')
    setAdding(true)
  }

  const addCustom = () => {
    const key = cropKey(label)
    if (!key) {
      setError('Enter a crop name.')
      return
    }
    if (selected.includes(key)) {
      setError('That crop is already added.')
      return
    }
    onChange([...selected, key])
    setLabel('')
    setError('')
    setAdding(false)
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {crops.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => toggle(c.id)}
            className={chipCls(selected.includes(c.id), variant)}
          >
            {c.name}
          </button>
        ))}
        {customSelected.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => toggle(c.id)}
            className={chipCls(true, variant)}
            title="Your custom crop"
          >
            {c.name} ✓
          </button>
        ))}
        {allowCustom && !adding && (
          <button type="button" onClick={startAdd} className={chipCls(false, variant)}>
            + Add your own
          </button>
        )}
      </div>

      {allowCustom && adding && (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <input
            autoFocus
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                addCustom()
              }
            }}
            placeholder={placeholder}
            className="w-full min-w-0 flex-1 rounded-[8px] border border-line bg-surface px-2.5 py-1.5 font-sans text-xs text-ink outline-none focus:border-leaf focus:shadow-[0_0_0_3px_rgba(29,101,79,.12)]"
          />
          <button
            type="button"
            onClick={addCustom}
            className="rounded-full bg-leaf px-3 py-1.5 font-sans text-xs font-bold text-white transition hover:bg-leaf-dark"
          >
            Add
          </button>
          <button
            type="button"
            onClick={() => {
              setAdding(false)
              setLabel('')
              setError('')
            }}
            className="rounded-full border border-line bg-white px-3 py-1.5 font-sans text-xs font-medium text-muted hover:bg-paper"
          >
            Cancel
          </button>
          {error && <p className="w-full font-sans text-xs text-bad-text">{error}</p>}
        </div>
      )}
    </div>
  )
}