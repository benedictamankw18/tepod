// Maps the backend's WMO-based condition labels (src/services/weather.js) to the
// stroke icons shown in the AI weather guide. Returns { icon, color } where color
// is a Tailwind text class so each weather card reads at a glance.

import {
  SunIcon,
  PartlyCloudyIcon,
  CloudIcon,
  FogIcon,
  DrizzleIcon,
  RainIcon,
  HeavyRainIcon,
  StormIcon,
  SnowIcon,
} from '../components/icons'

const TABLE = [
  { match: /thunder|storm/i, icon: StormIcon, color: 'text-bad-text' },
  { match: /heavy rain/i, icon: HeavyRainIcon, color: 'text-sky-600' },
  { match: /heavy showers/i, icon: HeavyRainIcon, color: 'text-sky-600' },
  { match: /rain/i, icon: RainIcon, color: 'text-sky-600' },
  { match: /showers/i, icon: RainIcon, color: 'text-sky-600' },
  { match: /drizzle/i, icon: DrizzleIcon, color: 'text-sky-500' },
  { match: /snow/i, icon: SnowIcon, color: 'text-sky-400' },
  { match: /fog/i, icon: FogIcon, color: 'text-muted' },
  { match: /clear/i, icon: SunIcon, color: 'text-gold' },
  { match: /partly/i, icon: PartlyCloudyIcon, color: 'text-gold' },
  { match: /overcast/i, icon: CloudIcon, color: 'text-muted' },
]

export function weatherIconMeta(condition) {
  const label = String(condition || '')
  const hit = TABLE.find((row) => row.match.test(label))
  return hit || { icon: CloudIcon, color: 'text-muted' }
}