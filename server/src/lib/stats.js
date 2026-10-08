// Bayesian crossover model for a single person.
//
//   y_t = b0 + b1 * x_t + b2 * trend_t + e_t        x_t = 1 on B (intervention) days, 0 on A days
//   e_t is AR(1): corr(e_s, e_t) = phi^|s-t| (gaps in the log are fine, the lag is in real days)
//   b | s2 ~ N(0, s2 * V0),  s2 ~ InvGamma(a0, b0)
//
// For a fixed phi the posterior is closed form (normal-inverse-gamma on the whitened data).
// phi itself is integrated out on a grid, so the effect posterior is a mixture of Student-t's.
// Everything is computed on standardized y and scaled back at the end.

const PHI_GRID = Array.from({ length: 20 }, (_, i) => i * 0.05) // 0 .. 0.95
const PRIOR = { a0: 2, b0: 1, vInt: 10, vEffect: 12, vTrend: 1 }
export const MIN_PER_ARM = 3

// ---------- numerics ----------

function lgamma(x) {
  const c = [76.18009172947146, -86.50532032941677, 24.01409824083091, -1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5]
  let y = x
  let tmp = x + 5.5
  tmp -= (x + 0.5) * Math.log(tmp)
  let ser = 1.000000000190015
  for (let j = 0; j < 6; j++) ser += c[j] / ++y
  return -tmp + Math.log((2.5066282746310005 * ser) / x)
}

function betacf(a, b, x) {
  const FPMIN = 1e-300
  const qab = a + b, qap = a + 1, qam = a - 1
  let c = 1
  let d = 1 - (qab * x) / qap
  if (Math.abs(d) < FPMIN) d = FPMIN
  d = 1 / d
  let h = d
  for (let m = 1; m <= 200; m++) {
    const m2 = 2 * m
    let aa = (m * (b - m) * x) / ((qam + m2) * (a + m2))
    d = 1 + aa * d; if (Math.abs(d) < FPMIN) d = FPMIN
    c = 1 + aa / c; if (Math.abs(c) < FPMIN) c = FPMIN
    d = 1 / d
    h *= d * c
    aa = (-(a + m) * (qab + m) * x) / ((a + m2) * (qap + m2))
    d = 1 + aa * d; if (Math.abs(d) < FPMIN) d = FPMIN
    c = 1 + aa / c; if (Math.abs(c) < FPMIN) c = FPMIN
    d = 1 / d
    const del = d * c
    h *= del
    if (Math.abs(del - 1) < 3e-12) break
  }
  return h
}

function betai(a, b, x) {
  if (x <= 0) return 0
  if (x >= 1) return 1
  const bt = Math.exp(lgamma(a + b) - lgamma(a) - lgamma(b) + a * Math.log(x) + b * Math.log(1 - x))
  if (x < (a + 1) / (a + b + 2)) return (bt * betacf(a, b, x)) / a
  return 1 - (bt * betacf(b, a, 1 - x)) / b
}

function tCdf(t, nu) {
  const ib = betai(nu / 2, 0.5, nu / (nu + t * t))
  return t > 0 ? 1 - 0.5 * ib : 0.5 * ib
}

function tPdf(t, nu) {
  const lc = lgamma((nu + 1) / 2) - lgamma(nu / 2) - 0.5 * Math.log(nu * Math.PI)
  return Math.exp(lc - ((nu + 1) / 2) * Math.log(1 + (t * t) / nu))
}

export function normCdf(z) {
  // Abramowitz & Stegun 7.1.26
  const s = z < 0 ? -1 : 1
  const x = Math.abs(z) / Math.SQRT2
  const t = 1 / (1 + 0.3275911 * x)
  const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x)
  return 0.5 * (1 + s * y)
}

function invert(m) {
  const n = m.length
  const a = m.map((r, i) => [...r, ...Array.from({ length: n }, (_, j) => (i === j ? 1 : 0))])
  let logDet = 0
  for (let c = 0; c < n; c++) {
    let p = c
    for (let r = c + 1; r < n; r++) if (Math.abs(a[r][c]) > Math.abs(a[p][c])) p = r
    if (Math.abs(a[p][c]) < 1e-12) return null
    ;[a[c], a[p]] = [a[p], a[c]]
    const piv = a[c][c]
    logDet += Math.log(Math.abs(piv))
    for (let j = 0; j < 2 * n; j++) a[c][j] /= piv
    for (let r = 0; r < n; r++) {
      if (r === c) continue
      const f = a[r][c]
      if (!f) continue
      for (let j = 0; j < 2 * n; j++) a[r][j] -= f * a[c][j]
    }
  }
  return { inv: a.map(r => r.slice(n)), logDet }
}

const mean = v => v.reduce((s, x) => s + x, 0) / v.length
const sd = v => {
  const m = mean(v)
  return Math.sqrt(v.reduce((s, x) => s + (x - m) ** 2, 0) / (v.length - 1))
}

// ---------- AR(1) whitening ----------

