import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { api } from '../api.js'
import { useToast } from '../components/Toast.jsx'
import Icon from '../components/Icon.jsx'
import { PRESETS, localIso, metricKey, num } from '../lib/format.js'
import { parseCsv, toIsoDate } from '../lib/csv.js'

function Importer({ onDone }) {
  const toast = useToast()
  const fileRef = useRef(null)
  const [parsed, setParsed] = useState(null)
  const [dateCol, setDateCol] = useState(0)
  const [cols, setCols] = useState({})
  const [over, setOver] = useState(false)
  const [busy, setBusy] = useState(false)

  async function read(file) {
    if (!file) return
    if (file.size > 2_000_000) return toast('That file is over 2 MB', 'bad')
    const p = parseCsv(await file.text())
    if (p.headers.length < 2 || !p.rows.length) return toast('Could not find a header row with data under it', 'bad')
    const di = Math.max(0, p.headers.findIndex(h => /date|day|time/i.test(h)))
    const c = {}
    p.headers.forEach((h, i) => {
      const vals = p.rows.slice(0, 40).map(r => r[i]).filter(v => v !== '' && v != null)
      const numeric = vals.length > 0 && vals.filter(v => Number.isFinite(Number(String(v).replace(',', '.')))).length / vals.length >= 0.6
      c[i] = { on: i !== di && numeric, key: metricKey(h) }
    })
    setParsed(p)
    setDateCol(di)
    setCols(c)
  }

  const picks = useMemo(() => Object.entries(cols).filter(([i, c]) => c.on && Number(i) !== dateCol), [cols, dateCol])
  const keysOk = picks.length > 0 && picks.every(([, c]) => /^[a-zA-Z][a-zA-Z0-9_]{0,39}$/.test(c.key))

  async function run() {
    const byDate = new Map()
    let bad = 0
    for (const r of parsed.rows) {
      const date = toIsoDate(r[dateCol])
      if (!date) { bad++; continue }
      const m = byDate.get(date) || {}
      for (const [i, c] of picks) {
        const raw = r[i]
        if (raw === '' || raw == null) continue
        const v = Number(String(raw).replace(',', '.'))
        if (Number.isFinite(v)) m[c.key] = v
      }
      if (Object.keys(m).length) byDate.set(date, m)
    }
    const rows = [...byDate].map(([date, metrics]) => ({ date, metrics }))
    if (!rows.length) return toast('No usable rows. Check the date column.', 'bad')
    setBusy(true)
    try {
      for (let i = 0; i < rows.length; i += 1000) await api.post('/logs/bulk', { rows: rows.slice(i, i + 1000), source: 'csv' })
      toast(`Imported ${rows.length} days${bad ? `, skipped ${bad} rows with unreadable dates` : ''}`)
      setParsed(null)
      onDone()
    } catch (e) {
      toast(e.message, 'bad')
    } finally {
      setBusy(false)
    }
  }

  if (!parsed) {
    return (
      <div
        className={`drop ${over ? 'over' : ''}`}
        onDragOver={e => { e.preventDefault(); setOver(true) }}
        onDragLeave={() => setOver(false)}
        onDrop={e => { e.preventDefault(); setOver(false); read(e.dataTransfer.files[0]) }}
      >
        <Icon n="up" className="ico" />
        <b>Drop a wearable CSV here</b>
        <span className="hint">Any export with one date column and numeric columns. Several rows on one day are merged.</span>
        <div className="inline">
          <button className="btn sm" onClick={() => fileRef.current.click()}>Choose file</button>
          <a className="btn sm" href="/sample-wearable.csv" download>Sample file</a>
        </div>
        <input ref={fileRef} type="file" accept=".csv,.tsv,.txt,text/csv" hidden onChange={e => { read(e.target.files[0]); e.target.value = '' }} />
      </div>
    )
  }

  return (
    <div className="stack">
      <div className="field">
        <label htmlFor="dc">Date column</label>
        <select id="dc" className="select" value={dateCol} onChange={e => setDateCol(Number(e.target.value))}>
          {parsed.headers.map((h, i) => <option key={i} value={i}>{h || `Column ${i + 1}`}</option>)}
        </select>
        <span className="hint">First value: {parsed.rows[0][dateCol]} reads as {toIsoDate(parsed.rows[0][dateCol]) || 'an unreadable date'}</span>
      </div>
      <div className="map">
        <span className="lab">Columns to import, and the metric name each one gets</span>
        {parsed.headers.map((h, i) => i !== dateCol && (
          <div className="map-row" key={i}>
            <input type="checkbox" checked={!!cols[i]?.on} onChange={e => setCols(c => ({ ...c, [i]: { ...c[i], on: e.target.checked } }))} aria-label={`Import ${h}`} />
            <span>{h}</span>
            <input className="input" style={{ minHeight: 34, padding: '4px 10px' }} value={cols[i]?.key || ''} disabled={!cols[i]?.on}
              onChange={e => setCols(c => ({ ...c, [i]: { ...c[i], key: e.target.value.replace(/[^a-zA-Z0-9_]/g, '') } }))} />
          </div>
        ))}
      </div>
      <div className="inline">
        <button className="btn primary" onClick={run} disabled={!keysOk || busy}>{busy ? 'Importing' : `Import ${parsed.rows.length} rows`}</button>
        <button className="btn" onClick={() => setParsed(null)}>Cancel</button>
      </div>
    </div>
  )
}

