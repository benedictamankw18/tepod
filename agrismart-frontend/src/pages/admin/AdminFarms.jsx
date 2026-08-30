import { useEffect, useMemo, useState } from 'react'
import { getAdminFarms, getUsers, createFarm, updateFarm, deleteFarm, restoreFarm } from '../../lib/api'
import { useAdmin } from '../../components/AdminShell'
import Modal from '../../components/Modal'
import SearchableSelect from '../../components/SearchableSelect'
import { Page, Loader, Empty, Badge, Btn, Table, Td, inputCls, labelCls, dateOnly } from './_ui'

const FARM_STATUSES = [
  { value: 'growing', label: 'Growing' },
  { value: 'ready', label: 'Ready' },
  { value: 'harvested', label: 'Harvested' },
]

const blankForm = {
  farmerId: '', name: '', cropType: '', stage: 'pre_harvest', status: 'growing',
  location: '', expectedHarvestDate: '', reason: '',
}

export default function AdminFarms() {
  const { flash } = useAdmin()
  const [farms, setFarms] = useState(null)
  const [farmers, setFarmers] = useState([])
  const [error, setError] = useState('')
  const [busy, setBusy] = useState('')
  const [editor, setEditor] = useState(null) // null closed, 'new', or farm id
  const [deleting, setDeleting] = useState(null) // farm row being soft-deleted
  const [form, setForm] = useState(blankForm)

  const load = () => getAdminFarms().then(setFarms).catch((e) => setError(e.message))

  useEffect(() => {
    load()
    getUsers({ role: 'farmer' })
      .then((rows) => setFarmers(rows))
      .catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const farmerOptions = useMemo(
    () =>
      farmers.map((fr) => ({
        value: fr.id,
        label: `${fr.name} · ${fr.phone || 'no phone'}${fr.active === false ? ' (inactive)' : ''}`,
      })),
    [farmers]
  )

  const openNew = () => {
    setForm(blankForm)
    setError('')
    setEditor('new')
  }

  const openEdit = (f) => {
    setForm({
      farmerId: f.farmerId, name: f.name || '', cropType: f.cropType || '', stage: f.stage || 'pre_harvest',
      status: f.status || 'growing', location: f.location || '', expectedHarvestDate: f.expectedHarvestDate || '', reason: '',
    })
    setError('')
    setEditor(f.id)
  }

  const closeEdit = () => {
    setEditor(null)
    setForm(blankForm)
  }

  const openDelete = (f) => {
    setDeleting(f)
    setForm(blankForm)
    setError('')
  }

  const closeDelete = () => {
    setDeleting(null)
    setForm(blankForm)
  }

  const save = async (e) => {
    e.preventDefault()
    if (editor === 'new') {
      if (!form.farmerId) {
        setError('Pick the farm owner (farmer) first.')
        return
      }
      if (!form.name.trim() || !form.cropType.trim()) {
        setError('Farm name and crop are required.')
        return
      }
    } else if (!form.reason.trim()) {
      setError('A reason is required for admin edits.')
      return
    }
    setError('')
    setBusy(editor === 'new' ? '*' : editor)
    try {
      const fields = {
        farmerId: form.farmerId,
        name: form.name.trim(),
        cropType: form.cropType.trim(),
        stage: form.stage,
        status: form.status.trim() || 'growing',
        location: form.location.trim() || undefined,
        expectedHarvestDate: form.expectedHarvestDate || undefined,
      }
      if (editor === 'new') {
        await createFarm(fields)
        flash('Farm created.')
      } else {
        await updateFarm(editor, { ...fields, reason: form.reason.trim() })
        flash('Farm updated.')
      }
      await load()
      closeEdit()
    } catch (err) {
      setError(err.message || 'Could not save farm.')
    } finally {
      setBusy('')
    }
  }

  const remove = async (e) => {
    e.preventDefault()
    if (!form.reason.trim()) {
      setError('A reason is required to delete a farm.')
      return
    }
    setError('')
    setBusy(deleting.id)
    try {
      await deleteFarm(deleting.id, form.reason.trim())
      await load()
      closeDelete()
      flash(`Farm "${deleting.name}" soft-deleted.`)
    } catch (err) {
      setError(err.message || 'Could not delete farm.')
    } finally {
      setBusy('')
    }
  }

  const restore = async (f) => {
    setBusy(f.id)
    try {
      await restoreFarm(f.id)
      await load()
      flash(`"${f.name}" restored.`)
    } catch (err) {
      setError(err.message || 'Could not restore farm.')
    } finally {
      setBusy('')
    }
  }

  const farmFields = (hideReason) => (
    <>
      {editor === 'new' && (
        <div>
          <label className={labelCls}>Farm owner (farmer) *</label>
          <SearchableSelect value={form.farmerId} onChange={(v) => setForm((f) => ({ ...f, farmerId: v }))} options={farmerOptions} placeholder="Search farmers…" />
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={labelCls}>Name *</label>
          <input className={inputCls} value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. Ama's tomato plot" />
        </div>
        <div>
          <label className={labelCls}>Crop *</label>
          <input className={inputCls} value={form.cropType} onChange={(e) => setForm((f) => ({ ...f, cropType: e.target.value }))} placeholder="e.g. tomato" />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={labelCls}>Stage</label>
          <select className={inputCls} value={form.stage} onChange={(e) => setForm((f) => ({ ...f, stage: e.target.value }))}>
            <option value="pre_harvest">Pre-harvest</option>
            <option value="post_harvest">Post-harvest</option>
          </select>
        </div>
        <div>
          <label className={labelCls}>Status</label>
          <SearchableSelect
            value={form.status}
            onChange={(v) => setForm((f) => ({ ...f, status: v }))}
            options={FARM_STATUSES}
            placeholder="Growing, Ready, Harvested — or type a new one"
            allowNew
          />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={labelCls}>Location</label>
          <input className={inputCls} value={form.location} onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))} placeholder="Town or area" />
        </div>
        <div>
          <label className={labelCls}>Expected harvest</label>
          <input className={inputCls} type="date" value={form.expectedHarvestDate} onChange={(e) => setForm((f) => ({ ...f, expectedHarvestDate: e.target.value }))} />
        </div>
      </div>
      {!hideReason && (
        <div>
          <label className={labelCls}>Reason for change *</label>
          <textarea
            className={`${inputCls} min-h-[80px] resize-y`}
            value={form.reason}
            onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
            placeholder="Why is the admin updating this farm?"
          />
        </div>
      )}
    </>
  )

  return (
    <>
      <Page
        title="Farms"
        subtitle="Every farm across all farmers — including soft-deleted records kept for history. Admin edits and deletes are recorded with a reason."
        actions={<Btn tone="green" onClick={openNew}>+ New farm</Btn>}
      />

      {error && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 font-sans text-sm text-red-700">
          {error}
        </div>
      )}

      {!farms ? (
        <Loader />
      ) : farms.length === 0 ? (
        <Empty title="No farms yet" />
      ) : (
        <Table head={['Farm', 'Farmer', 'Crop', 'Stage', 'Status', 'Created', 'Actions']}>
          {farms.map((f) => (
            <tr key={f.id} className="hover:bg-paper/40">
              <Td>
                <p className="font-semibold text-ink">{f.name}</p>
                <p className="text-xs text-muted">{f.location || 'location pending'}</p>
              </Td>
              <Td>{f.farmerName}</Td>
              <Td className="capitalize">{f.cropType || '—'}</Td>
              <Td className="capitalize">{f.stage?.replace('_', ' ') || '—'}</Td>
              <Td>
                <div className="flex flex-wrap gap-1.5">
                  <Badge tone={f.status === 'ready' ? 'green' : 'muted'}>{f.status || 'active'}</Badge>
                  {f.deletedAt && <Badge tone="red">deleted</Badge>}
                </div>
              </Td>
              <Td>{dateOnly(f.createdAt)}</Td>
              <Td>
                <div className="flex flex-wrap items-center gap-2">
                  {f.deletedAt ? (
                    <Btn tone="green" disabled={busy === f.id} onClick={() => restore(f)}>
                      Restore
                    </Btn>
                  ) : (
                    <>
                      <Btn disabled={busy === f.id} onClick={() => openEdit(f)}>Edit</Btn>
                      <Btn tone="danger" disabled={busy === f.id} onClick={() => openDelete(f)}>
                        Delete
                      </Btn>
                    </>
                  )}
                </div>
              </Td>
            </tr>
          ))}
        </Table>
      )}

      <Modal open={editor !== null} onClose={closeEdit} title={editor === 'new' ? 'New farm' : 'Edit farm'} maxWidth="max-w-lg">
        <form onSubmit={save} className="grid gap-4">
          {farmFields(editor === 'new')}
          {editor !== null && !farmers.length && editor === 'new' && (
            <p className="font-sans text-xs text-muted">Loading farmers…</p>
          )}
          <div className="flex justify-end gap-2">
            <Btn onClick={closeEdit}>Cancel</Btn>
            <Btn tone="green" submit disabled={busy !== ''}>
              {editor === 'new' ? 'Create farm' : 'Save changes'}
            </Btn>
          </div>
        </form>
      </Modal>

      <Modal open={deleting !== null} onClose={closeDelete} title="Delete farm" maxWidth="max-w-md">
        <form onSubmit={remove} className="grid gap-4">
          <p className="font-sans text-sm leading-relaxed text-ink">
            Delete <strong>{deleting?.name}</strong> ({deleting?.cropType || 'no crop'}) for {deleting?.farmerName}? The record and its history stay intact — it is hidden from the dashboard.
          </p>
          <div>
            <label className={labelCls}>Reason for delete *</label>
            <textarea
              className={`${inputCls} min-h-[80px] resize-y`}
              value={form.reason}
              onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
              placeholder="Why is the admin deleting this farm?"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Btn onClick={closeDelete}>Cancel</Btn>
            <Btn tone="danger" submit disabled={busy !== ''}>
              {busy === deleting?.id ? 'Deleting…' : 'Delete farm'}
            </Btn>
          </div>
        </form>
      </Modal>
    </>
  )
}