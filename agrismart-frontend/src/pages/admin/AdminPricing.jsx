import { useEffect, useMemo, useRef, useState } from 'react'
import { getAdminCrops, getAllPrices, createPrice, updatePrice, deletePrice, importPrices } from '../../lib/api'
import { csvLines, splitCsv } from '../../lib/importCsv'
import { useAdmin } from '../../components/AdminShell'
import Modal from '../../components/Modal'
import SearchableSelect from '../../components/SearchableSelect'
import { Page, Loader, Empty, Btn, Table, Td, inputCls, labelCls, money, dateOnly } from './_ui'

const blank = { cropType: '', market: '', price: '' }

const CSV_HEADER = 'cropType,market,price,date'

function parsePriceCsv(text) {
  const lines = csvLines(text)
  const validRows = []
  const failed = []
  lines.forEach((line, i) => {
    if (i === 0 && /^(cropType|crop)$/i.test(line.split(',')[0])) return // header line
    const [cropType, market, price, date] = splitCsv(line)
    if (!cropType || !market) {
      failed.push({ ref: `Line ${i + 1}`, reason: 'Missing cropType or market' })
      return
    }
    if (!Number.isFinite(Number(price)) || Number(price) < 0) {
      failed.push({ ref: `Line ${i + 1} (${cropType})`, reason: `Invalid price '${price}'` })
      return
    }
    validRows.push({ cropType, market, price: Number(price), date: date || undefined })
  })
  return { validRows, failed }
}

