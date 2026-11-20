import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import AppShell, { useAppShell } from '../components/AppShell'
import { Panel, PanelHead } from '../components/Panel'
import FarmCard from '../components/FarmCard'
import FarmForm from '../components/FarmForm'
import ProductCard from '../components/ProductCard'
import ListingPhotoManager from '../components/ListingPhotoManager'
import Chip from '../components/Chip'
import Empty from '../components/Empty'
import Modal from '../components/Modal'
import SearchableSelect from '../components/SearchableSelect'
import { getMyFarms, deleteFarm } from '../lib/api'
import { useCrops } from '../lib/crops'
import { productArt, productGradient } from '../lib/productArt'
import VerifyProfileModal from '../components/VerifyProfileModal'

const STAGE_LABELS = { pre_harvest: 'Pre-harvest', post_harvest: 'Post-harvest' }
const STAGE_OPTIONS = [
  { value: '', label: 'All' },
  { value: 'pre_harvest', label: 'Pre-harvest' },
  { value: 'post_harvest', label: 'Post-harvest' },
]

function FarmDetail({ farm, onEdit, onDelete, onClose }) {
  const { emoji } = productArt(farm.cropType)
  const row = 'flex justify-between gap-3 border-b border-line/60 py-2 last:border-0'
  return (
    <Panel>
      <PanelHead
        title={farm.name || 'My farm'}
        sub={`${farm.cropType?.charAt(0).toUpperCase() + farm.cropType.slice(1)} · ${STAGE_LABELS[farm.stage] || farm.stage}`}
      />
      {farm.imageUrl ? (
        <img src={farm.imageUrl} alt={farm.cropType} className="mb-3 aspect-[4/3] w-full rounded-xl object-cover" />
      ) : (
        <div
          className="mb-3 flex aspect-[4/3] w-full items-center justify-center rounded-xl border border-line"
          style={{ background: productGradient(farm.cropType) }}
        >
          <span className="text-6xl" aria-hidden="true">{emoji}</span>
        </div>
      )}
      <div className="font-sans text-sm text-ink">
        <div className={row}><span className="text-muted">Status</span><span className="font-semibold capitalize">{farm.status}</span></div>
        <div className={row}><span className="text-muted">Location</span><span className="font-semibold">{farm.location || '—'}</span></div>
        <div className={row}><span className="text-muted">Expected harvest</span><span className="font-semibold">{farm.expectedHarvestDate || '—'}</span></div>
        <div className={row}>
          <span className="text-muted">Coordinates</span>
          <span className="font-semibold">
            {farm.lat != null && farm.lng != null ? `${farm.lat}, ${farm.lng}` : '—'}
          </span>
        </div>
        <div className={row}>
          <span className="text-muted">Added</span>
          <span className="font-semibold">{farm.createdAt ? new Date(farm.createdAt).toLocaleDateString() : '—'}</span>
        </div>
      </div>
      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        <button
          type="button"
          onClick={onEdit}
          className="rounded-[10px] border border-line bg-white px-4 py-2.5 font-sans text-xs font-bold text-ink transition hover:bg-paper"
        >
          Edit
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="rounded-[10px] border border-line bg-white px-4 py-2.5 font-sans text-xs font-bold text-bad-text transition hover:bg-bad"
        >
          Delete
        </button>
        <button
          type="button"
          onClick={onClose}
          className="rounded-[10px] bg-leaf px-4 py-2.5 font-sans text-xs font-bold text-white transition hover:bg-leaf-dark"
        >
          Close
        </button>
      </div>
    </Panel>
  )
}

