import { useEffect, useState } from 'react'

export default function CountUp({ value, decimals = 0, ms = 1100 }) {
  const [v, setV] = useState(0)
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { setV(value); return }
    let raf, t0
    const step = t => {
      t0 ??= t
      const k = Math.min(1, (t - t0) / ms)
      setV(value * (1 - Math.pow(1 - k, 4)))
      if (k < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [value, ms])
  return <>{v.toFixed(decimals)}</>
}
