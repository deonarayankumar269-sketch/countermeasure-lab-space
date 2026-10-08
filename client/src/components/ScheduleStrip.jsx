export default function ScheduleStrip({ rows, today }) {
  return (
    <div className="strip">
      {rows.map((r, i) => {
        const fut = r.date > today
        const got = r.phase !== 'W' && r.value != null
        const gap = r.phase !== 'W' && !fut && r.value == null && r.date !== today
        return (
          <div key={r.date} title={`${r.date}, ${r.phase === 'W' ? 'washout' : r.phase === 'A' ? 'baseline' : 'intervention'}`}
            className={`cell ${r.phase} ${fut ? 'fut' : ''} ${r.date === today ? 'now' : ''} ${gap ? 'gap' : ''}`} style={{ '--i': i }}>
            <b>{r.phase === 'W' ? 'W' : r.phase}</b>
            <small>{Number(r.date.slice(8))}</small>
            {(got || gap) && <span className="got" />}
          </div>
        )
      })}
    </div>
  )
}
