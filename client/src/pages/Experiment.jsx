import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api } from '../api.js'
import { useToast } from '../components/Toast.jsx'
import Icon from '../components/Icon.jsx'
import ScheduleStrip from '../components/ScheduleStrip.jsx'
import { ConvergenceChart, PosteriorChart, SeriesChart } from '../components/Charts.jsx'
import { localIso, num, pct, shortDate } from '../lib/format.js'

const PHASE_TEXT = {
  A: 'Baseline day. Keep your usual routine.',
  B: 'Intervention day.',
  W: 'Washout day. Nothing special, and today does not count in the analysis.',
}

function Today({ exp, a, onSaved }) {
  const toast = useToast()
  const today = localIso()
  const t = a.progress.today
  const [date, setDate] = useState(today)
  const [val, setVal] = useState('')
  const [busy, setBusy] = useState(false)
  const open = exp.status === 'active'
  const until = Math.round((Date.parse(a.progress.startDate) - Date.parse(today)) / 86400000)

  async function save(e) {
    e.preventDefault()
    const v = Number(val.replace(',', '.'))
    if (val.trim() === '' || !Number.isFinite(v)) return toast('Enter a number', 'bad')
    setBusy(true)
    try {
      await api.put(`/logs/${date}`, { metrics: { [exp.outcome.metric]: v } })
      toast(`Logged ${exp.outcome.label.toLowerCase()} for ${shortDate(date)}`)
      setVal('')
      onSaved()
    } catch (err) {
      toast(err.message, 'bad')
    } finally {
      setBusy(false)
    }
  }

  let line
  if (!open) line = 'This test is closed.'
  else if (t) line = t.phase === 'B' ? `Intervention day. ${exp.intervention.protocol || exp.intervention.name}` : PHASE_TEXT[t.phase]
  else if (until > 0) line = `The first block starts in ${until} day${until > 1 ? 's' : ''}, on ${shortDate(a.progress.startDate)}.`
  else line = 'The schedule has finished. Log any missing days, then make the call.'

  return (
    <div className="panel pad">
      <div className="panel-head"><span className="plate">Today</span></div>
      <div className="today">
        <span className={`ltr ${t && open ? t.phase : 'W'}`}>{t && open ? t.phase : '-'}</span>
        <div className="stack" style={{ gap: 10 }}>
          <p>{line}</p>
          {open && (
            <form className="inline" onSubmit={save}>
              <input type="date" className="input" style={{ width: 160 }} value={date} max={today} onChange={e => e.target.value && setDate(e.target.value)} aria-label="Date of reading" />
              <input className="input nums" style={{ width: 120 }} inputMode="decimal" placeholder={exp.outcome.unit || 'value'} value={val} onChange={e => setVal(e.target.value)} aria-label={exp.outcome.label} />
              <button className="btn sm primary" disabled={busy}>{busy ? 'Saving' : `Log ${exp.outcome.label.toLowerCase()}`}</button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

function Verdict({ exp, a, onChanged }) {
  const toast = useToast()
  const v = a.verdict
  const open = exp.status === 'active'
  const [note, setNote] = useState('')
  const [days, setDays] = useState(Math.min(28, v.moreDays || 4))
  const [busy, setBusy] = useState(false)
  const unit = exp.outcome.unit

  async function act(action) {
    if (action !== 'extend' && !window.confirm(`${action === 'keep' ? 'Keep' : 'Drop'} "${exp.intervention.name}" and close this test?`)) return
    setBusy(true)
    try {
      const body = { action, note }
      if (action === 'extend') body.days = Number(days)
      await api.post(`/experiments/${exp.id}/decision?today=${localIso()}`, body)
      toast(action === 'extend' ? `Extended by ${days} data days` : action === 'keep' ? 'Kept, test closed' : 'Dropped, test closed')
      setNote('')
      onChanged()
    } catch (e) {
      toast(e.message, 'bad')
    } finally {
      setBusy(false)
    }
  }

  async function reopen() {
    setBusy(true)
    try {
      await api.post(`/experiments/${exp.id}/reopen`)
      onChanged()
    } catch (e) {
      toast(e.message, 'bad')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="panel">
      <div className="verdict">
        <div className="verdict-main">
          <span className="plate">Verdict</span>
          <h2 className="vline">{v.headline}</h2>
          <p className="faint">Based on {a.model.n} logged days, {a.model.nA} on baseline and {a.model.nB} on the intervention. The model allows for each day echoing the one before it.</p>
        </div>

        <div className="verdict-side">
          <div className="lamps" aria-label={`Leaning towards ${v.action}`}>
            {['keep', 'extend', 'drop'].map((k, i) => (
              <div key={k} className={`ann ${k} ${v.action === k ? 'lit' : ''}`} style={{ '--i': i }}>{k[0].toUpperCase() + k.slice(1)}</div>
            ))}
          </div>

          <div>
            <div className="meter">
              <i style={{ width: pct(v.pMeaningful) }} />
              <u style={{ left: '10%' }} />
              <u style={{ left: '90%' }} />
            </div>
            <div className="meter-lab"><span>drop below 10%</span><span>keep above 90%</span></div>
            <p className="faint" style={{ marginTop: 8 }}>{pct(v.pMeaningful)} chance the benefit is bigger than {num(v.minEffect)}{unit ? ` ${unit}` : ''}.</p>
          </div>

          {open ? (
            <div className="decide">
              <textarea className="textarea" style={{ minHeight: 56 }} placeholder="Note for the record (optional)" value={note} onChange={e => setNote(e.target.value)} maxLength={400} aria-label="Decision note" />
              <div className="inline">
                <button className="btn sm" onClick={() => act('keep')} disabled={busy}>Keep</button>
                <button className="btn sm danger" onClick={() => act('drop')} disabled={busy}>Drop</button>
              </div>
              <div className="inline">
                <input type="number" min="2" max="28" className="input nums" value={days} onChange={e => setDays(e.target.value)} aria-label="Extra data days" />
                <button className="btn sm primary" onClick={() => act('extend')} disabled={busy || !(days >= 2 && days <= 28)}>Extend by {days} days</button>
              </div>
            </div>
          ) : (
            <div className="decide">
              <p>
                <b>{exp.status === 'kept' ? 'Kept' : 'Dropped'}</b> on {shortDate(exp.decision.at.slice(0, 10))}.
                {exp.decision.note ? ` "${exp.decision.note}"` : ''}
              </p>
              <button className="btn sm" onClick={reopen} disabled={busy}>Reopen test</button>
            </div>
          )}
        </div>
      </div>

      <div className="facts">
        <div className="fact"><div className="v nums">{v.mean >= 0 ? '+' : ''}{num(v.mean, 1)}<small>{unit}</small></div><div className="k">best estimate of benefit</div></div>
        <div className="fact"><div className="v nums">{num(v.i80[0], 1)} to {num(v.i80[1], 1)}</div><div className="k">80% interval</div></div>
        <div className="fact"><div className="v nums">{num(v.i95[0], 1)} to {num(v.i95[1], 1)}</div><div className="k">95% interval</div></div>
        <div className="fact"><div className="v nums">{pct(v.pBenefit)}</div><div className="k">chance it helps at all</div></div>
        <div className="fact"><div className="v nums">{a.model.phi.toFixed(2)}</div><div className="k">day-to-day carry-over</div></div>
      </div>
    </div>
  )
}

export default function Experiment() {
  const { id } = useParams()
  const nav = useNavigate()
  const toast = useToast()
  const [data, setData] = useState(null)
  const [err, setErr] = useState('')

  const load = useCallback(async () => {
    try {
      setData(await api.get(`/experiments/${id}?today=${localIso()}`))
      setErr('')
    } catch (e) {
      setErr(e.status === 404 ? 'That test does not exist.' : e.message)
    }
  }, [id])
  useEffect(() => { setData(null); load() }, [load])

  async function remove() {
    if (!window.confirm('Delete this test? The daily log stays.')) return
    try {
      await api.del(`/experiments/${id}`)
      toast('Test deleted')
      nav('/app', { replace: true })
    } catch (e) {
      toast(e.message, 'bad')
    }
  }

  if (err) return <div className="stack"><div className="form-error">{err}</div><Link to="/app" className="btn" style={{ justifySelf: 'start' }}>Back to board</Link></div>
  if (!data) return <div className="loading"><div className="spinner" /><span>Running the numbers</span></div>

  const { experiment: exp, analysis: a } = data
  const lamp = exp.status === 'kept' ? 'green' : exp.status === 'dropped' ? 'red' : 'amber live'
  const label = exp.status === 'kept' ? 'Kept' : exp.status === 'dropped' ? 'Dropped' : 'Running'
  const today = localIso()

  return (
    <>
      <Link to="/app" className="crumb"><Icon n="back" className="ico" style={{ width: 15 }} /> Board</Link>
      <div className="xhead">
        <div>
          <span className={`lamp ${lamp}`}>{label}</span>
          <h1 style={{ marginTop: 12 }}>{exp.title}</h1>
          {exp.hypothesis && <p className="sub">{exp.hypothesis}</p>}
        </div>
        <button className="btn sm danger" onClick={remove}>Delete test</button>
      </div>

      {a.ready ? (
        <Verdict exp={exp} a={a} onChanged={load} />
      ) : (
        <div className="panel pending">
          <div className="inline" style={{ gap: 22 }}>
            <div className="sweep" />
            <div>
              <span className="plate">Collecting</span>
              <h2 style={{ fontSize: 40, margin: '12px 0 6px' }}>No verdict yet</h2>
              <p className="sub">{a.reason}</p>
            </div>
          </div>
        </div>
      )}

      <div className="charts" style={{ marginTop: 22 }}>
        <Today exp={exp} a={a} onSaved={load} />
      </div>

      {a.ready && (
        <div className="charts two">
          <div className="panel pad">
            <div className="panel-head"><span className="plate">How big is the benefit</span></div>
            <PosteriorChart analysis={a} unit={exp.outcome.unit} />
            <p className="hint" style={{ marginTop: 8 }}>The curve is how plausible each size of benefit is. The amber part is the 80% interval, the grey band is too small to matter.</p>
          </div>
          <div className="panel pad">
            <div className="panel-head"><span className="plate">As the days came in</span></div>
            <ConvergenceChart history={a.history} minEffect={exp.minEffect} unit={exp.outcome.unit} />
            <p className="hint" style={{ marginTop: 8 }}>The band narrows as data piles up. A test is ready when it sits fully on one side of the dashed line.</p>
          </div>
        </div>
      )}

      <div className="charts">
        <div className="panel pad">
          <div className="panel-head">
            <span className="plate">{exp.outcome.label} by day</span>
            <div className="legend">
              <span style={{ '--c': 'var(--frost-2)' }}>Baseline</span>
              <span style={{ '--c': 'var(--amber)' }}>Intervention</span>
            </div>
          </div>
          <SeriesChart rows={a.series} unit={exp.outcome.unit} label={exp.outcome.label} />
        </div>

        <div className="panel pad">
          <div className="panel-head">
            <span className="plate">Schedule</span>
            <span className="faint">
              {a.progress.logged} of {a.progress.dataDays} data days logged
              {a.progress.missing > 0 ? `, ${a.progress.missing} missing so far` : ''}
              {exp.design.extendedDays ? `, extended by ${exp.design.extendedDays}` : ''}
            </span>
          </div>
          <ScheduleStrip rows={a.series} today={today} />
          <div className="legend" style={{ marginTop: 16 }}>
            <span style={{ '--c': 'var(--frost-2)' }}>A baseline</span>
            <span style={{ '--c': 'var(--amber)' }}>B intervention</span>
            <span style={{ '--c': 'var(--seam-2)' }}>W washout</span>
          </div>
        </div>
      </div>
    </>
  )
}
