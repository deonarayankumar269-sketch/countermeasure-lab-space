export const pad = n => String(n).padStart(2, '0')

export function localIso(d = new Date()) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function num(v, d) {
  if (v == null || Number.isNaN(v)) return '-'
  const a = Math.abs(v)
  const dp = d ?? (a >= 100 ? 0 : a >= 10 ? 0 : 1)
  return (Math.round(v * 10 ** dp) / 10 ** dp).toLocaleString('en-US', { maximumFractionDigits: dp })
}

export const pct = v => `${Math.round(v * 100)}%`

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
export function shortDate(iso) {
  const [, m, d] = iso.split('-')
  return `${Number(d)} ${MONTHS[Number(m) - 1]}`
}

export const metricKey = h => {
  let k = h.trim().replace(/[^a-zA-Z0-9]+(.)?/g, (_, c) => (c ? c.toUpperCase() : ''))
  k = k.charAt(0).toLowerCase() + k.slice(1)
  if (!/^[a-zA-Z]/.test(k)) k = 'm' + k
  return k.slice(0, 40)
}

export const PRESETS = [
  { key: 'deepSleepMin', label: 'Deep sleep', unit: 'min', higherIsBetter: true, minEffect: 5 },
  { key: 'totalSleepMin', label: 'Total sleep', unit: 'min', higherIsBetter: true, minEffect: 15 },
  { key: 'hrv', label: 'HRV', unit: 'ms', higherIsBetter: true, minEffect: 3 },
  { key: 'restingHr', label: 'Resting HR', unit: 'bpm', higherIsBetter: false, minEffect: 2 },
  { key: 'mood', label: 'Mood', unit: '/10', higherIsBetter: true, minEffect: 0.5 },
  { key: 'glucoseFasting', label: 'Fasting glucose', unit: 'mg/dL', higherIsBetter: false, minEffect: 5 },
  { key: 'systolicBp', label: 'Systolic BP', unit: 'mmHg', higherIsBetter: false, minEffect: 4 },
]

export const presetFor = key => PRESETS.find(p => p.key === key)
