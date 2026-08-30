import { Fragment, useEffect, useMemo, useState } from 'react'
import { getAdminAudit } from '../../lib/api'
import { Page, Loader, Empty, Badge, Btn, Td, inputCls, dateOnly, shortId } from './_ui'

const ACTION_TONES = {
  create: 'green',
  edit: 'amber',
  delete: 'red',
  restore: 'muted',
}

function DiffRows({ before, after }) {
  const diffs = useMemo(() => {
    const b = before && typeof before === 'object' ? before : {}
    const a = after && typeof after === 'object' ? after : {}
    const keys = [...new Set([...Object.keys(b), ...Object.keys(a)])].filter((k) => !['id', 'createdAt', 'updatedAt'].includes(k))
    const rows = []
    for (const k of keys) {
      const l = JSON.stringify(b[k])
      const r = JSON.stringify(a[k])
      if (l === r) continue
      rows.push({ k, l: l === undefined ? '—' : b[k], r: r === undefined ? '—' : a[k] })
    }
    return rows
  }, [before, after])

  if (diffs.length === 0) {
    return null
  }
  return (
    <div className="overflow-hidden rounded-lg border border-line">
      <table className="w-full font-sans text-xs">
        <thead className="bg-paper text-left text-muted">
          <tr>
            <th className="px-3 py-2 font-semibold">Field</th>
            <th className="px-3 py-2 font-semibold">Before</th>
            <th className="px-3 py-2 font-semibold">After</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line bg-white">
          {diffs.map(({ k, l, r }) => (
            <tr key={k}>
              <td className="px-3 py-2 font-semibold capitalize text-ink">{k.replace(/([A-Z])/g, ' $1')}</td>
              <td className="px-3 py-2 text-muted line-through">{typeof l === 'object' && l !== null ? JSON.stringify(l) : String(l)}</td>
              <td className="px-3 py-2 font-medium text-leaf-dark">{typeof r === 'object' && r !== null ? JSON.stringify(r) : String(r)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function AdminActivity() {
  const [rows, setRows] = useState(null)
  const [error, setError] = useState('')
  const [entityType, setEntityType] = useState('')
  const [entityId, setEntityId] = useState('')
  const [action, setAction] = useState('')
  const [open, setOpen] = useState('') // '<type>:<id>:<createdAt>' of expanded row
  const [applied, setApplied] = useState(false)

  const load = () => {
    setRows(null)
    setError('')
    getAdminAudit({
      entityType: entityType || undefined,
      entityId: entityId.trim() || undefined,
      action: action || undefined,
    })
      .then(setRows)
      .catch((e) => setError(e.message))
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [applied])

  const key = (r) => `${r.entityType}:${r.entityId}:${r.createdAt}:${r.id}`

  return (
    <>
      <Page title="Activity log" subtitle="Every admin create, edit, restore and delete on farms and listings, with the reason and before/after values. Filter by entity or action." />

      <div className="mb-4 grid gap-4 rounded-xl border border-line bg-white p-4 sm:grid-cols-4">
        <div>
          <label className="mb-1 block font-sans text-[11px] font-bold uppercase tracking-wide text-muted">Entity</label>
          <select className={inputCls} value={entityType} onChange={(e) => setEntityType(e.target.value)}>
            <option value="">All entities</option>
            <option value="farm">Farm</option>
            <option value="listing">Listing</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block font-sans text-[11px] font-bold uppercase tracking-wide text-muted">Entity ID</label>
          <input className={inputCls} value={entityId} onChange={(e) => setEntityId(e.target.value)} placeholder="exact id, e.g. an id" />
        </div>
        <div>
          <label className="mb-1 block font-sans text-[11px] font-bold uppercase tracking-wide text-muted">Action</label>
          <select className={inputCls} value={action} onChange={(e) => setAction(e.target.value)}>
            <option value="">All actions</option>
            <option value="create">create</option>
            <option value="edit">edit</option>
            <option value="delete">delete</option>
            <option value="restore">restore</option>
          </select>
        </div>
        <div className="flex items-end gap-2">
          <Btn tone="green" className="flex-1 justify-center" onClick={() => setApplied((v) => !v)}>
            Apply
          </Btn>
          {(entityType || entityId || action) && (
            <Btn
              onClick={() => {
                setEntityType('')
                setEntityId('')
                setAction('')
                setApplied((v) => !v)
              }}
            >
              Reset
            </Btn>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 font-sans text-sm text-red-700">
          {error}
        </div>
      )}

      {!rows ? (
        <Loader />
      ) : rows.length === 0 ? (
        <Empty title="No activity" hint="Adjust the filters or log some admin actions first." />
      ) : (
        <div className="overflow-hidden rounded-xl border border-line bg-white shadow-sm">
          <table className="w-full font-sans text-sm">
            <thead className="border-b border-line bg-paper text-left text-[11px] font-bold uppercase tracking-wide text-muted">
              <tr>
                <th className="px-4 py-3">When</th>
                <th className="px-4 py-3">Admin</th>
                <th className="px-4 py-3">Entity</th>
                <th className="px-4 py-3">Action</th>
                <th className="px-4 py-3">Reason</th>
                <th className="px-4 py-3 text-right">Changes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((r) => (
                <Fragment key={key(r)}>
                  <tr className="hover:bg-paper/40">
                    <Td>{dateOnly(r.createdAt)}</Td>
                    <Td>{r.adminName}</Td>
                    <Td>
                      <span className="capitalize">{r.entityType}</span>{' '}
                      <span className="rounded bg-paper px-1 py-0.5 font-mono text-xs text-muted">{shortId(r.entityId, 8)}</span>
                    </Td>
                    <Td>
                      <Badge tone={ACTION_TONES[r.action] || 'muted'}>{r.action}</Badge>
                    </Td>
                    <Td className="max-w-[260px]">{r.reason ? <span className="text-ink">{r.reason}</span> : <span className="text-muted">—</span>}</Td>
                    <Td className="text-right">
                      <button
                        type="button"
                        onClick={() => setOpen(open === key(r) ? '' : key(r))}
                        className="rounded-md border border-line px-2.5 py-1 font-sans text-xs font-semibold text-leaf-dark transition hover:border-leaf hover:bg-paper"
                      >
                        {open === key(r) ? 'Hide' : 'View'}
                      </button>
                    </Td>
                  </tr>
                  {open === key(r) && (
                    <tr>
                      <td colSpan={6} className="bg-paper/60 px-4 pb-4">
                        <dl className="mb-3 grid gap-x-8 gap-y-1 py-2 font-sans text-xs sm:grid-cols-2">
                          <div>
                            <dt className="font-bold uppercase tracking-wide text-muted">Entity ID</dt>
                            <dd className="font-mono text-ink">{r.entityId}</dd>
                          </div>
                          <div>
                            <dt className="font-bold uppercase tracking-wide text-muted">Recorded at</dt>
                            <dd className="text-ink">{r.createdAt}</dd>
                          </div>
                        </dl>
                        <DiffRows before={r.before} after={r.after} />
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}