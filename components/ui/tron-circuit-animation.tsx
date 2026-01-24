"use client"

import { useEffect, useRef, useCallback } from "react"

interface TronCircuitAnimationProps {
  opacity?: number
  lineColor?: string
  glowColor?: string
  particleColor?: string
  lineWidth?: number
  particleCount?: number
  gridSize?: number
  animationSpeed?: number
}

interface CircuitLine {
  startX: number
  startY: number
  endX: number
  endY: number
  progress: number
  speed: number
  direction: "horizontal" | "vertical"
  pulseOffset: number
}

interface DataParticle {
  x: number
  y: number
  targetX: number
  targetY: number
  speed: number
  size: number
  trail: { x: number; y: number }[]
  maxTrailLength: number
  lineIndex: number
  progress: number
}

// Tron-style circuit animation with glowing lines and data particles
export function TronCircuitAnimation({
  opacity = 0.6,
  lineColor = "#8B5CF6",
  glowColor = "#A855F7",
  particleColor = "#22D3EE",
  lineWidth = 1,
  particleCount = 30,
  gridSize = 60,
  animationSpeed = 1
}: TronCircuitAnimationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const animationRef = useRef<number>(0)
  const linesRef = useRef<CircuitLine[]>([])
  const particlesRef = useRef<DataParticle[]>([])
  const timeRef = useRef(0)

  // Generate circuit grid lines
  const generateCircuit = useCallback((width: number, height: number) => {
    const lines: CircuitLine[] = []
    const cols = Math.ceil(width / gridSize)
    const rows = Math.ceil(height / gridSize)

    // Horizontal lines
    for (let row = 1; row < rows; row++) {
      const y = row * gridSize
      const segments = Math.floor(Math.random() * 3) + 1
      let currentX = 0

      for (let s = 0; s < segments; s++) {
        const segmentWidth = (width / segments) * (0.5 + Math.random() * 0.5)
        const startX = currentX + Math.random() * gridSize
        const endX = Math.min(startX + segmentWidth, width)

        if (endX > startX + gridSize) {
          lines.push({
            startX,
            startY: y,
            endX,
            endY: y,
            progress: 0,
            speed: 0.002 + Math.random() * 0.003,
            direction: "horizontal",
            pulseOffset: Math.random() * Math.PI * 2
          })
        }
        currentX = endX
      }
    }

    // Vertical lines
    for (let col = 1; col < cols; col++) {
      const x = col * gridSize
      const segments = Math.floor(Math.random() * 2) + 1
      let currentY = 0

      for (let s = 0; s < segments; s++) {
        const segmentHeight = (height / segments) * (0.4 + Math.random() * 0.6)
        const startY = currentY + Math.random() * gridSize
        const endY = Math.min(startY + segmentHeight, height)

        if (endY > startY + gridSize) {
          lines.push({
            startX: x,
            startY,
            endX: x,
            endY,
            progress: 0,
            speed: 0.002 + Math.random() * 0.003,
            direction: "vertical",
            pulseOffset: Math.random() * Math.PI * 2
          })
        }
        currentY = endY
      }
    }

    // Add some diagonal accent lines
    for (let i = 0; i < 5; i++) {
      const startX = Math.random() * width
      const startY = Math.random() * height
      const angle = (Math.random() * Math.PI) / 4 - Math.PI / 8
      const length = 50 + Math.random() * 100

      lines.push({
        startX,
        startY,
        endX: startX + Math.cos(angle) * length,
        endY: startY + Math.sin(angle) * length,
        progress: 0,
        speed: 0.003 + Math.random() * 0.002,
        direction: "horizontal",
        pulseOffset: Math.random() * Math.PI * 2
      })
    }

    return lines
  }, [gridSize])

  // Generate data particles that travel along lines
  const generateParticles = useCallback((lines: CircuitLine[], count: number) => {
    const particles: DataParticle[] = []

    for (let i = 0; i < count; i++) {
      const lineIndex = Math.floor(Math.random() * lines.length)
      const line = lines[lineIndex]
      if (!line) continue

      particles.push({
        x: line.startX,
        y: line.startY,
        targetX: line.endX,
        targetY: line.endY,
        speed: 0.5 + Math.random() * 1.5,
        size: 2 + Math.random() * 2,
        trail: [],
        maxTrailLength: 15 + Math.floor(Math.random() * 10),
        lineIndex,
        progress: Math.random()
      })
    }

    return particles
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Setup canvas
    const setupCanvas = () => {
      const rect = container.getBoundingClientRect()
      const dpr = window.devicePixelRatio || 1
      canvas.width = rect.width * dpr
      canvas.height = rect.height * dpr
      canvas.style.width = `${rect.width}px`
      canvas.style.height = `${rect.height}px`
      ctx.scale(dpr, dpr)

      // Regenerate circuit for new size
      linesRef.current = generateCircuit(rect.width, rect.height)
      particlesRef.current = generateParticles(linesRef.current, particleCount)
    }

    setupCanvas()

    // Animation loop
    const animate = () => {
      const rect = container.getBoundingClientRect()
      ctx.clearRect(0, 0, rect.width, rect.height)
      timeRef.current += 0.016 * animationSpeed

      const lines = linesRef.current
      const particles = particlesRef.current

      // Draw circuit lines with glow
      lines.forEach((line) => {
        const pulseIntensity = 0.3 + 0.7 * Math.sin(timeRef.current * 2 + line.pulseOffset)

        // Glow effect
        ctx.shadowBlur = 8 * pulseIntensity
        ctx.shadowColor = glowColor
        ctx.strokeStyle = lineColor
        ctx.lineWidth = lineWidth
        ctx.globalAlpha = 0.3 + 0.4 * pulseIntensity

        ctx.beginPath()
        ctx.moveTo(line.startX, line.startY)
        ctx.lineTo(line.endX, line.endY)
        ctx.stroke()

        // Reset shadow
        ctx.shadowBlur = 0
      })

      // Update and draw particles
      particles.forEach((particle, idx) => {
        const line = lines[particle.lineIndex]
        if (!line) return

        // Update progress
        particle.progress += particle.speed * 0.01 * animationSpeed

        // Calculate position along line
        const t = particle.progress % 1
        particle.x = line.startX + (line.endX - line.startX) * t
        particle.y = line.startY + (line.endY - line.startY) * t

        // Add to trail
        particle.trail.unshift({ x: particle.x, y: particle.y })
        if (particle.trail.length > particle.maxTrailLength) {
          particle.trail.pop()
        }

        // Draw trail
        particle.trail.forEach((point, i) => {
          const alpha = 1 - i / particle.maxTrailLength
          ctx.globalAlpha = alpha * 0.8
          ctx.fillStyle = particleColor
          ctx.shadowBlur = 6 * alpha
          ctx.shadowColor = particleColor

          const size = particle.size * (1 - i / particle.maxTrailLength * 0.5)
          ctx.beginPath()
          ctx.arc(point.x, point.y, size, 0, Math.PI * 2)
          ctx.fill()
        })

        // Draw main particle with strong glow
        ctx.globalAlpha = 1
        ctx.shadowBlur = 12
        ctx.shadowColor = particleColor
        ctx.fillStyle = "#fff"
        ctx.beginPath()
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2)
        ctx.fill()

        // Reset to line when complete
        if (particle.progress >= 1) {
          const newLineIndex = Math.floor(Math.random() * lines.length)
          const newLine = lines[newLineIndex]
          if (newLine) {
            particle.lineIndex = newLineIndex
            particle.progress = 0
            particle.x = newLine.startX
            particle.y = newLine.startY
            particle.targetX = newLine.endX
            particle.targetY = newLine.endY
            particle.trail = []
          }
        }
      })

      ctx.shadowBlur = 0
      ctx.globalAlpha = 1

      animationRef.current = requestAnimationFrame(animate)
    }

    animate()

    // Handle resize
    const handleResize = () => {
      setupCanvas()
    }

    window.addEventListener("resize", handleResize)

    return () => {
      window.removeEventListener("resize", handleResize)
      cancelAnimationFrame(animationRef.current)
    }
  }, [generateCircuit, generateParticles, particleCount, lineColor, glowColor, particleColor, lineWidth, animationSpeed])

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 overflow-hidden pointer-events-none"
      style={{ opacity }}
    >
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
      />
    </div>
  )
}
