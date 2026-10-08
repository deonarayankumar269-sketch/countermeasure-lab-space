import test from 'node:test'
import assert from 'node:assert/strict'
import { buildSchedule, extendSchedule } from '../src/lib/schedule.js'
import { isIso, addDays } from '../src/lib/dates.js'

const base = { startDate: '2026-03-01', blockDays: 5, pairs: 3, washoutDays: 2 }

test('schedule has balanced A and B days and washout between periods', () => {
  const s = buildSchedule({ ...base, seed: 42 })
  assert.equal(s.filter(d => d.phase === 'A').length, 15)
  assert.equal(s.filter(d => d.phase === 'B').length, 15)
  assert.equal(s.filter(d => d.phase === 'W').length, 2 * 5)
  assert.equal(s.length, 30 + 10)
})

test('days are consecutive and start where asked', () => {
  const s = buildSchedule({ ...base, seed: 1 })
  assert.equal(s[0].date, '2026-03-01')
  for (let i = 1; i < s.length; i++) assert.equal(s[i].date, addDays(s[i - 1].date, 1))
})

test('same seed same plan, different seeds eventually differ', () => {
  const a = buildSchedule({ ...base, seed: 9 }).map(d => d.phase).join('')
  const b = buildSchedule({ ...base, seed: 9 }).map(d => d.phase).join('')
  assert.equal(a, b)
  const seen = new Set()
  for (let seed = 1; seed < 40; seed++) seen.add(buildSchedule({ ...base, seed }).map(d => d.phase).join(''))
  assert.ok(seen.size > 3)
})

test('every pair holds one A period and one B period', () => {
  const s = buildSchedule({ ...base, seed: 5 })
  const periods = new Map()
  for (const d of s) if (d.phase !== 'W') periods.set(d.period, d.phase)
  const order = [...periods.entries()].sort((x, y) => x[0] - y[0]).map(x => x[1])
  for (let i = 0; i < order.length; i += 2) assert.deepEqual([order[i], order[i + 1]].sort(), ['A', 'B'])
})

test('extend appends data days after the last day', () => {
  const s = buildSchedule({ ...base, seed: 3 })
  const e = extendSchedule(s, { days: 5, washoutDays: 2, seed: 3 })
  const added = e.slice(s.length)
  assert.equal(added.filter(d => d.phase !== 'W').length, 5)
  assert.equal(added[0].date, addDays(s.at(-1).date, 1))
  assert.ok(added.every(d => d.period > Math.max(...s.map(x => x.period))))
})

test('isIso rejects impossible dates', () => {
  assert.ok(isIso('2026-02-28'))
  assert.ok(!isIso('2026-02-30'))
  assert.ok(!isIso('26-02-01'))
  assert.ok(!isIso(null))
})
