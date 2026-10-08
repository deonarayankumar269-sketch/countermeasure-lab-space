import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { useAuth } from './auth/AuthContext.jsx'
import Starfield from './components/Starfield.jsx'
import Shell from './components/Shell.jsx'
import Landing from './pages/Landing.jsx'
import Auth from './pages/Auth.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Logs from './pages/Logs.jsx'
import NewExperiment from './pages/NewExperiment.jsx'
import Experiment from './pages/Experiment.jsx'
import NotFound from './pages/NotFound.jsx'

function Splash() {
  return <div className="loading"><div className="spinner" /><span>Connecting</span></div>
}

function Protected({ children }) {
  const { user, ready } = useAuth()
  const loc = useLocation()
  if (!ready) return <Splash />
  if (!user) return <Navigate to="/login" replace state={{ from: loc.pathname }} />
  return children
}

function Guest({ children }) {
  const { user, ready } = useAuth()
  if (!ready) return <Splash />
  if (user) return <Navigate to="/app" replace />
  return children
}

export default function App() {
  return (
    <>
      <Starfield />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Guest><Auth mode="login" /></Guest>} />
        <Route path="/register" element={<Guest><Auth mode="register" /></Guest>} />
        <Route path="/app" element={<Protected><Shell /></Protected>}>
          <Route index element={<Dashboard />} />
          <Route path="logs" element={<Logs />} />
          <Route path="new" element={<NewExperiment />} />
          <Route path="experiments/:id" element={<Experiment />} />
        </Route>
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  )
}
