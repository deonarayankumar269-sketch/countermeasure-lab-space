const ISO = /^\d{4}-\d{2}-\d{2}$/

export function isIso(s) {
  if (typeof s !== 'string' || !ISO.test(s)) return false
  const d = new Date(s + 'T00:00:00Z')
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s
}

export const dayNum = iso => Math.floor(Date.parse(iso + 'T00:00:00Z') / 86400000)

export function addDays(iso, n) {
  const d = new Date(iso + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

export const todayIso = () => new Date().toISOString().slice(0, 10)
