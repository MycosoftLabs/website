"use client"

import { useEffect, useRef } from "react"
import { useTheme } from "next-themes"

interface PsathyrellaSonarCanvasProps {
  className?: string
}

function dist(x1: number, y1: number, x2: number, y2: number): number {
  const dx = x1 - x2
  const dy = y1 - y2
  return Math.sqrt(dx * dx + dy * dy)
}

function mapRange(
  value: number,
  istart: number,
  istop: number,
  ostart: number,
  ostop: number
): number {
  return ostart + (ostop - ostart) * ((value - istart) / (istop - istart))
}

function max2(v1: number, v2: number): number {
  return v1 > v2 ? v1 : v2
}

function constrainVal(value: number, min: number, max: number): number {
  if (value > max) return max
  if (value < min) return min
  return value
}

/** Blue sonar blips — staggered hues from cyan through deep blue */
function blipColor(gridStrength: number, frameCount: number): string {
  const hue =
    188 +
    ((((gridStrength * 19 + Math.floor(frameCount / 4)) % 42) + 42) % 42)
  const sat = 56 + (gridStrength % 5) * 8
  const light = 34 + (gridStrength % 8) * 5
  const alpha = 0.2 + (gridStrength % 5) * 0.07
  return `hsla(${hue}, ${sat}%, ${light}%, ${alpha})`
}

export function PsathyrellaSonarCanvas({ className = "" }: PsathyrellaSonarCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number>(0)
  const { resolvedTheme } = useTheme()

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const isDark = resolvedTheme === "dark"

    const rectSize = 30
    const sonarPower = 10
    const pulseCooldown = 150
    const numColorRect = 150
    const sonarSpeed = 6

    let grid: Record<string, number> = {}
    let countPulse = pulseCooldown + 1
    let rayonSonar = -1
    let centerSonarX = 0
    let centerSonarY = 0
    let frameCount = 0

    const bgClear = () => {
      const w = canvas.width
      const h = canvas.height
      if (isDark) {
        ctx.fillStyle = "rgb(15 23 42)"
      } else {
        ctx.fillStyle = "rgb(248 250 252)"
      }
      ctx.fillRect(0, 0, w, h)
    }

    function generateGrid(cx: number, cy: number, power: number): void {
      countPulse = 0
      rayonSonar = 0
      centerSonarX = cx
      centerSonarY = cy
      grid = {}

      const maxCol = Math.floor(canvas.width / rectSize)
      const maxRow = Math.floor(canvas.height / rectSize)
      let gx = constrainVal(Math.floor(cx / rectSize), 0, maxCol)
      let gy = constrainVal(Math.floor(cy / rectSize), 0, maxRow)
      const startX = gx
      const startY = gy
      let previous = -1

      const key = `${gx},${gy}`
      grid[key] = 1

      for (let p = 0; p < power; p++) {
        let nTry = 0
        while (nTry < 4) {
          const rand = Math.random()
          if (rand < 0.25 && previous !== 0) {
            gx += 1
            previous = 1
            nTry = 4
          } else if (rand < 0.5 && previous !== 1) {
            gx -= 1
            previous = 0
            nTry = 4
          } else if (rand < 0.75 && previous !== 2) {
            gy += 1
            previous = 3
            nTry = 4
          } else if (previous !== 3) {
            gy -= 1
            previous = 2
            nTry = 4
          }
          nTry++
        }

        const k = `${gx},${gy}`
        if (grid[k] === 1) grid[k] += 1
        else grid[k] = 1

        if (gx < 0 || gy < 0 || gx > maxCol || gy > maxRow) {
          gx = startX
          gy = startY
        }
      }
    }

    function isUnderSonarRayon(i: number, j: number): number {
      return dist(i * rectSize, j * rectSize, centerSonarX, centerSonarY)
    }

    const resize = () => {
      canvas.width = canvas.offsetWidth
      canvas.height = canvas.offsetHeight
      bgClear()
    }

    const draw = () => {
      const w = canvas.width
      const h = canvas.height
      const cols = Math.floor(w / rectSize)
      const rows = Math.floor(h / rectSize)

      for (let i = 0; i <= cols; i++) {
        for (let j = 0; j <= rows; j++) {
          const distS = isUnderSonarRayon(i, j)
          const inRing =
            ((distS < rayonSonar + rectSize && distS > rayonSonar - rectSize) ||
              (distS < rayonSonar - sonarPower * rectSize &&
                distS > rayonSonar - sonarPower * rectSize - rectSize)) &&
            rayonSonar >= 0

          if (inRing) {
            const alpha = mapRange(
              rayonSonar,
              0,
              (pulseCooldown * sonarSpeed) / 2,
              isDark ? 0.35 : 0.12,
              isDark ? 0.06 : 0.03
            )
            ctx.fillStyle = isDark
              ? `rgba(56, 189, 248, ${alpha})`
              : `rgba(14, 116, 184, ${alpha})`
          } else {
            ctx.fillStyle = isDark ? "rgba(30, 58, 95, 0.28)" : "rgba(148, 184, 214, 0.14)"
          }

          const cellKey = `${i},${j}`
          const g = grid[cellKey]
          if (
            g != null &&
            distS < rayonSonar &&
            distS > rayonSonar - sonarPower * rectSize
          ) {
            ctx.fillStyle = blipColor(g, frameCount)
          }

          const srec = mapRange(distS - rayonSonar * 0.7, 0, w / 2, rectSize, 2)
          ctx.fillRect(
            2 + i * rectSize + rectSize / 2,
            2 + j * rectSize + rectSize / 2,
            srec - 2,
            srec - 2
          )
        }
      }

      if (rayonSonar >= 0) {
        rayonSonar += sonarSpeed
      }
      if (rayonSonar > max2(w * 1.4, h * 1.4)) {
        rayonSonar = -1
      }
      if (countPulse > pulseCooldown) {
        generateGrid(w / 2, h / 2, numColorRect)
      }
      countPulse++
      frameCount++
      animationRef.current = requestAnimationFrame(draw)
    }

    resize()
    bgClear()

    const ro = new ResizeObserver(() => {
      resize()
      bgClear()
    })
    ro.observe(canvas)

    animationRef.current = requestAnimationFrame(draw)

    return () => {
      ro.disconnect()
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [resolvedTheme])

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className={`absolute inset-0 h-full w-full ${className}`}
      style={{ pointerEvents: "none" }}
    />
  )
}
