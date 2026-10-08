import express from 'express'
import fs from 'node:fs'
import path from 'node:path'
import cors from 'cors'
import helmet from 'helmet'
import cookieParser from 'cookie-parser'
import mongoose from 'mongoose'
import { config } from './config.js'
import { requestLog, notFound, errorHandler } from './middleware/errors.js'
import auth from './routes/auth.js'
import logs from './routes/logs.js'
import experiments from './routes/experiments.js'
import demo from './routes/demo.js'

export function createApp() {
  const app = express()
  app.disable('x-powered-by')
  app.set('trust proxy', 1)

  app.use(helmet())
  app.use(cors({ origin: config.clientOrigin, credentials: true }))
  app.use(express.json({ limit: '1mb' }))
  app.use(cookieParser())
  app.use(requestLog)

  app.get('/api/health', (_req, res) => {
    const up = mongoose.connection.readyState === 1
    res.status(up ? 200 : 503).json({ ok: up, db: up ? 'up' : 'down', uptime: Math.round(process.uptime()), time: new Date().toISOString() })
  })

  app.use('/api/auth', auth)
  app.use('/api/logs', logs)
  app.use('/api/experiments', experiments)
  app.use('/api/demo', demo)
  app.use('/api', notFound)

  // built client, only present after `npm run build`
  const index = path.join(config.clientDist, 'index.html')
  if (fs.existsSync(index)) {
    app.use(express.static(config.clientDist, { maxAge: '1h', index: false }))
    app.get('*', (_req, res) => res.sendFile(index))
  }

  app.use(errorHandler)
  return app
}
