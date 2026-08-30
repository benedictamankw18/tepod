import { useEffect, useMemo, useState } from 'react'
import { getAllListings, getUsers, getCrops, getUnits, createListing, updateListing, setListingStatus, deleteListing } from '../../lib/api'
import { useAdmin } from '../../components/AdminShell'
import Modal from '../../components/Modal'
import SearchableSelect from '../../components/SearchableSelect'
import { Page, Loader, Empty, Btn, Table, Td, money, dateOnly, shortId, inputCls, labelCls } from './_ui'

const STATUSES = ['open', 'pre_committed', 'sold', 'expired', 'spoiled_withdrawn', 'deactivated', 'deleted']
const TABS = ['', ...STATUSES]

const blankForm = {
  farmerId: '', cropType: '', quantity: '', unit: 'bags', askingPrice: '', harvestDate: '',
  location: '', reason: '',
}

export default function AdminListings() {
  const { flash } = useAdmin()
  const [rows, setRows] = useState(null)
  const [farmers, setFarmers] = useState([])
  const [crops, setCrops] = useState([])
  const [units, setUnits] = useState([])
  const [error, setError] = useState('')
  const [busy, setBusy] = useState('')
  const [status, setStatus] = useState('')
  const [editor, setEditor] = useState(null) // null closed, 'new', or listing id
  const [deleting, setDeleting] = useState(null) // listing being soft-deleted
  const [form, setForm] = useState(blankForm)
  const [saving, setSaving] = useState(false)

  const load = () => {
    getAllListings({ status: status || undefined })
      .then(setRows)
      .catch((e) => setError(e.message))
  }

  useEffect(() => {
    setRows(null)
    setError('')
    load()
    getUsers({ role: 'farmer' }).then(setFarmers).catch(() => {})
    getCrops().then((c) => setCrops(Array.isArray(c) ? c.map((x) => x.name || x) : [])).catch(() => {})
    getUnits().then(setUnits).catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status])

  const farmerOptions = useMemo(
    () =>
      farmers.map((fr) => ({
        value: fr.id,
        label: `${fr.name} · ${fr.phone || 'no phone'}${fr.active === false ? ' (inactive)' : ''}`,
      })),
    [farmers]
  )

  const unitOptions = useMemo(() => {
    const base = units.map((u) => ({ value: u.id, label: u.name }))
    return form.unit && !units.some((u) => u.id === form.unit) ? [...base, { value: form.unit, label: form.unit }] : base
  }, [units, form.unit])

  const openNew = () => {
    setForm(blankForm)
    setError('')
    setEditor('new')
  }

  const openEdit = (l) => {
    setForm({
      farmerId: l.farmerId, cropType: l.cropType || '', quantity: String(l.quantity ?? ''),
      unit: l.unit || 'bags', askingPrice: String(l.askingPrice ?? ''), harvestDate: l.harvestDate || '',
      location: l.location || '', reason: '',
    })
    setError('')
    setEditor(l.id)
  }

  const closeEdit = () => {
    setEditor(null)
    setForm(blankForm)
  }

  const openDelete = (l) => {
    setDeleting(l)
    setForm(blankForm)
    setError('')
  }

  const closeDelete = () => {
    setDeleting(null)
    setForm(blankForm)
  }

  const validateForm = () => {
    if (editor === 'new' && !form.farmerId) return 'Pick the listing owner (farmer) first.'
    if (!form.cropType.trim()) return 'Crop is required.'
    if (!Number(form.quantity) || Number(form.quantity) <= 0) return 'Quantity must be a positive number.'
    if (Number.isNaN(Number(form.askingPrice)) || Number(form.askingPrice) < 0) return 'Asking price must be a valid amount.'
    if (editor !== 'new' && !form.reason.trim()) return 'A reason is required for admin edits.'
    return ''
  }

  const save = async (e) => {
    e.preventDefault()
    const problem = validateForm()
    if (problem) {
      setError(problem)
      return
    }
    setError('')
    setSaving(true)
    try {
      const fields = {
        farmerId: form.farmerId,
        cropType: form.cropType.trim(),
        quantity: Number(form.quantity),
        unit: form.unit.trim() || 'bags',
        askingPrice: Number(form.askingPrice),
        harvestDate: form.harvestDate || undefined,
        location: form.location.trim() || undefined,
      }
      if (editor === 'new') {
        await createListing(fields)
        flash('Listing created.')
      } else {
        await updateListing(editor, { ...fields, reason: form.reason.trim() })
        flash('Listing updated.')
      }
      await load()
      closeEdit()
    } catch (err) {
      setError(err.message || 'Could not save listing.')
    } finally {
      setSaving(false)
    }
  }

  const changeStatus = async (l, next) => {
    if (next === l.status) return
    setBusy(l.id)
    try {
      await setListingStatus(l.id, next)
      await load()
      flash(`Listing is now ${next.replace('_', ' ')}.`)
    } catch (err) {
      setError(err.message || 'Could not change status.')
    } finally {
      setBusy('')
    }
  }

  const remove = async (e) => {
    e.preventDefault()
    if (!form.reason.trim()) {
      setError('A reason is required to delete a listing.')
      return
    }
    setError('')
    setBusy(deleting.id)
    try {
      await deleteListing(deleting.id, form.reason.trim())
      await load()
      closeDelete()
      flash('Listing soft-deleted.')
    } catch (err) {
      setError(err.message || 'Could not delete listing.')
    } finally {
      setBusy('')
    }
  }

  const listingFields = () => (
    <>
      {editor === 'new' && (
        <div>
          <label className={labelCls}>Listing owner (farmer) *</label>
          <SearchableSelect value={form.farmerId} onChange={(v) => setForm((f) => ({ ...f, farmerId: v }))} options={farmerOptions} placeholder="Search farmers…" />
        </div>
      )}
      <div>
        <label className={labelCls}>Crop *</label>
        <input
          className={inputCls}
          value={form.cropType}
          onChange={(e) => setForm((f) => ({ ...f, cropType: e.target.value }))}
          placeholder="e.g. tomato"
          list="admin-crop-types"
        />
        {crops.length > 0 && (
          <datalist id="admin-crop-types">
            {crops.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        )}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={labelCls}>Quantity *</label>
          <input className={inputCls} type="number" min="0" step="any" value={form.quantity} onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))} placeholder="e.g. 10" />
        </div>
        <div>
          <label className={labelCls}>Unit</label>
          <SearchableSelect
            value={form.unit}
            onChange={(v) => setForm((f) => ({ ...f, unit: v }))}
            options={unitOptions}
            placeholder="Select a unit or type a new one"
            allowNew
          />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={labelCls}>Asking price (GHS) *</label>
          <input className={inputCls} type="number" min="0" step="any" value={form.askingPrice} onChange={(e) => setForm((f) => ({ ...f, askingPrice: e.target.value }))} placeholder="e.g. 200" />
        </div>
        <div>
          <label className={labelCls}>Harvest date</label>
          <input className={inputCls} type="date" value={form.harvestDate} onChange={(e) => setForm((f) => ({ ...f, harvestDate: e.target.value }))} />
        </div>
      </div>
      <div>
        <label className={labelCls}>Location</label>
        <input className={inputCls} value={form.location} onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))} placeholder="Market or town" />
      </div>
      {editor !== 'new' && (
        <div>
          <label className={labelCls}>Reason for change *</label>
          <textarea
            className={`${inputCls} min-h-[80px] resize-y`}
            value={form.reason}
            onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
            placeholder="Why is the admin updating this listing?"
          />
        </div>
      )}
    </>
  )

  return (
    <>
      <Page
        title="Listings"
        subtitle="All produce listings across every farmer, including soft-deleted rows. Admins may create, edit (with reason), set any status, or delete listings."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Btn tone="green" onClick={openNew}>+ New listing</Btn>
            <div className="flex flex-wrap gap-1.5">
              {TABS.map((s) => (
                <button
                  key={s || 'all'}
                  type="button"
                  onClick={() => setStatus(s)}
                  className={`rounded-full border px-3 py-1.5 font-sans text-xs font-semibold capitalize transition ${
                    status === s ? 'border-leaf bg-leaf text-white' : 'border-line bg-white text-muted hover:border-leaf hover:text-leaf'
                  }`}
                >
                  {s || 'All'}
                </button>
              ))}
            </div>
          </div>
        }
      />

      {error && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 font-sans text-sm text-red-700">
          {error}
        </div>
      )}

      {!rows ? (
        <Loader />
      ) : rows.length === 0 ? (
        <Empty title="No listings" hint="Try another status filter." />
      ) : (
        <Table head={['Produce', 'Farmer', 'Quantity', 'Price', 'Location', 'Status', 'Created', 'Actions']}>
          {rows.map((l) => (
            <tr key={l.id} className="hover:bg-paper/40">
              <Td>
                <div className="flex items-center gap-3">
                  {l.imageUrls?.[0] ? (
                    <img src={l.imageUrls[0]} alt="" className="h-10 w-14 shrink-0 rounded-lg border border-line object-cover" />
                  ) : (
                    <span className="grid h-10 w-14 shrink-0 place-items-center rounded-lg bg-[#e8f0c5] font-serif text-xs font-bold text-leaf-dark">
                      {l.cropType.slice(0, 2).toUpperCase()}
                    </span>
                  )}
                  <p className="font-semibold capitalize text-ink">{l.cropType}</p>
                </div>
              </Td>
              <Td>
                <p className="font-semibold text-ink">{l.farmerName || shortId(l.farmerId)}</p>
                {!l.farmerName && <p className="text-xs text-muted">{l.farmerId}</p>}
              </Td>
              <Td>
                {l.quantity} {l.unit}
              </Td>
              <Td>{money(l.askingPrice)}</Td>
              <Td className="max-w-[140px] truncate">{l.location || '—'}</Td>
              <Td>
                <select
                  value={l.status}
                  disabled={busy === l.id}
                  onChange={(e) => changeStatus(l, e.target.value)}
                  className="rounded-[8px] border border-line bg-[#fbfcfa] px-2 py-1.5 font-sans text-xs capitalize text-ink outline-none focus:border-leaf"
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s.replace('_', ' ')}
                    </option>
                  ))}
                </select>
              </Td>
              <Td>{dateOnly(l.createdAt)}</Td>
              <Td>
                <div className="flex flex-wrap items-center gap-2">
                  <Btn disabled={busy === l.id} onClick={() => openEdit(l)}>Edit</Btn>
                  <Btn tone="danger" disabled={busy === l.id} onClick={() => openDelete(l)}>
                    Delete
                  </Btn>
                </div>
              </Td>
            </tr>
          ))}
        </Table>
      )}

      <Modal open={editor !== null} onClose={closeEdit} title={editor === 'new' ? 'New listing' : 'Edit listing'} maxWidth="max-w-lg">
        <form onSubmit={save} className="grid gap-4">
          {listingFields()}
          <div className="flex justify-end gap-2">
            <Btn onClick={closeEdit}>Cancel</Btn>
            <Btn tone="green" submit disabled={saving}>
              {editor === 'new' ? 'Create listing' : 'Save changes'}
            </Btn>
          </div>
        </form>
      </Modal>

      <Modal open={deleting !== null} onClose={closeDelete} title="Delete listing" maxWidth="max-w-md">
        <form onSubmit={remove} className="grid gap-4">
          <p className="font-sans text-sm leading-relaxed text-ink">
            Delete <strong>{deleting?.cropType || 'this listing'}</strong> of {deleting?.quantity} {deleting?.unit} for{' '}
            {deleting?.farmerName || 'this farmer'}? It disappears from buyer feeds but keeps its history.
          </p>
          <div>
            <label className={labelCls}>Reason for delete *</label>
            <textarea
              className={`${inputCls} min-h-[80px] resize-y`}
              value={form.reason}
              onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
              placeholder="Why is the admin deleting this listing?"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Btn onClick={closeDelete}>Cancel</Btn>
            <Btn tone="danger" submit disabled={busy !== ''}>
              {busy === deleting?.id ? 'Deleting…' : 'Delete listing'}
            </Btn>
          </div>
        </form>
      </Modal>
    </>
  )
}