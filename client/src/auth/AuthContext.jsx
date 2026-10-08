import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { api } from '../api.js'

const Ctx = createContext(null)
export const useAuth = () => useContext(Ctx)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let live = true
    api.get('/auth/me')
      .then(d => live && setUser(d.user))
      .catch(() => live && setUser(null))
      .finally(() => live && setReady(true))
    return () => { live = false }
  }, [])

  const login = useCallback(async (email, password) => {
    const d = await api.post('/auth/login', { email, password })
    setUser(d.user)
  }, [])

  const register = useCallback(async body => {
    const d = await api.post('/auth/register', body)
    setUser(d.user)
  }, [])

  const logout = useCallback(async () => {
    await api.post('/auth/logout').catch(() => {})
    setUser(null)
  }, [])

  const value = useMemo(() => ({ user, ready, login, register, logout }), [user, ready, login, register, logout])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}
