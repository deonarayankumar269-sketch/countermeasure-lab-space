import { Experiment } from '../models/Experiment.js'
import { LogEntry } from '../models/LogEntry.js'
import { todayIso } from './dates.js'
import { demoData } from './demoData.js'

export const DEMO_TITLE = 'Evening light filtering and deep sleep'

export async function loadDemo(userId, today = todayIso()) {
  const existing = await Experiment.findOne({ owner: userId, title: DEMO_TITLE })
  if (existing) return existing

  const { logs, schedule, startDate } = demoData(today)
  await LogEntry.bulkWrite(
    logs.map(l => ({
      updateOne: {
        filter: { user: userId, date: l.date },
        update: { $set: { source: 'demo', ...Object.fromEntries(Object.entries(l.metrics).map(([k, v]) => [`metrics.${k}`, v])) } },
        upsert: true,
      },
    }))
  )

  return Experiment.create({
    owner: userId,
    title: DEMO_TITLE,
    hypothesis: 'Amber cabin lighting after 20:00 raises deep sleep for this crew member.',
    intervention: {
      name: 'Evening light filtering',
      protocol: 'From 20:00 the cabin switches to the amber profile and screens run the red filter. Control days keep standard lighting.',
    },
    outcome: { metric: 'deepSleepMin', label: 'Deep sleep', unit: 'min', higherIsBetter: true },
    minEffect: 5,
    design: { blockDays: 5, pairs: 2, washoutDays: 2, startDate, seed: 7 },
    schedule,
  })
}
