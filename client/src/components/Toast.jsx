import { createContext, useCallback, useContext, useMemo, useState } from 'react'

const Ctx = createContext(() => {})
export const useToast = () => useContext(Ctx)

export function ToastProvider({ children }) {
  const [items, setItems] = useState([])
  const push = useCallback((text, kind = 'ok') => {
    const id = Math.random().toString(36).slice(2)
    setItems(l => [...l, { id, text, kind }])
    setTimeout(() => setItems(l => l.filter(t => t.id !== id)), 4200)
  }, [])
  const value = useMemo(() => push, [push])
  return (
    <Ctx.Provider value={value}>
      {children}
      <div className="toast-zone" role="status" aria-live="polite">
        {items.map(t => <div key={t.id} className={`toast ${t.kind === 'bad' ? 'bad' : ''}`}>{t.text}</div>)}
      </div>
    </Ctx.Provider>
  )
}
