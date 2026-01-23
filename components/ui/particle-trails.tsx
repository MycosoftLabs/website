"use client"

import { useEffect, useRef } from "react"

interface ParticleTrailsProps {
  opacity?: number
  particleCount?: number
  trailLength?: number
  hue?: number
}

// Inspired by Games Done Quick overlay - Codepen by Alca
export function ParticleTrails({ 
  opacity = 0.7, 
  particleCount = 800,
  trailLength = 300,
  hue = 320 
}: ParticleTrailsProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number>(0)
  const particlesRef = useRef<Particle[]>([])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    let width = canvas.offsetWidth
    let height = canvas.offsetHeight

    // Set canvas size
    const setSize = () => {
      const dpr = window.devicePixelRatio || 1
      width = canvas.offsetWidth
      height = canvas.offsetHeight
      canvas.width = width * dpr
      canvas.height = height * dpr
      ctx.scale(dpr, dpr)
    }

    setSize()

    // Particle class
    class Particle {
      pos: { x: number; y: number }
      vel: number

      constructor() {
        this.pos = { x: 0, y: 0 }
        this.vel = 0
        this.reset()
      }

      reset() {
        this.pos.x = Math.random() * width
        this.pos.y = height + 10
        this.vel = -(Math.random() * 3 + 1) // Speed between -1 and -4
        return this
      }

      update() {
        this.pos.y += this.vel
        if (this.pos.y < -trailLength) {
          this.reset()
        }
      }
    }

    // Create gradient
    const createGradient = () => {
      const grad = ctx.createLinearGradient(0, 0, 0, trailLength)
      // Primary color (purple/magenta)
      grad.addColorStop(0.0, `hsla(${hue}, 100%, 50%, 1.0)`)
      // Transition to red
      grad.addColorStop(0.6, `hsla(${hue - 40}, 100%, 50%, 0.5)`)
      // Fade out
      grad.addColorStop(1.0, `hsla(${hue - 40}, 100%, 50%, 0.0)`)
      return grad
    }

    // Initialize particles
    particlesRef.current = []
    for (let i = 0; i < particleCount; i++) {
      const p = new Particle()
      // Distribute particles across the screen initially
      p.pos.y = Math.random() * (height + trailLength) - trailLength
      particlesRef.current.push(p)
    }

    let gradient = createGradient()

    // Animation loop
    const draw = () => {
      ctx.clearRect(0, 0, width, height)

      // Draw trails
      for (const p of particlesRef.current) {
        ctx.save()
        ctx.translate(p.pos.x, p.pos.y)
        ctx.scale(1, -p.vel / 4)
        
        ctx.beginPath()
        ctx.moveTo(0, 0)
        ctx.lineTo(0, trailLength)
        ctx.strokeStyle = gradient
        ctx.lineWidth = 1.5
        ctx.stroke()
        
        ctx.restore()
      }

      // Draw particles (bright dots)
      ctx.beginPath()
      for (const p of particlesRef.current) {
        ctx.moveTo(p.pos.x + 1.5, p.pos.y)
        ctx.arc(p.pos.x, p.pos.y, 1.5, 0, Math.PI * 2)
        p.update()
      }
      ctx.fillStyle = "hsl(0, 0%, 100%)"
      ctx.fill()

      animationRef.current = requestAnimationFrame(draw)
    }

    draw()

    // Handle resize
    const handleResize = () => {
      setSize()
      gradient = createGradient()
      // Redistribute particles on resize
      for (const p of particlesRef.current) {
        p.pos.x = Math.random() * width
      }
    }

    window.addEventListener("resize", handleResize)

    return () => {
      window.removeEventListener("resize", handleResize)
      cancelAnimationFrame(animationRef.current)
    }
  }, [particleCount, trailLength, hue])

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ opacity }}
    />
  )
}
