import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api.js'
import { useToast } from '../components/Toast.jsx'
import { PRESETS, localIso, presetFor } from '../lib/format.js'

const STEPS = ['The question', 'The outcome', 'The design']

export default function NewExperiment() {
  const nav = useNavigate()
  const toast = useToast()
  const [step, setStep] = useState(0)
  const [busy, setBusy] = useState(false)
  const [errs, setErrs] = useState({})
  const [logged, setLogged] = useState([])
  const [f, setF] = useState({
    title: '', hypothesis: '', iname: '', protocol: '',
    metric: 'deepSleepMin', label: 'Deep sleep', unit: 'min', higherIsBetter: true, minEffect: '5',
    blockDays: 5, pairs: 2, washoutDays: 2, startDate: localIso(),
  })
  const set = (k, v) => setF(s => ({ ...s, [k]: v }))

  useEffect(() => {
    api.get('/logs/metrics').then(d => setLogged(d.metrics)).catch(() => {})
  }, [])

  const chips = [...PRESETS, ...logged.filter(m => !presetFor(m.key)).map(m => ({ key: m.key, label: m.key, unit: '', higherIsBetter: true, minEffect: '' }))]
  const count = k => logged.find(m => m.key === k)?.count

  function pick(p) {
    setF(s => ({ ...s, metric: p.key, label: p.label, unit: p.unit, higherIsBetter: p.higherIsBetter, minEffect: String(p.minEffect ?? '') }))
  }

  function check(n) {
    const e = {}
    if (n === 0) {
      if (f.title.trim().length < 3) e.title = 'Give the test a title'
      if (f.iname.trim().length < 2) e.iname = 'Name the intervention'
    }
    if (n === 1) {
      if (!/^[a-zA-Z][a-zA-Z0-9_]{0,39}$/.test(f.metric)) e.metric = 'Pick a metric'
      if (f.label.trim().length < 2) e.label = 'Add a label'
      if (!(Number(f.minEffect) > 0)) e.minEffect = 'Enter a number above zero'
    }
    setErrs(e)
    return !Object.keys(e).length
  }

  const next = () => check(step) && setStep(s => s + 1)

  async function launch() {
    setBusy(true)
    try {
      const d = await api.post('/experiments', {
        title: f.title, hypothesis: f.hypothesis,
        intervention: { name: f.iname, protocol: f.protocol },
        outcome: { metric: f.metric, label: f.label, unit: f.unit, higherIsBetter: f.higherIsBetter },
        minEffect: Number(f.minEffect),
        design: { blockDays: Number(f.blockDays), pairs: Number(f.pairs), washoutDays: Number(f.washoutDays), startDate: f.startDate },
      })
      toast('Test launched, the order is randomized')
      nav(`/app/experiments/${d.experiment.id}`)
    } catch (e) {
      toast(e.message, 'bad')
      setBusy(false)
    }
  }

  const periods = f.pairs * 2
  const dataDays = periods * f.blockDays
  const total = dataDays + (periods - 1) * f.washoutDays
  const blocks = []
  for (let p = 0; p < periods; p++) {
    if (p > 0 && f.washoutDays > 0) blocks.push({ w: true, n: f.washoutDays })
    blocks.push({ w: false, n: f.blockDays, k: p + 1 })
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h1>New test</h1>
          <p className="sub">Three short steps. The A and B order is drawn at random when you launch, so you cannot nudge it.</p>
        </div>
      </div>

      <div className="steps" style={{ '--p': (step / (STEPS.length - 1)) * 100 }}>
        {STEPS.map((s, i) => <div key={s} className={`stp ${i < step ? 'done' : ''} ${i === step ? 'now' : ''}`}>{s}</div>)}
      </div>

      <div className="panel pad">
        <div className="step-body" key={step}>
          {step === 0 && (
            <div className="stack">
              <div className="field">
                <label htmlFor="t">Title</label>
                <input id="t" className="input" value={f.title} onChange={e => set('title', e.target.value)} placeholder="Evening light filtering and deep sleep" />
                {errs.title && <span className="err">{errs.title}</span>}
              </div>
              <div className="row">
                <div className="field">
                  <label htmlFor="in">Intervention (condition B)</label>
                  <input id="in" className="input" value={f.iname} onChange={e => set('iname', e.target.value)} placeholder="Evening light filtering" />
                  {errs.iname && <span className="err">{errs.iname}</span>}
                </div>
                <div className="field">
                  <label htmlFor="pr">Control (condition A)</label>
                  <input id="pr" className="input" value="Usual routine" disabled />
                  <span className="hint">Baseline days are your normal routine.</span>
                </div>
              </div>
              <div className="field">
                <label htmlFor="pt">Protocol</label>
                <textarea id="pt" className="textarea" value={f.protocol} onChange={e => set('protocol', e.target.value)} placeholder="Exactly what you do on a B day: when, how much, how long." />
              </div>
              <div className="field">
                <label htmlFor="h">Hypothesis (optional)</label>
                <input id="h" className="input" value={f.hypothesis} onChange={e => set('hypothesis', e.target.value)} placeholder="Amber light after 20:00 adds deep sleep" />
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="stack">
              <div className="field">
                <span className="lab">What are you measuring?</span>
                <div className="chips" role="group" aria-label="Outcome metric">
                  {chips.map(p => (
                    <button type="button" key={p.key} className="chip" aria-pressed={f.metric === p.key} onClick={() => pick(p)}>
                      {p.label}{count(p.key) ? ` (${count(p.key)} days)` : ''}
                    </button>
                  ))}
                </div>
                {logged.length > 0 && !count(f.metric) && <span className="hint">Nothing logged for this metric yet. You can add it in the daily log once the test starts.</span>}
                {errs.metric && <span className="err">{errs.metric}</span>}
              </div>
              <div className="row">
                <div className="field">
                  <label htmlFor="ml">Label</label>
                  <input id="ml" className="input" value={f.label} onChange={e => set('label', e.target.value)} />
                  {errs.label && <span className="err">{errs.label}</span>}
                </div>
                <div className="field">
                  <label htmlFor="mu">Unit</label>
                  <input id="mu" className="input" value={f.unit} maxLength={12} onChange={e => set('unit', e.target.value)} />
                </div>
                <div className="field">
                  <label htmlFor="mk">Metric key in your log</label>
                  <input id="mk" className="input" value={f.metric} onChange={e => set('metric', e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))} />
                </div>
              </div>
              <div className="row">
                <div className="field">
                  <span className="lab">Which direction is better?</span>
                  <div className="seg">
                    <button type="button" aria-pressed={f.higherIsBetter} onClick={() => set('higherIsBetter', true)}>Higher</button>
                    <button type="button" aria-pressed={!f.higherIsBetter} onClick={() => set('higherIsBetter', false)}>Lower</button>
                  </div>
                </div>
                <div className="field">
                  <label htmlFor="me">Smallest change worth keeping{f.unit ? ` (${f.unit})` : ''}</label>
                  <input id="me" className="input nums" inputMode="decimal" value={f.minEffect} onChange={e => set('minEffect', e.target.value)} />
                  {errs.minEffect ? <span className="err">{errs.minEffect}</span> : <span className="hint">Below this, the intervention is not worth the effort even if the effect is real.</span>}
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="stack">
              <div className="row">
                <div className="field">
                  <label htmlFor="bd">Days per block</label>
                  <input id="bd" type="number" min="2" max="14" className="input nums" value={f.blockDays} onChange={e => set('blockDays', Math.min(14, Math.max(2, Number(e.target.value) || 2)))} />
                  <span className="hint">2 to 14. Longer blocks suit slow effects.</span>
                </div>
                <div className="field">
                  <label htmlFor="pa">A and B pairs</label>
                  <input id="pa" type="number" min="2" max="6" className="input nums" value={f.pairs} onChange={e => set('pairs', Math.min(6, Math.max(2, Number(e.target.value) || 2)))} />
                  <span className="hint">2 to 6. Each pair is randomized.</span>
                </div>
                <div className="field">
                  <label htmlFor="wo">Washout days</label>
                  <input id="wo" type="number" min="0" max="7" className="input nums" value={f.washoutDays} onChange={e => set('washoutDays', Math.min(7, Math.max(0, Number(e.target.value) || 0)))} />
                  <span className="hint">Between blocks, not counted.</span>
                </div>
                <div className="field">
                  <label htmlFor="sd">Start date</label>
                  <input id="sd" type="date" className="input" value={f.startDate} onChange={e => e.target.value && set('startDate', e.target.value)} />
                </div>
              </div>

              <div>
                <span className="lab">Layout, order of A and B decided at launch</span>
                <div className="pv" key={`${f.blockDays}-${f.pairs}-${f.washoutDays}`}>
                  {blocks.map((b, i) => (
                    <div key={i} className={b.w ? 'w' : ''} style={{ flex: b.n, '--i': i }}>{b.w ? 'W' : `P${b.k}`}</div>
                  ))}
                </div>
                <p className="hint" style={{ marginTop: 10 }}>
                  {total} days in all: {dataDays} data days ({dataDays / 2} on each condition) and {total - dataDays} washout days.
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="wiz-foot">
          <button className="btn" onClick={() => (step === 0 ? nav('/app') : setStep(s => s - 1))}>{step === 0 ? 'Cancel' : 'Back'}</button>
          {step < 2 ? <button className="btn primary" onClick={next}>Continue</button> : <button className="btn primary" onClick={launch} disabled={busy}>{busy ? 'Launching' : 'Randomize and launch'}</button>}
        </div>
      </div>
    </>
  )
}
