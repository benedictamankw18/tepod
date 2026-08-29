import { useEffect, useRef, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { getUser } from '../lib/auth'
import {
  getAllBanners,
  createBanner,
  updateBanner,
  setBannerActive,
  deleteBanner,
  uploadImage,
} from '../lib/api'
import Sidebar from '../components/Sidebar'

const inputCls =
  'w-full rounded-[10px] border border-line bg-[#fbfcfa] px-3 py-2.5 font-sans text-sm text-ink outline-none focus:border-leaf focus:shadow-[0_0_0_3px_rgba(29,101,79,.12)]'
const labelCls = 'mb-1 block font-sans text-[11px] uppercase tracking-[.06em] text-muted'

const blank = { title: '', eyebrow: '', subtitle: '', imageUrl: '', linkUrl: '', sortOrder: 0, active: true }

export default function AdminBanners() {
  const user = getUser()
  const [banners, setBanners] = useState(null)
  const [editing, setEditing] = useState(null) // null = closed, blank object = new, id = edit
  const [form, setForm] = useState(blank)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [toast, setToast] = useState('')
  const fileRef = useRef(null)

  const load = () => getAllBanners().then(setBanners).catch((e) => setError(e.message))

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (user?.role !== 'admin') {
    return <Navigate to="/" replace />
  }

  const flash = (msg) => {
    setToast('')
    requestAnimationFrame(() => setToast(msg))
  }

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
    <div className="flex min-h-screen bg-paper">
      <Sidebar user={user} links={[]} activeId="" onNavigate={() => {}} />
      <main className="mx-auto w-full max-w-[1100px] flex-1 px-4 py-6 md:px-8 md:py-7">
        <header className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <span className="font-sans text-[11px] font-bold uppercase tracking-[.15em] text-leaf">
              Admin workspace
            </span>
            <h1 className="mt-2 font-serif text-[clamp(28px,3.8vw,40px)] font-semibold leading-none tracking-[-.05em] text-ink">
              Storefront banners
            </h1>
            <p className="mt-2 max-w-[560px] font-sans text-sm leading-relaxed text-muted">
              The first active banner (lowest sort order) shows on the buyer storefront. Activate, edit, or delete
              as needed.
            </p>
          </div>
          <div className="flex shrink-0 gap-2">
            <Link
              to="/"
              className="rounded-[10px] border border-line bg-white px-4 py-2.5 font-sans text-xs font-bold text-ink transition hover:bg-paper"
            >
              Back to dashboard
            </Link>
            {!formOpen && (
              <button
                type="button"
                onClick={openNew}
                className="rounded-[10px] bg-leaf px-4 py-2.5 font-sans text-xs font-bold text-white transition hover:bg-leaf-dark"
              >
                + New banner
              </button>
            )}
          </div>
        </header>

        {error && (
          <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 font-sans text-sm text-red-700">
            {error}
          </div>
        )}

        {formOpen && (
          <section className="mb-6 rounded-2xl border border-line bg-white p-5 shadow-sm">
            <h2 className="mb-4 font-serif text-xl font-semibold tracking-[-.04em] text-ink">
              {editing === 'new' ? 'New banner' : 'Edit banner'}
            </h2>
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
                      className="grid h-20 w-40 place-items-center rounded-lg border border-dashed border-line bg-[#fbfcfa] font-sans text-xs text-muted hover:border-leaf hover:text-leaf disabled:opacity-50"
                    >
                      {busy ? 'Uploading…' : '+ Add image'}
                    </button>
                  )}
                  {form.imageUrl && (
                    <button type="button" onClick={() => setForm((f) => ({ ...f, imageUrl: '' }))} className="font-sans text-xs text-red-600 hover:underline">
                      Remove image
                    </button>
                  )}
                </div>
              </div>
              <div className="flex justify-end gap-2 sm:col-span-2">
                <button type="button" onClick={closeForm} className="rounded-[10px] border border-line bg-white px-4 py-2.5 font-sans text-xs font-bold text-ink hover:bg-paper">
                  Cancel
                </button>
                <button type="submit" disabled={busy} className="rounded-[10px] bg-leaf px-4 py-2.5 font-sans text-xs font-bold text-white transition hover:bg-leaf-dark disabled:opacity-50">
                  {busy ? 'Saving…' : 'Save banner'}
                </button>
              </div>
            </form>
          </section>
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
                <div className="flex items-start justify-between gap-4">
                  <div className="flex min-w-0 items-center gap-4">
                    {b.imageUrl ? (
                      <img src={b.imageUrl} alt="" className="h-14 w-24 shrink-0 rounded-lg border border-line object-cover" />
                    ) : (
                      <span className="flex h-14 w-24 shrink-0 items-center justify-center rounded-lg bg-[#e8f0c5] font-serif text-xs font-bold text-leaf-dark">
                        {b.title.slice(0, 2).toUpperCase()}
                      </span>
                    )}
                    <div className="min-w-0">
                      <p className="truncate font-serif text-base font-semibold text-ink">{b.title}</p>
                      <p className="truncate font-sans text-xs text-muted">
                        {b.eyebrow || '—'} · sort {b.sortOrder}
                      </p>
                      <span
                        className={`mt-1 inline-block rounded-full px-2 py-0.5 font-sans text-[10px] font-bold ${
                          b.active ? 'bg-[#e8f0c5] text-leaf-dark' : 'bg-paper text-muted'
                        }`}
                      >
                        {b.active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <button
                      type="button"
                      onClick={() => toggleActive(b)}
                      className="rounded-[10px] border border-line bg-white px-3 py-2 font-sans text-xs font-bold text-ink hover:bg-paper"
                    >
                      {b.active ? 'Deactivate' : 'Activate'}
                    </button>
                    <button
                      type="button"
                      onClick={() => openEdit(b)}
                      className="rounded-[10px] border border-line bg-white px-3 py-2 font-sans text-xs font-bold text-ink hover:bg-paper"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(b)}
                      className="rounded-[10px] border border-red-200 bg-white px-3 py-2 font-sans text-xs font-bold text-red-600 hover:bg-red-50"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {toast && (
          <div className="fixed bottom-6 right-6 z-50 max-w-xs rounded-[10px] bg-leaf-dark px-4 py-3.5 font-sans text-xs text-white shadow">
            {toast}
          </div>
        )}
      </main>
    </div>
  )
}
