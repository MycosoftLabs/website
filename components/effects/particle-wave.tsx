"use client"

import { useEffect, useRef, useCallback } from "react"

interface Particle {
  x: number
  y: number
  diameter: number
  duration: number
  amplitude: number
  offsetY: number
  arc: number
  startTime: number
  colour: string
}

interface ParticleWaveProps {
  /** Number of particles */
  numParticles?: number
  /** Particle size in view height units */
  particleSize?: number
  /** Animation speed in milliseconds */
  speed?: number
  /** Additional CSS classes */
  className?: string
}

/**
 * Flowing sinusoidal particle wave effect
 * Based on: https://codepen.io/stufreen/pen/KOWKBw
 * 
 * Creates particles that flow in wave patterns across the screen,
 * perfect for atmospheric/environmental themes.
 */
export function ParticleWave({
  numParticles = 600,
  particleSize = 0.5,
  speed = 20000,
  className = "",
}: ParticleWaveProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number>()
  const particlesRef = useRef<Particle[]>([])

  // Modified random-normal distribution
  const normal = useCallback((options: { mean: number; dev: number }) => {
    let r: number
    let a: number
    let n: number
    let e: number
    const l = options.mean
    const t = options.dev
    
    do {
      a = 2 * Math.random() - 1
      n = 2 * Math.random() - 1
      r = a * a + n * n
    } while (r >= 1)
    
    e = a * Math.sqrt(-2 * Math.log(r) / r)
    return t * e + l
  }, [])

  const randomNormal = useCallback((options: { mean: number; dev: number; pool?: number[] }) => {
    const o = { mean: 0, dev: 1, pool: [], ...options }
    
    if (Array.isArray(o.pool) && o.pool.length > 0) {
      let r = 0
      do {
        const a = Math.round(normal({ mean: o.mean, dev: o.dev }))
        if (a < o.pool.length && a >= 0) return o.pool[a]
        r++
      } while (r < 100)
    }
    
    return normal({ mean: o.mean, dev: o.dev })
  }, [normal])

  const rand = useCallback((low: number, high: number) => {
    return Math.random() * (high - low) + low
  }, [])

  const createParticle = useCallback((): Particle => {
    const colour = {
      r: 255,
      g: randomNormal({ mean: 125, dev: 20 }),
      b: 50,
      a: rand(0, 1),
    }
    return {
      x: -2,
      y: -2,
      diameter: Math.max(0, randomNormal({ mean: particleSize, dev: particleSize / 2 })),
      duration: randomNormal({ mean: speed, dev: speed * 0.1 }),
      amplitude: randomNormal({ mean: 16, dev: 2 }),
      offsetY: randomNormal({ mean: 0, dev: 10 }),
      arc: Math.PI * 2,
      startTime: performance.now() - rand(0, speed),
      colour: `rgba(${colour.r}, ${Math.floor(colour.g)}, ${colour.b}, ${colour.a})`,
    }
  }, [particleSize, speed, randomNormal, rand])

  const moveParticle = useCallback((particle: Particle, time: number): Particle => {
    const progress = ((time - particle.startTime) % particle.duration) / particle.duration
    return {
      ...particle,
      x: progress,
      y: (Math.sin(progress * particle.arc) * particle.amplitude) + particle.offsetY,
    }
  }, [])

  const drawParticle = useCallback((
    particle: Particle,
    canvas: HTMLCanvasElement,
    ctx: CanvasRenderingContext2D
  ) => {
    const vh = canvas.height / 100

    ctx.fillStyle = particle.colour
    ctx.beginPath()
    ctx.ellipse(
      particle.x * canvas.width,
      particle.y * vh + (canvas.height / 2),
      particle.diameter * vh,
      particle.diameter * vh,
      0,
      0,
      2 * Math.PI
    )
    ctx.fill()
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    // Initialize canvas size
    const updateSize = () => {
      canvas.width = canvas.offsetWidth * window.devicePixelRatio
      canvas.height = canvas.offsetHeight * window.devicePixelRatio
    }
    updateSize()

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Create particles
    particlesRef.current = []
    for (let i = 0; i < numParticles; i++) {
      particlesRef.current.push(createParticle())
    }

    // Animation loop
    const draw = (time: number) => {
      // Move particles
      particlesRef.current = particlesRef.current.map(particle => 
        moveParticle(particle, time)
      )

      // Clear the canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // Draw the particles
      particlesRef.current.forEach(particle => {
        drawParticle(particle, canvas, ctx)
      })

      // Schedule next frame
      animationRef.current = requestAnimationFrame(draw)
    }

    // Start animation
    animationRef.current = requestAnimationFrame(draw)

    // Handle resize
    const handleResize = () => {
      updateSize()
    }
    window.addEventListener('resize', handleResize)

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
      window.removeEventListener('resize', handleResize)
    }
  }, [numParticles, createParticle, moveParticle, drawParticle])

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 w-full h-full ${className}`}
      style={{ 
        background: 'transparent',
        verticalAlign: 'middle',
      }}
    />
  )
}

/**
 * SporeBase themed variant with orange/amber particles flowing in waves
 */
export function SporeWave({
  className = "",
  ...props
}: Omit<ParticleWaveProps, 'className'> & { className?: string }) {
  return (
    <ParticleWave
      className={className}
      numParticles={400}
      particleSize={0.4}
      speed={18000}
      {...props}
    />
  )
}
