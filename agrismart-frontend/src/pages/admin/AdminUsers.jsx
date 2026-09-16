import { useEffect, useState } from 'react'
import {
  getUsers, createUser, updateUser, setUserVerified, setUserActive, setUserRole,
  deleteUser, restoreUser,
} from '../../lib/api'
import { useAdmin } from '../../components/AdminShell'
import Modal from '../../components/Modal'
import { Page, Loader, Empty, Badge, Btn, Table, Td, inputCls, labelCls, dateOnly } from './_ui'
import UserInfoModal from './UserInfoModal'

export const ROLES = ['farmer', 'buyer', 'market_seller', 'transporter', 'admin']
export const ROLE_LABELS = { farmer: 'Farmer', buyer: 'Buyer', market_seller: 'Market seller', transporter: 'Transporter', admin: 'Admin' }
export const BUYER_TYPES = ['wholesale', 'retail', 'processor']

const blankForm = {
  name: '', phone: '', email: '', username: '', password: '', role: 'farmer',
  verified: true, active: true, buyerType: '', location: '', language: 'en', farmSize: '', community: '',
}

export default function AdminUsers() {
  const { flash } = useAdmin()
  const [users, setUsers] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState('')
  const [role, setRole] = useState('')
  const [verified, setVerified] = useState('')
  const [q, setQ] = useState('')
  const [debounced, setDebounced] = useState('')
  const [editing, setEditing] = useState(null) // null closed, 'new', or user id
  const [viewing, setViewing] = useState(null)
  const [form, setForm] = useState(blankForm)

  useEffect(() => {
    const t = setTimeout(() => setDebounced(q.trim()), 350)
    return () => clearTimeout(t)
  }, [q])

  const load = () => {
    getUsers({ role: role || undefined, verified: verified === '' ? undefined : verified, q: debounced || undefined })
      .then(setUsers)
      .catch((e) => setError(e.message))
  }

  useEffect(() => {
    setUsers(null)
    setError('')
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role, verified, debounced])

  const openNew = () => {
    setEditing('new')
    setForm(blankForm)
    setError('')
  }

  const openEdit = (u) => {
    setEditing(u.id)
    setForm({
      name: u.name || '', phone: u.phone || '', email: u.email || '', username: u.username || '',
      password: '', role: u.role || 'farmer', verified: !!u.verified, active: u.active !== false,
      buyerType: u.buyerType || '', location: u.location || '', language: u.language || 'en',
      farmSize: u.farmSize ?? '', community: u.community || '',
    })
    setError('')
  }

  const close = () => {
    setEditing(null)
    setForm(blankForm)
    setError('')
  }

  const save = async (e) => {
    e.preventDefault()
    if (!form.name.trim() || !form.phone.trim()) {
      setError('Name and phone are required.')
      return
    }
    if (form.role === 'buyer' && !BUYER_TYPES.includes(form.buyerType)) {
      setError('Buyer accounts need a buyer type (wholesale, retail or processor).')
      return
    }
    setError('')
    setBusy('*')
    try {
      const payload = {
        name: form.name.trim(),
        phone: form.phone.trim(),
        email: form.email.trim() || undefined,
        username: form.username.trim() || undefined,
        role: form.role,
        verified: !!form.verified,
        active: form.active !== false,
        buyerType: form.buyerType || undefined,
        location: form.location.trim() || undefined,
        language: form.language || undefined,
        farmSize: form.farmSize === '' ? undefined : Number(form.farmSize),
        community: form.community.trim() || undefined,
      }
      if (form.password.trim()) payload.password = form.password
      if (editing === 'new') await createUser(payload)
      else await updateUser(editing, payload)
      await load()
      close()
      flash(editing === 'new' ? 'User created.' : 'User updated.')
    } catch (err) {
      setError(err.message || 'Could not save user.')
    } finally {
      setBusy('')
    }
  }

  const toggleVerified = async (u) => {
    setBusy(u.id)
    setError('')
    try {
      await setUserVerified(u.id, !u.verified)
      await load()
      flash(`${u.name} ${u.verified ? 'no longer verified' : 'verified'}.`)
    } catch (e) {
      setError(e.message || 'Could not update verification.')
    } finally {
      setBusy('')
    }
  }

  const changeRole = async (u, next) => {
    setBusy(u.id)
    setError('')
    try {
      await setUserRole(u.id, next)
      await load()
      flash(`${u.name} is now ${ROLE_LABELS[next]}.`)
    } catch (e) {
      setError(e.message || 'Could not change role.')
    } finally {
      setBusy('')
    }
  }

  const toggleActive = async (u) => {
    const turningOff = u.active !== false
    if (turningOff && !window.confirm(`Deactivate ${u.name}? They will be logged out and unable to log back in.`)) return
    setBusy(u.id)
    setError('')
    try {
      await setUserActive(u.id, !turningOff)
      await load()
      flash(`${u.name} ${turningOff ? 'deactivated' : 'reactivated'}.`)
    } catch (e) {
      setError(e.message || 'Could not update account status.')
    } finally {
      setBusy('')
    }
  }

  const remove = async (u) => {
    if (!window.confirm(`Delete ${u.name}? Their account is hidden and cannot log in, but can be restored later.`)) return
    setBusy(u.id)
    setError('')
    try {
      await deleteUser(u.id)
      await load()
      flash(`${u.name} deleted.`)
    } catch (e) {
      setError(e.message || 'Could not delete user.')
    } finally {
      setBusy('')
    }
  }

  const dupAccount = async (u) => {
    setBusy(u.id)
    setError('')
    try {
      await restoreUser(u.id)
      await load()
      flash(`${u.name} restored.`)
    } catch (e) {
      setError(e.message || 'Could not restore user.')
    } finally {
      setBusy('')
    }
  }

  const showsBuyerType = form.role === 'buyer' || form.role === 'market_seller'

  return (
    <>
      <Page
        title="Users"
        subtitle="Search accounts and manage roles, verification and account status across the platform."
        actions={<Btn tone="green" onClick={openNew}>+ New user</Btn>}
      />

      <div className="mb-5 flex flex-col gap-3 sm:flex-row">
        <input
          className={`${inputCls} sm:max-w-xs`}
          placeholder="Search by name, phone or email…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <select className={`${inputCls} sm:w-44`} value={role} onChange={(e) => setRole(e.target.value)}>
          <option value="">All roles</option>
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {ROLE_LABELS[r]}
            </option>
          ))}
        </select>
        <select className={`${inputCls} sm:w-44`} value={verified} onChange={(e) => setVerified(e.target.value)}>
          <option value="">Verified: all</option>
          <option value="true">Verified</option>
          <option value="false">Unverified</option>
        </select>
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-bad/40 bg-bad px-3 py-2 font-sans text-sm text-bad-text">
          {error}
        </div>
      )}

      {!users ? (
        <Loader />
      ) : users.length === 0 ? (
        <Empty title="No matching users" hint="Adjust your filters." />
      ) : (
        <Table head={['Name', 'Contact', 'Role', 'Status', 'Joined', 'Actions']}>
          {users.map((u) => {
            const deleted = !!u.deletedAt
            return (
              <tr key={u.id} className={`hover:bg-paper/40 ${deleted ? 'bg-paper/50 opacity-70' : ''}`}>
                <Td>
                  <button type="button" onClick={() => setViewing(u)} className="block text-left font-semibold text-ink hover:text-leaf">
                    {u.name}
                  </button>
                  {u.email && <p className="text-xs text-muted">{u.email}</p>}
                </Td>
                <Td>{u.phone}</Td>
                <Td>
                  {deleted ? (
                    <span className="font-sans text-sm text-muted">{ROLE_LABELS[u.role]}</span>
                  ) : (
                    <select value={u.role} disabled={busy === u.id} onChange={(e) => changeRole(u, e.target.value)} className="rounded-[8px] border border-line bg-surface px-2 py-1.5 font-sans text-xs text-ink outline-none focus:border-leaf">
                      {ROLES.map((r) => (
                        <option key={r} value={r}>
                          {ROLE_LABELS[r]}
                        </option>
                      ))}
                    </select>
                  )}
                </Td>
                <Td>
                  <div className="flex flex-wrap gap-1">
                    {deleted ? (
                      <Badge tone="red">Deleted</Badge>
                    ) : u.active === false ? (
                      <Badge tone="amber">Inactive</Badge>
                    ) : null}
                    <Badge tone={u.verified ? 'green' : 'muted'}>{u.verified ? 'Verified' : 'Unverified'}</Badge>
                  </div>
                </Td>
                <Td className="whitespace-nowrap">{dateOnly(u.createdAt)}</Td>
                <Td>
                  <div className="flex flex-wrap items-center gap-2">
                    <Btn onClick={() => setViewing(u)}>View</Btn>
                    {deleted ? (
                      <Btn tone="green" disabled={busy === u.id} onClick={() => dupAccount(u)}>
                        Restore
                      </Btn>
                    ) : (
                      <>
                        <Btn tone={u.verified ? 'danger' : 'green'} disabled={busy === u.id} onClick={() => toggleVerified(u)}>
                          {u.verified ? 'Revoke' : 'Approve'}
                        </Btn>
                        <Btn disabled={busy === u.id} onClick={() => openEdit(u)}>Edit</Btn>
                        <Btn tone="danger" disabled={busy === u.id} onClick={() => toggleActive(u)}>
                          {u.active === false ? 'Activate' : 'Deactivate'}
                        </Btn>
                        <Btn tone="danger" disabled={busy === u.id} onClick={() => remove(u)}>
                          Delete
                        </Btn>
                      </>
                    )}
                  </div>
                </Td>
              </tr>
            )
          })}
        </Table>
      )}

      <Modal open={editing !== null} onClose={close} title={editing === 'new' ? 'New user' : 'Edit user'} maxWidth="max-w-lg">
        <form onSubmit={save} className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelCls}>Name *</label>
              <input className={inputCls} value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Full name" />
            </div>
            <div>
              <label className={labelCls}>Role *</label>
              <select className={inputCls} value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}>
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {ROLE_LABELS[r]}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelCls}>Phone *</label>
              <input className={inputCls} value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} placeholder="e.g. 0241234567" />
            </div>
            <div>
              <label className={labelCls}>Email</label>
              <input className={inputCls} value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} placeholder="optional" />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelCls}>Username</label>
              <input className={inputCls} value={form.username} onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))} placeholder="optional" />
            </div>
            <div>
              <label className={labelCls}>{editing === 'new' ? 'Password' : 'Reset password'}</label>
              <input className={inputCls} type="password" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} placeholder={editing === 'new' ? 'optional' : 'leave blank to keep current'} />
            </div>
          </div>
          {showsBuyerType && (
            <div>
              <label className={labelCls}>Buyer type{form.role === 'buyer' ? ' *' : ''}</label>
              <select className={inputCls} value={form.buyerType} onChange={(e) => setForm((f) => ({ ...f, buyerType: e.target.value }))}>
                <option value="">Select…</option>
                {BUYER_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelCls}>Location</label>
              <input className={inputCls} value={form.location} onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))} placeholder="Town or area" />
            </div>
            <div>
              <label className={labelCls}>Community</label>
              <input className={inputCls} value={form.community} onChange={(e) => setForm((f) => ({ ...f, community: e.target.value }))} placeholder="optional" />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelCls}>Language</label>
              <select className={inputCls} value={form.language} onChange={(e) => setForm((f) => ({ ...f, language: e.target.value }))}>
                <option value="en">English</option>
                <option value="tw">Twi</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Farm size (ha)</label>
              <input className={inputCls} type="number" min="0" step="any" value={form.farmSize} onChange={(e) => setForm((f) => ({ ...f, farmSize: e.target.value }))} placeholder="optional" />
            </div>
          </div>
          <div className="flex gap-5">
            <label className="flex items-center gap-2 font-sans text-sm text-ink">
              <input type="checkbox" checked={form.verified} onChange={(e) => setForm((f) => ({ ...f, verified: e.target.checked }))} />
              Pre-verified
            </label>
            <label className="flex items-center gap-2 font-sans text-sm text-ink">
              <input type="checkbox" checked={form.active} onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))} />
              Active account
            </label>
          </div>
          <div className="flex justify-end gap-2">
            <Btn onClick={close}>Cancel</Btn>
            <Btn tone="green" submit disabled={busy !== ''}>{editing === 'new' ? 'Create user' : 'Save changes'}</Btn>
          </div>
        </form>
      </Modal>

      <UserInfoModal user={viewing} onClose={() => setViewing(null)} />
    </>
  )
}