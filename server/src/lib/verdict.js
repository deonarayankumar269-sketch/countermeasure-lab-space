import { normCdf } from './stats.js'

// keep when we're 90% sure the benefit is bigger than the smallest effect worth caring about,
// drop when we're 90% sure it isn't, otherwise keep testing.
export const CONFIDENCE = 0.9

export function fmt(v) {
  const a = Math.abs(v)
  const s = a >= 10 ? Math.round(v).toString() : (Math.round(v * 10) / 10).toString()
  return s === '-0' ? '0' : s
}

const soft = t => t.replace(/^([A-Z])([a-z])/, (_, a, b) => a.toLowerCase() + b)

function pair(lo, hi) {
  if (Math.max(Math.abs(lo), Math.abs(hi)) >= 10) return `${Math.round(lo)} to ${Math.round(hi)}`
  return `${fmt(lo)} to ${fmt(hi)}`
}

function daysToResolve(mu, sd, n, delta) {
  for (let k = 1; k <= 60; k++) {
    const s = sd * Math.sqrt(n / (n + k))
    const p = normCdf((mu - delta) / s)
    if (p >= CONFIDENCE || p <= 1 - CONFIDENCE) return k
  }
  return null
}

// everything below is in "benefit" orientation: positive always means better for the person
export function decide(model, exp) {
  const dir = exp.outcome.higherIsBetter ? 1 : -1
  const delta = exp.minEffect
  const above = x => (dir === 1 ? 1 - model.cdf(x) : model.cdf(-x)) // P(benefit > x)

  const q = p => {
    const lo = model.quantile(p)
    const hi = model.quantile(1 - p)
    return dir === 1 ? [lo, hi] : [-hi, -lo]
  }
  const mean = dir * model.mean
  const i80 = q(0.1)
  const i95 = q(0.025)

  const pBenefit = above(0)
  const pMeaningful = above(delta)
  const pHarm = 1 - above(-delta)
  const pNegligible = Math.max(0, above(-delta) - above(delta))

  let action = 'extend'
  if (pMeaningful >= CONFIDENCE) action = 'keep'
  else if (pMeaningful <= 1 - CONFIDENCE) action = 'drop'

  const more = action === 'extend' ? daysToResolve(mean, model.sd, model.n, delta) : null
  const unit = exp.outcome.unit ? ' ' + exp.outcome.unit : ''
  const label = soft(exp.outcome.label)
  const name = exp.intervention.name

  let verb = null
  if (Math.abs(mean) >= delta * 0.25) verb = mean > 0 ? 'improved' : 'worsened'
  let [lo, hi] = i80
  let size = mean
  if (verb === 'worsened') {
    size = -mean
    ;[lo, hi] = [-hi, -lo]
  }

  const range = `80% interval ${pair(lo, hi)}${unit}`
  const head = verb
    ? `${name} ${verb} ${label} by about ${fmt(size)}${unit}, ${range}`
    : `${name} showed no clear effect on ${label}, ${range}`

  let tail
  if (action === 'keep') tail = 'conclusive, keep it.'
  else if (action === 'drop') tail = pHarm >= CONFIDENCE ? 'conclusive, it looks worse than baseline, drop it.' : 'conclusive, no meaningful benefit, drop it.'
  else if (more) tail = `not conclusive yet, run ${Math.max(2, more)} more days.`
  else tail = 'not conclusive, and more days are unlikely to settle it. Drop it or accept the uncertainty.'

  return {
    action,
    headline: `${head}, ${tail}`,
    mean, i80, i95,
    pBenefit, pMeaningful, pHarm, pNegligible,
    minEffect: delta,
    confidence: CONFIDENCE,
    moreDays: more ? Math.max(2, more) : null,
    unit: exp.outcome.unit || '',
  }
}
