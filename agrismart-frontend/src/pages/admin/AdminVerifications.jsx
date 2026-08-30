import { useEffect, useState } from 'react'
import { getUsers, setUserVerified } from '../../lib/api'
import { useAdmin } from '../../components/AdminShell'
import { Page, Loader, Empty, Badge, Btn, Table, Td, dateOnly } from './_ui'
import UserInfoModal from './UserInfoModal'

const TABS = [
  { id: '', label: 'All' },
  { id: 'pending', label: 'Unverified' },
  { id: 'verified', label: 'Verified' },
]

export default function AdminVerifications() {
  const { flash } = useAdmin()
  const [all, setAll] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState('')
  const [tab, setTab] = useState('pending')
  const [viewing, setViewing] = useState(null)

  const load = () => {
    getUsers()
      .then((rows) =>
        rows.sort((a, b) => {
          if (a.verified !== b.verified) return a.verified ? 1 : -1
          return String(b.createdAt).localeCompare(String(a.createdAt))
        })
      )
      .then(setAll)
      .catch((e) => setError(e.message))
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const visible = (all || []).filter((u) =>
    tab === 'pending' ? !u.verified : tab === 'verified' ? u.verified : true
  )

  const toggle = async (u) => {
    setBusy(u.id)
    setError('')
    try {
      await setUserVerified(u.id, !u.verified)
      await load()
      flash(`${u.name} ${u.verified ? 'revoked (unverified)' : 'restored (verified)'}.`)
    } catch (e) {
      setError(e.message || 'Could not update verification.')
    } finally {
      setBusy('')
    }
  }

  return (
    <>
      <Page
        title="Verifications"
        subtitle="Identity documents submitted by users for review. Use Approve/Revoke to control who can trade or list produce."
        actions={
          <div className="flex gap-1.5">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`rounded-full border px-3 py-1.5 font-sans text-xs font-semibold capitalize transition ${
                  tab === t.id ? 'border-leaf bg-leaf text-white' : 'border-line bg-white text-muted hover:border-leaf hover:text-leaf'
                }`}
              >
                {t.label}
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

      {!all ? (
        <Loader />
      ) : visible.length === 0 ? (
        <Empty title="No users here" hint="Try another tab." />
      ) : (
        <Table head={['User', 'Role', 'ID submitted', 'Verification', 'Approval', 'Actions']}>
          {visible.map((u) => {
            const v = u.verification
            return (
              <tr key={u.id} className="hover:bg-paper/40">
                <Td>
                  <button type="button" onClick={() => setViewing(u)} className="block text-left font-semibold text-ink hover:text-leaf">
                    {u.name}
                  </button>
                  <p className="text-xs text-muted">{u.phone}</p>
                </Td>
                <Td className="capitalize">{u.role.replace('_', ' ')}</Td>
                <Td>
                  {v ? (
                    <div className="flex items-center gap-3">
                      {v.photoUrl ? (
                        <img src={v.photoUrl} alt="" className="h-10 w-10 rounded-lg border border-line object-cover" />
                      ) : (
                        <span className="grid h-10 w-10 place-items-center rounded-lg bg-lime-soft font-serif text-xs font-bold text-leaf-dark">
                          {u.name.slice(0, 1).toUpperCase()}
                        </span>
                      )}
                      <div>
                        <p className="text-sm text-ink capitalize">{v.idType?.replace('_', ' ')}</p>
                        <p className="text-xs text-muted">{v.idNumber || 'number pending'}</p>
                      </div>
                    </div>
                  ) : (
                    <span className="font-sans text-xs text-muted">—</span>
                  )}
                </Td>
                <Td>
                  <div className="flex flex-col gap-1">
                    <Badge tone={u.verified ? 'green' : u.verification && !u.verified ? 'amber' : 'muted'}>
                      {u.verified ? 'Verified' : u.verification ? 'Pending review' : 'No submission'}
                    </Badge>
                    {v && <span className="font-sans text-[11px] text-muted">submitted {dateOnly(v.submittedAt)}</span>}
                  </div>
                </Td>
                <Td>
                  <Btn tone={u.verified ? 'danger' : 'green'} disabled={busy === u.id} onClick={() => toggle(u)}>
                    {u.verified ? 'Revoke' : 'Approve'}
                  </Btn>
                </Td>
                <Td>
                  <Btn disabled={busy === u.id} onClick={() => setViewing(u)}>View</Btn>
                </Td>
              </tr>
            )
          })}
        </Table>
      )}

      <UserInfoModal user={viewing} onClose={() => setViewing(null)} />
    </>
  )
}