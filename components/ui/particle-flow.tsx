"use client"

import { useEffect, useRef, useCallback } from 'react'

interface Vector {
  x: number
  y: number
  copy: () => Vector
  add: (v: Vector) => Vector
  sub: (v: Vector) => Vector
  mult: (n: number) => Vector
  rotate: (angle: number) => Vector
  limit: (max: number) => Vector
  mag: () => number
  heading: () => number
}

interface Particle {
  pos: Vector
  lastPos: Vector
  vel: Vector
  e: number
  life: number
  update: (e: number) => void
}

interface ParticleFlowProps {
  className?: string
  opacity?: number
}

function createVector(x: number, y: number): Vector {
  return {
    x,
    y,
    copy() {
      return createVector(this.x, this.y)
    },
    add(v: Vector) {
      this.x += v.x
      this.y += v.y
      return this
    },
    sub(v: Vector) {
      this.x -= v.x
      this.y -= v.y
      return this
    },
    mult(n: number) {
      this.x *= n
      this.y *= n
      return this
    },
    rotate(angle: number) {
      const cos = Math.cos(angle)
      const sin = Math.sin(angle)
      const x = this.x * cos - this.y * sin
      const y = this.x * sin + this.y * cos
      this.x = x
      this.y = y
      return this
    },
    limit(max: number) {
      const mag = this.mag()
      if (mag > max) {
        this.x = (this.x / mag) * max
        this.y = (this.y / mag) * max
      }
      return this
    },
    mag() {
      return Math.sqrt(this.x * this.x + this.y * this.y)
    },
    heading() {
      return Math.atan2(this.y, this.x)
    }
  }
}

function hsl(h: number, s: number, l: number, a: number = 1): string {
  return `hsla(${h}, ${s}%, ${l}%, ${a})`
}

function lerp(v1: Vector, v2: Vector, t: number): Vector {
  return createVector(
    v1.x + (v2.x - v1.x) * t,
    v1.y + (v2.y - v1.y) * t
  )
}

