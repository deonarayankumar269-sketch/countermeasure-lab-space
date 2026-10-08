import { useId, useState } from 'react'
import { num, shortDate } from '../lib/format.js'

const uid = raw => raw.replace(/[^a-zA-Z0-9]/g, '')

function niceTicks(min, max, n = 5) {
  const span = max - min || 1
  const raw = span / n
  const mag = 10 ** Math.floor(Math.log10(raw))
  const step = [1, 2, 2.5, 5, 10].map(m => m * mag).find(s => s >= raw)
  const out = []
  for (let v = Math.ceil(min / step) * step; v <= max + 1e-9; v += step) out.push(+v.toFixed(10))
  return out
}

function Wipe({ id, x, y, w, h, dur = 1.5 }) {
  return (
    <clipPath id={id}>
      <rect x={x} y={y} width="0" height={h}>
        <animate attributeName="width" from="0" to={w} dur={`${dur}s`} fill="freeze" calcMode="spline" keyTimes="0;1" keySplines="0.22 1 0.36 1" />
      </rect>
    </clipPath>
  )
}

const unitOf = u => (u ? ` ${u}` : '')

/* how likely is each size of benefit */
export function PosteriorChart({ analysis, unit }) {
  const id = uid(useId())
  const { density, verdict: v } = analysis
  const W = 820, H = 270, L = 16, R = 16, T = 24, B = 44
  const xs = density.x, ys = density.y
  const x0 = xs[0], x1 = xs[xs.length - 1]
  const ymax = Math.max(...ys) * 1.08
  const px = d => L + ((d - x0) / (x1 - x0)) * (W - L - R)
  const py = d => T + (1 - d / ymax) * (H - T - B)
  const yb = py(0)
  const pts = xs.map((x, i) => `${px(x).toFixed(1)},${py(ys[i]).toFixed(1)}`)
  const line = 'M' + pts.join('L')
  const area = `M${px(x0)},${yb}L${pts.join('L')}L${px(x1)},${yb}Z`
  const ticks = niceTicks(x0, x1, 6)
  const d = v.minEffect

  return (
    <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Probability of each benefit size">
      <defs>
        <Wipe id={`${id}w`} x={0} y={0} w={W} h={H} />
        <clipPath id={`${id}i`}><rect x={px(v.i80[0])} y="0" width={Math.max(1, px(v.i80[1]) - px(v.i80[0]))} height={H} /></clipPath>
      </defs>
      <rect className="rope" x={px(-d)} y={T} width={px(d) - px(-d)} height={yb - T} />
      {ticks.map(t => <line key={t} className="tick" x1={px(t)} x2={px(t)} y1={T} y2={yb} />)}
      <g clipPath={`url(#${id}w)`}>
        <path className="area" d={area} />
        <path className="area-hi" d={area} clipPath={`url(#${id}i)`} />
        <path className="curve" d={line} />
        <line className="mean" x1={px(v.mean)} x2={px(v.mean)} y1={T - 6} y2={yb} />
      </g>
      <line className="zero" x1={px(0)} x2={px(0)} y1={T} y2={yb} />
      <line className="thr" x1={px(d)} x2={px(d)} y1={T - 6} y2={yb} />
      <line className="domain" x1={L} x2={W - R} y1={yb} y2={yb} />
      {ticks.map(t => <text key={t} x={px(t)} y={yb + 17} textAnchor="middle">{num(t)}</text>)}
      <text x={px(d) + 6} y={T - 10}>{`worth keeping above ${num(d)}${unitOf(unit)}`}</text>
      <text x={px(0) - 6} y={T + 12} textAnchor="end">no effect</text>
      <text x={W - R} y={H - 6} textAnchor="end">Benefit{unit ? ` (${unit})` : ''}, further right is better</text>
    </svg>
  )
}

