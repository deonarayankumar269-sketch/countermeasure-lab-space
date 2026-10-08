const C = 300
const R = 150
const orbitPath = (rx, ry) => `M${C - rx},${C} a${rx},${ry} 0 1,0 ${2 * rx},0 a${rx},${ry} 0 1,0 ${-2 * rx},0`

const ORBITS = [
  { id: 'o1', rx: 255, ry: 74, rot: -18, dur: 28, sats: [{ at: 0, tag: 'C1' }, { at: 0.5, tag: 'C2' }] },
  { id: 'o2', rx: 228, ry: 124, rot: 27, dur: 38, sats: [{ at: 0.2, tag: 'C3' }, { at: 0.72, tag: 'C4' }] },
  { id: 'o3', rx: 290, ry: 46, rot: -4, dur: 50, sats: [{ at: 0.4, tag: 'C5' }] },
]
const LATS = [-62, -34, 0, 34, 62]

export default function Globe({ className = '' }) {
  return (
    <div className={`globe-wrap ${className}`} aria-hidden="true">
      <svg className="globe" viewBox="0 0 600 600">
        <defs>
          <radialGradient id="planet" cx="36%" cy="30%" r="80%">
            <stop offset="0%" stopColor="#22342d" />
            <stop offset="70%" stopColor="#101b17" />
            <stop offset="100%" stopColor="#0a120f" />
          </radialGradient>
        </defs>

        {[0, 1, 2].map(k => <circle key={k} className="pulse" cx={C} cy={C} r={R} style={{ '--k': k }} />)}

        {ORBITS.map(o => (
          <g key={o.id} transform={`rotate(${o.rot} ${C} ${C})`}>
            <path id={o.id} className="ring" d={orbitPath(o.rx, o.ry)} />
          </g>
        ))}

        <circle cx={C} cy={C} r={R} fill="url(#planet)" stroke="#2a3d36" strokeWidth="1" />
        {LATS.map(l => {
          const rad = (l * Math.PI) / 180
          const rx = R * Math.cos(rad)
          return <ellipse key={l} cx={C} cy={C + R * Math.sin(rad) * 0.96} rx={rx} ry={rx * 0.2} fill="none" stroke="#2f453c" strokeWidth="1" />
        })}
        {[0, 1, 2, 3, 4, 5].map(k => (
          <ellipse key={k} className="mer" style={{ '--k': k }} cx={C} cy={C} rx={R} ry={R} fill="none" stroke="#2f453c" strokeWidth="1" />
        ))}

        <circle cx={C} cy={C} r={R} fill="none" stroke="#eaa83c" strokeOpacity="0.14" strokeWidth="9" strokeDasharray="250 700" transform={`rotate(-158 ${C} ${C})`} />
        <circle cx={C} cy={C} r={R} fill="none" stroke="#eaa83c" strokeWidth="2.2" strokeDasharray="250 700" transform={`rotate(-158 ${C} ${C})`} />

        {ORBITS.map(o => (
          <g key={o.id + 's'} transform={`rotate(${o.rot} ${C} ${C})`}>
            {o.sats.map(s => (
              <g key={s.tag}>
                <rect x="-3.5" y="-3.5" width="7" height="7" fill="#e4ece5" />
                <text x="10" y="4">{s.tag}</text>
                <animateMotion dur={`${o.dur}s`} begin={`-${(o.dur * s.at).toFixed(2)}s`} repeatCount="indefinite">
                  <mpath href={`#${o.id}`} />
                </animateMotion>
              </g>
            ))}
          </g>
        ))}
      </svg>
    </div>
  )
}