export function ParticleFlow({ className = "", opacity = 0.9 }: ParticleFlowProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number>()
  const particlesRef = useRef<Particle[]>([])
  const lastRef = useRef<Vector | null>(null)
  const startTimeRef = useRef<number>(0)
  const mouseRef = useRef<{ x: number; y: number; in: boolean; prev: { x: number; y: number } }>({
    x: 0,
    y: 0,
    in: false,
    prev: { x: 0, y: 0 }
  })

  const createParticle = useCallback((pos: Vector, vel: Vector, e: number): Particle => {
    const life = 200 + Math.random() * 400
    let currentE = e
    
    return {
      pos: pos.copy(),
      lastPos: pos.copy(),
      vel: vel.copy(),
      e,
      life,
      update(newE: number) {
        currentE = newE
        const dir = Math.floor(this.life + currentE * 0.003) % 2 ? 1 : -1
        const rot = dir * this.life * 0.0003
        this.lastPos = this.pos.copy()
        this.pos.add(this.vel.mult(0.95).rotate(rot))
      }
    }
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const resizeCanvas = () => {
      const parent = canvas.parentElement
      if (parent) {
        canvas.width = parent.offsetWidth
        canvas.height = parent.offsetHeight
      }
    }

    resizeCanvas()

    let width = canvas.width
    let height = canvas.height
    let centerX = width / 2
    let centerY = height / 2

    // Create gradient
    const createGradient = () => {
      const grad = ctx.createRadialGradient(
        centerX, centerY, 0,
        centerX, centerY, Math.hypot(width, height) * 0.4
      )
      grad.addColorStop(0.0, hsl(340, 100, 50))
      grad.addColorStop(0.3, hsl(310, 100, 50))
      grad.addColorStop(0.7, hsl(240, 100, 50))
      grad.addColorStop(1.0, hsl(210, 100, 50))
      return grad
    }

    let grad = createGradient()
    startTimeRef.current = performance.now()

    // Mouse event handlers
    const handleMouseMove = (event: MouseEvent) => {
      const rect = canvas.getBoundingClientRect()
      mouseRef.current.prev.x = mouseRef.current.x
      mouseRef.current.prev.y = mouseRef.current.y
      mouseRef.current.x = event.clientX - rect.left
      mouseRef.current.y = event.clientY - rect.top
    }

    const handleMouseEnter = () => {
      mouseRef.current.in = true
    }

    const handleMouseLeave = () => {
      mouseRef.current.in = false
    }

    canvas.addEventListener('mousemove', handleMouseMove)
    canvas.addEventListener('mouseenter', handleMouseEnter)
    canvas.addEventListener('mouseleave', handleMouseLeave)

    const draw = (timestamp: number) => {
      const e = timestamp - startTimeRef.current
      const time = e * 0.001
      const sTime = Math.sin(time * 0.8)

      // Background with fade effect
      ctx.fillStyle = hsl(0, 0, 8, 0.05 + (sTime + 1) * 0.075)
      ctx.fillRect(0, 0, width, height)

      // Mouse interaction - create particles following cursor
      if (mouseRef.current.in) {
        lastRef.current = null
        const mousePos = createVector(mouseRef.current.x, mouseRef.current.y)
        const mousePrev = createVector(mouseRef.current.prev.x, mouseRef.current.prev.y)
        const v = mousePos.copy().sub(mousePrev)
        
        if (v.mag() > 2) {
          const vel_ = v.limit(80)
          for (let i = 0; i < 10; i++) {
            const pos = lerp(mousePrev, mousePos, Math.random())
            const vel = vel_.copy().mult(0.05 + Math.random() * 0.25)
            const p = createParticle(pos, vel, e)
            particlesRef.current.push(p)
          }
        }
      } else {
        // Auto-generate particles in a flowing pattern when no mouse interaction
        const mn = Math.min(width / 2, height / 2) * 0.45
        const count = 4
        const timeC = time * 3.75
        const timeS = time * 2.5
        const EIGHTH_PI = Math.PI / 8

        for (let i = 0; i < count; i++) {
          const t = (i / count) * EIGHTH_PI
          const pos = createVector(
            Math.cos(timeC + t),
            Math.sin(timeS + t)
          ).mult(mn).add(createVector(centerX, centerY))

          if (lastRef.current) {
            const vel = pos.copy().sub(lastRef.current)
            const p = createParticle(pos, vel, e)
            particlesRef.current.push(p)
          }
          lastRef.current = pos.copy()
        }
      }

      // Filter old particles
      particlesRef.current = particlesRef.current.filter(p => p.e + p.life > e)

      // Draw particles
      ctx.beginPath()
      particlesRef.current.forEach(p => {
        const life = (e - p.e) / p.life
        const r = (1 - life) * 10

        ctx.save()
        ctx.translate(p.pos.x, p.pos.y)
        const v = p.pos.copy().sub(p.lastPos)
        const heading = v.heading()
        const mag = v.mag()
        ctx.rotate(heading)
        
        ctx.moveTo(0, r)
        ctx.arc(0, 0, r, Math.PI / 2, -Math.PI / 2)
        ctx.arc(mag, 0, r, -Math.PI / 2, Math.PI / 2)
        ctx.closePath()
        ctx.restore()

        p.update(e)
      })

      ctx.fillStyle = grad
      ctx.fill()

      animationRef.current = requestAnimationFrame(draw)
    }

    // Initial fill
    ctx.fillStyle = hsl(0, 0, 8)
    ctx.fillRect(0, 0, width, height)

    animationRef.current = requestAnimationFrame(draw)

    const handleResize = () => {
      resizeCanvas()
      width = canvas.width
      height = canvas.height
      centerX = width / 2
      centerY = height / 2
      grad = createGradient()
    }

    window.addEventListener('resize', handleResize)

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
      window.removeEventListener('resize', handleResize)
      canvas.removeEventListener('mousemove', handleMouseMove)
      canvas.removeEventListener('mouseenter', handleMouseEnter)
      canvas.removeEventListener('mouseleave', handleMouseLeave)
    }
  }, [createParticle])

  return (
    <>
      {/* SVG Filter for displacement effect */}
      <svg id="weirdFilter" style={{ display: 'none' }}>
        <filter id="svgFilter">
          <feTurbulence
            id="turbulence"
            type="fractalNoise"
            baseFrequency="0.009"
            numOctaves={5}
          />
          <feDisplacementMap
            id="displacement"
            in="SourceGraphic"
            scale={200}
          />
        </filter>
      </svg>
      <canvas
        ref={canvasRef}
        className={`absolute inset-0 w-full h-full ${className}`}
        style={{ 
          opacity,
          filter: 'blur(5px) url(#svgFilter)',
          cursor: 'crosshair'
        }}
      />
    </>
  )
}
