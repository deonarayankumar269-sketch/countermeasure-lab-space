import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import rateLimit from 'express-rate-limit'
import { User } from '../models/User.js'
import { HttpError, wrap, parse } from '../lib/http.js'
import { setSession, clearSession, requireAuth } from '../middleware/auth.js'

const r = Router()

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many attempts, wait a few minutes', code: 'rate_limited' },
})

const creds = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email').max(120),
  password: z.string().min(8, 'At least 8 characters').max(100),
})
const registerBody = creds.extend({
  name: z.string().trim().min(2, 'Enter your name').max(60),
  callsign: z.string().trim().max(24).optional().default(''),
})

// compared against when the email isn't found so both paths cost the same
const DUMMY = bcrypt.hashSync('not-a-real-password', 10)

r.post('/register', limiter, wrap(async (req, res) => {
  const body = parse(registerBody, req.body)
  if (await User.exists({ email: body.email })) {
    throw new HttpError(409, 'An account with that email already exists', { fields: { email: 'Already registered' } })
  }
  const user = await User.create({
    name: body.name,
    callsign: body.callsign,
    email: body.email,
    passwordHash: await bcrypt.hash(body.password, 11),
  })
  setSession(res, user._id.toString())
  res.status(201).json({ user: user.toPublic() })
}))

r.post('/login', limiter, wrap(async (req, res) => {
  const body = parse(creds, req.body)
  const user = await User.findOne({ email: body.email }).select('+passwordHash')
  const ok = await bcrypt.compare(body.password, user?.passwordHash || DUMMY)
  if (!user || !ok) throw new HttpError(401, 'Email or password is wrong', { code: 'bad_credentials' })
  setSession(res, user._id.toString())
  res.json({ user: user.toPublic() })
}))

r.post('/logout', (_req, res) => {
  clearSession(res)
  res.json({ ok: true })
})

r.get('/me', requireAuth, wrap(async (req, res) => {
  const user = await User.findById(req.user.id)
  res.json({ user: user.toPublic() })
}))

export default r
