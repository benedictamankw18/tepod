import { useEffect, useState } from 'react'
import { getNotifications, broadcastNotification } from '../../lib/api'
import Modal from '../../components/Modal'
import { useAdmin } from '../../components/AdminShell'
import { Page, Loader, Empty, Badge, Btn, Table, Td, inputCls, labelCls, dateOnly } from './_ui'

const CHANNELS = ['', 'sms', 'in_app', 'email']
const DELIVERY = [
  { id: '', label: 'Both' },
  { id: 'yes', label: 'Delivered' },
  { id: 'no', label: 'Undelivered' },
]

const AUDIENCES = [
  { id: 'buyers', label: 'Buyers' },
  { id: 'farmers', label: 'Farmers' },
  { id: 'all', label: 'All' },
]

const SEND_CHANNELS = [
  { id: 'in_app', label: 'In-app', hint: 'Bell inbox' },
  { id: 'sms', label: 'SMS', hint: 'Phone' },
  { id: 'email', label: 'Email', hint: 'Email' },
]

const blank = { audience: 'buyers', channels: [], title: '', message: '' }

export default function AdminNotifications() {
  const { flash } = useAdmin()
  const [rows, setRows] = useState(null)
  const [error, setError] = useState('')
  const [channel, setChannel] = useState('')
  const [delivered, setDelivered] = useState('')

  const [sendOpen, setSendOpen] = useState(false)
  const [form, setForm] = useState(blank)
  const [sendBusy, setSendBusy] = useState(false)

  const load = () => {
    getNotifications({
      channel: channel || undefined,
      delivered: delivered === '' ? undefined : delivered === 'yes',
    })
      .then(setRows)
      .catch((e) => setError(e.message))
  }

  useEffect(() => {
    setRows(null)
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channel, delivered])

  const openSend = () => {
    setForm(blank)
    setError('')
    setSendOpen(true)
  }

  const closeSend = () => {
    setSendOpen(false)
    setForm(blank)
  }

  const toggleChannel = (id) => {
    setForm((f) => ({
      ...f,
      channels: f.channels.includes(id) ? f.channels.filter((c) => c !== id) : [...f.channels, id],
    }))
  }

  const send = async (e) => {
    e.preventDefault()
    if (!form.message.trim()) {
      setError('Write a message before sending.')
      return
    }
    if (!form.channels.length) {
      setError('Choose at least one channel (in-app, SMS, or email).')
      return
    }
    setError('')
    setSendBusy(true)
    try {
      const result = await broadcastNotification({
        audience: form.audience,
        channels: form.channels,
        title: form.title.trim() || undefined,
        message: form.message.trim(),
      })
      const c = result.counts || {}
      const bits = []
      for (const k of ['in_app', 'sms', 'email']) {
        if (c[k] > 0) bits.push(`${c[k]} ${k}`)
      }
      if (c.skipped > 0) bits.push(`${c.skipped} skipped (no contact)`)
      if (c.invalidPhones > 0) bits.push(`${c.invalidPhones} invalid phone${c.invalidPhones === 1 ? '' : 's'}`)
      if (c.invalidEmails > 0) bits.push(`${c.invalidEmails} invalid email${c.invalidEmails === 1 ? '' : 's'}`)
      flash(`Notification sent — ${bits.join(' · ')}`)
      closeSend()
      load()
    } catch (err) {
      setError(err.message || 'Could not send notification.')
    } finally {
      setSendBusy(false)
    }
  }

  const smsSegments = Math.max(1, Math.ceil(form.message.length / 160))

  return (
    <>
      <Page
        title="Notifications"
        subtitle="Compose a broadcast to buyers, farmers, or everyone, then review the outbound message log."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Btn tone="green" onClick={openSend}>
              + Send notification
            </Btn>
            <div className="flex gap-1.5">
              {CHANNELS.map((c) => (
                <button
                  key={c || 'all'}
                  type="button"
                  onClick={() => setChannel(c)}
                  className={`rounded-full border px-3 py-1.5 font-sans text-xs font-semibold capitalize transition ${
                    channel === c ? 'border-leaf bg-leaf text-white' : 'border-line bg-white text-muted hover:border-leaf hover:text-leaf'
                  }`}
                >
                  {c || 'All channels'}
                </button>
              ))}
            </div>
            <select className="rounded-full border border-line bg-white px-3 py-1.5 font-sans text-xs font-semibold text-muted outline-none" value={delivered} onChange={(e) => setDelivered(e.target.value)}>
              {DELIVERY.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.label}
                </option>
              ))}
            </select>
          </div>
        }
      />

      {error && (
        <div className="mb-4 rounded-md border border-bad/40 bg-bad px-3 py-2 font-sans text-sm text-bad-text">
          {error}
        </div>
      )}

      <Modal open={sendOpen} onClose={closeSend} title="Send notification" maxWidth="max-w-lg">
        {error && (
          <div className="mb-4 rounded-md border border-bad/40 bg-bad px-3 py-2 font-sans text-sm text-bad-text">
            {error}
          </div>
        )}
        <form onSubmit={send} className="grid gap-4">
          <div>
            <label className={labelCls}>Send to</label>
            <div className="flex gap-1.5">
              {AUDIENCES.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, audience: a.id }))}
                  className={`flex-1 rounded-[10px] border px-3 py-2 font-sans text-sm font-semibold capitalize transition ${
                    form.audience === a.id ? 'border-leaf bg-leaf text-white' : 'border-line bg-surface text-muted hover:border-leaf hover:text-leaf'
                  }`}
                >
                  {a.label}
                </button>
              ))}
            </div>
            <p className="mt-1 font-sans text-[11px] text-muted">
              {form.audience === 'buyers' && 'Active buyers only.'}
              {form.audience === 'farmers' && 'Active farmers only.'}
              {form.audience === 'all' && 'Active buyers, farmers, market sellers, and transporters.'}
            </p>
          </div>

          <div>
            <label className={labelCls}>Channels</label>
            <div className="grid gap-2 sm:grid-cols-3">
              {SEND_CHANNELS.map((c) => (
                <label
                  key={c.id}
                  className={`flex cursor-pointer items-center gap-2 rounded-[10px] border px-3 py-2.5 transition ${
                    form.channels.includes(c.id) ? 'border-leaf bg-ok-soft' : 'border-line bg-surface hover:border-leaf'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={form.channels.includes(c.id)}
                    onChange={() => toggleChannel(c.id)}
                    className="h-4 w-4 accent-leaf"
                  />
                  <span className="font-sans text-sm font-semibold capitalize text-ink">{c.label}</span>
                  <span className="ml-auto font-sans text-[10px] text-muted">{c.hint}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className={labelCls}>Title (in-app)</label>
            <input
              className={inputCls}
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="e.g. Rainy-season harvest sale"
            />
          </div>

          <div>
            <label className={labelCls}>Message *</label>
            <textarea
              className={`${inputCls} min-h-[110px] resize-y`}
              value={form.message}
              onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
              placeholder="Write the broadcast message…"
            />
            <div className="mt-1 flex justify-between font-sans text-[11px] text-muted">
              <span>{form.message.length} characters</span>
              {form.channels.includes('sms') && <span>{smsSegments} SMS segment{smsSegments === 1 ? '' : 's'}</span>}
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Btn onClick={closeSend}>
              Cancel
            </Btn>
            <Btn tone="green" submit disabled={sendBusy}>
              {sendBusy ? 'Sending…' : 'Send notification'}
            </Btn>
          </div>
        </form>
      </Modal>

      {!rows ? (
        <Loader />
      ) : rows.length === 0 ? (
        <Empty title="No notifications" hint="Nothing sent matching these filters yet." />
      ) : (
        <Table head={['Recipient', 'Channel', 'Message', 'Delivered', 'Sent']}>
          {rows.map((n) => (
            <tr key={n.id} className="hover:bg-paper/40">
              <Td className="font-semibold text-ink">{n.toPhone || n.toEmail || n.userId || '—'}</Td>
              <Td>
                <Badge tone={n.channel === 'sms' ? 'green' : n.channel === 'email' ? 'amber' : 'muted'}>{n.channel}</Badge>
              </Td>
              <Td className="max-w-[420px]">
                {n.title && <p className="font-sans text-xs font-semibold text-ink">{n.title}</p>}
                <p className="line-clamp-2 break-words text-sm text-ink">{n.message || String(n.messageKey || '')}</p>
                {n.messageKey && <p className="text-[11px] text-muted">key: {n.messageKey}</p>}
              </Td>
              <Td>
                {n.channel === 'in_app' ? (
                  <Badge tone="green">Delivered</Badge>
                ) : n.delivered == null ? (
                  <Badge tone="muted">Pending</Badge>
                ) : n.delivered ? (
                  <Badge tone="green">Delivered</Badge>
                ) : (
                  <Badge tone="red">Failed</Badge>
                )}
              </Td>
              <Td>{dateOnly(n.sentAt)}</Td>
            </tr>
          ))}
        </Table>
      )}
    </>
  )
}