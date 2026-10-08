import test from 'node:test'
import assert from 'node:assert/strict'
import { demoData } from '../src/lib/demoData.js'
import { buildAnalysis } from '../src/lib/analysis.js'
import { buildSchedule } from '../src/lib/schedule.js'

const today = '2026-10-08'
const { logs, schedule } = demoData(today)
const exp = {
  outcome: { metric: 'deepSleepMin', label: 'Deep sleep', unit: 'min', higherIsBetter: true },
  intervention: { name: 'Evening light filtering' },
  minEffect: 5,
  schedule,
}

test('demo experiment reads as promising but not conclusive', () => {
  const a = buildAnalysis(exp, logs, today)
  assert.ok(a.ready)
  assert.equal(a.verdict.action, 'extend')
  assert.match(a.verdict.headline, /improved deep sleep/)
  assert.match(a.verdict.headline, /not conclusive yet/)
  assert.ok(a.verdict.mean > 5 && a.verdict.mean < 18)
  assert.ok(a.verdict.i80[0] < a.verdict.mean && a.verdict.mean < a.verdict.i80[1])
  assert.ok(a.verdict.moreDays >= 2)
})

test('lower-is-better metrics flip the sign of benefit', () => {
  const rhr = { ...exp, outcome: { metric: 'restingHr', label: 'Resting HR', unit: 'bpm', higherIsBetter: false }, minEffect: 2 }
  const lowerBetter = buildAnalysis(rhr, logs, today)
  const higherBetter = buildAnalysis({ ...rhr, outcome: { ...rhr.outcome, higherIsBetter: true } }, logs, today)
  assert.ok(Math.abs(lowerBetter.verdict.mean + higherBetter.verdict.mean) < 1e-9)
})

test('strong clean effect gets a keep', () => {
  const sched = buildSchedule({ startDate: '2026-08-01', blockDays: 7, pairs: 4, washoutDays: 2, seed: 4 })
  const rows = sched.filter(s => s.phase !== 'W').map((s, i) => ({
    date: s.date,
    metrics: { deepSleepMin: 70 + (s.phase === 'B' ? 25 : 0) + ((i * 7) % 5) },
  }))
  const a = buildAnalysis({ ...exp, schedule: sched }, rows, '2026-12-31')
  assert.equal(a.verdict.action, 'keep')
  assert.match(a.verdict.headline, /conclusive, keep it/)
})

test('not enough data returns a reason instead of a verdict', () => {
  const a = buildAnalysis(exp, logs.slice(0, 5), today)
  assert.equal(a.ready, false)
  assert.ok(a.reason.length > 10)
})

test('density integrates to roughly one and history is ordered', () => {
  const a = buildAnalysis(exp, logs, today)
  let area = 0
  for (let i = 1; i < a.density.x.length; i++) area += ((a.density.y[i] + a.density.y[i - 1]) / 2) * (a.density.x[i] - a.density.x[i - 1])
  assert.ok(area > 0.97 && area < 1.03, `area ${area}`)
  for (let i = 1; i < a.history.length; i++) assert.ok(a.history[i].n > a.history[i - 1].n)
})
