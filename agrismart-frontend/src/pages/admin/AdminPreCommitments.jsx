import { useEffect, useState } from 'react'
import { getAdminPreCommitments } from '../../lib/api'
import { Page, Loader, Empty, Badge, Table, Td, money, dateOnly } from './_ui'

const STATUSES = ['pending', 'accepted', 'declined']
const TABS = ['', ...STATUSES]
const TONE = { pending: 'amber', accepted: 'green', declined: 'red' }

export default function AdminPreCommitments() {
  const [rows, setRows] = useState(null)
  const [error, setError] = useState('')
  const [status, setStatus] = useState('')

  const load = () => {
    getAdminPreCommitments({ status: status || undefined })
      .then(setRows)
      .catch((e) => setError(e.message))
  }

  useEffect(() => {
    setRows(null)
    setError('')
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status])

  return (
    <>
      <Page
        title="Pre-commitments"
        subtitle="Advance orders buyers place against live listings before the farmer confirms the sale."
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
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 font-sans text-sm text-red-700">
          {error}
        </div>
      )}

      {!rows ? (
        <Loader />
      ) : rows.length === 0 ? (
        <Empty title="No pre-commitments" hint="Buyers can pre-commit to open listings." />
      ) : (
        <Table head={['Buyer', 'Farmer', 'Produce', 'Quantity', 'Offer', 'Status', 'Placed']}>
          {rows.map((pc) => (
            <tr key={pc.id} className="hover:bg-paper/40">
              <Td>
                <p className="font-semibold text-ink">{pc.buyer?.name || '—'}</p>
                {pc.buyer?.buyerType && <p className="text-xs capitalize text-muted">{pc.buyer.buyerType}</p>}
              </Td>
              <Td>{pc.farmer?.name || '—'}</Td>
              <Td className="capitalize">{pc.listing?.cropType || '—'}</Td>
              <Td>
                {pc.quantity} {pc.listing?.unit || ''}
              </Td>
              <Td>{money(pc.offeredPrice)}</Td>
              <Td>
                <Badge tone={TONE[pc.status] || 'muted'}>{pc.status}</Badge>
              </Td>
              <Td>{dateOnly(pc.createdAt)}</Td>
            </tr>
          ))}
        </Table>
      )}
    </>
  )
}