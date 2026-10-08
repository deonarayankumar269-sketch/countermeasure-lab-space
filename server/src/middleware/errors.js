import { config } from '../config.js'
import { log } from '../lib/logger.js'

export function requestLog(req, res, next) {
  const t0 = process.hrtime.bigint()
  res.on('finish', () => {
    const ms = Number(process.hrtime.bigint() - t0) / 1e6
    const line = `${req.method} ${req.originalUrl} ${res.statusCode} ${ms.toFixed(1)}ms`
    if (res.statusCode >= 500) log.error(line)
    else if (res.statusCode >= 400) log.warn(line)
    else log.debug(line)
  })
  next()
}

export function notFound(req, res) {
  res.status(404).json({ message: `No route for ${req.method} ${req.path}`, code: 'not_found' })
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, _next) {
  let status = err.status || 500
  let message = err.message
  let code = err.code
  let fields = err.fields

  if (err.name === 'CastError') { status = 400; message = 'Malformed id or value'; code = 'cast' }
  if (err.code === 11000) { status = 409; message = 'That already exists'; code = 'duplicate' }
  if (err.type === 'entity.parse.failed') { status = 400; message = 'Request body is not valid JSON'; code = 'bad_json' }
  if (err.type === 'entity.too.large') { status = 413; message = 'Payload too large'; code = 'too_large' }

  if (status >= 500) {
    log.error(`${req.method} ${req.originalUrl}`, err)
    message = config.isProd ? 'Something broke on our side' : err.message
  }
  const body = { message, code: typeof code === 'string' ? code : undefined, fields }
  if (!config.isProd && status >= 500) body.stack = err.stack
  res.status(status).json(body)
}
