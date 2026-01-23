"use client"

import { useEffect, useRef, useCallback } from "react"
import { cn } from "@/lib/utils"

interface PerlinFlowProps {
  /** Animation speed - higher = faster */
  speed?: number
  /** Scale of the perlin noise - lower = more zoomed out/larger patterns */
  scale?: number
  /** Grid spacing between circles */
  spacing?: number
  /** Hue value for HSL color (0-360) */
  hue?: number
  /** Background color */
  backgroundColor?: string
  /** Additional CSS classes */
  className?: string
}

// Perlin/Simplex noise implementation
class NoiseGenerator {
  private perm: number[] = new Array(512)
  private gradP: { x: number; y: number; z: number }[] = new Array(512)

  private grad3 = [
    { x: 1, y: 1, z: 0 }, { x: -1, y: 1, z: 0 }, { x: 1, y: -1, z: 0 }, { x: -1, y: -1, z: 0 },
    { x: 1, y: 0, z: 1 }, { x: -1, y: 0, z: 1 }, { x: 1, y: 0, z: -1 }, { x: -1, y: 0, z: -1 },
    { x: 0, y: 1, z: 1 }, { x: 0, y: -1, z: 1 }, { x: 0, y: 1, z: -1 }, { x: 0, y: -1, z: -1 }
  ]

  private p = [
    151, 160, 137, 91, 90, 15, 131, 13, 201, 95, 96, 53, 194, 233, 7, 225, 140, 36, 103, 30, 69, 142, 8, 99, 37, 240, 21, 10, 23,
    190, 6, 148, 247, 120, 234, 75, 0, 26, 197, 62, 94, 252, 219, 203, 117, 35, 11, 32, 57, 177, 33,
    88, 237, 149, 56, 87, 174, 20, 125, 136, 171, 168, 68, 175, 74, 165, 71, 134, 139, 48, 27, 166,
    77, 146, 158, 231, 83, 111, 229, 122, 60, 211, 133, 230, 220, 105, 92, 41, 55, 46, 245, 40, 244,
    102, 143, 54, 65, 25, 63, 161, 1, 216, 80, 73, 209, 76, 132, 187, 208, 89, 18, 169, 200, 196,
    135, 130, 116, 188, 159, 86, 164, 100, 109, 198, 173, 186, 3, 64, 52, 217, 226, 250, 124, 123,
    5, 202, 38, 147, 118, 126, 255, 82, 85, 212, 207, 206, 59, 227, 47, 16, 58, 17, 182, 189, 28, 42,
    223, 183, 170, 213, 119, 248, 152, 2, 44, 154, 163, 70, 221, 153, 101, 155, 167, 43, 172, 9,
    129, 22, 39, 253, 19, 98, 108, 110, 79, 113, 224, 232, 178, 185, 112, 104, 218, 246, 97, 228,
    251, 34, 242, 193, 238, 210, 144, 12, 191, 179, 162, 241, 81, 51, 145, 235, 249, 14, 239, 107,
    49, 192, 214, 31, 181, 199, 106, 157, 184, 84, 204, 176, 115, 121, 50, 45, 127, 4, 150, 254,
    138, 236, 205, 93, 222, 114, 67, 29, 24, 72, 243, 141, 128, 195, 78, 66, 215, 61, 156, 180
  ]

  constructor() {
    this.seed(Math.random() * 222)
  }

  seed(seedValue: number) {
    if (seedValue > 0 && seedValue < 1) {
      seedValue *= 65536
    }

    seedValue = Math.floor(seedValue)
    if (seedValue < 256) {
      seedValue |= seedValue << 8
    }

    for (let i = 0; i < 256; i++) {
      let v: number
      if (i & 1) {
        v = this.p[i] ^ (seedValue & 255)
      } else {
        v = this.p[i] ^ ((seedValue >> 8) & 255)
      }

      this.perm[i] = this.perm[i + 256] = v
      this.gradP[i] = this.gradP[i + 256] = this.grad3[v % 12]
    }
  }

  private fade(t: number): number {
    return t * t * t * (t * (t * 6 - 15) + 10)
  }

  private lerp(a: number, b: number, t: number): number {
    return (1 - t) * a + t * b
  }

  private dot3(g: { x: number; y: number; z: number }, x: number, y: number, z: number): number {
    return g.x * x + g.y * y + g.z * z
  }

