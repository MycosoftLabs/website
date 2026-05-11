"use client"

import { useEffect, useRef } from "react"
import { shouldUseLightweightVisuals } from "@/lib/client-motion"

const GRID_SIZE = 5

const SETTINGS = {
  speed: 1.6,
  branchProb: 0.07,
  taper: 1,
  minWidth: 0.2,
  rootColor: "rgba(180, 200, 220, 0.38)",
  neonColor: "#00f2ff",
  nodeSize: 0.25,
}

interface HyphaeRootNetworkBackgroundProps {
  className?: string
}

interface ConnectionPoint {
  x: number
  y: number
  alpha: number
  size: number
}

interface GridCell {
  id: number
}

class RootNode {
  x: number
  y: number
  angle: number
  width: number
  id: number
  active = true

  constructor(x: number, y: number, angle: number, width: number, id: number) {
    this.x = x
    this.y = y
    this.angle = angle
    this.width = width
    this.id = id
  }

  update(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    roots: RootNode[],
    grid: Map<string, GridCell>,
    connectionPoints: ConnectionPoint[],
  ) {
    if (!this.active) return

    const oldX = this.x
    const oldY = this.y

    this.angle += (Math.random() - 0.5) * 0.3
    this.x += Math.cos(this.angle) * SETTINGS.speed
    this.y += Math.sin(this.angle) * SETTINGS.speed
    this.width *= SETTINGS.taper

    ctx.beginPath()
    ctx.lineWidth = this.width
    ctx.lineCap = "round"
    ctx.strokeStyle = SETTINGS.rootColor
    ctx.moveTo(oldX, oldY)
    ctx.lineTo(this.x, this.y)
    ctx.stroke()

    this.checkConnection(grid, connectionPoints)

    if (Math.random() < SETTINGS.branchProb && this.width > 0.8) {
      this.split(roots)
    }

    if (
      this.width < SETTINGS.minWidth ||
      this.x < 0 ||
      this.x > width ||
      this.y < 0 ||
      this.y > height
    ) {
      this.active = false
    }
  }

  private checkConnection(grid: Map<string, GridCell>, connectionPoints: ConnectionPoint[]) {
    const gx = Math.round(this.x / GRID_SIZE)
    const gy = Math.round(this.y / GRID_SIZE)
    const key = `${gx},${gy}`

    if (grid.has(key)) {
      const other = grid.get(key)
      if (other && other.id !== this.id) {
        connectionPoints.push({
          x: this.x,
          y: this.y,
          alpha: 1,
          size: Math.random() * SETTINGS.nodeSize + 0.5,
        })
        this.width *= 0.5
        grid.delete(key)
      }
    } else {
      grid.set(key, { id: this.id })
    }
  }

  private split(roots: RootNode[]) {
    const angleOffset = (Math.random() - 0.5) * 1.1
    roots.push(
      new RootNode(
        this.x,
        this.y,
        this.angle + angleOffset,
        this.width * 0.65,
        this.id,
      ),
    )
    this.angle -= angleOffset * 0.5
    this.width *= 0.65
  }
}

export function HyphaeRootNetworkBackground({ className = "" }: HyphaeRootNetworkBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext("2d")
    if (!canvas || !ctx) return

    const roots: RootNode[] = []
    const connectionPoints: ConnectionPoint[] = []
    const grid = new Map<string, GridCell>()
    const prefersReducedMotion = shouldUseLightweightVisuals()
    let width = 0
    let height = 0
    let frame: number | null = null

    function spawn(x: number, y: number) {
      const rootId = Math.random()
      const branches = 6
      for (let i = 0; i < branches; i += 1) {
        roots.push(new RootNode(x, y, ((Math.PI * 2) / branches) * i, 2.5, rootId))
      }
    }

    function init() {
      const rect = canvas.getBoundingClientRect()
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      width = Math.max(1, rect.width)
      height = Math.max(1, rect.height)
      canvas.width = Math.round(width * dpr)
      canvas.height = Math.round(height * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.fillStyle = "#010203"
      ctx.fillRect(0, 0, width, height)

      roots.splice(0)
      connectionPoints.splice(0)
      grid.clear()

      const sectionSeeds = [
        [0.18, 0.05],
        [0.74, 0.08],
        [0.16, 0.18],
        [0.84, 0.24],
        [0.36, 0.36],
        [0.68, 0.58],
      ]
      const seedCount = prefersReducedMotion ? 2 : sectionSeeds.length
      for (let i = 0; i < seedCount; i += 1) {
        const [x, y] = sectionSeeds[i]
        spawn(width * x, height * y)
      }
      for (let i = 0; i < 2; i += 1) {
        spawn(Math.random() * width, Math.random() * height)
      }

      const warmupFrames = prefersReducedMotion ? 50 : 150
      for (let i = 0; i < warmupFrames; i += 1) {
        drawNetworkFrame()
      }
    }

    function drawNetworkFrame() {
      ctx.fillStyle = prefersReducedMotion ? "rgba(1, 2, 3, 0.02)" : "rgba(1, 2, 3, 0.005)"
      ctx.fillRect(0, 0, width, height)

      ctx.save()
      for (const point of connectionPoints) {
        ctx.beginPath()
        ctx.arc(point.x, point.y, point.size, 0, Math.PI * 2)
        ctx.fillStyle = SETTINGS.neonColor
        ctx.shadowBlur = 1
        ctx.shadowColor = SETTINGS.neonColor
        ctx.globalAlpha = point.alpha
        ctx.fill()
        point.alpha = 0.7 + Math.random() * 0.3
      }
      ctx.restore()

      for (let i = roots.length - 1; i >= 0; i -= 1) {
        roots[i].update(ctx, width, height, roots, grid, connectionPoints)
        if (!roots[i].active) roots.splice(i, 1)
      }

      if (roots.length < 5) {
        spawn(Math.random() * width, Math.random() * height)
      }
    }

    let lastFrame = 0
    function animate(now = 0) {
      if (document.hidden || (prefersReducedMotion && now - lastFrame < 250)) {
        frame = requestAnimationFrame(animate)
        return
      }
      lastFrame = now
      drawNetworkFrame()
      frame = requestAnimationFrame(animate)
    }

    function handlePointerDown(event: PointerEvent) {
      const rect = canvas.getBoundingClientRect()
      spawn(event.clientX - rect.left, event.clientY - rect.top)
    }

    const resizeObserver = new ResizeObserver(init)
    resizeObserver.observe(canvas)
    canvas.addEventListener("pointerdown", handlePointerDown)
    init()
    frame = requestAnimationFrame(animate)

    return () => {
      if (frame) cancelAnimationFrame(frame)
      resizeObserver.disconnect()
      canvas.removeEventListener("pointerdown", handlePointerDown)
    }
  }, [])

  return (
    <canvas
      id="c"
      ref={canvasRef}
      aria-hidden="true"
      className={`block h-full w-full ${className}`}
      style={{ filter: "contrast(1.1) brightness(1.2)" }}
    />
  )
}
