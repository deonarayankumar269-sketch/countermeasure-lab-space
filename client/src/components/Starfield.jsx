import { useEffect, useRef } from 'react'

export default function Starfield() {
  const ref = useRef(null)

  useEffect(() => {
    const cv = ref.current
    const ctx = cv.getContext('2d')
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let w = 0, h = 0, stars = [], raf = 0
    let mx = 0, my = 0, tx = 0, ty = 0
    let shoot = null
    let nextShoot = performance.now() + 5000

    function build() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      w = window.innerWidth
      h = window.innerHeight
      cv.width = w * dpr
      cv.height = h * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      const n = Math.min(420, Math.floor((w * h) / 5200))
      stars = Array.from({ length: n }, () => {
        const z = Math.random() ** 1.6
        return { x: Math.random() * w, y: Math.random() * h, z, r: 0.35 + z * 1.25, tw: Math.random() * 6.28, sp: 0.5 + Math.random() * 1.6, warm: Math.random() < 0.07 }
      })
    }

    function draw(t) {
      ctx.clearRect(0, 0, w, h)
      tx += (mx - tx) * 0.04
      ty += (my - ty) * 0.04
      for (const s of stars) {
        if (!reduce) {
          s.y -= 0.015 + s.z * 0.05
          if (s.y < -2) { s.y = h + 2; s.x = Math.random() * w }
        }
        const x = s.x + tx * s.z * 16
        const y = s.y + ty * s.z * 16
        const a = 0.2 + 0.8 * s.z * (0.55 + 0.45 * Math.sin((t / 1000) * s.sp + s.tw))
        ctx.fillStyle = s.warm ? `rgba(234,168,60,${a})` : `rgba(228,236,229,${a})`
        ctx.beginPath()
        ctx.arc(x, y, s.r, 0, 6.2832)
        ctx.fill()
      }

      if (!reduce) {
        if (!shoot && t > nextShoot) {
          shoot = { x: w * (0.45 + Math.random() * 0.5), y: Math.random() * h * 0.35, life: 0 }
          nextShoot = t + 7000 + Math.random() * 9000
        }
        if (shoot) {
          shoot.life += 0.018
          const k = shoot.life
          const hx = shoot.x - k * 520
          const hy = shoot.y + k * 240
          const g = ctx.createLinearGradient(hx, hy, hx + 130, hy - 60)
          const fade = Math.sin(Math.min(1, k) * Math.PI)
          g.addColorStop(0, `rgba(228,236,229,${0.85 * fade})`)
          g.addColorStop(1, 'rgba(228,236,229,0)')
          ctx.strokeStyle = g
          ctx.lineWidth = 1.2
          ctx.beginPath()
          ctx.moveTo(hx, hy)
          ctx.lineTo(hx + 130, hy - 60)
          ctx.stroke()
          if (k >= 1) shoot = null
        }
        raf = requestAnimationFrame(draw)
      }
    }

    const onMove = e => {
      mx = e.clientX / w - 0.5
      my = e.clientY / h - 0.5
    }
    const onVis = () => {
      if (reduce) return
      cancelAnimationFrame(raf)
      if (!document.hidden) raf = requestAnimationFrame(draw)
    }

    build()
    raf = requestAnimationFrame(draw)
    window.addEventListener('resize', build)
    window.addEventListener('mousemove', onMove, { passive: true })
    document.addEventListener('visibilitychange', onVis)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', build)
      window.removeEventListener('mousemove', onMove)
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [])

  return <canvas ref={ref} className="sky" aria-hidden="true" />
}
