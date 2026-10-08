import { config } from '../config.js'

const levels = { error: 0, warn: 1, info: 2, debug: 3 }
const colors = { error: '\x1b[31m', warn: '\x1b[33m', info: '\x1b[32m', debug: '\x1b[90m' }
const max = levels[config.logLevel] ?? 2

function out(level, args) {
  if (levels[level] > max) return
  const t = new Date().toISOString().slice(11, 23)
  const tag = `${colors[level]}${level.padEnd(5)}\x1b[0m`
  const fn = level === 'error' ? console.error : console.log
  fn(`\x1b[90m${t}\x1b[0m ${tag}`, ...args)
}

export const log = {
  error: (...a) => out('error', a),
  warn: (...a) => out('warn', a),
  info: (...a) => out('info', a),
  debug: (...a) => out('debug', a),
}
