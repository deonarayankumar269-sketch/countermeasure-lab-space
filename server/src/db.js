import mongoose from 'mongoose'
import { config } from './config.js'
import { log } from './lib/logger.js'

let memory = null

async function startMemory() {
  let MongoMemoryServer
  try {
    ;({ MongoMemoryServer } = await import('mongodb-memory-server'))
  } catch {
    throw new Error('mongodb-memory-server is not installed, run: npm install --prefix server')
  }
  memory = await MongoMemoryServer.create()
  return memory.getUri('n1lab')
}

export async function connectDb() {
  mongoose.set('strictQuery', true)
  let uri = config.mongoUri

  if (uri === 'memory') {
    log.warn('MONGO_URI=memory, data disappears when the server stops')
    uri = await startMemory()
  }

  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 4000 })
  } catch (err) {
    if (config.isProd || uri !== config.mongoUri || process.env.MEMORY_FALLBACK === '0') throw err
    log.warn(`could not reach mongo at ${config.mongoUri} (${err.message})`)
    log.warn('falling back to an in-memory database for this run. Start mongo (docker compose up -d) to keep data.')
    await mongoose.connect(await startMemory(), { serverSelectionTimeoutMS: 4000 })
  }
  log.info(`mongo connected (${mongoose.connection.host}:${mongoose.connection.port}/${mongoose.connection.name})`)
}

export async function closeDb() {
  await mongoose.disconnect()
  if (memory) await memory.stop()
}
