import { addDays, todayIso } from './dates.js'
import { buildSchedule, mulberry32 } from './schedule.js'

// pure part, no db: 75 days of believable wearable data plus the schedule of one half-finished experiment.
// the true effect baked in is about +10 min of deep sleep on B days, with day-to-day drift (AR1 ~ .45).
export function demoData(today = todayIso()) {
  const rnd = mulberry32(88231)
  const gauss = () => Math.sqrt(-2 * Math.log(1 - rnd())) * Math.cos(2 * Math.PI * rnd())

  const startDate = addDays(today, -23)
  const schedule = buildSchedule({ startDate, blockDays: 5, pairs: 2, washoutDays: 2, seed: 7 })
  const phaseOn = new Map(schedule.map(s => [s.date, s.phase]))

  const total = 75
  const first = addDays(today, -(total - 1))
  let e = 0
  let hrvE = 0
  const logs = []
  for (let i = 0; i < total; i++) {
    const date = addDays(first, i)
    const phase = phaseOn.get(date)
    e = 0.45 * e + Math.sqrt(1 - 0.45 ** 2) * gauss() * 11
    hrvE = 0.6 * hrvE + Math.sqrt(1 - 0.36) * gauss() * 5
    const deep = 76 + (phase === 'B' ? 10 : 0) + e
    logs.push({
      date,
      metrics: {
        deepSleepMin: Math.round(deep),
        totalSleepMin: Math.round(368 + deep * 0.6 + gauss() * 22),
        hrv: Math.round((52 + hrvE + (phase === 'B' ? 1.5 : 0)) * 10) / 10,
        restingHr: Math.round((58 + gauss() * 2 - (phase === 'B' ? 0.4 : 0)) * 10) / 10,
        mood: Math.min(10, Math.max(1, Math.round(6.5 + gauss() * 1.3))),
      },
    })
  }
  return { logs, schedule, startDate }
}
