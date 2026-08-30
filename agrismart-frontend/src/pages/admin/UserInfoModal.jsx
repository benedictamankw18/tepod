import { Badge } from './_ui'
import Modal from '../../components/Modal'

function Row({ label, value }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-line py-2">
      <span className="shrink-0 font-sans text-[11px] uppercase tracking-[.06em] text-muted">{label}</span>
      <span className="text-right font-sans text-sm text-ink">{value || '—'}</span>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div className="mb-5">
      <h3 className="mb-2 font-sans text-[11px] font-bold uppercase tracking-[.12em] text-leaf">{title}</h3>
      <div>{children}</div>
    </div>
  )
}

function cropsLabel(crops) {
  if (!Array.isArray(crops) || crops.length === 0) return '—'
  return crops.join(', ')
}

export default function UserInfoModal({ user, onClose }) {
  if (!user) return null
  return (
    <Modal open={!!user} onClose={onClose} title="User details" maxWidth="max-w-xl">
      <div className="mb-5 flex items-center justify-between gap-3 border-b border-line pb-4">
        <div>
          <p className="font-serif text-xl font-semibold capitalize text-ink">{user.name}</p>
          <p className="font-sans text-xs text-muted">{user.phone || user.email || shortId(user.id)}</p>
        </div>
        <div className="flex gap-1.5">
          <Badge tone={user.active === false ? 'red' : 'green'}>{user.active === false ? 'Inactive' : 'Active'}</Badge>
          <Badge tone={user.deletedAt ? 'red' : user.verified ? 'green' : 'amber'}>
            {user.deletedAt ? 'Deleted' : user.verified ? 'Verified' : 'Unverified'}
          </Badge>
        </div>
      </div>

      <Section title="Account">
        <Row label="Role" value={user.role} />
        <Row label="Rating" value={user.rating != null ? `${Number(user.rating).toFixed(2)} (${user.ratingCount} votes)` : null} />
        <Row label="Member since" value={user.createdAt ? new Date(user.createdAt).toLocaleDateString() : null} />
        <Row label="Deleted" value={user.deletedAt ? new Date(user.deletedAt).toLocaleDateString() : null} />
      </Section>

      <Section title="Contact">
        <Row label="Phone" value={user.phone} />
        <Row label="Email" value={user.email} />
        <Row label="Username" value={user.username} />
      </Section>

      <Section title="Profile">
        <Row label="Buyer type" value={user.buyerType} />
        <Row label="Mobile money" value={user.mobileMoneyProvider} />
        <Row label="Language" value={user.language} />
        <Row label="Farm size" value={user.farmSize != null ? `${user.farmSize} ha` : null} />
        <Row label="Location" value={user.location} />
        <Row label="Region" value={user.region} />
        <Row label="District" value={user.district} />
        <Row label="Community" value={user.community} />
        <Row label="GPS address" value={user.gpsAddress} />
        <Row label="Address" value={user.address} />
      </Section>

      <Section title="Crops">
        <Row label="Primary" value={cropsLabel(user.primaryCrops)} />
        <Row label="Picks" value={cropsLabel(user.purchaseCrops)} />
      </Section>

      <Section title="Verification">
        {user.verification ? (
          <>
            <Row label="ID type" value={user.verification.idType} />
            <Row label="ID number" value={user.verification.idNumber} />
            <Row label="Submitted" value={user.verification.submittedAt ? new Date(user.verification.submittedAt).toLocaleDateString() : null} />
            {user.verification.photoUrl && (
              <Row label="Photo" value={<a className="text-leaf underline" href={user.verification.photoUrl} target="_blank" rel="noreferrer">View</a>} />
            )}
            {user.verification.lat != null && user.verification.lng != null && (
              <Row
                label="Live location"
                value={`${Number(user.verification.lat).toFixed(5)}, ${Number(user.verification.lng).toFixed(5)}`}
              />
            )}
          </>
        ) : (
          <p className="font-sans text-sm text-muted">No verification on file</p>
        )}
      </Section>
    </Modal>
  )
}

function shortId(id = '') {
  return id ? `${id.slice(0, 8)}…` : '—'
}