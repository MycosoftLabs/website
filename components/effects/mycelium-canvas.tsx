"use client"

import { useEffect, useRef } from "react"
import { useTheme } from "next-themes"

interface MyceliumCanvasProps {
  className?: string
}

interface HifaConfig {
  lineColor: (hue: number) => string
  pulseColor: (hue: number) => string
  maxGrowth: number
  branchProbability: number
  maxHifas: number
}

class Hifa {
  x: number
  y: number
  angle: number
  hue: number
  depth: number
  speed: number
  length: number
  active: boolean
  life: number

  constructor(x: number, y: number, angle: number, hue: number, depth = 0) {
    this.x = x
    this.y = y
    this.angle = angle
    this.hue = hue
    this.depth = depth
    this.speed = Math.random() * 2 + 1
    this.length = 0
    this.active = true
    this.life = Math.random() * 100 + 50
  }

  update(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    config: HifaConfig,
    hifas: Hifa[]
  ): void {
    if (!this.active) return

    this.angle += (Math.random() - 0.5) * 0.5
    const nextX = this.x + Math.cos(this.angle) * this.speed
    const nextY = this.y + Math.sin(this.angle) * this.speed

    ctx.beginPath()
    ctx.moveTo(this.x, this.y)
    ctx.lineTo(nextX, nextY)
    ctx.strokeStyle = config.lineColor(this.hue)
    ctx.lineWidth = Math.max(0.5, 3 / (this.depth + 1))
    ctx.stroke()

    if (Math.random() > 0.98) {
      this.drawPulse(ctx, nextX, nextY, config)
    }

    this.x = nextX
    this.y = nextY
    this.length++

    if (
      this.active &&
      Math.random() < config.branchProbability &&
      hifas.length < config.maxHifas
    ) {
      hifas.push(new Hifa(this.x, this.y, this.angle + 0.5, this.hue + 5, this.depth + 1))
    }

    if (
      this.length > this.life ||
      this.x < 0 ||
      this.x > width ||
      this.y < 0 ||
      this.y > height
    ) {
      this.active = false
    }
  }

  drawPulse(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    config: HifaConfig
  ): void {
    ctx.beginPath()
    ctx.arc(x, y, 2, 0, Math.PI * 2)
    ctx.shadowBlur = 15
    ctx.shadowColor = config.pulseColor(this.hue)
    ctx.fillStyle = config.pulseColor(this.hue)
    ctx.fill()
    ctx.shadowBlur = 0
  }
}

export function MyceliumCanvas({ className = "" }: MyceliumCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const hifasRef = useRef<Hifa[]>([])
  const animationRef = useRef<number | null>(null)
  const { resolvedTheme } = useTheme()

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const isDark = resolvedTheme === "dark"

    const config: HifaConfig = {
      lineColor: (hue: number) =>
        isDark
          ? `hsla(${hue}, 80%, 60%, 0.15)`
          : `hsla(${hue}, 70%, 35%, 0.12)`,
      pulseColor: (hue: number) =>
        isDark
          ? `hsla(${hue}, 100%, 80%, 1)`
          : `hsla(${hue}, 90%, 50%, 0.8)`,
      maxGrowth: 15,
      branchProbability: 0.12,
      maxHifas: 800,
    }

    const globalHue = 140

    const bgColorLight = "#ffffff"
    const bgColorDark = "#374151"
    const fadeColorLight = "rgba(255, 255, 255, 0.01)"
    const fadeColorDark = "rgba(55, 65, 81, 0.01)"

    const resize = () => {
      canvas.width = canvas.offsetWidth
      canvas.height = canvas.offsetHeight
    }

    const reset = () => {
      const width = canvas.width
      const height = canvas.height
      ctx.fillStyle = isDark ? bgColorDark : bgColorLight
      ctx.fillRect(0, 0, width, height)
      hifasRef.current = []

      for (let i = 0; i < 6; i++) {
        const angle = (i * Math.PI * 2) / 6
        const x = width / 2 + Math.cos(angle) * 50
        const y = height / 2 + Math.sin(angle) * 50
        hifasRef.current.push(new Hifa(x, y, angle, globalHue, 0))
      }
    }

    const animate = () => {
      const width = canvas.width
      const height = canvas.height

      ctx.fillStyle = isDark ? fadeColorDark : fadeColorLight
      ctx.fillRect(0, 0, width, height)

      hifasRef.current.forEach((h) =>
        h.update(ctx, width, height, config, hifasRef.current)
      )

      if (hifasRef.current.filter((h) => h.active).length < 5) {
        const x = Math.random() * width
        const y = Math.random() * height
        hifasRef.current.push(new Hifa(x, y, Math.random() * Math.PI * 2, globalHue, 0))
      }

      animationRef.current = requestAnimationFrame(animate)
    }

    resize()
    reset()
    animate()

    const handleResize = () => {
      resize()
      reset()
    }

    window.addEventListener("resize", handleResize)

    return () => {
      window.removeEventListener("resize", handleResize)
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [resolvedTheme])

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 w-full h-full ${className}`}
      style={{ pointerEvents: "none" }}
    />
  )
}
