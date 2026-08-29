import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AppShell, { useAppShell } from '../components/AppShell'
import { Panel, PanelHead } from '../components/Panel'
import FarmTile from '../components/FarmTile'
import ProductCard from '../components/ProductCard'
import ListingPhotoManager from '../components/ListingPhotoManager'
import Empty from '../components/Empty'
import { getMyFarms } from '../lib/api'

function FarmsContent() {
  const { user, isFarmer, market } = useAppShell()
  const navigate = useNavigate()
  const [farms, setFarms] = useState(null)
  const [photoListing, setPhotoListing] = useState(null)

  useEffect(() => {
    if (!isFarmer) return
    let alive = true
    getMyFarms()
      .then((f) => alive && setFarms(f))
      .catch(() => alive && setFarms([]))
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFarmer])

  const ownListings = (market || []).filter((l) => String(l.farmerId) === String(user.id))

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
      <header>
        <span className="font-sans text-[11px] font-bold uppercase tracking-[.15em] text-leaf">
          My farms
        </span>
        <h1 className="mt-2 font-serif text-[clamp(28px,3.6vw,40px)] font-semibold leading-none tracking-[-.05em] text-ink">
          Farms & produce
        </h1>
        <p className="mt-2 font-sans text-sm text-muted">
          Manage the plots you're growing and the produce you've listed.
        </p>
      </header>

      {!farms ? (
        <Panel>
          <Empty>Loading farms…</Empty>
        </Panel>
      ) : (
        <>
          <Panel>
            <PanelHead title="Pre-harvest farms" sub="Crops still growing toward harvest." />
            {farms.preHarvest.length === 0 ? (
              <Empty>No pre-harvest farms yet.</Empty>
            ) : (
              <div className="grid gap-2.5 sm:grid-cols-2">
                {farms.preHarvest.map((f) => (
                  <FarmTile key={f.id} farm={f} />
                ))}
              </div>
            )}
          </Panel>

          <Panel>
            <PanelHead title="Post-harvest farms" sub="Produce ready for market." />
            {farms.postHarvest.length === 0 ? (
              <Empty>No post-harvest farms yet.</Empty>
            ) : (
              <div className="grid gap-2.5 sm:grid-cols-2">
                {farms.postHarvest.map((f) => (
                  <FarmTile key={f.id} farm={f} />
                ))}
              </div>
            )}
          </Panel>

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
        </>
      )}
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
