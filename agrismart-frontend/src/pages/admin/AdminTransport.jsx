import { useEffect, useMemo, useState } from 'react'
import { getTransportRequests, getUsers, assignTransport, setTransportStatus } from '../../lib/api'
import { useAdmin } from '../../components/AdminShell'
import Modal from '../../components/Modal'
import SearchableSelect from '../../components/SearchableSelect'
import { Page, Loader, Empty, Badge, Btn, Table, Td, inputCls, labelCls, money, dateOnly } from './_ui'

const STATUSES = ['requested', 'assigned', 'confirmed', 'cancelled']
const TABS = ['', ...STATUSES]

const TONE = { requested: 'muted', assigned: 'amber', confirmed: 'green', cancelled: 'red' }

export default function AdminTransport() {
  const { flash } = useAdmin()
  const [rows, setRows] = useState(null)
  const [transporters, setTransporters] = useState([])
  const [error, setError] = useState('')
  const [busy, setBusy] = useState('')
  const [status, setStatus] = useState('')
  const [assigning, setAssigning] = useState(null) // request id or null
  const [transporterId, setTransporterId] = useState('')
  const [cost, setCost] = useState('')

  const load = () => {
    getTransportRequests(status || undefined)
      .then(setRows)
      .catch((e) => setError(e.message))
  }

  useEffect(() => {
    getUsers({ role: 'transporter' })
      .then((u) => setTransporters(u.map((x) => ({ value: x.id, label: `${x.name} · ${x.phone}` }))))
      .catch(() => {})
  }, [])

  useEffect(() => {
    setRows(null)
    setError('')
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status])

  const transporterName = useMemo(() => {
    const map = new Map(transporters.map((t) => [t.value, t.label]))
    return (id) => (id && map.get(id)) || null
  }, [transporters])

  const openAssign = (tr) => {
    setAssigning(tr.id)
    setTransporterId(tr.transporterId || (transporters[0] && transporters[0].value) || '')
    setCost(tr.estimatedCost != null ? String(tr.estimatedCost) : '')
    setError('')
  }

  const saveAssign = async () => {
    if (!transporters.length) {
      setError('No transporter accounts exist yet — create one first.')
      return
    }
    const id = transporterId || transporters[0].value
    setError('')
    setBusy(assigning)
    try {
      await assignTransport(assigning, id, Number(cost) || undefined)
      setAssigning(null)
      await load()
      flash('Transport request assigned.')
    } catch (err) {
      setError(err.message || 'Could not assign transport.')
    } finally {
      setBusy('')
    }
  }

  const changeStatus = async (tr, next) => {
    if (next === tr.status) return
    setBusy(tr.id)
    try {
      await setTransportStatus(tr.id, next)
      await load()
      flash(`Request is now ${next}.`)
    } catch (err) {
      setError(err.message || 'Could not change status.')
    } finally {
      setBusy('')
    }
  }

  return (
    <>
      <Page
        title="Transport"
        subtitle="Shared farm-to-market transport requests. Assign a transporter and move requests through their lifecycle."
        actions={
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
        }
      />

      {error && (
        <div className="mb-4 rounded-md border border-bad/40 bg-bad px-3 py-2 font-sans text-sm text-bad-text">
          {error}
        </div>
      )}

      {!rows ? (
        <Loader />
      ) : rows.length === 0 ? (
        <Empty title="No transport requests" hint="Farmers request shared pickups from their dashboard." />
      ) : (
        <Table head={['Pickup', 'Date', 'Farmers', 'Transporter', 'Cost', 'Status', 'Actions']}>
          {rows.map((tr) => (
            <tr key={tr.id} className="hover:bg-paper/40">
              <Td className="font-semibold text-ink">{tr.pickupLocation}</Td>
              <Td>{dateOnly(tr.requestedDate)}</Td>
              <Td>{tr.farmerIds?.length || 0}</Td>
              <Td className="text-muted">{transporterName(tr.transporterId) || 'Unassigned'}</Td>
              <Td>{tr.estimatedCost != null ? money(tr.estimatedCost) : '—'}</Td>
              <Td>
                <Badge tone={TONE[tr.status] || 'muted'}>{tr.status}</Badge>
              </Td>
              <Td>
                <div className="flex items-center gap-2">
                  {tr.status !== 'cancelled' && (
                    <Btn tone="green" disabled={busy === tr.id} onClick={() => openAssign(tr)}>
                      Assign
                    </Btn>
                  )}
                  <select
                    value={tr.status}
                    disabled={busy === tr.id}
                    onChange={(e) => changeStatus(tr, e.target.value)}
                    className="rounded-[8px] border border-line bg-surface px-2 py-1.5 font-sans text-xs capitalize text-ink outline-none focus:border-leaf"
                  >
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              </Td>
            </tr>
          ))}
        </Table>
      )}

      <Modal open={assigning !== null} onClose={() => setAssigning(null)} title="Assign transporter">
        <div className="grid gap-4">
          <div>
            <label className={labelCls}>Transporter *</label>
            <SearchableSelect value={transporterId} onChange={setTransporterId} options={transporters} placeholder="Select a transporter…" />
          </div>
          <div>
            <label className={labelCls}>Estimated cost (GHS)</label>
            <input className={inputCls} type="number" min="0" step="any" value={cost} onChange={(e) => setCost(e.target.value)} placeholder="e.g. 120" />
          </div>
          <div className="flex justify-end gap-2">
            <Btn onClick={() => setAssigning(null)}>Cancel</Btn>
            <Btn tone="green" disabled={busy !== ''} onClick={saveAssign}>
              Assign
            </Btn>
          </div>
        </div>
      </Modal>
    </>
  )
}