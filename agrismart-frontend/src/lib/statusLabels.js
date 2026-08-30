import { BADGE_CLS } from '../components/Badge'

export const BADGE_TONES = {
  open: 'lime',
  pre_committed: 'warn',
  sold: 'bad',
  expired: 'muted',
  spoiled_withdrawn: 'muted',
  deactivated: 'warn',
  deleted: 'muted',
}

export const STATUS_META = {
  open: { label: 'Open', tone: 'lime' },
  pre_committed: { label: 'Pre-committed', tone: 'warn' },
  sold: { label: 'Sold', tone: 'bad' },
  expired: { label: 'Expired', tone: 'muted' },
  spoiled_withdrawn: { label: 'Withdrawn', tone: 'muted' },
  deactivated: { label: 'Deactivated — hidden', tone: 'warn' },
  deleted: { label: 'Deleted', tone: 'muted' },
}

export const STATUS_LABELS = Object.fromEntries(
  Object.entries(STATUS_META).map(([k, v]) => [k, { label: v.label, cls: BADGE_CLS[v.tone] }]),
)