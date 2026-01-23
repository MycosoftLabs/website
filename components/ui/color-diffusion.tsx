"use client"

import { useEffect, useRef } from "react"

interface ColorDiffusionProps {
  opacity?: number
  step?: number
  cellSize?: number
  exchangesPerFrame?: number
}

// Inspired by Codepen by Dillo - Color diffusion grid animation
// Creates a rainbow grid of colored squares that diffuse/mix over time
export function ColorDiffusion({ 
  opacity = 0.5, 
  step = 10,
  cellSize = 9,
  exchangesPerFrame = 1000
}: ColorDiffusionProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const animationRef = useRef<number>(0)
  const gridRef = useRef<string[][]>([])
  const xDispRef = useRef<number[]>([])
  const yDispRef = useRef<number[]>([])
  const nbxRef = useRef(0)
  const nbyRef = useRef(0)

  useEffect(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Helper functions
    const intAlea = (min: number, max?: number) => {
      if (typeof max === "undefined") {
        max = min
        min = 0
      }
      return Math.floor(min + (max - min) * Math.random())
    }

    // Draw a single cell
    const drawCell = (kx: number, ky: number) => {
      ctx.fillStyle = gridRef.current[ky][kx]
      ctx.fillRect(xDispRef.current[kx], yDispRef.current[ky], cellSize, cellSize)
    }

    // Exchange two adjacent cells
    const xchg = () => {
      const nbx = nbxRef.current
      const nby = nbyRef.current
      const grid = gridRef.current

      if (!grid.length) return

      // Take random cell
      const kx = intAlea(nbx)
      const ky = intAlea(nby)

      // Choose existing neighbour
      let dir: number, x: number, y: number
      do {
        dir = intAlea(4)
        x = kx + [1, 0, -1, 0][dir]
        y = ky + [0, 1, 0, -1][dir]
      } while (x < 0 || x >= nbx || y < 0 || y >= nby)

      // Exchange cell and neighbour
      ;[grid[ky][kx], grid[y][x]] = [grid[y][x], grid[ky][kx]]

      // Draw two cells
      drawCell(kx, ky)
      drawCell(x, y)
    }

    // Create the grid with rainbow gradient (hue 0-300 like original)
    const createGrid = () => {
      const nbx = nbxRef.current
      const nby = nbyRef.current
      const grid: string[][] = []

      // Fill background with black first
      ctx.fillStyle = "#000"
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      for (let ky = 0; ky < nby; ++ky) {
        grid[ky] = []
        for (let kx = 0; kx < nbx; ++kx) {
          // Create rainbow gradient from red (0) to magenta (300) across the width
          const hue = Math.floor(300 * kx / nbx)
          grid[ky][kx] = `hsl(${hue}, 100%, 50%)`
          ctx.fillStyle = grid[ky][kx]
          ctx.fillRect(xDispRef.current[kx], yDispRef.current[ky], cellSize, cellSize)
        }
      }

      gridRef.current = grid
    }

    // Initialize/resize
    const startOver = () => {
      const rect = container.getBoundingClientRect()
      const maxx = rect.width
      const maxy = rect.height

      if (maxx < 10 || maxy < 10) return false

      canvas.width = maxx
      canvas.height = maxy
      ctx.imageSmoothingEnabled = false

      const nbx = Math.ceil(maxx / step)
      const nby = Math.ceil(maxy / step)

      if (nbx < 5 || nby < 5) return false

      nbxRef.current = nbx
      nbyRef.current = nby

      // Calculate positions of columns/rows
      const xDisp: number[] = []
      const xOffs = (maxx - nbx * step) / 2
      for (let kx = 0; kx < nbx; ++kx) {
        xDisp[kx] = xOffs + kx * step
      }
      xDispRef.current = xDisp

      const yDisp: number[] = []
      const yOffs = (maxy - nby * step) / 2
      for (let ky = 0; ky < nby; ++ky) {
        yDisp[ky] = yOffs + ky * step
      }
      yDispRef.current = yDisp

      createGrid()
      return true
    }

    // Animation state
    let animState = 0

    const animate = () => {
      switch (animState) {
        case 0:
          if (startOver()) ++animState
          break
        case 1:
          for (let k = 0; k < exchangesPerFrame; ++k) {
            xchg()
          }
          break
      }
      animationRef.current = requestAnimationFrame(animate)
    }

    // Handle resize
    const handleResize = () => {
      animState = 0
    }

    // Handle click to reset
    const handleClick = () => {
      animState = 0
    }

    window.addEventListener("resize", handleResize)
    canvas.addEventListener("click", handleClick)

    animState = 0
    animate()

    return () => {
      window.removeEventListener("resize", handleResize)
      canvas.removeEventListener("click", handleClick)
      cancelAnimationFrame(animationRef.current)
    }
  }, [step, cellSize, exchangesPerFrame])

  return (
    <div 
      ref={containerRef} 
      className="absolute inset-0 overflow-hidden"
      style={{ opacity }}
    >
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        style={{ background: "#000" }}
      />
    </div>
  )
}
