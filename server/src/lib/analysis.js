import { fitCrossover, MIN_PER_ARM } from './stats.js'
import { decide } from './verdict.js'
import { dayNum, todayIso } from './dates.js'

const clean = v => (typeof v === 'number' && Number.isFinite(v) ? v : null)

export function buildAnalysis(exp, logs, today = todayIso()) {
  const metric = exp.outcome.metric
  const dir = exp.outcome.higherIsBetter ? 1 : -1
  const byDate = new Map(logs.map(l => [l.date, l.metrics || {}]))

  const series = exp.schedule.map(s => ({
    date: s.date,
    phase: s.phase,
    period: s.period,
    value: clean(byDate.get(s.date)?.[metric]),
  }))
  const data = series.filter(r => r.phase !== 'W')
  const used = data.filter(r => r.value !== null)
  const expected = data.filter(r => r.date <= today).length
  const nA = used.filter(r => r.phase === 'A').length
  const nB = used.length - nA

  const progress = {
    totalDays: series.length,
    dataDays: data.length,
    elapsedDays: series.filter(r => r.date <= today).length,
    expected,
    logged: used.length,
    missing: Math.max(0, expected - used.filter(r => r.date <= today).length),
    nA, nB,
    startDate: series[0].date,
    endDate: series[series.length - 1].date,
    today: series.find(r => r.date === today) || null,
    over: today > series[series.length - 1].date,
  }

  const points = used.map(r => ({ day: dayNum(r.date), x: r.phase === 'B' ? 1 : 0, y: r.value }))
  const model = fitCrossover(points)
  if (!model) {
    return {
      ready: false,
      progress,
      series,
      reason: `Need at least ${MIN_PER_ARM} logged days on each condition. So far ${nA} on A and ${nB} on B.`,
    }
  }

  const verdict = decide(model, exp)

  // density, flipped into benefit orientation so "right" always means better
  const delta = exp.minEffect
  const lo2 = Math.min(model.quantile(0.002), -delta * 1.5)
  const hi = Math.max(model.quantile(0.998), delta * 1.5)
  let xs = [], ys = []
  const steps = 140
  for (let i = 0; i <= steps; i++) {
    const x = lo2 + ((hi - lo2) * i) / steps
    xs.push(x)
    ys.push(model.pdf(x))
  }
  if (dir === -1) {
    xs = xs.map(x => -x).reverse()
    ys = ys.reverse()
  }

  // how the estimate moved as days came in
  const history = []
  const stride = Math.max(1, Math.floor(points.length / 28))
  for (let k = points.length; k >= 2 * MIN_PER_ARM; k -= stride) {
    const m = fitCrossover(points.slice(0, k))
    if (!m) continue
    const a = m.quantile(0.1), b = m.quantile(0.9)
    history.push({
      n: k,
      date: used[k - 1].date,
      mean: dir * m.mean,
      lo: dir === 1 ? a : -b,
      hi: dir === 1 ? b : -a,
    })
  }
  history.reverse()

  return {
    ready: true,
    progress,
    series,
    verdict,
    density: { x: xs, y: ys },
    history,
    model: {
      n: model.n, nA: model.nA, nB: model.nB,
      phi: model.phi,
      meanA: model.meanA, meanB: model.meanB,
      rawEffect: model.mean,
    },
  }
}

export function briefOf(a) {
  if (!a.ready) return { ready: false, reason: a.reason, progress: a.progress }
  const v = a.verdict
  return { ready: true, action: v.action, headline: v.headline, pMeaningful: v.pMeaningful, mean: v.mean, progress: a.progress }
}