function FarmsContent() {
  const { user, isFarmer, market, flashToast } = useAppShell()
  const { crops } = useCrops()
  const navigate = useNavigate()
  const [farms, setFarms] = useState(null)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [cropFilter, setCropFilter] = useState('')
  const [stageFilter, setStageFilter] = useState('')
  const [photoListing, setPhotoListing] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [detailFarm, setDetailFarm] = useState(null)
  const [verifyOpen, setVerifyOpen] = useState(false)

  const loadFarms = () =>
    getMyFarms()
      .then(setFarms)
      .catch((e) => {
        setFarms({ preHarvest: [], postHarvest: [] })
        setError(e.message || 'Could not load your farms.')
      })

  useEffect(() => {
    if (!isFarmer) return
    loadFarms()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFarmer])

  const allFarms = (farms
    ? [
        ...farms.preHarvest.map((f) => ({ ...f, stage: 'pre_harvest' })),
        ...farms.postHarvest.map((f) => ({ ...f, stage: 'post_harvest' })),
      ]
    : []
  ).filter((f) => (!stageFilter || f.stage === stageFilter) && String(f.farmerId) === String(user.id))

  const filtered = allFarms.filter(
    (f) =>
      (!query ||
        `${f.name} ${f.cropType} ${f.location}`.toLowerCase().includes(query.toLowerCase())) &&
      (!cropFilter || (f.cropType || '').toLowerCase() === cropFilter.toLowerCase()),
  )

  const ownListings = (market || []).filter((l) => String(l.farmerId) === String(user.id))

  const cropOptions = [{ value: '', label: 'All crops' }, ...crops.map((c) => ({ value: c.id, label: c.name }))]

  const openCreate = () => {
    if (!user?.verified) {
      setVerifyOpen(true)
      return
    }
    setEditing(null)
    setShowForm(true)
  }

  const openEdit = (farm) => {
    setDetailFarm(null)
    setEditing(farm)
    setShowForm(true)
  }

  const openDelete = async (farm) => {
    if (!window.confirm(`Delete "${farm.name || farm.cropType}"? It will be archived and hidden from your lists.`)) return
    try {
      await deleteFarm(farm.id)
      flashToast('Farm deleted.')
      setDetailFarm(null)
      loadFarms()
    } catch (e) {
      flashToast(e.message || 'Could not delete the farm.')
    }
  }

  if (!isFarmer) {
    return (
      <div className="space-y-5">
        <header>
          <span className="font-sans text-[11px] font-bold uppercase tracking-[.15em] text-leaf">
            My farms
          </span>
          <h1 className="mt-2 font-serif text-[clamp(28px,3.6vw,40px)] font-semibold leading-none tracking-[-.05em] text-ink">
            Farms
          </h1>
          <p className="mt-2 font-sans text-sm text-muted">Manage your growing plots.</p>
        </header>
        <Empty>Farms are available to growers.</Empty>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <header className="flex items-end justify-between gap-4">
        <div>
          <span className="font-sans text-[11px] font-bold uppercase tracking-[.15em] text-leaf">
            My farms
          </span>
          <h1 className="mt-2 font-serif text-[clamp(28px,3.6vw,40px)] font-semibold leading-none tracking-[-.05em] text-ink">
            Farms & produce
          </h1>
          <p className="mt-2 font-sans text-sm text-muted">
            Manage the plots you're growing and the produce you've listed.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="shrink-0 rounded-[10px] bg-leaf px-4 py-2.5 font-sans text-xs font-bold text-white transition hover:bg-leaf-dark"
        >
          + New farm
        </button>
      </header>

      {!user?.verified && (
        <Panel className="border-leaf/40">
          <h2 className="font-serif text-[19px] font-semibold tracking-[-.04em] text-ink">
            Verify your farmer profile
          </h2>
          <p className="mt-1 font-sans text-sm text-muted">
            You must be verified before you can manage farms.
          </p>
          <Link
            to="/verify"
            className="mt-4 inline-block rounded-[10px] bg-leaf px-4 py-2.5 font-sans text-sm font-bold text-white transition hover:bg-leaf-dark"
          >
            Verify my profile
          </Link>
        </Panel>
      )}

      <div className="flex flex-col gap-2">
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search plot, crop, location…"
            className="w-full flex-1 rounded-[10px] border border-line bg-surface px-3 py-2.5 font-sans text-sm text-ink outline-none focus:border-leaf focus:shadow-[0_0_0_3px_rgba(29,101,79,.12)]"
          />
          <SearchableSelect
            value={cropFilter}
            onChange={setCropFilter}
            options={cropOptions}
            placeholder="All crops"
            className="w-full sm:w-52"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {STAGE_OPTIONS.map((s) => (
            <Chip key={s.value} active={stageFilter === s.value} onClick={() => setStageFilter(s.value)}>
              {s.label}
            </Chip>
          ))}
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-bad/40 bg-bad px-3 py-2 font-sans text-sm text-bad-text">
          {error}
        </div>
      )}

      {!farms ? (
        <Panel>
          <Empty>Loading farms…</Empty>
        </Panel>
      ) : !allFarms.length ? (
        <Empty>You haven't added any farms yet. Use + New farm to track your plots.</Empty>
      ) : filtered.length === 0 ? (
        <Empty>No farms match that search yet.</Empty>
      ) : (
        <div className="grid grid-cols-2 gap-3.5 md:grid-cols-3 xl:grid-cols-4">
          {filtered.map((f) => (
            <FarmCard key={f.id} farm={f} onDetails={() => setDetailFarm(f)} />
          ))}
        </div>
      )}

      <Panel>
        <PanelHead title="Your open listings" sub="Everything you currently have on offer." />
        {ownListings.length === 0 ? (
          <Empty>You haven't listed any produce yet. Create a listing from the marketplace.</Empty>
        ) : (
          <div className="grid grid-cols-2 gap-3.5 md:grid-cols-3 xl:grid-cols-4">
            {ownListings.map((l) => (
              <div key={l.id}>
                <ProductCard
                  item={l}
                  viewOnly
                  onView={() => navigate(`/produce/${l.id}`)}
                  onManagePhotos={() =>
                    setPhotoListing((cur) => (cur === l.id ? null : l.id))
                  }
                  photosActive={photoListing === l.id}
                />
                {photoListing === l.id && (
                  <ListingPhotoManager
                    listing={l}
                    onDone={() => setPhotoListing(null)}
                  />
                )}
              </div>
            ))}
          </div>
        )}
      </Panel>

      <Modal open={showForm} onClose={() => setShowForm(false)}>
        <FarmForm
          defaultLocation={user.location}
          farm={editing}
          onCancel={() => setShowForm(false)}
          onDone={() => {
            setShowForm(false)
            loadFarms()
            flashToast(editing ? 'Farm updated.' : 'Farm added.')
          }}
        />
      </Modal>

      <Modal open={Boolean(detailFarm)} onClose={() => setDetailFarm(null)}>
        {detailFarm && (
          <FarmDetail
            farm={detailFarm}
            onEdit={() => openEdit(detailFarm)}
            onDelete={() => openDelete(detailFarm)}
            onClose={() => setDetailFarm(null)}
          />
        )}
      </Modal>
      <VerifyProfileModal open={verifyOpen} onClose={() => setVerifyOpen(false)} />
    </div>
  )
}

export default function FarmsPage() {
  return (
    <AppShell activeId="farms">
      <FarmsContent />
    </AppShell>
  )
}