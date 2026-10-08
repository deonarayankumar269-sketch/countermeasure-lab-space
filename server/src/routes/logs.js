import { Router } from 'express'
import { z } from 'zod'
import { LogEntry } from '../models/LogEntry.js'
import { HttpError, wrap, parse } from '../lib/http.js'
import { requireAuth } from '../middleware/auth.js'
import { isIso, addDays, todayIso } from '../lib/dates.js'

const r = Router()
r.use(requireAuth)

const key = z.string().regex(/^[a-zA-Z][a-zA-Z0-9_]{0,39}$/, 'Metric keys are letters, digits and underscores')
const value = z.number().finite().min(-1e7).max(1e7).nullable()
const metrics = z.record(key, value).refine(m => Object.keys(m).length > 0 && Object.keys(m).length <= 40, 'Send 1 to 40 metrics')

function toOps(userId, date, m, source, note) {
  const $set = { source }
  const $unset = {}
  if (note !== undefined) $set.note = note
  for (const [k, v] of Object.entries(m)) {
    if (v === null) $unset[`metrics.${k}`] = ''
    else $set[`metrics.${k}`] = v
  }
  const update = { $set }
  if (Object.keys($unset).length) update.$unset = $unset
  return { updateOne: { filter: { user: userId, date }, update, upsert: true } }
}

r.get('/', wrap(async (req, res) => {
  const to = isIso(req.query.to) ? req.query.to : todayIso()
  const from = isIso(req.query.from) ? req.query.from : addDays(to, -89)
  const logs = await LogEntry.find({ user: req.user.id, date: { $gte: from, $lte: to } })
    .sort({ date: 1 })
    .select('date metrics source note -_id')
    .lean()
  res.json({ logs, from, to })
}))

r.get('/metrics', wrap(async (req, res) => {
  const all = await LogEntry.find({ user: req.user.id }).select('date metrics -_id').sort({ date: 1 }).lean()
  const seen = new Map()
  for (const l of all) {
    for (const [k, v] of Object.entries(l.metrics || {})) {
      if (typeof v !== 'number') continue
      const s = seen.get(k) || { key: k, count: 0, last: l.date, sum: 0 }
      s.count++
      s.sum += v
      s.last = l.date
      seen.set(k, s)
    }
  }
  const list = [...seen.values()].map(s => ({ key: s.key, count: s.count, last: s.last, avg: s.sum / s.count }))
  res.json({ metrics: list.sort((a, b) => b.count - a.count), days: all.length, lastDate: all.at(-1)?.date || null })
}))

r.put('/:date', wrap(async (req, res) => {
  if (!isIso(req.params.date)) throw new HttpError(400, 'Date must look like 2026-03-14')
  const body = parse(z.object({ metrics, note: z.string().max(300).optional() }), req.body)
  await LogEntry.bulkWrite([toOps(req.user.id, req.params.date, body.metrics, 'manual', body.note)])
  const doc = await LogEntry.findOne({ user: req.user.id, date: req.params.date }).select('date metrics source note -_id').lean()
  // all metrics cleared -> drop the empty day
  if (doc && !Object.keys(doc.metrics || {}).length) {
    await LogEntry.deleteOne({ user: req.user.id, date: req.params.date })
    return res.json({ log: null })
  }
  res.json({ log: doc })
}))

r.delete('/:date', wrap(async (req, res) => {
  if (!isIso(req.params.date)) throw new HttpError(400, 'Date must look like 2026-03-14')
  const out = await LogEntry.deleteOne({ user: req.user.id, date: req.params.date })
  res.json({ deleted: out.deletedCount })
}))

const bulkBody = z.object({
  rows: z.array(z.object({ date: z.string(), metrics })).min(1).max(3000),
  source: z.enum(['csv', 'manual']).default('csv'),
})

r.post('/bulk', wrap(async (req, res) => {
  const body = parse(bulkBody, req.body)
  const good = body.rows.filter(row => isIso(row.date))
  const skipped = body.rows.length - good.length
  const ops = good.map(row => toOps(req.user.id, row.date, row.metrics, body.source))
  for (let i = 0; i < ops.length; i += 500) await LogEntry.bulkWrite(ops.slice(i, i + 500), { ordered: false })
  res.json({ imported: good.length, skipped })
}))

export default r
