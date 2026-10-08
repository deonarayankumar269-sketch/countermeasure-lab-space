import { addDays } from './dates.js'

export function mulberry32(seed) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// every pair of periods gets its own coin flip, so A-B-B-A, B-A-A-B, A-B-A-B etc all show up.
// washout days sit between every two periods and never count as data.
export function buildSchedule({ startDate, blockDays, pairs, washoutDays, seed }) {
  const rnd = mulberry32(seed)
  const order = []
  for (let i = 0; i < pairs; i++) order.push(...(rnd() < 0.5 ? ['A', 'B'] : ['B', 'A']))

  const out = []
  let cursor = startDate
  order.forEach((phase, period) => {
    if (period > 0) {
      for (let w = 0; w < washoutDays; w++) {
        out.push({ date: cursor, phase: 'W', period })
        cursor = addDays(cursor, 1)
      }
    }
    for (let d = 0; d < blockDays; d++) {
      out.push({ date: cursor, phase, period })
      cursor = addDays(cursor, 1)
    }
  })
  return out
}

// adds one more randomized A/B pair after the last scheduled day. `days` is data days, split over the two periods.
export function extendSchedule(schedule, { days, washoutDays, seed }) {
  const rnd = mulberry32((seed ^ Math.imul(schedule.length, 2654435761)) >>> 0)
  const order = rnd() < 0.5 ? ['A', 'B'] : ['B', 'A']
  const lens = [Math.ceil(days / 2), Math.floor(days / 2)]
  let cursor = addDays(schedule[schedule.length - 1].date, 1)
  let period = Math.max(...schedule.map(s => s.period)) + 1
  const out = [...schedule]
  order.forEach((phase, i) => {
    if (!lens[i]) return
    for (let w = 0; w < washoutDays; w++) {
      out.push({ date: cursor, phase: 'W', period })
      cursor = addDays(cursor, 1)
    }
    for (let d = 0; d < lens[i]; d++) {
      out.push({ date: cursor, phase, period })
      cursor = addDays(cursor, 1)
    }
    period++
  })
  return out
}
