import dotenv from 'dotenv'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.resolve(here, '../.env') })

const e = process.env

export const config = {
  port: Number(e.PORT) || 5000,
  mongoUri: e.MONGO_URI || 'mongodb://127.0.0.1:27017/n1lab',
  jwtSecret: e.JWT_SECRET || 'n1lab-dev-secret',
  jwtDays: Number(e.JWT_DAYS) || 7,
  clientOrigin: e.CLIENT_ORIGIN || 'http://localhost:5173',
  isProd: e.NODE_ENV === 'production',
  logLevel: e.LOG_LEVEL || (e.NODE_ENV === 'production' ? 'info' : 'debug'),
  demo: e.ENABLE_DEMO !== '0',
  clientDist: path.resolve(here, '../../client/dist'),
}

if (config.isProd && config.jwtSecret.includes('dev-secret')) {
  throw new Error('JWT_SECRET is still the dev default, set a real one before running in production')
}
