"use client"

import { useEffect, useRef } from "react"

interface DefenseParticlesProps {
  className?: string
}

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  radius: number
  alpha: number
  tint: number
  pulse: number
}

export function DefenseParticles({ className = "" }: DefenseParticlesProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    let frame: number | null = null
    let width = 0
    let height = 0
    let dpr = window.devicePixelRatio || 1
    let particles: Particle[] = []
    let isDark = document.documentElement.classList.contains("dark")

    const makeParticle = (): Particle => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.22 * dpr,
      vy: (Math.random() - 0.5) * 0.2 * dpr,
      radius: (1.8 + Math.random() * 6.8) * dpr,
      alpha: 0.2 + Math.random() * 0.42,
      tint: Math.random(),
      pulse: Math.random() * Math.PI * 2,
    })

    const resize = () => {
      const rect = container.getBoundingClientRect()
      dpr = window.devicePixelRatio || 1
      width = Math.max(1, rect.width * dpr)
      height = Math.max(1, rect.height * dpr)
      canvas.width = width
      canvas.height = height
      canvas.style.width = `${rect.width}px`
      canvas.style.height = `${rect.height}px`
      const count = Math.min(620, Math.max(260, Math.floor((rect.width * rect.height) / 1350)))
      particles = Array.from({ length: count }, makeParticle)
    }

    const draw = () => {
      ctx.clearRect(0, 0, width, height)
      const colors = isDark
        ? [
            [226, 232, 240],
            [125, 211, 252],
          ]
        : [
            [15, 23, 42],
            [14, 116, 144],
          ]

      for (const p of particles) {
        p.pulse += 0.018
        p.x += p.vx
        p.y += p.vy
        if (p.x < -p.radius) p.x = width + p.radius
        if (p.x > width + p.radius) p.x = -p.radius
        if (p.y < -p.radius) p.y = height + p.radius
        if (p.y > height + p.radius) p.y = -p.radius

        const color = colors[p.tint > 0.5 ? 1 : 0]
        const pulse = 0.7 + Math.sin(p.pulse) * 0.3
        ctx.beginPath()
        ctx.fillStyle = `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${p.alpha * pulse})`
        ctx.arc(p.x, p.y, p.radius * pulse, 0, Math.PI * 2)
        ctx.fill()
      }

      frame = requestAnimationFrame(draw)
    }

    const resizeObserver = new ResizeObserver(resize)
    resizeObserver.observe(container)

    const themeObserver = new MutationObserver(() => {
      isDark = document.documentElement.classList.contains("dark")
    })
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] })

    resize()
    frame = requestAnimationFrame(draw)

    return () => {
      if (frame) cancelAnimationFrame(frame)
      resizeObserver.disconnect()
      themeObserver.disconnect()
    }
  }, [])

  return (
    <div ref={containerRef} className={`absolute inset-0 opacity-60 dark:opacity-70 ${className}`} aria-hidden="true">
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full pointer-events-none" />
    </div>
  )
}
