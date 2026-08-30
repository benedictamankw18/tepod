import { useEffect, useMemo, useRef, useState } from 'react'
import { getAdminCrops, createCrop, updateCrop, deleteCrop, importCrops } from '../../lib/api'
import { csvLines, splitCsv } from '../../lib/importCsv'
import { useAdmin } from '../../components/AdminShell'
import Modal from '../../components/Modal'
import { Page, Loader, Empty, Badge, Btn, Table, Td, inputCls, labelCls } from './_ui'
import AdminUserCroptype from './AdminUserCroptype'

const EMOJIS = ['🌽', '🍅', '🌶️', '🍌', '🍠', '🥔', '🥬', '🧅', '🍍', '🥭', '🌾', '🥥', '🫑', '🍆', '🥕', '🍚']

const blank = { name: '', defaultUnit: 'bags', emoji: '', gradientFrom: '#1d654f', gradientTo: '#4caf50', displayOrder: 0, active: true }

const swatchCls = 'h-9 w-9 shrink-0 cursor-pointer rounded-lg border border-line bg-white p-0.5'

const CROP_CSV_HEADER = 'name,defaultUnit,emoji,gradientFrom,gradientTo,displayOrder'

function parseCropCsv(text) {
  const lines = csvLines(text)
  const validRows = []
  const failed = []
  lines.forEach((line, i) => {
    if (i === 0 && /^name$/i.test(line.split(',')[0])) return // header line
    const [name, defaultUnit, emoji, gradientFrom, gradientTo, displayOrder] = splitCsv(line)
    if (!name) {
      failed.push({ ref: `Line ${i + 1}`, reason: 'Missing name' })
      return
    }
    validRows.push({
      name,
      defaultUnit: defaultUnit || undefined,
      emoji: emoji || undefined,
      gradientFrom: gradientFrom || undefined,
      gradientTo: gradientTo || undefined,
      displayOrder: displayOrder === '' ? 0 : Number(displayOrder) || 0,
    })
  })
  return { validRows, failed }
}

const CROP_TEMPLATE = [CROP_CSV_HEADER, 'Garden Eggs,bags,🍆,#e6d0c8,#9d6b8c,15', 'Tiger Nuts,bags,🥜,#ecdfc0,#b98d5a,20']

