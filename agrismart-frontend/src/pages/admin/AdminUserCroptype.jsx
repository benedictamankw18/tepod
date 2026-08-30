import { useEffect, useMemo, useState } from 'react'
import { getUserCropTypes, getUsers, getAdminCrops, setUserCrops } from '../../lib/api'
import { useAdmin } from '../../components/AdminShell'
import Modal from '../../components/Modal'
import SearchableSelect from '../../components/SearchableSelect'
import { Page, Loader, Empty, Badge, Btn, Table, Td, labelCls } from './_ui'

export default function AdminUserCroptype() {
  const { flash } = useAdmin()
  const [registry, setRegistry] = useState(null)
  const [users, setUsers] = useState([])
  const [crops, setCrops] = useState([])
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [editorOpen, setEditorOpen] = useState(false)
  const [userId, setUserId] = useState('')
  const [primary, setPrimary] = useState([])
  const [purchase, setPurchase] = useState([])

  const load = () => getUserCropTypes().then(setRegistry).catch((e) => setError(e.message))

  useEffect(() => {
    load()
    getUsers({ role: 'farmer' })
      .then((u) => setUsers(u.map((x) => ({ value: x.id, label: `${x.name} · ${x.phone}` }))))
      .catch(() => {})
    getAdminCrops()
      .then((c) => setCrops(c.filter((x) => x.active).map((x) => x.name)))
      .catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const grouped = useMemo(() => {
    const map = new Map()
    for (const r of registry || []) {
      const entry = map.get(r.userId) || { name: r.userName, phone: r.phone, role: r.role, primary: [], purchase: [] }
      if (r.kind === 'primary') entry.primary.push(r.crop)
      else entry.purchase.push(r.crop)
      map.set(r.userId, entry)
    }
    return Array.from(map.entries()).map(([id, e]) => ({ id, ...e }))
  }, [registry])

  const openEditor = (u) => {
    setUserId(u.id)
    setPrimary(u.primary)
    setPurchase(u.purchase)
    setError('')
    setEditorOpen(true)
  }

  const openNew = () => {
    setUserId('')
    setPrimary([])
    setPurchase([])
    setError('')
    setEditorOpen(true)
  }

  const toggleIn = (list, setList, name) =>
    setList((cur) => (cur.includes(name) ? cur.filter((x) => x !== name) : [...cur, name]))

  const save = async (e) => {
    e.preventDefault()
    if (!userId) {
      setError('Choose a user first.')
      return
    }
    setError('')
    setBusy(true)
    try {
      await setUserCrops(userId, { primaryCrops: primary, purchaseCrops: purchase })
      setEditorOpen(false)
      await load()
      flash('Crops assigned.')
    } catch (err) {
      setError(err.message || 'Could not save crops.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <Page
        title="User crops"
        subtitle="Which crops each farmer grows (primary) and each buyer or market seller purchases. Assign crops per user to tune marketplace matching."
        actions={<Btn tone="green" onClick={openNew}>+ Assign crops</Btn>}
      />

      {error && (
        <div className="mb-4 rounded-md border border-bad/40 bg-bad px-3 py-2 font-sans text-sm text-bad-text">
          {error}
        </div>
      )}

      {!registry ? (
        <Loader />
      ) : grouped.length === 0 ? (
        <Empty title="No crop assignments yet" hint="Assign primary and purchase crops to users." />
      ) : (
        <Table head={['User', 'Role', 'Primary crops', 'Purchase crops', '']}>
          {grouped.map((u) => (
            <tr key={u.id} className="hover:bg-paper/40">
              <Td>
                <p className="font-semibold text-ink">{u.name}</p>
                <p className="text-xs text-muted">{u.phone}</p>
              </Td>
              <Td className="capitalize">{u.role?.replace('_', ' ')}</Td>
              <Td>
                <div className="flex max-w-xs flex-wrap gap-1.5">
                  {u.primary.length ? u.primary.map((c) => <Badge key={c} tone="green">{c}</Badge>) : <span className="text-xs text-muted">—</span>}
                </div>
              </Td>
              <Td>
                <div className="flex max-w-xs flex-wrap gap-1.5">
                  {u.purchase.length ? u.purchase.map((c) => <Badge key={c} tone="amber">{c}</Badge>) : <span className="text-xs text-muted">—</span>}
                </div>
              </Td>
              <Td>
                <Btn onClick={() => openEditor(u)}>Edit</Btn>
              </Td>
            </tr>
          ))}
        </Table>
      )}

      <Modal open={editorOpen} onClose={() => setEditorOpen(false)} title="Assign crops">
        <form onSubmit={save} className="grid gap-4">
          <div>
            <label className={labelCls}>Farmer / buyer *</label>
            <SearchableSelect value={userId} onChange={setUserId} options={users} placeholder="Search users…" />
          </div>
          <div>
            <label className={labelCls}>Primary crops (grows)</label>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {crops.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => toggleIn(primary, setPrimary, c)}
                  className={`rounded-full border px-3 py-1.5 font-sans text-xs font-semibold capitalize transition ${
                    primary.includes(c) ? 'border-leaf bg-leaf text-white' : 'border-line bg-white text-muted hover:border-leaf hover:text-leaf'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className={labelCls}>Purchase crops (buys)</label>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {crops.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => toggleIn(purchase, setPurchase, c)}
                  className={`rounded-full border px-3 py-1.5 font-sans text-xs font-semibold capitalize transition ${
                    purchase.includes(c) ? 'border-leaf bg-leaf text-white' : 'border-line bg-white text-muted hover:border-leaf hover:text-leaf'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Btn onClick={() => setEditorOpen(false)}>Cancel</Btn>
            <Btn tone="green" submit disabled={busy}>Save</Btn>
          </div>
        </form>
      </Modal>
    </>
  )
}