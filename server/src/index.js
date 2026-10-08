import { config } from './config.js'
import { log } from './lib/logger.js'
import { connectDb, closeDb } from './db.js'
import { createApp } from './app.js'

process.on('unhandledRejection', err => log.error('unhandled rejection', err))
process.on('uncaughtException', err => {
  log.error('uncaught exception', err)
  process.exit(1)
})

try {
  await connectDb()
} catch (err) {
  log.error(`database connection failed: ${err.message}`)
  log.error('start mongo with: docker compose up -d   (or set MONGO_URI in server/.env)')
  process.exit(1)
}

const server = createApp().listen(config.port, () => {
  log.info(`api listening on http://localhost:${config.port} (${config.isProd ? 'production' : 'development'})`)
})

server.on('error', err => {
  if (err.code === 'EADDRINUSE') log.error(`port ${config.port} is already in use, change PORT in server/.env`)
  else log.error(err)
  process.exit(1)
})

async function stop(sig) {
  log.info(`${sig}, shutting down`)
  server.close()
  await closeDb().catch(() => {})
  process.exit(0)
}
process.on('SIGINT', () => stop('SIGINT'))
process.on('SIGTERM', () => stop('SIGTERM'))
