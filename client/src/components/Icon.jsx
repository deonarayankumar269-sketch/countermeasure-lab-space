const P = {
  board: <><rect x="3" y="3" width="7" height="9" /><rect x="14" y="3" width="7" height="5" /><rect x="14" y="12" width="7" height="9" /><rect x="3" y="16" width="7" height="5" /></>,
  log: <><path d="M4 20h4L19 9l-4-4L4 16v4z" /><path d="M13 7l4 4" /></>,
  flask: <><path d="M9 3h6" /><path d="M10 3v6l-5.5 9.5A2 2 0 0 0 6.2 21h11.6a2 2 0 0 0 1.7-2.5L14 9V3" /><path d="M7.5 15h9" /></>,
  out: <><path d="M15 4h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4" /><path d="M10 8l-4 4 4 4" /><path d="M6 12h10" /></>,
  go: <path d="M5 12h13M13 6l6 6-6 6" />,
  back: <path d="M19 12H6M11 6l-6 6 6 6" />,
  plus: <path d="M12 5v14M5 12h14" />,
  up: <><path d="M12 16V4M7 9l5-5 5 5" /><path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" /></>,
}

export default function Icon({ n, className = '' }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      {P[n]}
    </svg>
  )
}

export function Mark({ className = '' }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <circle cx="16" cy="16" r="5.5" fill="none" stroke="#e4ece5" strokeWidth="2" />
      <g className="orb">
        <ellipse cx="16" cy="16" rx="13.5" ry="5" fill="none" stroke="#eaa83c" strokeWidth="1.5" transform="rotate(-24 16 16)" />
      </g>
    </svg>
  )
}
