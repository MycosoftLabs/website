"use client"

import { useEffect, useRef } from "react"

// ── Particle animation — inspired by Jeremboo / inconvergent.net ──────────────
// White particles (rgba 0.05) drift from a central circle outward,
// accumulating into a soft nebula. Canvas is NOT cleared each frame — trails persist.

const NUM_PARTICLES  = 1000
const PARTICLE_SPEED = 0.3
const VELOCITY       = 0.9
const CIRCLE_RADIUS  = 50

interface Particle {
  x: number
  y: number
  vel: { x: number; y: number; min: number; max: number }
}

function rand(min: number, max: number) {
  return Math.random() * (max - min) + min
}

function makeParticle(cx: number, cy: number): Particle {
  const angle = Math.random() * Math.PI * 2
  return {
    x: cx + Math.cos(angle) * CIRCLE_RADIUS,
    y: cy - Math.sin(angle) * CIRCLE_RADIUS,
    vel: {
      x: rand(-20, 20) / 100,
      y: rand(-20, 20) / 100,
      min: rand(2, 10),
      max: rand(10, 100) / 10,
    },
  }
}

function stepParticle(p: Particle, w: number, h: number) {
  const fx = rand(-1, 1)
  const fy = rand(-1, 1)
  if (Math.abs(p.vel.x + fx) < p.vel.max) p.vel.x += fx
  if (Math.abs(p.vel.y + fy) < p.vel.max) p.vel.y += fy
  p.x += p.vel.x * PARTICLE_SPEED
  p.y += p.vel.y * PARTICLE_SPEED
  if (Math.abs(p.vel.x) > p.vel.min) p.vel.x *= VELOCITY
  if (Math.abs(p.vel.y) > p.vel.min) p.vel.y *= VELOCITY
  // wrap edges (matches original: off-right/bottom stay, off-left/top wrap)
  if (p.x < 0) p.x = w
  if (p.y < 0) p.y = h
}

interface Props {
  className?: string
}

export function ParticleCanvas({ className }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    let rafId = 0
    let running = false
    let particles: Particle[] = []
    let W = 0
    let H = 0

    function spawn() {
      particles = []
      for (let i = 0; i < NUM_PARTICLES; i++) {
        particles.push(makeParticle(W * 0.5, H * 0.5))
      }
    }

    function resize() {
      const parent = canvas.parentElement
      W = canvas.width  = parent ? parent.offsetWidth  : window.innerWidth
      H = canvas.height = parent ? parent.offsetHeight : window.innerHeight
      ctx.clearRect(0, 0, W, H)
      spawn()
    }

    function loop() {
      if (!running) return
      for (const p of particles) {
        stepParticle(p, W, H)
        ctx.beginPath()
        ctx.fillStyle = "rgba(255,255,255,0.04)"
        ctx.arc(p.x, p.y, 1, 0, Math.PI * 2)
        ctx.fill()
      }
      rafId = requestAnimationFrame(loop)
    }

    function start() {
      if (running) return
      running = true
      loop()
    }

    function stop() {
      running = false
      cancelAnimationFrame(rafId)
    }

    // Only animate while the section is visible in the viewport
    const io = new IntersectionObserver(
      (entries) => {
        entries[0].isIntersecting ? start() : stop()
      },
      { threshold: 0.05 }   // fire as soon as 5% of the section scrolls in
    )

    const parent = canvas.parentElement
    if (parent) io.observe(parent)

    resize()

    const ro = new ResizeObserver(resize)
    if (parent) ro.observe(parent)

    return () => {
      stop()
      io.disconnect()
      ro.disconnect()
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{ display: "block" }}
      aria-hidden="true"
    />
  )
}