export default function AdminPricing() {
  const { flash } = useAdmin()
  const [crops, setCrops] = useState([])
  const [rows, setRows] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState('')
  const [cropFilter, setCropFilter] = useState('')
  const [marketFilter, setMarketFilter] = useState('')
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(blank)

  useEffect(() => {
    getAdminCrops().then(setCrops).catch(() => {})
  }, [])

  const croNames = useMemo(() => crops.map((c) => c.name) || [], [crops])

  const markets = useMemo(() => {
    const s = new Set((rows || []).map((r) => r.market).filter(Boolean))
    return Array.from(s).sort()
  }, [rows])

  const load = () => {
    getAllPrices({
      cropType: cropFilter || undefined,
      market: marketFilter || undefined,
    })
      .then(setRows)
      .catch((e) => setError(e.message))
  }

  useEffect(() => {
    setRows(null)
    setError('')
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cropFilter, marketFilter])

  const [importOpen, setImportOpen] = useState(false)
  const [importText, setImportText] = useState('')
  const [importBusy, setImportBusy] = useState(false)
  const [importError, setImportError] = useState('')
  const fileRef = useRef(null)

  const importParsed = useMemo(() => parsePriceCsv(importText), [importText])

  const downloadTemplate = () => {
    const csv = [CSV_HEADER, 'tomato,Kasoa,140,2026-08-30', 'maize,Ada,185,2026-08-30'].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'prices-template.csv'
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
      const result = await importPrices(validRows)
      flash(
        `Imported ${result.inserted}, skipped ${result.skipped} duplicate${result.skipped === 1 ? '' : 's'}` +
          (result.failed.length ? `, ${result.failed.length} failed` : ''),
      )
      setImportOpen(false)
      setImportText('')
      await load()
    } catch (err) {
      setImportError(err.message || 'Could not import prices.')
    } finally {
      setImportBusy(false)
    }
  }

  const openNew = () => {
    setEditing('new')
    setForm(blank)
    setError('')
  }

  const openEdit = (r) => {
    setEditing(r.id)
    setForm({ cropType: r.cropType, market: r.market, price: String(r.price) })
    setError('')
  }

  const close = () => {
    setEditing(null)
    setForm(blank)
    setError('')
  }

  const save = async (e) => {
    e.preventDefault()
    if (!form.cropType.trim() || !form.market.trim()) {
      setError('Crop and market are required.')
      return
    }
    const price = Number(form.price)
    if (!Number.isFinite(price) || price < 0) {
      setError('Price must be a valid amount.')
      return
    }
    setError('')
    setBusy('*')
    try {
      if (editing === 'new') await createPrice({ cropType: form.cropType.trim(), market: form.market.trim(), price })
      else await updatePrice(editing, { price })
      await load()
      close()
      flash(editing === 'new' ? 'Price signal added.' : 'Price updated.')
    } catch (err) {
      setError(err.message || 'Could not save price.')
    } finally {
      setBusy('')
    }
  }

  const remove = async (r) => {
    if (!window.confirm(`Delete the ${r.cropType} price for ${r.market} on ${dateOnly(r.date)}?`)) return
    setBusy(r.id)
    try {
      await deletePrice(r.id)
      await load()
      flash('Price signal deleted.')
    } catch (err) {
      setError(err.message || 'Could not delete price.')
    } finally {
      setBusy('')
    }
  }

  return (
    <>
      <Page
        title="Pricing"
        subtitle="Admin-managed market price signals — one row per crop, market and date. The buyer price guide averages the latest signals. Use Import to bulk-add from a CSV, or download the Template to copy the format."
        actions={
          <>
            <Btn onClick={downloadTemplate}>Template</Btn>
            <Btn onClick={openImport}>Import</Btn>
            <Btn tone="green" onClick={openNew}>+ New price</Btn>
          </>
        }
      />

      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:max-w-xl">
        <SearchableSelect value={cropFilter} onChange={setCropFilter} options={croNames} placeholder="Filter by crop" />
        <SearchableSelect value={marketFilter} onChange={setMarketFilter} options={markets} placeholder="Filter by market" allowNew />
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 font-sans text-sm text-red-700">
          {error}
        </div>
      )}

      {!rows ? (
        <Loader />
      ) : rows.length === 0 ? (
        <Empty title="No price signals" hint="Add one, or clear the filters." />
      ) : (
        <Table head={['Crop', 'Market', 'Price', 'Date', 'Actions']}>
          {rows.map((r) => (
            <tr key={r.id} className="hover:bg-paper/40">
              <Td className="capitalize font-semibold">{r.cropType}</Td>
              <Td className="capitalize">{r.market}</Td>
              <Td>{money(r.price)}</Td>
              <Td>{dateOnly(r.date)}</Td>
              <Td>
                <div className="flex items-center gap-2">
                  <Btn onClick={() => openEdit(r)}>Edit</Btn>
                  <Btn tone="danger" disabled={busy === r.id} onClick={() => remove(r)}>
                    Delete
                  </Btn>
                </div>
              </Td>
            </tr>
          ))}
        </Table>
      )}

      <Modal open={editing !== null} onClose={close} title={editing === 'new' ? 'New price signal' : 'Edit price'}>
        <form onSubmit={save} className="grid gap-4">
          <div>
            <label className={labelCls}>Crop *</label>
            <SearchableSelect value={form.cropType} onChange={(v) => setForm((f) => ({ ...f, cropType: v }))} options={croNames} placeholder="e.g. tomato" allowNew />
          </div>
          <div>
            <label className={labelCls}>Market *</label>
            <SearchableSelect value={form.market} onChange={(v) => setForm((f) => ({ ...f, market: v }))} options={markets} placeholder="e.g. Makola" allowNew />
          </div>
          <div>
            <label className={labelCls}>Price (GHS) *</label>
            <input className={inputCls} type="number" min="0" step="any" value={form.price} onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))} placeholder="e.g. 120" />
          </div>
          <div className="flex justify-end gap-2">
            <Btn onClick={close}>Cancel</Btn>
            <Btn tone="green" submit disabled={busy !== ''}>Save price</Btn>
          </div>
        </form>
      </Modal>
    <Modal open={importOpen} onClose={closeImport} title="Import price signals">
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
            placeholder={[CSV_HEADER, 'tomato,Kasoa,140,2026-08-30', 'maize,Ada,185,2026-08-30'].join('\n')}
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