export class HttpError extends Error {
  constructor(status, message, extra = {}) {
    super(message)
    this.status = status
    Object.assign(this, extra)
  }
}

export const wrap = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next)

export function parse(schema, data) {
  const r = schema.safeParse(data)
  if (r.success) return r.data
  const fields = {}
  for (const i of r.error.issues) fields[i.path.join('.') || '_'] = i.message
  throw new HttpError(400, 'Some fields need fixing', { fields, code: 'validation' })
}
