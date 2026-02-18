"use client"

/**
 * Particle animation canvas for SporeBase "How it works" section.
 * Emitter on the right; particles flow left across the section.
 * Orange/amber palette to match the SporeBase page.
 */

import { useEffect, useRef } from "react"

interface Particle {
  x: number
  y: number
  r: number
  life: number
  vy: number
  traction: number
}

// SporeBase orange scheme: dark → light (life high → low)
const COLORS = [
  "#fbbf24", // amber-400 – newest
  "#fb923c", // orange-400
  "#f97316", // orange-500
  "#ea580c", // orange-600
  "#7c2d12", // orange-900 – oldest
]

const BG_COLOR = "#0f172a"   // slate-900, matches section
const EMITTER_COLOR = "#f97316" // orange-500

function findColor(life: number): string {
  if (life < 2000) return COLORS[4]
  if (life < 4000) return COLORS[3]
  if (life < 6000) return COLORS[2]
  if (life < 8000) return COLORS[1]
  return COLORS[0]
}

export function SporeParticleCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    let animationId: number
    let holder: Particle[] = []
    const wind = 5
    let emitter = { x: 0, y: 0 }

    function resize() {
      const W = canvas.parentElement?.clientWidth ?? 400
      const H = canvas.parentElement?.clientHeight ?? 300
      canvas.width = W
      canvas.height = H
      // Emitter on the right, vertically centered – particles flow left
      emitter = { x: W - 24, y: H / 2 }
    }

    function createParticle() {
      holder.push({
        x: emitter.x,
        y: emitter.y,
        r: Math.round(Math.random() * 2),
        life: Math.round(Math.random() * 10000),
        vy: Math.random() > 0.5 ? Math.random() / 2 : -Math.random() / 2,
        traction: Math.round(Math.random() * wind - 3),
      })
    }

    function draw() {
      const W = canvas.width
      const H = canvas.height

      for (let i = 0; i < 15; i++) {
        createParticle()
      }

      ctx.globalCompositeOperation = "source-over"
      ctx.fillStyle = BG_COLOR
      ctx.fillRect(0, 0, W, H)

      const partNum = holder.length
      for (let i = partNum - 1; i >= 0; i--) {
        const temp = holder[i]
        if (!temp) continue

        ctx.fillStyle = findColor(temp.life)
        ctx.beginPath()
        ctx.arc(temp.x, temp.y, temp.r, 0, Math.PI * 2, true)
        ctx.fill()

        temp.x -= wind - temp.traction
        temp.life -= 40
        temp.y -= temp.vy

        if (temp.life < 0 || temp.x < 0) {
          holder.splice(i, 1)
        }
      }

      ctx.fillStyle = EMITTER_COLOR
      ctx.beginPath()
      ctx.arc(emitter.x, emitter.y, 3, 0, Math.PI * 2, true)
      ctx.fill()

      animationId = requestAnimationFrame(draw)
    }

    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(canvas.parentElement ?? canvas)
    animationId = requestAnimationFrame(draw)

    return () => {
      cancelAnimationFrame(animationId)
      ro.disconnect()
    }
  }, [])

  return <canvas ref={canvasRef} className="w-full h-full" />
}
