import { Router } from 'express'
import { wrap, HttpError } from '../lib/http.js'
import { requireAuth } from '../middleware/auth.js'
import { loadDemo } from '../lib/demo.js'
import { isIso, todayIso } from '../lib/dates.js'
import { config } from '../config.js'

const r = Router()
r.use(requireAuth)

r.post('/load', wrap(async (req, res) => {
  if (!config.demo) throw new HttpError(403, 'Demo data is switched off on this server')
  const today = isIso(req.query.today) ? req.query.today : todayIso()
  const exp = await loadDemo(req.user.id, today)
  res.json({ experimentId: exp._id.toString() })
}))

export default r
