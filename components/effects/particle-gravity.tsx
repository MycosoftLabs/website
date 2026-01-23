"use client"

import { useEffect, useRef, useCallback } from "react"

interface Particle {
  x: number
  y: number
  xv: number
  yv: number
  c: string
  s: number
  a: number
}

interface ParticleGravityProps {
  /** Additional CSS classes */
  className?: string
  /** Gravity strength - how strongly particles are pulled to mouse */
  gravityStrength?: number
  /** Spawn interval in ms - lower = more particles */
  spawnInterval?: number
  /** Max particles before cleanup */
  maxParticles?: number
  /** Primary color palette - 'orange' | 'white' | 'mixed' */
  colorScheme?: 'orange' | 'white' | 'mixed'
}

/**
 * Interactive particle gravity effect
 * Based on: https://codepen.io/GabbeV/pen/DMRPox
 * 
 * Particles spawn at mouse position and are attracted back to it.
 * Creates an organic, flowing effect perfect for interactive sections.
 */
export function ParticleGravity({
  className = "",
  gravityStrength = 10,
  spawnInterval = 10,
  maxParticles = 700,
  colorScheme = 'orange',
}: ParticleGravityProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number>()
  const particlesRef = useRef<Particle[]>([])
  const mouseRef = useRef({ x: 0, y: 0, out: true })
  const spawnTimerRef = useRef(0)
  const typeRef = useRef(0)
  const timeRef = useRef(0)
  const initializedRef = useRef(false)

  const getParticleColor = useCallback((type: number): string => {
    switch (colorScheme) {
      case 'orange':
        return type 
          ? `rgb(255,${(200 * Math.random()) | 0},${(80 * Math.random()) | 0})`
          : 'rgba(255,255,255,0.8)'
      case 'white':
        return `rgba(255,255,255,${0.5 + Math.random() * 0.5})`
      case 'mixed':
      default:
        return type 
          ? `rgb(255,${(200 * Math.random()) | 0},${(80 * Math.random()) | 0})`
          : 'rgb(255,255,255)'
    }
  }, [colorScheme])

  const newParticle = useCallback(() => {
    typeRef.current = typeRef.current ? 0 : 1
    const type = typeRef.current
    
    particlesRef.current.push({
      x: mouseRef.current.x,
      y: mouseRef.current.y,
      xv: type ? 18 * Math.random() - 9 : 24 * Math.random() - 12,
      yv: type ? 18 * Math.random() - 9 : 24 * Math.random() - 12,
      c: getParticleColor(type),
      s: type ? 5 + 10 * Math.random() : 1,
      a: 1,
    })
  }, [getParticleColor])

  const draw = useCallback((ctx: CanvasRenderingContext2D, width: number, height: number) => {
    ctx.clearRect(0, 0, width, height)
    
    for (const p of particlesRef.current) {
      ctx.globalAlpha = p.a
      ctx.fillStyle = p.c
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.s, 0, 2 * Math.PI)
      ctx.fill()
    }
  }, [])

  const calculate = useCallback((newTime: number) => {
    const dt = newTime - timeRef.current
    timeRef.current = newTime

    const mouse = mouseRef.current

    // Spawn particles when mouse is inside
    if (!mouse.out) {
      spawnTimerRef.current += dt < 100 ? dt : 100
      while (spawnTimerRef.current > 0) {
        spawnTimerRef.current -= spawnInterval
        newParticle()
      }
    }

    // Cleanup overflow particles
    const overflow = particlesRef.current.length - maxParticles
    if (overflow > 0) {
      particlesRef.current.splice(0, overflow)
    }

    // Update particles
    for (const p of particlesRef.current) {
      if (!mouse.out) {
        const x = mouse.x - p.x
        const y = mouse.y - p.y
        let a = x * x + y * y
        a = a > 100 ? gravityStrength / a : gravityStrength / 100
        p.xv = (p.xv + a * x) * 0.99
        p.yv = (p.yv + a * y) * 0.99
      }
      p.x += p.xv
      p.y += p.yv
      p.a *= 0.99
    }

    // Remove faded particles
    particlesRef.current = particlesRef.current.filter(p => p.a > 0.01)
  }, [gravityStrength, maxParticles, newParticle, spawnInterval])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Set initial size
    const updateSize = () => {
      canvas.width = canvas.clientWidth
      canvas.height = canvas.clientHeight
      // Initialize mouse to center
      if (!initializedRef.current) {
        mouseRef.current = { 
          x: canvas.width / 2, 
          y: canvas.height / 2, 
          out: true 
        }
        initializedRef.current = true
      }
    }
    updateSize()

    // Mouse handlers
    const handleMouseOut = () => {
      mouseRef.current.out = true
    }

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect()
      mouseRef.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
        out: false,
      }
    }

    const handleTouchMove = (e: TouchEvent) => {
      const rect = canvas.getBoundingClientRect()
      const touch = e.touches[0]
      if (touch) {
        mouseRef.current = {
          x: touch.clientX - rect.left,
          y: touch.clientY - rect.top,
          out: false,
        }
      }
    }

    const handleTouchEnd = () => {
      mouseRef.current.out = true
    }

    canvas.addEventListener('mouseout', handleMouseOut)
    canvas.addEventListener('mousemove', handleMouseMove)
    canvas.addEventListener('touchmove', handleTouchMove)
    canvas.addEventListener('touchend', handleTouchEnd)
    window.addEventListener('resize', updateSize)

    // Animation loop
    const loop = (newTime: number) => {
      draw(ctx, canvas.width, canvas.height)
      calculate(newTime)
      animationRef.current = requestAnimationFrame(loop)
    }

    // Start animation
    timeRef.current = performance.now()
    animationRef.current = requestAnimationFrame(loop)

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
      canvas.removeEventListener('mouseout', handleMouseOut)
      canvas.removeEventListener('mousemove', handleMouseMove)
      canvas.removeEventListener('touchmove', handleTouchMove)
      canvas.removeEventListener('touchend', handleTouchEnd)
      window.removeEventListener('resize', updateSize)
    }
  }, [draw, calculate])

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 w-full h-full pointer-events-auto ${className}`}
      style={{ background: 'transparent' }}
    />
  )
}

/**
 * SporeBase themed variant with orange/amber particles
 */
export function SporeGravity({
  className = "",
  ...props
}: Omit<ParticleGravityProps, 'colorScheme'>) {
  return (
    <ParticleGravity
      className={className}
      colorScheme="orange"
      gravityStrength={8}
      spawnInterval={12}
      maxParticles={500}
      {...props}
    />
  )
}
