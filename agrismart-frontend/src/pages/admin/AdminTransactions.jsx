import { useEffect, useState } from 'react'
import { getAdminTransactions, markTransactionPaid } from '../../lib/api'
import { useAdmin } from '../../components/AdminShell'
import { Page, Loader, Empty, Badge, Btn, Table, Td, money, dateOnly, shortId } from './_ui'

const STATUSES = ['pending', 'paid', 'overdue', 'disputed']
const TABS = ['', ...STATUSES]
const TONE = { pending: 'muted', paid: 'green', overdue: 'amber', disputed: 'red' }
const ESCROW_LABEL = { funds_collected: 'collected', held: 'held', released: 'released', refunded: 'refunded', none: 'off' }
const ESCROW_TONE = { funds_collected: 'amber', held: 'amber', released: 'green', refunded: 'red', none: 'muted' }

export default function AdminTransactions() {
  const { flash } = useAdmin()
  const [rows, setRows] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState('')
  const [status, setStatus] = useState('')

  const load = () => {
    getAdminTransactions({ paymentStatus: status || undefined })
      .then(setRows)
      .catch((e) => setError(e.message))
  }

  useEffect(() => {
    setRows(null)
    setError('')
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status])

  const pay = async (tx) => {
    if (!window.confirm('Mark this transaction as paid?')) return
    setBusy(tx.id)
    try {
      await markTransactionPaid(tx.id)
      await load()
      flash('Transaction marked as paid.')
    } catch (err) {
      setError(err.message || 'Could not mark as paid.')
    } finally {
      setBusy('')
    }
  }

  return (
    <>
      <Page
        title="Transactions"
        subtitle="Confirmed sale agreements between farmers and buyers and their payment state."
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
        <Empty title="No transactions" hint="Sales appear here once a deal is confirmed." />
      ) : (
        <Table head={['Ref', 'Crop', 'Buyer', 'Farmer', 'Amount', 'Fee', 'Farmer net', 'Payment', 'Escrow', 'Due', 'Actions']}>
          {rows.map((tx) => (
            <tr key={tx.id} className="hover:bg-paper/40">
              <Td className="text-muted">{shortId(tx.id)}</Td>
              <Td className="capitalize font-semibold text-ink">{tx.cropType || '—'}</Td>
              <Td>{tx.buyer?.name || '—'}</Td>
              <Td>{tx.farmer?.name || '—'}</Td>
              <Td>{money(tx.agreedPrice)}</Td>
              <Td>{tx.commissionAmount > 0 ? money(tx.commissionAmount) : '—'}</Td>
              <Td className="font-semibold">{money(tx.netAmount != null ? tx.netAmount : tx.agreedPrice)}</Td>
              <Td>
                <Badge tone={TONE[tx.paymentStatus] || 'muted'}>{tx.paymentStatus}</Badge>
              </Td>
              <Td>
                <Badge tone={ESCROW_TONE[tx.escrowStatus || 'none'] || 'muted'}>
                  {ESCROW_LABEL[tx.escrowStatus || 'none'] || tx.escrowStatus}
                </Badge>
                {tx.escrowAmount > 0 && (
                  <span className="ml-1 font-sans text-[10px] text-muted">{money(tx.escrowAmount)}</span>
                )}
              </Td>
              <Td>{dateOnly(tx.dueDate)}</Td>
              <Td>
                {tx.paymentStatus !== 'paid' && tx.paymentStatus !== 'disputed' ? (
                  <Btn tone="green" disabled={busy === tx.id} onClick={() => pay(tx)}>
                    Mark paid
                  </Btn>
                ) : (
                  <span className="font-sans text-xs text-muted">{tx.paymentStatus === 'paid' ? 'Paid' : '—'}</span>
                )}
              </Td>
            </tr>
          ))}
        </Table>
      )}
    </>
  )
}