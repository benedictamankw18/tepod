import { useEffect, useMemo, useRef, useState } from 'react'
import { getAdminUnits, createUnit, updateUnit, deleteUnit, importUnits } from '../../lib/api'
import { csvLines, splitCsv } from '../../lib/importCsv'
import { useAdmin } from '../../components/AdminShell'
import Modal from '../../components/Modal'
import { Page, Loader, Empty, Badge, Btn, Table, Td, inputCls, labelCls } from './_ui'

const blank = { name: '', plural: '' }

const UNIT_CSV_HEADER = 'name,plural,displayOrder'

function parseUnitCsv(text) {
  const lines = csvLines(text)
  const validRows = []
  const failed = []
  lines.forEach((line, i) => {
    if (i === 0 && /^name$/i.test(line.split(',')[0])) return // header line
    const [name, plural, displayOrder] = splitCsv(line)
    if (!name) {
      failed.push({ ref: `Line ${i + 1}`, reason: 'Missing name' })
      return
    }
    validRows.push({
      name,
      plural: plural || undefined,
      displayOrder: displayOrder === '' ? 0 : Number(displayOrder) || 0,
    })
  })
  return { validRows, failed }
}

const UNIT_TEMPLATE = [UNIT_CSV_HEADER, 'sack,sacks,12', 'wheelbarrow,wheelbarrows,13']

export default function AdminUnits() {
  const { flash } = useAdmin()
  const [units, setUnits] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState('')
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(blank)

  const load = () => getAdminUnits().then(setUnits).catch((e) => setError(e.message))

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const [importOpen, setImportOpen] = useState(false)
  const [importText, setImportText] = useState('')
  const [importBusy, setImportBusy] = useState(false)
  const [importError, setImportError] = useState('')
  const fileRef = useRef(null)

  const importParsed = useMemo(() => parseUnitCsv(importText), [importText])

  const downloadTemplate = () => {
    const blob = new Blob([UNIT_TEMPLATE.join('\n')], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'units-template.csv'
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
      const result = await importUnits(validRows)
      flash(
        `Imported ${result.inserted}, skipped ${result.skipped} duplicate${result.skipped === 1 ? '' : 's'}` +
          (result.failed.length ? `, ${result.failed.length} failed` : ''),
      )
      setImportOpen(false)
      setImportText('')
      await load()
    } catch (err) {
      setImportError(err.message || 'Could not import units.')
    } finally {
      setImportBusy(false)
    }
  }

  const openNew = () => {
    setEditing('new')
    setForm(blank)
    setError('')
  }

  const openEdit = (u) => {
    setEditing(u.id)
    setForm({ name: u.name, plural: u.plural || '' })
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
      setError('Unit name is required.')
      return
    }
    setError('')
    setBusy('*')
    try {
      const payload = { name: form.name.trim(), plural: form.plural.trim() || undefined }
      if (editing === 'new') await createUnit(payload)
      else await updateUnit(editing, payload)
      await load()
      close()
      flash(editing === 'new' ? 'Unit added.' : 'Unit updated.')
    } catch (err) {
      setError(err.message || 'Could not save unit.')
    } finally {
      setBusy('')
    }
  }

  const toggleActive = async (u) => {
    setBusy(u.id)
    try {
      await updateUnit(u.id, { active: !u.active })
      await load()
      flash(`${u.name} ${u.active ? 'deactivated' : 'activated'}.`)
    } catch (err) {
      setError(err.message || 'Could not update unit.')
    } finally {
      setBusy('')
    }
  }

  const remove = async (u) => {
    if (!window.confirm(`Delete the unit "${u.name}"?`)) return
    setBusy(u.id)
    try {
      await deleteUnit(u.id)
      await load()
      if (editing === u.id) close()
      flash('Unit deleted.')
    } catch (err) {
      setError(err.message || 'Could not delete unit.')
    } finally {
      setBusy('')
    }
  }

  return (
    <>
      <Page
        title="Units of measure"
        subtitle="Measurement units available when farmers list produce and farms."
        actions={
          <>
            <Btn onClick={downloadTemplate}>Template</Btn>
            <Btn onClick={openImport}>Import</Btn>
            <Btn tone="green" onClick={openNew}>+ New unit</Btn>
          </>
        }
      />

      {error && (
        <div className="mb-4 rounded-md border border-bad/40 bg-bad px-3 py-2 font-sans text-sm text-bad-text">
          {error}
        </div>
      )}

      {!units ? (
        <Loader />
      ) : units.length === 0 ? (
        <Empty title="No units yet" />
      ) : (
        <Table head={['Unit', 'Plural', 'Status', 'Actions']}>
          {units.map((u) => (
            <tr key={u.id} className="hover:bg-paper/40">
              <Td>
                <p className="font-semibold text-ink capitalize">{u.name}</p>
                <p className="text-xs text-muted">{u.id}</p>
              </Td>
              <Td className="capitalize">{u.plural || '—'}</Td>
              <Td>
                <Badge tone={u.active ? 'green' : 'muted'}>{u.active ? 'Active' : 'Inactive'}</Badge>
              </Td>
              <Td>
                <div className="flex items-center gap-2">
                  <Btn disabled={busy === u.id} onClick={() => toggleActive(u)}>
                    {u.active ? 'Deactivate' : 'Activate'}
                  </Btn>
                  <Btn onClick={() => openEdit(u)}>Edit</Btn>
                  <Btn tone="danger" disabled={busy === u.id} onClick={() => remove(u)}>
                    Delete
                  </Btn>
                </div>
              </Td>
            </tr>
          ))}
        </Table>
      )}

      <Modal open={editing !== null} onClose={close} title={editing === 'new' ? 'New unit' : 'Edit unit'}>
        <form onSubmit={save} className="grid gap-4">
          <div>
            <label className={labelCls}>Unit name *</label>
            <input className={inputCls} value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. bowl" />
          </div>
          <div>
            <label className={labelCls}>Plural form</label>
            <input className={inputCls} value={form.plural} onChange={(e) => setForm((f) => ({ ...f, plural: e.target.value }))} placeholder="e.g. bowls" />
          </div>
          <div className="flex justify-end gap-2">
            <Btn onClick={close}>Cancel</Btn>
            <Btn tone="green" submit disabled={busy !== ''}>Save unit</Btn>
          </div>
        </form>
      </Modal>

      <Modal open={importOpen} onClose={closeImport} title="Import units of measure">
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
            placeholder={UNIT_TEMPLATE.join('\n')}
            className={`${inputCls} font-mono text-xs`}
          />

          {importParsed.failed.length > 0 && (
            <div className="rounded-md border border-warn/40 bg-warn-soft px-3 py-2 font-sans text-[12px] text-warn">
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
            <div className="rounded-md border border-bad/40 bg-bad px-3 py-2 font-sans text-sm text-bad-text">{importError}</div>
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