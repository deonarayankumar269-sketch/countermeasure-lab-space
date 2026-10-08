import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext.jsx'
import Globe from '../components/Globe.jsx'
import { Mark } from '../components/Icon.jsx'

export default function Auth({ mode }) {
  const isReg = mode === 'register'
  const { login, register } = useAuth()
  const nav = useNavigate()
  const loc = useLocation()
  const [f, setF] = useState({ name: '', callsign: '', email: '', password: '' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [fields, setFields] = useState({})

  const set = k => e => setF(s => ({ ...s, [k]: e.target.value }))

  async function submit(e) {
    e.preventDefault()
    setBusy(true)
    setError('')
    setFields({})
    try {
      if (isReg) await register({ name: f.name, callsign: f.callsign, email: f.email, password: f.password })
      else await login(f.email, f.password)
      nav(loc.state?.from || '/app', { replace: true })
    } catch (err) {
      setError(err.message)
      setFields(err.fields || {})
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="auth">
      <section className="auth-form">
        <Link to="/" className="brand" style={{ padding: 0 }}><Mark /> N1 Lab</Link>
        <div>
          <h1>{isReg ? 'Join the crew' : 'Sign in'}</h1>
          <p className="sub">{isReg ? 'Your readings stay under your account. Nobody else sees them.' : 'Pick up the test where you left it.'}</p>
        </div>

        <form onSubmit={submit} noValidate>
          {error && <div className="form-error" role="alert">{error}</div>}
          {isReg && (
            <div className="row">
              <div className="field">
                <label htmlFor="name">Full name</label>
                <input id="name" className="input" value={f.name} onChange={set('name')} autoComplete="name" required />
                {fields.name && <span className="err">{fields.name}</span>}
              </div>
              <div className="field">
                <label htmlFor="cs">Callsign (optional)</label>
                <input id="cs" className="input" value={f.callsign} onChange={set('callsign')} maxLength={24} />
              </div>
            </div>
          )}
          <div className="field">
            <label htmlFor="email">Email</label>
            <input id="email" type="email" className="input" value={f.email} onChange={set('email')} autoComplete="email" required />
            {fields.email && <span className="err">{fields.email}</span>}
          </div>
          <div className="field">
            <label htmlFor="pw">Password</label>
            <input id="pw" type="password" className="input" value={f.password} onChange={set('password')} autoComplete={isReg ? 'new-password' : 'current-password'} required />
            {fields.password ? <span className="err">{fields.password}</span> : isReg && <span className="hint">At least 8 characters.</span>}
          </div>
          <button className="btn primary block" disabled={busy}>{busy ? 'Working' : isReg ? 'Create account' : 'Sign in'}</button>
        </form>

        <p className="faint">
          {isReg ? 'Already registered? ' : 'No account yet? '}
          <Link to={isReg ? '/login' : '/register'} style={{ color: 'var(--frost)', textDecoration: 'underline', textUnderlineOffset: 4 }}>
            {isReg ? 'Sign in' : 'Create one'}
          </Link>
        </p>
      </section>

      <aside className="auth-side">
        <Globe />
        <div className="auth-quote">
          <b>Six people. One answer each.</b>
          Population studies need hundreds of volunteers. A crew has six, so every person gets their own trial.
        </div>
      </aside>
    </div>
  )
}
