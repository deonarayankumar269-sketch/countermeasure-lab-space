import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext.jsx'
import { api } from '../api.js'
import Icon, { Mark } from './Icon.jsx'
import { pad } from '../lib/format.js'

function Clock() {
  const [t, setT] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setT(new Date()), 1000)
    return () => clearInterval(id)
  }, [])
  return (
    <span className="clock">
      UTC {pad(t.getUTCHours())}<i>:</i>{pad(t.getUTCMinutes())}<i>:</i>{pad(t.getUTCSeconds())}
    </span>
  )
}

function useLink() {
  const [up, setUp] = useState(null)
  useEffect(() => {
    let live = true
    const ping = () => api.get('/health').then(() => live && setUp(true)).catch(() => live && setUp(false))
    ping()
    const id = setInterval(ping, 20000)
    return () => { live = false; clearInterval(id) }
  }, [])
  return up
}

export default function Shell() {
  const { user, logout } = useAuth()
  const nav = useNavigate()
  const loc = useLocation()
  const up = useLink()

  const out = async () => {
    await logout()
    nav('/', { replace: true })
  }

  return (
    <div className="shell">
      <aside className="rail">
        <NavLink to="/app" className="brand"><Mark /> N1 Lab</NavLink>
        <nav className="nav">
          <NavLink to="/app" end><Icon n="board" /> Board</NavLink>
          <NavLink to="/app/logs"><Icon n="log" /> Daily log</NavLink>
          <NavLink to="/app/new"><Icon n="flask" /> New test</NavLink>
        </nav>
        <div className="rail-foot">
          <b>{user.callsign || user.name}</b>
          <span>{user.email}</span>
        </div>
      </aside>

      <div className="stage">
        <header className="bar">
          <Clock />
          <div className="right">
            <span className={`lamp ${up === null ? '' : up ? 'green live' : 'red'}`}>
              {up === null ? 'Checking link' : up ? 'Link nominal' : 'Link lost'}
            </span>
            <button className="btn sm" onClick={out}><Icon n="out" className="ico" /> Sign out</button>
          </div>
        </header>
        <main className="main">
          <div className="page" key={loc.pathname}>
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