export default function Logs() {
  const toast = useToast()
  const [logs, setLogs] = useState(null)
  const [date, setDate] = useState(localIso())
  const [vals, setVals] = useState({})
  const [custom, setCustom] = useState({ key: '', value: '' })
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    try {
      const to = localIso()
      const from = localIso(new Date(Date.now() - 120 * 86400000))
      setLogs((await api.get(`/logs?from=${from}&to=${to}`)).logs)
    } catch (e) {
      toast(e.message, 'bad')
      setLogs([])
    }
  }, [toast])
  useEffect(() => { load() }, [load])

  useEffect(() => {
    const hit = logs?.find(l => l.date === date)
    const next = {}
    if (hit) for (const [k, v] of Object.entries(hit.metrics || {})) next[k] = String(v)
    setVals(next)
  }, [date, logs])

  const keys = useMemo(() => {
    const count = {}
    for (const l of logs || []) for (const k of Object.keys(l.metrics || {})) count[k] = (count[k] || 0) + 1
    return Object.keys(count).sort((a, b) => count[b] - count[a]).slice(0, 6)
  }, [logs])

  const fieldKeys = useMemo(() => {
    const extra = Object.keys(vals).filter(k => !PRESETS.some(p => p.key === k))
    return [...PRESETS.map(p => p.key), ...extra]
  }, [vals])

  async function save(e) {
    e.preventDefault()
    const metrics = {}
    for (const k of fieldKeys) {
      const raw = (vals[k] ?? '').trim()
      if (raw !== '') {
        const v = Number(raw.replace(',', '.'))
        if (!Number.isFinite(v)) return toast(`${k} is not a number`, 'bad')
        metrics[k] = v
      } else if (logs?.find(l => l.date === date)?.metrics?.[k] !== undefined) metrics[k] = null
    }
    if (custom.key) {
      const v = Number(custom.value.replace(',', '.'))
      if (!/^[a-zA-Z][a-zA-Z0-9_]{0,39}$/.test(custom.key) || !Number.isFinite(v)) return toast('Custom metric needs a name with letters and digits and a number', 'bad')
      metrics[custom.key] = v
    }
    if (!Object.keys(metrics).length) return toast('Enter at least one value', 'bad')
    setBusy(true)
    try {
      await api.put(`/logs/${date}`, { metrics })
      setCustom({ key: '', value: '' })
      toast(`Saved ${date}`)
      await load()
    } catch (err) {
      toast(err.message, 'bad')
    } finally {
      setBusy(false)
    }
  }

  async function remove(d) {
    if (!window.confirm(`Delete the log for ${d}?`)) return
    try {
      await api.del(`/logs/${d}`)
      await load()
    } catch (e) {
      toast(e.message, 'bad')
    }
  }

  const label = k => PRESETS.find(p => p.key === k)?.label || k
  const unit = k => PRESETS.find(p => p.key === k)?.unit || ''

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Daily log</h1>
          <p className="sub">One row per day. Every test reads its outcome from here, so log once and every running test sees it.</p>
        </div>
      </div>

      <div className="split">
        <div className="stack">
          <form className="panel pad stack" onSubmit={save}>
            <div className="panel-head" style={{ marginBottom: 0 }}><span className="plate">Enter a day</span></div>
            <div className="field">
              <label htmlFor="d">Date</label>
              <input id="d" type="date" className="input" value={date} max={localIso()} onChange={e => e.target.value && setDate(e.target.value)} />
            </div>
            <div className="row" style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
              {fieldKeys.map(k => (
                <div className="field" key={k}>
                  <label htmlFor={`m-${k}`}>{label(k)}{unit(k) ? ` (${unit(k)})` : ''}</label>
                  <input id={`m-${k}`} className="input nums" inputMode="decimal" value={vals[k] ?? ''} onChange={e => setVals(v => ({ ...v, [k]: e.target.value }))} />
                </div>
              ))}
            </div>
            <div className="metric-in">
              <div className="field">
                <label htmlFor="ck">Other metric, name</label>
                <input id="ck" className="input" placeholder="e.g. steps" value={custom.key} onChange={e => setCustom(c => ({ ...c, key: e.target.value.replace(/[^a-zA-Z0-9_]/g, '') }))} />
              </div>
              <div className="field">
                <label htmlFor="cv">Value</label>
                <input id="cv" className="input nums" inputMode="decimal" value={custom.value} onChange={e => setCustom(c => ({ ...c, value: e.target.value }))} />
              </div>
            </div>
            <button className="btn primary" disabled={busy}>{busy ? 'Saving' : 'Save day'}</button>
          </form>

          <div className="panel pad stack">
            <div className="panel-head" style={{ marginBottom: 0 }}><span className="plate">Import from a wearable</span></div>
            <Importer onDone={load} />
          </div>
        </div>

        <div className="panel pad">
          <div className="panel-head"><span className="plate">Last 120 days</span><span className="faint">{logs?.length || 0} days</span></div>
          {!logs ? (
            <div className="loading" style={{ minHeight: 200 }}><div className="spinner" /></div>
          ) : logs.length === 0 ? (
            <p className="faint">Nothing logged yet. Enter today on the left or import a CSV.</p>
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr><th>Date</th>{keys.map(k => <th key={k} className="num">{label(k)}</th>)}<th /></tr>
                </thead>
                <tbody>
                  {[...logs].reverse().slice(0, 60).map(l => (
                    <tr key={l.date} onClick={() => setDate(l.date)} style={{ cursor: 'pointer' }}>
                      <td>{l.date}</td>
                      {keys.map(k => <td key={k} className="num">{l.metrics?.[k] != null ? num(l.metrics[k], 1) : ''}</td>)}
                      <td className="num"><button className="x" onClick={e => { e.stopPropagation(); remove(l.date) }} aria-label={`Delete ${l.date}`}>Delete</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