  perlin3(x: number, y: number, z: number): number {
    // Find unit grid cell containing point
    let X = Math.floor(x)
    let Y = Math.floor(y)
    let Z = Math.floor(z)
    
    // Get relative xyz coordinates of point within that cell
    x = x - X
    y = y - Y
    z = z - Z
    
    // Wrap the integer cells at 255
    X = X & 255
    Y = Y & 255
    Z = Z & 255

    // Calculate noise contributions from each of the eight corners
    const n000 = this.dot3(this.gradP[X + this.perm[Y + this.perm[Z]]], x, y, z)
    const n001 = this.dot3(this.gradP[X + this.perm[Y + this.perm[Z + 1]]], x, y, z - 1)
    const n010 = this.dot3(this.gradP[X + this.perm[Y + 1 + this.perm[Z]]], x, y - 1, z)
    const n011 = this.dot3(this.gradP[X + this.perm[Y + 1 + this.perm[Z + 1]]], x, y - 1, z - 1)
    const n100 = this.dot3(this.gradP[X + 1 + this.perm[Y + this.perm[Z]]], x - 1, y, z)
    const n101 = this.dot3(this.gradP[X + 1 + this.perm[Y + this.perm[Z + 1]]], x - 1, y, z - 1)
    const n110 = this.dot3(this.gradP[X + 1 + this.perm[Y + 1 + this.perm[Z]]], x - 1, y - 1, z)
    const n111 = this.dot3(this.gradP[X + 1 + this.perm[Y + 1 + this.perm[Z + 1]]], x - 1, y - 1, z - 1)

    // Compute the fade curve value for x, y, z
    const u = this.fade(x)
    const v = this.fade(y)
    const w = this.fade(z)

    // Interpolate
    return this.lerp(
      this.lerp(
        this.lerp(n000, n100, u),
        this.lerp(n001, n101, u),
        w
      ),
      this.lerp(
        this.lerp(n010, n110, u),
        this.lerp(n011, n111, u),
        w
      ),
      v
    )
  }
}

/**
 * Perlin Flow Background Effect
 * Creates a grid of circles that animate based on Perlin noise
 * Creates a flowing, organic pattern perfect for underground/nature themes
 */
export function PerlinFlow({
  speed = 1.85,
  scale = 0.0028,
  spacing = 11,
  hue = 311, // Purple/Fuchsia
  backgroundColor = "#021636",
  className = "",
}: PerlinFlowProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const noiseRef = useRef<NoiseGenerator | null>(null)
  const zRef = useRef<number>(Math.random() * 222)
  const animationFrameRef = useRef<number>()

  const render = useCallback((ctx: CanvasRenderingContext2D, width: number, height: number) => {
    if (!noiseRef.current) return

    ctx.clearRect(0, 0, width, height)

    const getValue = (x: number, y: number, z: number, scl: number): number => {
      return noiseRef.current!.perlin3(x * scl, y * scl, z * scl) * Math.PI * 2
    }

    for (let x = 0; x < width; x += spacing) {
      for (let y = 0; y < height; y += spacing) {
        const value = getValue(x, y, zRef.current, scale)
        
        ctx.save()
        ctx.beginPath()
        ctx.translate(x, y)
        
        const radius = Math.abs(2 * value)
        ctx.arc(0, 0, radius, 0, Math.PI * 2, true)
        
        const lightness = Math.min(Math.abs(value), 1)
        ctx.fillStyle = `hsl(${hue}, 100%, ${Math.floor(100 * lightness)}%)`
        ctx.fill()
        ctx.restore()
      }
    }

    zRef.current += speed
  }, [spacing, scale, hue, speed])

  useEffect(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Initialize noise generator
    noiseRef.current = new NoiseGenerator()

    const updateSize = () => {
      const rect = container.getBoundingClientRect()
      canvas.width = rect.width
      canvas.height = rect.height
    }

    updateSize()

    const resizeObserver = new ResizeObserver(() => {
      updateSize()
    })
    resizeObserver.observe(container)

    const animate = () => {
      render(ctx, canvas.width, canvas.height)
      animationFrameRef.current = requestAnimationFrame(animate)
    }

    animate()

    return () => {
      resizeObserver.disconnect()
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [render])

  return (
    <div
      ref={containerRef}
      className={cn("absolute inset-0 overflow-hidden pointer-events-none", className)}
      style={{ backgroundColor }}
    >
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
    </div>
  )
}

/**
 * Underground/Mycology themed variant
 * Purple/Fuchsia colors perfect for MycoNode "Listen to the underground" section
 */
export function UndergroundFlow({
  className = "",
  ...props
}: Omit<PerlinFlowProps, 'hue' | 'backgroundColor'>) {
  return (
    <PerlinFlow
      speed={1.5}
      scale={0.003}
      spacing={12}
      hue={280}  // Deep purple
      backgroundColor="transparent"
      className={className}
      {...props}
    />
  )
}
