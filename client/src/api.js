export class ApiError extends Error {
  constructor(status, body) {
    super(body?.message || 'Request failed')
    this.status = status
    this.code = body?.code
    this.fields = body?.fields || null
  }
}

async function request(method, url, body) {
  let res
  try {
    res = await fetch('/api' + url, {
      method,
      credentials: 'include',
      headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
  } catch {
    throw new ApiError(0, { message: 'Cannot reach the server. Check that the API is running on port 5000.', code: 'network' })
  }

  const text = await res.text()
  let data = null
  try { data = text ? JSON.parse(text) : null } catch { /* proxy error pages are html */ }

  if (!res.ok) {
    const err = new ApiError(res.status, data || { message: `Server answered ${res.status}` })
    if (import.meta.env.DEV) console.debug('[api]', method, url, res.status, data)
    throw err
  }
  return data
}

export const api = {
  get: u => request('GET', u),
  post: (u, b = {}) => request('POST', u, b),
  put: (u, b = {}) => request('PUT', u, b),
  del: u => request('DELETE', u),
}