function whiten(days, v, phi) {
  const out = new Array(v.length)
  out[0] = v[0]
  for (let i = 1; i < v.length; i++) {
    const rho = Math.pow(phi, days[i] - days[i - 1])
    out[i] = (v[i] - rho * v[i - 1]) / Math.sqrt(1 - rho * rho)
  }
  return out
}

function logDetR(days, phi) {
  let s = 0
  for (let i = 1; i < days.length; i++) {
    const rho = Math.pow(phi, days[i] - days[i - 1])
    s += Math.log(1 - rho * rho)
  }
  return s
}

function fitAtPhi(days, y, cols, phi) {
  const n = y.length
  const p = cols.length
  const wy = whiten(days, y, phi)
  const wx = cols.map(c => whiten(days, c, phi))

  const A = Array.from({ length: p }, () => new Array(p).fill(0))
  const xty = new Array(p).fill(0)
  let yty = 0
  for (let k = 0; k < n; k++) {
    yty += wy[k] * wy[k]
    for (let i = 0; i < p; i++) {
      xty[i] += wx[i][k] * wy[k]
      for (let j = i; j < p; j++) A[i][j] += wx[i][k] * wx[j][k]
    }
  }
  for (let i = 0; i < p; i++) for (let j = 0; j < i; j++) A[i][j] = A[j][i]

  const v0 = [PRIOR.vInt, PRIOR.vEffect, PRIOR.vTrend]
  for (let i = 0; i < p; i++) A[i][i] += 1 / v0[i]

  const r = invert(A)
  if (!r) return null
  const mn = r.inv.map(row => row.reduce((s, x, j) => s + x * xty[j], 0))
  const an = PRIOR.a0 + n / 2
  const bn = PRIOR.b0 + 0.5 * (yty - mn.reduce((s, m, i) => s + m * xty[i], 0))
  if (!(bn > 0)) return null

  const logV0 = v0.reduce((s, v) => s + Math.log(v), 0)
  const logML =
    -0.5 * n * Math.log(2 * Math.PI) - 0.5 * logDetR(days, phi) +
    0.5 * (-r.logDet - logV0) +
    PRIOR.a0 * Math.log(PRIOR.b0) - an * Math.log(bn) + lgamma(an) - lgamma(PRIOR.a0)

  return { phi, logML, m: mn[1], s2: (bn / an) * r.inv[1][1], nu: 2 * an }
}

/**
 * points: [{ day, x, y }] sorted by day, one per day, x is 0 (A) or 1 (B)
 * returns null when there isn't enough data to say anything
 */
export function fitCrossover(points) {
  const n = points.length
  const nA = points.filter(p => p.x === 0).length
  const nB = n - nA
  if (nA < MIN_PER_ARM || nB < MIN_PER_ARM) return null

  const days = points.map(p => p.day)
  const yRaw = points.map(p => p.y)
  const ym = mean(yRaw)
  const sy = sd(yRaw)
  if (!(sy > 1e-9)) return null
  const y = yRaw.map(v => (v - ym) / sy)

  const d0 = mean(days)
  const half = Math.max(1, (days[n - 1] - days[0]) / 2)
  const cols = [new Array(n).fill(1), points.map(p => p.x), days.map(d => (d - d0) / half)]

  const fits = PHI_GRID.map(phi => fitAtPhi(days, y, cols, phi)).filter(Boolean)
  if (!fits.length) return null

  const top = Math.max(...fits.map(f => f.logML))
  const raw = fits.map(f => Math.exp(f.logML - top))
  const tot = raw.reduce((s, w) => s + w, 0)
  const comps = fits.map((f, i) => ({
    w: raw[i] / tot,
    phi: f.phi,
    m: f.m * sy,
    s: Math.sqrt(f.s2) * sy,
    nu: f.nu,
  }))

  const mu = comps.reduce((s, c) => s + c.w * c.m, 0)
  const variance = comps.reduce((s, c) => s + c.w * (c.s * c.s * (c.nu / (c.nu - 2)) + c.m * c.m), 0) - mu * mu

  const cdf = x => comps.reduce((s, c) => s + c.w * tCdf((x - c.m) / c.s, c.nu), 0)
  const pdf = x => comps.reduce((s, c) => s + (c.w * tPdf((x - c.m) / c.s, c.nu)) / c.s, 0)
  const quantile = q => {
    let lo = Math.min(...comps.map(c => c.m - 60 * c.s))
    let hi = Math.max(...comps.map(c => c.m + 60 * c.s))
    for (let i = 0; i < 70; i++) {
      const mid = (lo + hi) / 2
      if (cdf(mid) < q) lo = mid
      else hi = mid
    }
    return (lo + hi) / 2
  }

  const a = points.filter(p => p.x === 0).map(p => p.y)
  const b = points.filter(p => p.x === 1).map(p => p.y)

  return {
    n, nA, nB,
    mean: mu,
    sd: Math.sqrt(variance),
    phi: comps.reduce((s, c) => s + c.w * c.phi, 0),
    meanA: mean(a),
    meanB: mean(b),
    cdf, pdf, quantile,
  }
}