/* raw readings across the schedule, shaded by condition */
export function SeriesChart({ rows, unit, label }) {
  const id = uid(useId())
  const [hover, setHover] = useState(null)
  const W = 900, H = 300, L = 46, R = 14, T = 30, B = 34
  const n = rows.length
  const vals = rows.filter(r => r.value != null).map(r => r.value)
  if (!vals.length) return <p className="faint">No readings in this window yet.</p>

  let lo = Math.min(...vals), hi = Math.max(...vals)
  const pad = (hi - lo || 1) * 0.12
  lo -= pad; hi += pad
  const px = i => L + ((i + 0.5) / n) * (W - L - R)
  const edge = i => L + (i / n) * (W - L - R)
  const py = v => T + (1 - (v - lo) / (hi - lo)) * (H - T - B)

  const bands = []
  rows.forEach((r, i) => {
    const last = bands[bands.length - 1]
    if (last && last.phase === r.phase && last.period === r.period) last.i1 = i
    else bands.push({ phase: r.phase, period: r.period, i0: i, i1: i })
  })
  bands.forEach(b => {
    const v = rows.slice(b.i0, b.i1 + 1).filter(r => r.value != null).map(r => r.value)
    b.mean = v.length ? v.reduce((s, x) => s + x, 0) / v.length : null
  })

  let path = ''
  for (const b of bands) {
    if (b.phase === 'W') continue
    let started = false
    for (let i = b.i0; i <= b.i1; i++) {
      if (rows[i].value == null) continue
      path += `${started ? 'L' : 'M'}${px(i).toFixed(1)},${py(rows[i].value).toFixed(1)}`
      started = true
    }
  }

  const ticks = niceTicks(lo, hi, 4)
  const labelEvery = Math.max(1, Math.ceil(n / 10))
  const onMove = e => {
    const r = e.currentTarget.getBoundingClientRect()
    const sx = ((e.clientX - r.left) / r.width) * W
    const i = Math.min(n - 1, Math.max(0, Math.floor(((sx - L) / (W - L - R)) * n)))
    setHover(i)
  }
  const h = hover != null ? rows[hover] : null

  return (
    <div className="chart-box">
      <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${label} readings by day`} onMouseMove={onMove} onMouseLeave={() => setHover(null)}>
        <defs>
          <pattern id={`${id}h`} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="6" stroke="#3d554b" strokeWidth="1" />
          </pattern>
        </defs>
        {bands.map((b, k) => (
          <g key={k}>
            <rect className={b.phase === 'A' ? 'a' : b.phase === 'B' ? 'b' : ''} fill={b.phase === 'W' ? `url(#${id}h)` : undefined}
              x={edge(b.i0)} y={T} width={edge(b.i1 + 1) - edge(b.i0)} height={H - T - B} />
            {b.phase !== 'W' && (
              <text className={b.phase === 'A' ? 'lab-a' : 'lab-b'} x={(edge(b.i0) + edge(b.i1 + 1)) / 2} y={T - 10} textAnchor="middle">
                {b.phase === 'A' ? 'A baseline' : 'B intervention'}
              </text>
            )}
          </g>
        ))}
        {ticks.map(t => (
          <g key={t}>
            <line className="tick" x1={L} x2={W - R} y1={py(t)} y2={py(t)} />
            <text x={L - 8} y={py(t) + 4} textAnchor="end">{num(t)}</text>
          </g>
        ))}
        {bands.filter(b => b.phase !== 'W' && b.mean != null).map((b, k) => (
          <line key={k} x1={edge(b.i0) + 3} x2={edge(b.i1 + 1) - 3} y1={py(b.mean)} y2={py(b.mean)} stroke={b.phase === 'B' ? '#eaa83c' : '#b3c4b9'} strokeWidth="2" strokeDasharray="5 4" opacity="0.9" />
        ))}
        <path className="line" d={path} pathLength="1" />
        {rows.map((r, i) => r.value != null && r.phase !== 'W' && (
          <circle key={i} className={`pt ${r.phase}`} style={{ '--i': i }} cx={px(i)} cy={py(r.value)} r="3.6" />
        ))}
        {rows.map((r, i) => i % labelEvery === 0 && <text key={'x' + i} x={px(i)} y={H - 10} textAnchor="middle">{shortDate(r.date)}</text>)}
        {h && <line className="hover-line" x1={px(hover)} x2={px(hover)} y1={T} y2={H - B} />}
      </svg>
      {h && (
        <div className="tip" style={{ left: `${(px(hover) / W) * 100}%`, top: `${((h.value != null ? py(h.value) : T) / H) * 100}%` }}>
          {shortDate(h.date)}, {h.phase === 'W' ? 'washout' : h.phase === 'A' ? 'baseline' : 'intervention'}
          {h.value != null ? `: ${num(h.value, 1)}${unitOf(unit)}` : h.phase === 'W' ? '' : ': not logged'}
        </div>
      )}
    </div>
  )
}

/* the 80% interval as days of data came in */
export function ConvergenceChart({ history, minEffect, unit }) {
  const id = uid(useId())
  if (history.length < 2) return <p className="faint">Needs a few more logged days to show the trend.</p>
  const W = 560, H = 260, L = 46, R = 14, T = 16, B = 38
  const n0 = history[0].n, n1 = history[history.length - 1].n
  const lo = Math.min(0, ...history.map(h => h.lo)) 
  const hi = Math.max(minEffect * 1.3, ...history.map(h => h.hi))
  const pad = (hi - lo) * 0.08
  const y0 = lo - pad, y1 = hi + pad
  const px = n => L + ((n - n0) / (n1 - n0 || 1)) * (W - L - R)
  const py = v => T + (1 - (v - y0) / (y1 - y0)) * (H - T - B)
  const upper = history.map(h => `${px(h.n).toFixed(1)},${py(h.hi).toFixed(1)}`)
  const lower = history.map(h => `${px(h.n).toFixed(1)},${py(h.lo).toFixed(1)}`).reverse()
  const mean = 'M' + history.map(h => `${px(h.n).toFixed(1)},${py(h.mean).toFixed(1)}`).join('L')
  const ticks = niceTicks(y0, y1, 4)
  const last = history[history.length - 1]

  return (
    <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Estimate over time">
      <defs><Wipe id={`${id}w`} x={0} y={0} w={W} h={H} dur={1.8} /></defs>
      {ticks.map(t => (
        <g key={t}>
          <line className="tick" x1={L} x2={W - R} y1={py(t)} y2={py(t)} />
          <text x={L - 8} y={py(t) + 4} textAnchor="end">{num(t)}</text>
        </g>
      ))}
      <line className="zero" x1={L} x2={W - R} y1={py(0)} y2={py(0)} />
      <line className="thr" x1={L} x2={W - R} y1={py(minEffect)} y2={py(minEffect)} />
      <text x={W - R} y={py(minEffect) - 6} textAnchor="end">{`worth keeping: ${num(minEffect)}${unitOf(unit)}`}</text>
      <g clipPath={`url(#${id}w)`}>
        <path className="bandfill" d={`M${upper.join('L')}L${lower.join('L')}Z`} />
        <path className="line amber" d={mean} pathLength="1" style={{ animation: 'none', strokeDasharray: 'none', strokeDashoffset: 0 }} />
        <circle cx={px(last.n)} cy={py(last.mean)} r="4.5" fill="#eaa83c" />
      </g>
      <line className="domain" x1={L} x2={W - R} y1={H - B} y2={H - B} />
      <text x={L} y={H - 12}>{n0} days logged</text>
      <text x={W - R} y={H - 12} textAnchor="end">{n1} days logged</text>
    </svg>
  )
}
