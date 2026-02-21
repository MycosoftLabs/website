 "use client"

 import { useEffect, useMemo, useRef } from "react"

 interface IntelligenceWavesProps {
   className?: string
   targetSelector: string
 }

 interface WaveProps {
   segments: number
   growth: number
   step: number
   rows: number
   lineDiff: number
   curveDiff: number
   lineWidth: number
 }

 class ClassicalNoise {
   grad3 = [
     [1, 1, 0],
     [-1, 1, 0],
     [1, -1, 0],
     [-1, -1, 0],
     [1, 0, 1],
     [-1, 0, 1],
     [1, 0, -1],
     [-1, 0, -1],
     [0, 1, 1],
     [0, -1, 1],
     [0, 1, -1],
     [0, -1, -1],
   ]
   p: number[] = []
   perm: number[] = []

   constructor(randomSource: () => number = Math.random) {
     for (let i = 0; i < 256; i++) this.p[i] = Math.floor(256 * randomSource())
     for (let i = 0; i < 512; i++) this.perm[i] = this.p[i & 255]
   }

   dot(g: number[], x: number, y: number, z: number) {
     return g[0] * x + g[1] * y + g[2] * z
   }

   mix(a: number, b: number, t: number) {
     return (1 - t) * a + t * b
   }

   fade(t: number) {
     return t * t * t * (t * (t * 6 - 15) + 10)
   }

   noise(x: number, y: number, z: number) {
     let X = Math.floor(x)
     let Y = Math.floor(y)
     let Z = Math.floor(z)
     x -= X
     y -= Y
     z -= Z
     X &= 255
     Y &= 255
     Z &= 255

     const gi000 = this.perm[X + this.perm[Y + this.perm[Z]]] % 12
     const gi001 = this.perm[X + this.perm[Y + this.perm[Z + 1]]] % 12
     const gi010 = this.perm[X + this.perm[Y + 1 + this.perm[Z]]] % 12
     const gi011 = this.perm[X + this.perm[Y + 1 + this.perm[Z + 1]]] % 12
     const gi100 = this.perm[X + 1 + this.perm[Y + this.perm[Z]]] % 12
     const gi101 = this.perm[X + 1 + this.perm[Y + this.perm[Z + 1]]] % 12
     const gi110 = this.perm[X + 1 + this.perm[Y + 1 + this.perm[Z]]] % 12
     const gi111 = this.perm[X + 1 + this.perm[Y + 1 + this.perm[Z + 1]]] % 12

     const n000 = this.dot(this.grad3[gi000], x, y, z)
     const n100 = this.dot(this.grad3[gi100], x - 1, y, z)
     const n010 = this.dot(this.grad3[gi010], x, y - 1, z)
     const n110 = this.dot(this.grad3[gi110], x - 1, y - 1, z)
     const n001 = this.dot(this.grad3[gi001], x, y, z - 1)
     const n101 = this.dot(this.grad3[gi101], x - 1, y, z - 1)
     const n011 = this.dot(this.grad3[gi011], x, y - 1, z - 1)
     const n111 = this.dot(this.grad3[gi111], x - 1, y - 1, z - 1)

     const u = this.fade(x)
     const v = this.fade(y)
     const w = this.fade(z)

     const nx00 = this.mix(n000, n100, u)
     const nx01 = this.mix(n001, n101, u)
     const nx10 = this.mix(n010, n110, u)
     const nx11 = this.mix(n011, n111, u)

     const nxy0 = this.mix(nx00, nx10, v)
     const nxy1 = this.mix(nx01, nx11, v)

     return this.mix(nxy0, nxy1, w)
   }
 }

 const baseProps: WaveProps = {
   segments: 10,
   growth: 75,
   step: 0.08,
   rows: 100,
   lineDiff: 0.06,
   curveDiff: 1,
   lineWidth: 1.3,
 }

 const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value))
 const lerp = (a: number, b: number, t: number) => a + (b - a) * t

