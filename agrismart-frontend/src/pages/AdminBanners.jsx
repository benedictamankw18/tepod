import { useEffect, useRef, useState } from 'react'
import { getAllBanners, createBanner, updateBanner, setBannerActive, deleteBanner, uploadImage } from '../lib/api'
import { useAdmin } from '../components/AdminShell'
import Modal from '../components/Modal'
import { Page, Badge, Btn, inputCls, labelCls } from './admin/_ui'

const blank = { title: '', eyebrow: '', subtitle: '', imageUrl: '', linkUrl: '', sortOrder: 0, active: true }

export default function AdminBanners() {
  const { flash } = useAdmin()
  const [banners, setBanners] = useState(null)
  const [editing, setEditing] = useState(null) // null = closed, 'new' = create, id = edit
  const [form, setForm] = useState(blank)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef(null)

  const load = () => getAllBanners().then(setBanners).catch((e) => setError(e.message))

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const openNew = () => {
    setEditing('new')
    setForm(blank)
    setError('')
  }

  const openEdit = (b) => {
    setEditing(b.id)
    setForm({
      title: b.title,
      eyebrow: b.eyebrow || '',
      subtitle: b.subtitle || '',
      imageUrl: b.imageUrl || '',
      linkUrl: b.linkUrl || '',
      sortOrder: b.sortOrder ?? 0,
      active: b.active,
    })
    setError('')
  }

  const closeForm = () => {
    setEditing(null)
    setForm(blank)
    setError('')
  }

  const upload = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setBusy(true)
    try {
      const { url } = await uploadImage(file)
      setForm((f) => ({ ...f, imageUrl: url }))
    } catch (err) {
      setError(err.message || 'Image upload failed.')
    } finally {
      setBusy(false)
    }
  }

  const save = async (e) => {
    e.preventDefault()
    if (!form.title.trim()) {
      setError('Title is required.')
      return
    }
    setError('')
    setBusy(true)
    try {
      const payload = {
        title: form.title.trim(),
        eyebrow: form.eyebrow.trim() || undefined,
        subtitle: form.subtitle.trim() || undefined,
        imageUrl: form.imageUrl.trim() || undefined,
        linkUrl: form.linkUrl.trim() || undefined,
        sortOrder: Number(form.sortOrder) || 0,
        active: Boolean(form.active),
      }
      if (editing === 'new') await createBanner(payload)
      else await updateBanner(editing, payload)
      await load()
      closeForm()
      flash('Banner saved.')
    } catch (err) {
      setError(err.message || 'Could not save banner.')
    } finally {
      setBusy(false)
    }
  }

  const toggleActive = async (b) => {
    try {
      await setBannerActive(b.id, !b.active)
      await load()
      flash(b.active ? 'Banner deactivated.' : 'Banner activated.')
    } catch (err) {
      setError(err.message || 'Could not update banner.')
    }
  }

  const remove = async (b) => {
    if (!window.confirm(`Delete the banner "${b.title}"?`)) return
    try {
      await deleteBanner(b.id)
      await load()
      if (editing === b.id) closeForm()
      flash('Banner deleted.')
    } catch (err) {
      setError(err.message || 'Could not delete banner.')
    }
  }

  const formOpen = editing !== null

  return (
    <>
      <Page
        title="Storefront banners"
        subtitle="Active banners rotate as a slider on the buyer storefront in sort order. Activate, edit, or delete as needed."
        actions={
          <Btn tone="green" onClick={openNew}>
            + New banner
          </Btn>
        }
      />

      {!formOpen && error && (
        <div className="mb-4 rounded-md border border-bad/40 bg-bad px-3 py-2 font-sans text-sm text-bad-text">
          {error}
        </div>
      )}

      {formOpen && (
        <Modal
          open={formOpen}
          onClose={closeForm}
          title={editing === 'new' ? 'New banner' : 'Edit banner'}
          maxWidth="max-w-lg"
        >
          {error && (
            <div className="mb-4 rounded-md border border-bad/40 bg-bad px-3 py-2 font-sans text-sm text-bad-text">
              {error}
            </div>
          )}
          <form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className={labelCls}>Title *</label>
              <input className={inputCls} value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="e.g. Rainy-season harvest sale" />
            </div>
            <div>
              <label className={labelCls}>Eyebrow</label>
              <input className={inputCls} value={form.eyebrow} onChange={(e) => setForm((f) => ({ ...f, eyebrow: e.target.value }))} placeholder="e.g. Harvest marketplace" />
            </div>
            <div>
              <label className={labelCls}>Link URL</label>
              <input className={inputCls} value={form.linkUrl} onChange={(e) => setForm((f) => ({ ...f, linkUrl: e.target.value }))} placeholder="https://…" />
            </div>
            <div className="sm:col-span-2">
              <label className={labelCls}>Subtitle</label>
              <input className={inputCls} value={form.subtitle} onChange={(e) => setForm((f) => ({ ...f, subtitle: e.target.value }))} placeholder="Short supporting line" />
            </div>
            <div>
              <label className={labelCls}>Sort order</label>
              <input
                className={inputCls}
                type="number"
                value={form.sortOrder}
                onChange={(e) => setForm((f) => ({ ...f, sortOrder: e.target.value }))}
              />
              <p className="mt-1 font-sans text-[11px] text-muted">Lower numbers show first.</p>
            </div>
            <div>
              <label className={labelCls}>Active</label>
              <label className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))}
                  className="h-4 w-4 accent-leaf"
                />
                <span className="font-sans text-sm text-ink">Show on storefront</span>
              </label>
            </div>
            <div className="sm:col-span-2">
              <label className={labelCls}>Banner image (optional)</label>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={upload} />
              <div className="flex items-center gap-3">
                {form.imageUrl ? (
                  <img src={form.imageUrl} alt="banner preview" className="h-20 w-40 rounded-lg border border-line object-cover" />
                ) : (
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    disabled={busy}
                    className="grid h-20 w-40 place-items-center rounded-lg border border-dashed border-line bg-surface font-sans text-xs text-muted hover:border-leaf hover:text-leaf disabled:opacity-50"
                  >
                    {busy ? 'Uploading…' : '+ Add image'}
                  </button>
                )}
                {form.imageUrl && (
                  <button type="button" onClick={() => setForm((f) => ({ ...f, imageUrl: '' }))} className="font-sans text-xs text-bad-text hover:underline">
                    Remove image
                  </button>
                )}
              </div>
            </div>
            <div className="flex justify-end gap-2 sm:col-span-2">
              <Btn onClick={closeForm}>Cancel</Btn>
              <Btn tone="green" submit disabled={busy}>
                {busy ? 'Saving…' : 'Save banner'}
              </Btn>
            </div>
          </form>
        </Modal>
      )}

      {!banners ? (
        <div className="py-12 text-center font-sans text-sm text-muted">Loading banners…</div>
      ) : banners.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line bg-white py-14 text-center">
          <p className="font-serif text-lg text-ink">No banners yet</p>
          <p className="mt-1 font-sans text-sm text-muted">Create your first storefront banner to get started.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {banners.map((b) => (
            <div key={b.id} className="rounded-2xl border border-line bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex min-w-0 items-center gap-4">
                  {b.imageUrl ? (
                    <img src={b.imageUrl} alt="" className="h-14 w-24 shrink-0 rounded-lg border border-line object-cover" />
                  ) : (
                    <span className="flex h-14 w-24 shrink-0 items-center justify-center rounded-lg bg-lime-soft font-serif text-xs font-bold text-leaf-dark">
                      {b.title.slice(0, 2).toUpperCase()}
                    </span>
                  )}
                  <div className="min-w-0">
                    <p className="truncate font-serif text-base font-semibold text-ink">{b.title}</p>
                    <p className="truncate font-sans text-xs text-muted">
                      {b.eyebrow || '—'} · sort {b.sortOrder}
                    </p>
                    <Badge tone={b.active ? 'green' : 'muted'}>{b.active ? 'Active' : 'Inactive'}</Badge>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Btn onClick={() => toggleActive(b)}>{b.active ? 'Deactivate' : 'Activate'}</Btn>
                  <Btn onClick={() => openEdit(b)}>Edit</Btn>
                  <Btn tone="danger" onClick={() => remove(b)}>
                    Delete
                  </Btn>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  )
}