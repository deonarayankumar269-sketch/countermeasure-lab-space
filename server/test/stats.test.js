import test from 'node:test'
import assert from 'node:assert/strict'
import { fitCrossover } from '../src/lib/stats.js'
import { buildSchedule, mulberry32 } from '../src/lib/schedule.js'
import { dayNum } from '../src/lib/dates.js'

function simulate(effect, phi, seed, sched, sd = 11) {
  const r = mulberry32(seed)
  const g = () => Math.sqrt(-2 * Math.log(1 - r())) * Math.cos(2 * Math.PI * r())
  let e = 0
  return sched.filter(s => s.phase !== 'W').map(s => {
    e = phi * e + Math.sqrt(1 - phi * phi) * g() * sd
    return { day: dayNum(s.date), x: s.phase === 'B' ? 1 : 0, y: 76 + (s.phase === 'B' ? effect : 0) + e }
  })
}

const sched = buildSchedule({ startDate: '2026-09-01', blockDays: 5, pairs: 3, washoutDays: 2, seed: 11 })

test('returns null when one arm has too few days', () => {
  const pts = [0, 1, 2, 3, 4, 5].map(i => ({ day: 100 + i, x: i < 5 ? 0 : 1, y: 70 + i }))
  assert.equal(fitCrossover(pts), null)
})

test('returns null for flat data', () => {
  const pts = Array.from({ length: 12 }, (_, i) => ({ day: 100 + i, x: i % 2, y: 50 }))
  assert.equal(fitCrossover(pts), null)
})

test('cdf is monotone and quantile inverts it', () => {
  const m = fitCrossover(simulate(8, 0.4, 5, sched))
  let prev = 0
  for (let x = -40; x <= 40; x += 2) {
    const c = m.cdf(x)
    assert.ok(c >= prev - 1e-12)
    prev = c
  }
  for (const q of [0.05, 0.3, 0.5, 0.9]) assert.ok(Math.abs(m.cdf(m.quantile(q)) - q) < 1e-6)
})

test('no effect centres near zero, big effect is found', () => {
  let zero = 0, big = 0
  const N = 60
  for (let i = 0; i < N; i++) {
    zero += fitCrossover(simulate(0, 0.4, 100 + i, sched)).mean
    big += fitCrossover(simulate(20, 0.4, 500 + i, sched)).mean
  }
  assert.ok(Math.abs(zero / N) < 2, `null mean was ${zero / N}`)
  assert.ok(big / N > 16 && big / N < 24, `big mean was ${big / N}`)
})

test('80% intervals cover the truth about 80% of the time', () => {
  let hit = 0
  const N = 150
  for (let i = 0; i < N; i++) {
    const m = fitCrossover(simulate(10, 0.45, 2000 + i, sched))
    if (m.quantile(0.1) <= 10 && 10 <= m.quantile(0.9)) hit++
  }
  const rate = hit / N
  assert.ok(rate > 0.68 && rate < 0.92, `coverage was ${rate}`)
})

test('strong day-to-day autocorrelation shows up in phi', () => {
  const hi = fitCrossover(simulate(0, 0.85, 7, sched))
  const lo = fitCrossover(simulate(0, 0.0, 7, sched))
  assert.ok(hi.phi > lo.phi)
})

test('more data narrows the interval', () => {
  const long = buildSchedule({ startDate: '2026-09-01', blockDays: 5, pairs: 6, washoutDays: 2, seed: 11 })
  const a = fitCrossover(simulate(8, 0.4, 9, sched))
  const b = fitCrossover(simulate(8, 0.4, 9, long))
  assert.ok(b.quantile(0.9) - b.quantile(0.1) < a.quantile(0.9) - a.quantile(0.1))
})
