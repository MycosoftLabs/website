"use client"

import { useEffect, useRef, useCallback } from "react"
import { cn } from "@/lib/utils"

interface ConnectedDotsProps {
  /** Number of dots */
  totalDots?: number
  /** Minimum distance for line connections */
  minDistance?: number
  /** Cursor friction (0-1, lower = smoother) */
  friction?: number
  /** Dot color */
  dotColor?: string
  /** Line color */
  lineColor?: string
  /** Cursor dot color */
  cursorColor?: string
  /** Background color */
  backgroundColor?: string
  /** Additional CSS classes */
  className?: string
}

// Extend Math with distance function
function distance(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2))
}

interface Dot {
  position: { x: number; y: number }
  radius: number
  velocity: { x: number; y: number }
}

/**
 * Connected Dots Animation
 * Based on: https://codepen.io/JuanFuentes/pen/yXoQYp
 * 
 * Creates floating dots that connect to the cursor with lines
 * when within a certain distance. Perfect for interactive backgrounds.
 */
export function ConnectedDots({
  totalDots = 100,
  minDistance = 80,
  friction = 0.15,
  dotColor = "rgba(30, 41, 59, 0.6)",
  lineColor = "rgba(30, 41, 59, 0.4)",
  cursorColor = "rgba(30, 41, 59, 0.8)",
  backgroundColor = "transparent",
  className = "",
}: ConnectedDotsProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const dotsRef = useRef<Dot[]>([])
  const mouseRef = useRef({ x: 0, y: 0 })
  const cursorRef = useRef({ x: 0, y: 0 })
  const animationRef = useRef<number>()
  const PI2 = Math.PI * 2

  // Create a single dot
  const createDot = useCallback((canvasWidth: number, canvasHeight: number): Dot => {
    return {
      position: {
        x: Math.random() * canvasWidth,
        y: Math.random() * canvasHeight,
      },
      radius: 1 + Math.ceil(Math.random() * 3), // 2-4px radius for better visibility
      velocity: {
        x: (Math.random() * 2 - 1) * 0.8,  // Slightly slower movement
        y: (Math.random() * 2 - 1) * 0.8,
      },
    }
  }, [])

  // Initialize dots
  const initDots = useCallback((canvasWidth: number, canvasHeight: number) => {
    dotsRef.current = []
    for (let i = 0; i < totalDots; i++) {
      dotsRef.current.push(createDot(canvasWidth, canvasHeight))
    }
  }, [totalDots, createDot])

  // Update dot position with wrapping
  const updateDot = useCallback((dot: Dot, canvasWidth: number, canvasHeight: number) => {
    dot.position.x += dot.velocity.x
    dot.position.y += dot.velocity.y

    // Wrap around edges
    if (dot.position.x < 0) dot.position.x = canvasWidth
    if (dot.position.y < 0) dot.position.y = canvasHeight
    if (dot.position.x > canvasWidth) dot.position.x = 0
    if (dot.position.y > canvasHeight) dot.position.y = 0
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Set canvas size
    const updateSize = () => {
      const rect = container.getBoundingClientRect()
      canvas.width = rect.width
      canvas.height = rect.height
      
      // Initialize cursor to center
      cursorRef.current = { x: rect.width / 2, y: rect.height / 2 }
      mouseRef.current = { x: rect.width / 2, y: rect.height / 2 }
      
      // Reinitialize dots when size changes
      initDots(rect.width, rect.height)
    }
    updateSize()

    // Mouse/touch event handlers
    const handleMouseMove = (event: MouseEvent) => {
      const rect = canvas.getBoundingClientRect()
      mouseRef.current = {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
      }
    }

    const handleTouchMove = (event: TouchEvent) => {
      const rect = canvas.getBoundingClientRect()
      const touch = event.touches[0]
      if (touch) {
        mouseRef.current = {
          x: touch.clientX - rect.left,
          y: touch.clientY - rect.top,
        }
      }
    }

    // Animation loop
    const animate = () => {
      const { width, height } = canvas

      // Clear canvas
      ctx.clearRect(0, 0, width, height)

      // Update cursor position with friction (smooth follow)
      cursorRef.current.x += (mouseRef.current.x - cursorRef.current.x) * friction
      cursorRef.current.y += (mouseRef.current.y - cursorRef.current.y) * friction

      // Draw cursor dot
      ctx.beginPath()
      ctx.fillStyle = cursorColor
      ctx.arc(cursorRef.current.x, cursorRef.current.y, 3, 0, PI2)
      ctx.fill()

      // Draw and update dots
      for (const dot of dotsRef.current) {
        // Update position
        updateDot(dot, width, height)

        // Draw dot
        ctx.beginPath()
        ctx.fillStyle = dotColor
        ctx.arc(dot.position.x, dot.position.y, dot.radius, 0, PI2)
        ctx.fill()

        // Draw line to cursor if within distance
        const dist = distance(dot.position, cursorRef.current)
        if (dist < minDistance) {
          ctx.beginPath()
          ctx.moveTo(dot.position.x, dot.position.y)
          ctx.lineTo(cursorRef.current.x, cursorRef.current.y)
          ctx.strokeStyle = lineColor
          ctx.lineWidth = 1 - dist / minDistance // Thicker when closer
          ctx.stroke()
        }
      }

      animationRef.current = requestAnimationFrame(animate)
    }

    // Start animation
    animate()

    // Add event listeners
    const resizeObserver = new ResizeObserver(updateSize)
    resizeObserver.observe(container)
    
    container.addEventListener("mousemove", handleMouseMove)
    container.addEventListener("touchmove", handleTouchMove, { passive: true })

    // Cleanup
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
      resizeObserver.disconnect()
      container.removeEventListener("mousemove", handleMouseMove)
      container.removeEventListener("touchmove", handleTouchMove)
    }
  }, [totalDots, minDistance, friction, dotColor, lineColor, cursorColor, initDots, updateDot, PI2])

  return (
    <div
      ref={containerRef}
      className={cn("absolute inset-0 overflow-hidden pointer-events-auto", className)}
      style={{ backgroundColor }}
    >
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
    </div>
  )
}

/**
 * Light theme variant for "Choose Your Size" section
 * Slate-colored dots on light background - dense particles, darker colors
 */
export function ProductShowcaseDots({
  className = "",
  ...props
}: Omit<ConnectedDotsProps, 'dotColor' | 'lineColor' | 'cursorColor'>) {
  return (
    <ConnectedDots
      totalDots={300}              // Dense particle field
      minDistance={100}            // Connection radius
      friction={0.12}              // Smooth cursor follow
      dotColor="rgba(15, 23, 42, 0.8)"    // Slate-900, darker/bolder
      lineColor="rgba(15, 23, 42, 0.6)"   // Slate-900, darker lines
      cursorColor="rgba(15, 23, 42, 1)"   // Slate-900, solid cursor
      className={className}
      {...props}
    />
  )
}
