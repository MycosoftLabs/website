"use client"

import { useEffect, useRef } from "react"

type Point = { x: number; y: number }
type CircuitLine = Point[]

function intersects(x1: number, y1: number, x2: number, y2: number, x3: number, y3: number, x4: number, y4: number) {
  const denom = (y4 - y3) * (x2 - x1) - (x4 - x3) * (y2 - y1)
  if (denom === 0) return false

  const ua = ((x4 - x3) * (y1 - y3) - (y4 - y3) * (x1 - x3)) / denom
  const ub = ((x2 - x1) * (y1 - y3) - (y2 - y1) * (x1 - x3)) / denom
  return ua >= 0 && ua <= 1 && ub >= 0 && ub <= 1
}

function warpIt(center: Point, point: Point) {
  const p = { ...point }
  const dx = center.x - p.x
  const dy = center.y - p.y
  const magnitude = Math.hypot(dx, dy)

  if (magnitude > 0 && magnitude < 100) {
    const target = (magnitude * magnitude) / 100
    p.x += (dx / magnitude) * target
    p.y += (dy / magnitude) * target
  }

  return p
}

export function CircuitLinesBackground() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const pointerRef = useRef<Point | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const context = canvas.getContext("2d")
    if (!context) return

    let width = 0
    let height = 0
    let frameId = 0
    let lines: CircuitLine[] = []

    const intersectsAnother = (x3: number, y3: number, x4: number, y4: number) => {
      for (const points of lines) {
        for (let i = 0; i < points.length - 1; i += 1) {
          const p1 = points[i]
          const p2 = points[i + 1]
          if (intersects(p1.x, p1.y, p2.x, p2.y, x3, y3, x4, y4)) return true
        }
      }
      return false
    }

    const addLine = () => {
      const line: CircuitLine = []
      let x = Math.random() * width
      let y = Math.random() * height
      let angle = Math.floor(Math.random() * 8) * Math.PI / 4
      const parts = 2 + Math.floor(Math.random() * 4)
      line.push({ x, y })

      for (let i = 1; i < parts; i += 1) {
        let tries = 80
        let doBreak = false

        do {
          const distance = 30 + Math.random() * 470
          const xDiff = Math.cos(angle) * distance
          const yDiff = Math.sin(angle) * distance
          const angleDiff = Math.random() < 0.5 ? -Math.PI / 4 : Math.PI / 4
          const previous = line[i - 1]

          if (intersectsAnother(x + xDiff, y + yDiff, previous.x, previous.y)) {
            doBreak = true
          } else {
            doBreak = false
            x += xDiff
            y += yDiff
            angle += angleDiff
            line.push({ x, y })
            break
          }
        } while (--tries)

        if (doBreak && tries === 0) break
      }

      if (line.length > 1) lines.push(line)
    }

    const buildLines = () => {
      lines = []
      const count = Math.min(800, Math.max(260, Math.floor((width * height) / 2600)))
      for (let i = 0; i < count; i += 1) addLine()
    }

    const resize = () => {
      const rect = canvas.getBoundingClientRect()
      width = Math.max(1, rect.width)
      height = Math.max(1, rect.height)
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = Math.floor(width * dpr)
      canvas.height = Math.floor(height * dpr)
      context.setTransform(dpr, 0, 0, dpr, 0, 0)
      buildLines()
    }

    const drawLines = () => {
      const isDark = document.documentElement.classList.contains("dark")
      const bg = isDark ? "black" : "white"
      const fg = isDark ? "white" : "black"
      const center = pointerRef.current ?? { x: width / 2, y: height / 2 }

      context.fillStyle = bg
      context.fillRect(0, 0, width, height)
      context.lineWidth = 1
      context.strokeStyle = fg
      context.fillStyle = fg

      for (const points of lines) {
        const first = warpIt(center, points[0])
        context.beginPath()
        context.arc(first.x, first.y, 2, 0, Math.PI * 2)
        context.fill()

        context.beginPath()
        points.forEach((point, index) => {
          const p = warpIt(center, point)
          if (index === 0) context.moveTo(p.x, p.y)
          else context.lineTo(p.x, p.y)
        })
        context.stroke()

        const last = warpIt(center, points[points.length - 1])
        context.beginPath()
        context.arc(last.x, last.y, 2, 0, Math.PI * 2)
        context.fill()
      }
    }

    const animate = () => {
      drawLines()
      frameId = requestAnimationFrame(animate)
    }

    const onPointerMove = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect()
      pointerRef.current = { x: event.clientX - rect.left, y: event.clientY - rect.top }
    }

    const observer = new ResizeObserver(resize)
    observer.observe(canvas)
    window.addEventListener("pointermove", onPointerMove, { passive: true })
    window.addEventListener("pointerdown", onPointerMove, { passive: true })
    resize()
    animate()

    return () => {
      cancelAnimationFrame(frameId)
      observer.disconnect()
      window.removeEventListener("pointermove", onPointerMove)
      window.removeEventListener("pointerdown", onPointerMove)
    }
  }, [])

  return <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true" />
}