export default function AdminCrops() {
  const { flash } = useAdmin()
  const [crops, setCrops] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState('')
  const [editing, setEditing] = useState(null) // null closed, 'new', or id
  const [form, setForm] = useState(blank)

  const load = () => getAdminCrops().then(setCrops).catch((e) => setError(e.message))

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const [importOpen, setImportOpen] = useState(false)
  const [importText, setImportText] = useState('')
  const [importBusy, setImportBusy] = useState(false)
  const [importError, setImportError] = useState('')
  const fileRef = useRef(null)

  const importParsed = useMemo(() => parseCropCsv(importText), [importText])

  const downloadTemplate = () => {
    const blob = new Blob([CROP_TEMPLATE.join('\n')], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'crop-types-template.csv'
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  const openImport = () => {
    setImportOpen(true)
    setImportText('')
    setImportError('')
    if (fileRef.current) fileRef.current.value = ''
  }

  const closeImport = () => {
    if (importBusy) return
    setImportOpen(false)
    setImportText('')
    setImportError('')
  }

  const onPickFile = (e) => {
    const file = e.target.files && e.target.files[0]
    if (!file) return
    setImportError('')
    const reader = new FileReader()
    reader.onload = () => setImportText(String(reader.result || ''))
    reader.onerror = () => setImportError('Could not read that file.')
    reader.readAsText(file)
  }

  const saveImport = async () => {
    const { validRows } = importParsed
    if (validRows.length === 0) {
      setImportError('No rows to import. Use the template button to download the format.')
      return
    }
    setImportBusy(true)
    setImportError('')
    try {
      const result = await importCrops(validRows)
      flash(
        `Imported ${result.inserted}, skipped ${result.skipped} duplicate${result.skipped === 1 ? '' : 's'}` +
          (result.failed.length ? `, ${result.failed.length} failed` : ''),
      )
      setImportOpen(false)
      setImportText('')
      await load()
    } catch (err) {
      setImportError(err.message || 'Could not import crops.')
    } finally {
      setImportBusy(false)
    }
  }

  const openNew = () => {
    setEditing('new')
    setForm({ ...blank })
    setError('')
  }

  const openEdit = (c) => {
    setEditing(c.id)
    setForm({
      name: c.name || '',
      defaultUnit: c.defaultUnit || '',
      emoji: c.emoji || '',
      gradientFrom: c.gradientFrom || '',
      gradientTo: c.gradientTo || '',
      displayOrder: c.displayOrder ?? 0,
      active: c.active !== false,
    })
    setError('')
  }

  const close = () => {
    setEditing(null)
    setForm(blank)
    setError('')
  }

  const save = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) {
      setError('Crop name is required.')
      return
    }
    setError('')
    setBusy('*')
    try {
      const payload = {
        name: form.name.trim(),
        defaultUnit: form.defaultUnit.trim() || undefined,
        emoji: form.emoji.trim() || undefined,
        gradientFrom: form.gradientFrom || undefined,
        gradientTo: form.gradientTo || undefined,
        displayOrder: form.displayOrder === '' ? 0 : Number(form.displayOrder) || 0,
      }
      if (editing !== 'new') payload.active = !!form.active
      if (editing === 'new') await createCrop(payload)
      else await updateCrop(editing, payload)
      await load()
      close()
      flash(editing === 'new' ? 'Crop added.' : 'Crop updated.')
    } catch (err) {
      setError(err.message || 'Could not save crop.')
    } finally {
      setBusy('')
    }
  }

  const toggleActive = async (c) => {
    setBusy(c.id)
    try {
      await updateCrop(c.id, { active: !c.active })
      await load()
      flash(`${c.name} ${c.active ? 'deactivated' : 'activated'}.`)
    } catch (err) {
      setError(err.message || 'Could not update crop.')
    } finally {
      setBusy('')
    }
  }

  const remove = async (c) => {
    if (!window.confirm(`Delete "${c.name}"? This removes the crop type for good.`)) return
    setBusy(c.id)
    try {
      await deleteCrop(c.id)
      await load()
      if (editing === c.id) close()
      flash('Crop deleted.')
    } catch (err) {
      setError(err.message || 'Could not delete crop.')
    } finally {
      setBusy('')
    }
  }

  return (
    <>
      <Page
        title="Crops"
        subtitle="The catalog of crop types used across listings, farms and price signals. Emoji and gradient power storefront art; display order controls picker sorting."
        actions={
          <>
            <Btn onClick={downloadTemplate}>Template</Btn>
            <Btn onClick={openImport}>Import</Btn>
            <Btn tone="green" onClick={openNew}>+ New crop</Btn>
          </>
        }
      />

      {error && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 font-sans text-sm text-red-700">
          {error}
        </div>
      )}

      {!crops ? (
        <Loader />
      ) : crops.length === 0 ? (
        <Empty title="No crops yet" />
      ) : (
        <Table head={['Crop', 'Default unit', 'Order', 'Status', 'Actions']}>
          {crops.map((c) => (
            <tr key={c.id} className="hover:bg-paper/40">
              <Td>
                <div className="flex items-center gap-3">
                  <span
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-lg"
                    style={{ background: c.gradientFrom ? `linear-gradient(135deg, ${c.gradientFrom}, ${c.gradientTo || c.gradientFrom})` : '#e8f0c5' }}
                  >
                    {c.emoji || c.name.slice(0, 1).toUpperCase()}
                  </span>
                  <div>
                    <p className="font-semibold capitalize text-ink">{c.name}</p>
                    <p className="text-xs text-muted">{c.id}</p>
                  </div>
                </div>
              </Td>
              <Td className="capitalize">{c.defaultUnit || '—'}</Td>
              <Td>{c.displayOrder ?? '—'}</Td>
              <Td>
                <Badge tone={c.active ? 'green' : 'muted'}>{c.active ? 'Active' : 'Inactive'}</Badge>
              </Td>
              <Td>
                <div className="flex items-center gap-2">
                  <Btn disabled={busy === c.id} onClick={() => toggleActive(c)}>
                    {c.active ? 'Deactivate' : 'Activate'}
                  </Btn>
                  <Btn onClick={() => openEdit(c)}>Edit</Btn>
                  <Btn tone="danger" disabled={busy === c.id} onClick={() => remove(c)}>
                    Delete
                  </Btn>
                </div>
              </Td>
            </tr>
          ))}
        </Table>
      )}

    
      <Modal open={editing !== null} onClose={close} title={editing === 'new' ? 'New crop' : 'Edit crop'} maxWidth="max-w-lg">
        <form onSubmit={save} className="grid gap-4">
          <div
            className="flex items-center justify-center rounded-2xl p-6"
            style={{
              background: `linear-gradient(135deg, ${form.gradientFrom || '#1d654f'}, ${form.gradientTo || '#4caf50'})`,
            }}
          >
            <span className="text-5xl" aria-hidden="true">{form.emoji || '🌽'}</span>
          </div>

          <div>
            <label className={labelCls}>Crop name *</label>
            <input className={inputCls} value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. Cassava" />
          </div>

          <div>
            <label className={labelCls}>Emoji</label>
            <div className="flex items-center gap-2">
              <input
                className={inputCls}
                value={form.emoji}
                onChange={(e) => setForm((f) => ({ ...f, emoji: e.target.value }))}
                placeholder="e.g. 🌽"
                maxLength={8}
              />
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-paper text-xl" aria-hidden="true">{form.emoji || '•'}</span>
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {EMOJIS.map((em) => (
                <button
                  key={em}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, emoji: f.emoji === em ? '' : em }))}
                  className={`grid h-8 w-8 place-items-center rounded-lg border text-base transition ${
                    form.emoji === em ? 'border-leaf bg-[#e8f0c5]' : 'border-line bg-white hover:bg-paper'
                  }`}
                  aria-label={`Set emoji ${em}`}
                >
                  {em}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelCls}>Gradient from</label>
              <div className="flex items-center gap-2">
                <input type="color" className={swatchCls} value={form.gradientFrom || '#1d654f'} onChange={(e) => setForm((f) => ({ ...f, gradientFrom: e.target.value }))} />
                <input className={inputCls} value={form.gradientFrom} onChange={(e) => setForm((f) => ({ ...f, gradientFrom: e.target.value }))} placeholder="#1d654f" />
              </div>
            </div>
            <div>
              <label className={labelCls}>Gradient to</label>
              <div className="flex items-center gap-2">
                <input type="color" className={swatchCls} value={form.gradientTo || '#4caf50'} onChange={(e) => setForm((f) => ({ ...f, gradientTo: e.target.value }))} />
                <input className={inputCls} value={form.gradientTo} onChange={(e) => setForm((f) => ({ ...f, gradientTo: e.target.value }))} placeholder="#4caf50" />
              </div>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelCls}>Default unit</label>
              <input className={inputCls} value={form.defaultUnit} onChange={(e) => setForm((f) => ({ ...f, defaultUnit: e.target.value }))} placeholder="e.g. bags" />
            </div>
            <div>
              <label className={labelCls}>Display order</label>
              <input
                className={inputCls}
                type="number"
                min="0"
                value={form.displayOrder}
                onChange={(e) => setForm((f) => ({ ...f, displayOrder: e.target.value }))}
                placeholder="0"
              />
              <p className="mt-1 font-sans text-[11px] text-muted">Lower numbers appear first in pickers.</p>
            </div>
          </div>

          {editing !== 'new' && (
            <label className="flex items-center gap-2 font-sans text-sm text-ink">
              <input type="checkbox" checked={form.active} onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))} />
              Active (visible in pickers)
            </label>
          )}

          <div className="flex justify-end gap-2">
            <Btn onClick={close}>Cancel</Btn>
            <Btn tone="green" submit disabled={busy !== ''}>Save crop</Btn>
          </div>
        </form>
      </Modal>

      <Modal open={importOpen} onClose={closeImport} title="Import crop types">
        <div className="grid gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <label className="cursor-pointer rounded-[10px] border border-line bg-white px-3 py-2 font-sans text-xs font-bold text-ink transition hover:bg-paper">
              Choose CSV file
              <input ref={fileRef} type="file" accept=".csv,.txt,text/csv" className="hidden" onChange={onPickFile} />
            </label>
            <span className="font-sans text-xs text-muted">
              {importParsed.validRows.length} row{importParsed.validRows.length === 1 ? '' : 's'} ready
              {importParsed.failed.length ? ` · ${importParsed.failed.length} skipped` : ''}
            </span>
          </div>

          <label className={labelCls}>or paste CSV</label>
          <textarea
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
            rows={6}
            placeholder={CROP_TEMPLATE.join('\n')}
            className={`${inputCls} font-mono text-xs`}
          />

          {importParsed.failed.length > 0 && (
            <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 font-sans text-[12px] text-amber-800">
              <p className="font-bold">Skipped lines</p>
              <ul className="mt-1 list-inside list-disc space-y-0.5">
                {importParsed.failed.slice(0, 5).map((f, i) => (
                  <li key={i}>
                    {f.ref} — {f.reason}
                  </li>
                ))}
                {importParsed.failed.length > 5 && <li>…and {importParsed.failed.length - 5} more</li>}
              </ul>
            </div>
          )}

          {importError && (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 font-sans text-sm text-red-700">{importError}</div>
          )}

          <div className="flex justify-end gap-2">
            <Btn onClick={closeImport} disabled={importBusy}>Cancel</Btn>
            <Btn tone="green" disabled={importBusy || importParsed.validRows.length === 0} onClick={saveImport}>
              {importBusy ? 'Importing…' : `Import ${importParsed.validRows.length} row${importParsed.validRows.length === 1 ? '' : 's'}`}
            </Btn>
          </div>
        </div>
      </Modal>
    </>
  )
}