const presetMap: Record<string, WaveProps> = {
  ETA: { segments: 14, growth: 210, step: 0.22, rows: 90, lineDiff: 0.14, curveDiff: 1.4, lineWidth: 2.6 },
  ESI: { segments: 8, growth: 70, step: 0.06, rows: 120, lineDiff: 0.02, curveDiff: 0.7, lineWidth: 1.1 },
  BAR: { segments: 12, growth: 160, step: 0.14, rows: 70, lineDiff: 0.09, curveDiff: 1.2, lineWidth: 2.1 },
  RER: { segments: 9, growth: 120, step: 0.1, rows: 80, lineDiff: 0.05, curveDiff: 0.95, lineWidth: 1.7 },
  EEW: { segments: 15, growth: 230, step: 0.26, rows: 60, lineDiff: 0.16, curveDiff: 1.55, lineWidth: 3.1 },
}

function jitterPreset(base: WaveProps) {
  const jitter = (value: number, pct: number) => value * (1 + (Math.random() * 2 - 1) * pct)
  return {
    segments: Math.round(clamp(jitter(base.segments, 0.2), 6, 16)),
    growth: clamp(jitter(base.growth, 0.3), 40, 240),
    step: clamp(jitter(base.step, 0.35), 0.03, 0.3),
    rows: Math.round(clamp(jitter(base.rows, 0.25), 40, 130)),
    lineDiff: clamp(jitter(base.lineDiff, 0.35), 0.01, 0.22),
    curveDiff: clamp(jitter(base.curveDiff, 0.35), 0.4, 1.7),
    lineWidth: clamp(jitter(base.lineWidth, 0.35), 0.8, 3.4),
  }
}

 function randomizeProps() {
   return {
     segments: Math.floor(clamp(6 + Math.random() * 9, 6, 15)),
     growth: clamp(40 + Math.random() * 180, 40, 220),
     step: clamp(0.03 + Math.random() * 0.2, 0.03, 0.28),
     rows: Math.floor(clamp(40 + Math.random() * 80, 40, 120)),
     lineDiff: clamp(0.01 + Math.random() * 0.12, 0.01, 0.2),
     curveDiff: clamp(0.4 + Math.random() * 1.2, 0.4, 1.6),
     lineWidth: clamp(0.8 + Math.random() * 2.4, 0.8, 3.2),
   }
 }

 export function IntelligenceWaves({ className = "", targetSelector }: IntelligenceWavesProps) {
   const containerRef = useRef<HTMLDivElement>(null)
   const canvasRef = useRef<HTMLCanvasElement>(null)
   const propsRef = useRef<WaveProps>({ ...baseProps })
   const targetRef = useRef<WaveProps>({ ...baseProps })
   const activeRef = useRef(false)
   const timeoutRef = useRef<number | null>(null)
   const randomizeIntervalRef = useRef<number | null>(null)
   const frameRef = useRef<number | null>(null)

   const lineColor = useMemo(() => "rgba(0, 148, 255, 0.55)", [])
   const bgColor = useMemo(() => "#0b1220", [])

   useEffect(() => {
     const canvas = canvasRef.current
     const container = containerRef.current
     if (!canvas || !container) return

     const ctx = canvas.getContext("2d")
     if (!ctx) return

     const noise = new ClassicalNoise()
     const DPR = window.devicePixelRatio || 1

     let W = 0
     let H = 0
     let segmentSize = 1
     let number = 0
     let lastTime = 0

     const resize = () => {
       const rect = container.getBoundingClientRect()
       const w = Math.max(1, rect.width)
       const h = Math.max(1, rect.height)
       canvas.style.width = `${w}px`
       canvas.style.height = `${h}px`
       W = canvas.width = w * DPR
       H = canvas.height = h * DPR
       segmentSize = distance(0, H / 2, W, H / 2) / propsRef.current.segments
     }

     const clear = () => {
       ctx.save()
       ctx.fillStyle = bgColor
       ctx.fillRect(0, 0, W, H)
       ctx.restore()
     }

     const drawCurve = (row: number) => {
       const { segments, growth, lineDiff, curveDiff, lineWidth } = propsRef.current
       const height = (H / (propsRef.current.rows + 1)) * row
       let path = `M0,${height}`
       ctx.save()
       ctx.strokeStyle = lineColor
       ctx.lineWidth = lineWidth * DPR
       ctx.beginPath()
       for (let i = 1; i <= segments; i++) {
         const n = noise.noise(number, row * lineDiff, i * curveDiff)
         path += ` S${Math.round(segmentSize * (i - 1) + segmentSize / 2)},${Math.round(height + n * growth)} ${Math.round(segmentSize * i)},${height}`
       }
       path += ` T${segmentSize * segments - 1},${height}`
       ctx.stroke(new Path2D(path))
       ctx.restore()
     }

     const step = (timestamp: number) => {
       frameRef.current = requestAnimationFrame(step)
       if (!lastTime) lastTime = timestamp
       const delta = timestamp - lastTime
       if (delta < 50) return
       lastTime = timestamp

       const current = propsRef.current
      const target = activeRef.current ? targetRef.current : baseProps
       propsRef.current = {
        segments: Math.round(lerp(current.segments, target.segments, 0.18)),
        growth: lerp(current.growth, target.growth, 0.16),
        step: lerp(current.step, target.step, 0.18),
        rows: Math.round(lerp(current.rows, target.rows, 0.18)),
        lineDiff: lerp(current.lineDiff, target.lineDiff, 0.18),
        curveDiff: lerp(current.curveDiff, target.curveDiff, 0.18),
        lineWidth: lerp(current.lineWidth, target.lineWidth, 0.18),
       }

       segmentSize = distance(0, H / 2, W, H / 2) / propsRef.current.segments
       number += propsRef.current.step
       clear()
       for (let i = 1; i <= Math.floor(propsRef.current.rows); i++) drawCurve(i)
     }

    const handleActivate = (key?: string) => {
       activeRef.current = true
      targetRef.current = (key && presetMap[key]) ? jitterPreset(presetMap[key]) : randomizeProps()
      propsRef.current = { ...targetRef.current }
       if (timeoutRef.current) window.clearTimeout(timeoutRef.current)
      if (randomizeIntervalRef.current) window.clearInterval(randomizeIntervalRef.current)
     }

     const handleDeactivate = () => {
       activeRef.current = false
       if (timeoutRef.current) window.clearTimeout(timeoutRef.current)
       if (randomizeIntervalRef.current) {
         window.clearInterval(randomizeIntervalRef.current)
         randomizeIntervalRef.current = null
       }
     }

    const handleTap = (key?: string) => {
      handleActivate(key)
       timeoutRef.current = window.setTimeout(() => {
         activeRef.current = false
         if (randomizeIntervalRef.current) {
           window.clearInterval(randomizeIntervalRef.current)
           randomizeIntervalRef.current = null
         }
       }, 1400)
     }

    const scope = container.closest("section") ?? container.parentElement ?? container
    const targets = Array.from(scope.querySelectorAll<HTMLElement>(targetSelector))
     targets.forEach((el) => {
      const key = el.dataset.intelKey
      const enter = () => handleActivate(key)
      const leave = () => handleDeactivate()
      const tap = () => handleTap(key)
      el.addEventListener("pointerenter", enter)
      el.addEventListener("pointerleave", leave)
      el.addEventListener("pointerdown", tap)
      el.addEventListener("click", tap)
      el.addEventListener("touchstart", tap)
      ;(el as HTMLElement & { __intelHandlers?: { enter: () => void; leave: () => void; tap: () => void } }).__intelHandlers = {
        enter,
        leave,
        tap,
      }
     })

     const observer = new ResizeObserver(() => resize())
     observer.observe(container)
     resize()
     frameRef.current = requestAnimationFrame(step)

     return () => {
       if (frameRef.current) cancelAnimationFrame(frameRef.current)
       if (timeoutRef.current) window.clearTimeout(timeoutRef.current)
       if (randomizeIntervalRef.current) window.clearInterval(randomizeIntervalRef.current)
       observer.disconnect()
      targets.forEach((el) => {
        const handlers = (el as HTMLElement & { __intelHandlers?: { enter: () => void; leave: () => void; tap: () => void } }).__intelHandlers
        if (handlers) {
          el.removeEventListener("pointerenter", handlers.enter)
          el.removeEventListener("pointerleave", handlers.leave)
          el.removeEventListener("pointerdown", handlers.tap)
          el.removeEventListener("click", handlers.tap)
          el.removeEventListener("touchstart", handlers.tap)
        }
      })
     }
   }, [bgColor, lineColor, targetSelector])

   return (
     <div ref={containerRef} className={`absolute inset-0 pointer-events-none ${className}`} aria-hidden="true">
       <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
     </div>
   )
 }

 function distance(x1: number, y1: number, x2: number, y2: number) {
   const dx = x2 - x1
   const dy = y2 - y1
   return Math.sqrt(dx * dx + dy * dy)
 }
