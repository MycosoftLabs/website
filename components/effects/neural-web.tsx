"use client"

import { useEffect, useRef, useCallback, useState } from "react"

interface Point {
  x: number
  y: number
}

interface Particle {
  x: number
  y: number
  len: number
  r: number
}

interface Spider {
  follow: (x: number, y: number) => void
  tick: (t: number) => void
}

interface NeuralWebProps {
  /** Number of particles per spider */
  particleCount?: number
  /** Number of spiders/nodes */
  spiderCount?: number
  /** Line color */
  color?: string
  /** Background color */
  backgroundColor?: string
  /** Additional CSS classes */
  className?: string
}

/**
 * Neural web animation effect
 * Based on: https://codepen.io/strangerintheq/pen/QWmPzja
 * 
 * Creates an organic, neural network-like visualization that responds
 * to mouse movement. Perfect for sensor/data visualization themes.
 */
export function NeuralWeb({
  particleCount = 333,
  spiderCount = 2,
  color = "#22c55e",
  backgroundColor = "transparent",
  className = "",
}: NeuralWebProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number>()
  const spidersRef = useRef<Spider[]>([])
  const mouseRef = useRef<Point>({ x: 0, y: 0 })
  const [dimensions, setDimensions] = useState({ w: 0, h: 0 })

  // Utility functions
  const rnd = useCallback((x = 1, dx = 0) => Math.random() * x + dx, [])
  
  const many = useCallback(<T,>(n: number, f: (i: number) => T): T[] => {
    return [...Array(n)].map((_, i) => f(i))
  }, [])

  const lerp = useCallback((a: number, b: number, t: number) => a + (b - a) * t, [])

  const noise = useCallback((x: number, y: number, t = 101) => {
    const w0 = Math.sin(0.3 * x + 1.4 * t + 2.0 + 
                 2.5 * Math.sin(0.4 * y + -1.3 * t + 1.0))
    const w1 = Math.sin(0.2 * y + 1.5 * t + 2.8 + 
                 2.3 * Math.sin(0.5 * x + -1.2 * t + 0.5))
    return w0 + w1
  }, [])

  const pt = useCallback((x: number, y: number): Point => ({ x, y }), [])

  // Use ResizeObserver to track container dimensions
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const updateDimensions = () => {
      const rect = container.getBoundingClientRect()
      setDimensions({ w: rect.width, h: rect.height })
    }

    // Initial dimensions
    updateDimensions()

    const resizeObserver = new ResizeObserver(updateDimensions)
    resizeObserver.observe(container)

    return () => {
      resizeObserver.disconnect()
    }
  }, [])

  // Main animation effect
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || dimensions.w === 0 || dimensions.h === 0) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Set canvas dimensions
    canvas.width = dimensions.w
    canvas.height = dimensions.h

    const { sin, cos, PI, hypot, min, max } = Math

    const drawCircle = (x: number, y: number, r: number) => {
      ctx.beginPath()
      ctx.ellipse(x, y, r, r, 0, 0, PI * 2)
      ctx.fill()
    }

    const drawLine = (x0: number, y0: number, x1: number, y1: number) => {
      ctx.beginPath()
      ctx.moveTo(x0, y0)

      many(100, (i) => {
        i = (i + 1) / 100
        const x = lerp(x0, x1, i)
        const y = lerp(y0, y1, i)
        const k = noise(x / 5 + x0, y / 5 + y0) * 2
        ctx.lineTo(x + k, y + k)
      })

      ctx.stroke()
    }

    const spawn = (): Spider => {
      const w = dimensions.w
      const h = dimensions.h

      const pts: Particle[] = many(particleCount, () => ({
        x: rnd(w),
        y: rnd(h),
        len: 0,
        r: 0
      }))

      const pts2: Point[] = many(9, (i) => ({
        x: cos((i / 9) * PI * 2),
        y: sin((i / 9) * PI * 2)
      }))

      const seed = rnd(100)
      let tx = rnd(w)
      let ty = rnd(h)
      let x = rnd(w)
      let y = rnd(h)
      const kx = rnd(0.5, 0.5)
      const ky = rnd(0.5, 0.5)
      const walkRadius = pt(rnd(50, 50), rnd(50, 50))
      const r = w / rnd(100, 150)

      const paintPt = (particle: Particle) => {
        pts2.forEach((pt2) => {
          if (!particle.len) return
          drawLine(
            lerp(x + pt2.x * r, particle.x, particle.len * particle.len),
            lerp(y + pt2.y * r, particle.y, particle.len * particle.len),
            x + pt2.x * r,
            y + pt2.y * r
          )
        })
        drawCircle(particle.x, particle.y, particle.r)
      }

      return {
        follow(newX: number, newY: number) {
          tx = newX
          ty = newY
        },

        tick(t: number) {
          const currentW = dimensions.w

          const selfMoveX = cos(t * kx + seed) * walkRadius.x
          const selfMoveY = sin(t * ky + seed) * walkRadius.y
          const fx = tx + selfMoveX
          const fy = ty + selfMoveY

          x += min(currentW / 100, (fx - x) / 10)
          y += min(currentW / 100, (fy - y) / 10)

          let i = 0
          pts.forEach((particle) => {
            const dx = particle.x - x
            const dy = particle.y - y
            const len = hypot(dx, dy)
            let particleR = min(2, currentW / len / 5)
            const increasing = len < currentW / 10 && i++ < 8
            const dir = increasing ? 0.1 : -0.1
            if (increasing) {
              particleR *= 1.5
            }
            particle.r = particleR
            particle.len = max(0, min(particle.len + dir, 1))
            paintPt(particle)
          })
        }
      }
    }

    // Set initial mouse position to center
    mouseRef.current = {
      x: dimensions.w / 2,
      y: dimensions.h / 2
    }

    // Initialize spiders
    spidersRef.current = many(spiderCount, spawn)

    // Animation loop
    const animate = (t: number) => {
      // Clear with background
      if (backgroundColor === "transparent") {
        ctx.clearRect(0, 0, dimensions.w, dimensions.h)
      } else {
        ctx.fillStyle = backgroundColor
        drawCircle(0, 0, dimensions.w * 10)
      }

      ctx.fillStyle = color
      ctx.strokeStyle = color
      ctx.lineWidth = 0.5

      const time = t / 1000
      spidersRef.current.forEach((spider) => {
        spider.follow(mouseRef.current.x, mouseRef.current.y)
        spider.tick(time)
      })

      animationRef.current = requestAnimationFrame(animate)
    }

    animationRef.current = requestAnimationFrame(animate)

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [dimensions, particleCount, spiderCount, color, backgroundColor, many, rnd, lerp, noise, pt])

  // Mouse/touch tracking
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const handlePointerMove = (e: PointerEvent) => {
      const rect = container.getBoundingClientRect()
      mouseRef.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      }
    }

    const handlePointerLeave = () => {
      // Move to center when mouse leaves
      mouseRef.current = {
        x: dimensions.w / 2,
        y: dimensions.h / 2
      }
    }

    container.addEventListener("pointermove", handlePointerMove)
    container.addEventListener("pointerleave", handlePointerLeave)

    return () => {
      container.removeEventListener("pointermove", handlePointerMove)
      container.removeEventListener("pointerleave", handlePointerLeave)
    }
  }, [dimensions])

  return (
    <div
      ref={containerRef}
      className={`absolute inset-0 w-full h-full overflow-hidden ${className}`}
      style={{ pointerEvents: "auto" }}
    >
      <canvas
        ref={canvasRef}
        style={{ 
          display: "block",
          width: "100%",
          height: "100%",
        }}
      />
    </div>
  )
}

/**
 * Sensor-themed variant with green neural web
 * Perfect for Mushroom 1 Advanced Sensor Suite section
 */
export function SensorNeuralWeb({
  className = "",
  ...props
}: Omit<NeuralWebProps, 'color' | 'backgroundColor'>) {
  return (
    <NeuralWeb
      particleCount={250}
      spiderCount={3}
      color="rgba(34, 197, 94, 0.6)" // Green with transparency
      backgroundColor="transparent"
      className={className}
      {...props}
    />
  )
}
