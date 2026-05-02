"use client"

import { useEffect, useRef } from "react"
import { useTheme } from "next-themes"

interface TechnologyMeshCanvasProps {
  className?: string
}

type Pt = { x: number; y: number; z: number }
type Tri = [Pt, Pt, Pt]

function fractSin(i: number, j: number): number {
  const s = Math.sin(i * 12.9898 + j * 78.233) * 43758.5453123
  return s - Math.floor(s)
}

/** Smooth 0–1 value noise (standalone — original snippet expected a global `noise`) */
function noise2d(x: number, y: number): number {
  const x0 = Math.floor(x)
  const y0 = Math.floor(y)
  const tx = x - x0
  const ty = y - y0
  const u = tx * tx * (3 - 2 * tx)
  const v = ty * ty * (3 - 2 * ty)
  const n00 = fractSin(x0, y0)
  const n10 = fractSin(x0 + 1, y0)
  const n01 = fractSin(x0, y0 + 1)
  const n11 = fractSin(x0 + 1, y0 + 1)
  const nx0 = n00 + u * (n10 - n00)
  const nx1 = n01 + u * (n11 - n01)
  return nx0 + v * (nx1 - nx0)
}

function clip(x: number, w: number): number {
  return x - w / 2
}

/**
 * Perspective mesh wave background (ported from legacy canvas demo).
 * Clears to a light slate fill in light mode and black in dark mode.
 */
export function TechnologyMeshCanvas({ className = "" }: TechnologyMeshCanvasProps) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === "dark"

  useEffect(() => {
    const canvas = canvasRef.current
    const wrap = wrapRef.current
    if (!canvas || !wrap) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const fps = 60
    const fov = 200
    const waveHeight = 15
    let cols = 40
    let rows = 40
    let offsetX = 0
    let offsetY = 0
    const inc = 0.01
    let mesh: Tri[] = []
    let raf = 0
    let then = performance.now()
    const interval = 1000 / fps

    function resizeCanvas() {
      const w = wrap.clientWidth
      const h = wrap.clientHeight
      const dpr = Math.min(window.devicePixelRatio ?? 1, 2)
      canvas.width = Math.max(1, Math.floor(w * dpr))
      canvas.height = Math.max(1, Math.floor(h * dpr))
      canvas.style.width = `${w}px`
      canvas.style.height = `${h}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      if (w < 640) {
        cols = 28
        rows = 28
      } else {
        cols = 40
        rows = 40
      }
    }

    function generateMesh(cw: number, ch: number) {
      mesh = []
      const gridWidth = cw / cols
      const gridHeight = ch / rows
      const gridDepth = fov / rows

      for (let col = 0; col < cols; col++) {
        for (let row = 0; row < rows; row++) {
          mesh.push([
            {
              x: col * gridWidth,
              y: row * gridHeight + gridHeight,
              z: fov - (row * gridDepth + gridDepth),
            },
            {
              x: col * gridWidth,
              y: row * gridHeight,
              z: fov - row * gridDepth,
            },
            {
              x: col * gridWidth + gridWidth,
              y: row * gridHeight,
              z: fov - row * gridDepth,
            },
          ])
          mesh.push([
            {
              x: col * gridWidth + gridWidth,
              y: row * gridHeight,
              z: fov - row * gridDepth,
            },
            {
              x: col * gridWidth + gridWidth,
              y: row * gridHeight + gridHeight,
              z: fov - (row * gridDepth + gridDepth),
            },
            {
              x: col * gridWidth,
              y: row * gridHeight + gridHeight,
              z: fov - (row * gridDepth + gridDepth),
            },
          ])
        }
      }
    }

    function drawMesh(cw: number, ch: number) {
      ctx.strokeStyle = isDark ? "steelblue" : "#1e40af"
      ctx.fillStyle = isDark ? "#000000" : "#f1f5f9"
      ctx.fillRect(0, 0, cw, ch)

      for (let m = 0; m < mesh.length; m++) {
        const poly = mesh[m]
        ctx.beginPath()
        ctx.moveTo(poly[0].x, poly[0].y)
        for (let p = 0; p < poly.length; p++) {
          ctx.lineTo(poly[p].x, poly[p].y)
        }
        ctx.closePath()
        ctx.stroke()
      }
    }

    function addNoise() {
      for (let m = 0; m < mesh.length; m++) {
        const poly = mesh[m]
        for (let p = 0; p < poly.length; p++) {
          const nx = (poly[p].x / 50 + offsetX) as number
          const ny = (poly[p].y / 50 + offsetY) as number
          poly[p].y += waveHeight * (noise2d(nx, ny) - 0.5) * 2
        }
      }
    }

    function projectMesh(cw: number, ch: number) {
      for (let m = 0; m < mesh.length; m++) {
        const poly = mesh[m]
        for (let p = 0; p < poly.length; p++) {
          const scale = fov / (fov + poly[p].z)
          poly[p].x = clip(poly[p].x, cw) * scale + cw / 2
          poly[p].y = clip(poly[p].y, ch) * scale + ch / 3
        }
      }
    }

    function draw() {
      const cw = wrap.clientWidth
      const ch = wrap.clientHeight
      if (cw < 1 || ch < 1) return

      offsetX += inc
      offsetY -= inc

      generateMesh(cw, ch)
      addNoise()
      projectMesh(cw, ch)
      drawMesh(cw, ch)
    }

    function tick(now: number) {
      raf = requestAnimationFrame(tick)
      const delta = now - then
      if (delta > interval) {
        then = now - (delta % interval)
        draw()
      }
    }

    const ro = new ResizeObserver(() => {
      resizeCanvas()
    })
    ro.observe(wrap)
    resizeCanvas()
    raf = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
    }
  }, [isDark])

  return (
    <div
      ref={wrapRef}
      className={`absolute inset-0 overflow-hidden ${isDark ? "bg-black" : "bg-slate-100"} ${className}`}
    >
      <canvas
        ref={canvasRef}
        className="block h-full w-full"
        aria-hidden
      />
    </div>
  )
}
