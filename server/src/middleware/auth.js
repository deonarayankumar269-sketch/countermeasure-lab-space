import jwt from 'jsonwebtoken'
import { config } from '../config.js'
import { User } from '../models/User.js'
import { HttpError, wrap } from '../lib/http.js'

export const COOKIE = 'n1_token'

export function setSession(res, userId) {
  const token = jwt.sign({ sub: userId }, config.jwtSecret, { expiresIn: `${config.jwtDays}d` })
  res.cookie(COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: config.isProd,
    maxAge: config.jwtDays * 86400000,
    path: '/',
  })
}

export const clearSession = res => res.clearCookie(COOKIE, { path: '/' })

export const requireAuth = wrap(async (req, _res, next) => {
  const header = req.headers.authorization
  const token = req.cookies?.[COOKIE] || (header?.startsWith('Bearer ') ? header.slice(7) : null)
  if (!token) throw new HttpError(401, 'Sign in to continue', { code: 'no_session' })

  let payload
  try {
    payload = jwt.verify(token, config.jwtSecret)
  } catch {
    throw new HttpError(401, 'Your session expired, sign in again', { code: 'bad_session' })
  }
  const user = await User.findById(payload.sub)
  if (!user) throw new HttpError(401, 'Account no longer exists', { code: 'no_user' })
  req.user = { id: user._id.toString(), name: user.name, email: user.email }
  next()
})
