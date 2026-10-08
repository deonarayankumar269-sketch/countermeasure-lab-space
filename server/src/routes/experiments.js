import { Router } from 'express'
import { randomInt } from 'node:crypto'
import mongoose from 'mongoose'
import { z } from 'zod'
import { Experiment } from '../models/Experiment.js'
import { LogEntry } from '../models/LogEntry.js'
import { HttpError, wrap, parse } from '../lib/http.js'
import { requireAuth } from '../middleware/auth.js'
import { isIso, todayIso } from '../lib/dates.js'
import { buildSchedule, extendSchedule } from '../lib/schedule.js'
import { buildAnalysis, briefOf } from '../lib/analysis.js'
import { log } from '../lib/logger.js'

const r = Router()
r.use(requireAuth)

const createBody = z.object({
  title: z.string().trim().min(3, 'Give it a title').max(90),
  hypothesis: z.string().trim().max(400).optional().default(''),
  intervention: z.object({
    name: z.string().trim().min(2, 'Name the intervention').max(80),
    protocol: z.string().trim().max(500).optional().default(''),
  }),
  outcome: z.object({
    metric: z.string().regex(/^[a-zA-Z][a-zA-Z0-9_]{0,39}$/, 'Pick a metric'),
    label: z.string().trim().min(2).max(40),
    unit: z.string().trim().max(12).optional().default(''),
    higherIsBetter: z.boolean(),
  }),
  minEffect: z.number().positive('Must be above zero').max(1e6),
  design: z.object({
    blockDays: z.number().int().min(2).max(14),
    pairs: z.number().int().min(2).max(6),
    washoutDays: z.number().int().min(0).max(7),
    startDate: z.string().refine(isIso, 'Use a real date'),
  }),
})

const decisionBody = z.discriminatedUnion('action', [
  z.object({ action: z.literal('keep'), note: z.string().max(400).optional().default('') }),
  z.object({ action: z.literal('drop'), note: z.string().max(400).optional().default('') }),
  z.object({ action: z.literal('extend'), days: z.number().int().min(2).max(28), note: z.string().max(400).optional().default('') }),
])

const todayOf = req => (isIso(req.query.today) ? req.query.today : todayIso())

async function load(req) {
  const { id } = req.params
  if (!mongoose.isValidObjectId(id)) throw new HttpError(404, 'Experiment not found')
  const exp = await Experiment.findOne({ _id: id, owner: req.user.id })
  if (!exp) throw new HttpError(404, 'Experiment not found')
  return exp
}

function logsFor(exp) {
  const first = exp.schedule[0].date
  const last = exp.schedule[exp.schedule.length - 1].date
  return LogEntry.find({ user: exp.owner, date: { $gte: first, $lte: last } }).select('date metrics -_id').lean()
}

r.get('/', wrap(async (req, res) => {
  const today = todayOf(req)
  const list = await Experiment.find({ owner: req.user.id }).sort({ createdAt: -1 })
  const out = []
  for (const exp of list) {
    const analysis = buildAnalysis(exp, await logsFor(exp), today)
    out.push({ ...exp.toClient(), brief: briefOf(analysis) })
  }
  res.json({ experiments: out })
}))

r.post('/', wrap(async (req, res) => {
  const body = parse(createBody, req.body)
  const seed = randomInt(1, 2 ** 31 - 1)
  const schedule = buildSchedule({ ...body.design, seed })
  const exp = await Experiment.create({
    owner: req.user.id,
    title: body.title,
    hypothesis: body.hypothesis,
    intervention: body.intervention,
    outcome: body.outcome,
    minEffect: body.minEffect,
    design: { ...body.design, seed },
    schedule,
  })
  log.info(`experiment ${exp._id} created, ${schedule.length} days, seed ${seed}`)
  res.status(201).json({ experiment: exp.toClient() })
}))

r.get('/:id', wrap(async (req, res) => {
  const exp = await load(req)
  const analysis = buildAnalysis(exp, await logsFor(exp), todayOf(req))
  res.json({ experiment: exp.toClient(), analysis })
}))

r.post('/:id/decision', wrap(async (req, res) => {
  const exp = await load(req)
  const body = parse(decisionBody, req.body)
  const today = todayOf(req)

  if (body.action === 'extend') {
    exp.schedule = extendSchedule(exp.schedule.map(s => ({ date: s.date, phase: s.phase, period: s.period })), {
      days: body.days,
      washoutDays: exp.design.washoutDays,
      seed: exp.design.seed,
    })
    exp.design.extendedDays += body.days
    exp.status = 'active'
    exp.decision = undefined
  } else {
    const a = buildAnalysis(exp, await logsFor(exp), today)
    exp.status = body.action === 'keep' ? 'kept' : 'dropped'
    exp.decision = {
      action: body.action,
      note: body.note,
      at: new Date(),
      snapshot: a.ready ? { headline: a.verdict.headline, mean: a.verdict.mean, i80: a.verdict.i80, pMeaningful: a.verdict.pMeaningful, n: a.model.n } : null,
    }
  }
  await exp.save()
  const analysis = buildAnalysis(exp, await logsFor(exp), today)
  res.json({ experiment: exp.toClient(), analysis })
}))

r.post('/:id/reopen', wrap(async (req, res) => {
  const exp = await load(req)
  exp.status = 'active'
  exp.decision = undefined
  await exp.save()
  res.json({ experiment: exp.toClient() })
}))

r.delete('/:id', wrap(async (req, res) => {
  const exp = await load(req)
  await exp.deleteOne()
  res.json({ deleted: true })
}))

export default r
