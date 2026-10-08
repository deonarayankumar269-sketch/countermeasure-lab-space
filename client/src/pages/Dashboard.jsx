import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../api.js'
import { useAuth } from '../auth/AuthContext.jsx'
import { useToast } from '../components/Toast.jsx'
import CountUp from '../components/CountUp.jsx'
import Icon from '../components/Icon.jsx'
import { localIso, pct } from '../lib/format.js'

const WORD = { keep: 'Keep', extend: 'Extend', drop: 'Drop' }

function Row({ x, i }) {
  const b = x.brief
  const p = b.progress
  const t = p.today?.phase
  const done = x.status !== 'active'
  const lamp = x.status === 'kept' ? 'green' : x.status === 'dropped' ? 'red' : 'amber live'
  const label = x.status === 'kept' ? 'Kept' : x.status === 'dropped' ? 'Dropped' : 'Running'
  return (
    <Link to={`/app/experiments/${x.id}`} className="panel xp" style={{ '--i': i }}>
      <div className="xp-phase">
        <span className={`ltr ${t || 'W'}`}>{done ? '-' : t || (p.over ? '-' : 'W')}</span>
        <small>{done ? 'closed' : t ? 'today' : p.over ? 'finished' : 'rest day'}</small>
      </div>
      <div className="xp-main">
        <span className={`lamp ${lamp}`}>{label}</span>
        <h3>{x.title}</h3>
        <p>{b.ready ? b.headline : b.reason}</p>
      </div>
      <div className="xp-side">
        {b.ready ? (
          <>
            <div>
              <div className="meter"><i style={{ width: pct(b.pMeaningful) }} /><u style={{ left: '90%' }} /></div>
              <div className="meter-lab"><span>{pct(b.pMeaningful)} sure it matters</span><span>90% to call it</span></div>
            </div>
            <span className="lab">Leaning: <b style={{ color: 'var(--frost)' }}>{WORD[b.action]}</b></span>
          </>
        ) : (
          <span className="faint">{p.logged} of {p.dataDays} data days logged</span>
        )}
      </div>
    </Link>
  )
}

export default function Dashboard() {
  const { user } = useAuth()
  const toast = useToast()
  const nav = useNavigate()
  const [list, setList] = useState(null)
  const [meta, setMeta] = useState({ days: 0 })
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    try {
      const [a, b] = await Promise.all([api.get(`/experiments?today=${localIso()}`), api.get('/logs/metrics')])
      setList(a.experiments)
      setMeta(b)
    } catch (e) {
      setErr(e.message)
    }
  }, [])
  useEffect(() => { load() }, [load])

  async function demo() {
    setBusy(true)
    try {
      const d = await api.post(`/demo/load?today=${localIso()}`)
      toast('Sample mission loaded')
      nav(`/app/experiments/${d.experimentId}`)
    } catch (e) {
      toast(e.message, 'bad')
      setBusy(false)
    }
  }

  if (err) return <div className="form-error">{err}</div>
  if (!list) return <div className="loading"><div className="spinner" /><span>Loading the board</span></div>

  const active = list.filter(x => x.status === 'active')
  const closed = list.length - active.length
  const hello = user.callsign || user.name.split(' ')[0]

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Board, {hello}</h1>
          <p className="sub">Every test you are running, and what the data says about each one today.</p>
        </div>
        <Link to="/app/new" className="btn primary"><Icon n="plus" className="ico" /> New test</Link>
      </div>

      <div className="panel stats">
        <div className="stat"><div className="n"><CountUp value={active.length} /></div><div className="l">tests running</div></div>
        <div className="stat"><div className="n"><CountUp value={closed} /></div><div className="l">decisions made</div></div>
        <div className="stat"><div className="n"><CountUp value={meta.days} /></div><div className="l">days in your log</div></div>
        <div className="stat"><div className="n"><CountUp value={meta.metrics?.length || 0} /></div><div className="l">metrics tracked</div></div>
      </div>

      {list.length === 0 ? (
        <div className="panel empty" style={{ marginTop: 22 }}>
          <span className="plate">No tests yet</span>
          <h3>Pick something to test</h3>
          <p className="sub">Design a randomized test for a countermeasure or habit, or load a sample mission to see a finished-looking result first.</p>
          <div className="inline" style={{ justifyContent: 'center' }}>
            <Link to="/app/new" className="btn primary">Design a test</Link>
            <button className="btn" onClick={demo} disabled={busy}>{busy ? 'Loading' : 'Load sample mission'}</button>
          </div>
        </div>
      ) : (
        <div className="xlist">{list.map((x, i) => <Row key={x.id} x={x} i={i} />)}</div>
      )}
    </>
  )
}
