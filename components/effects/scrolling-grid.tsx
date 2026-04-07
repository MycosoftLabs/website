"use client"

import { cn } from "@/lib/utils"
import { useMemo, useEffect, useLayoutEffect, useRef, useState, useId } from "react"
import { useTheme } from "next-themes"

/** Stable CSS id prefix from React useId (SSR + client must match; colons invalid in @keyframes names). */
function cssIdPrefix(prefix: string, reactId: string): string {
  return `${prefix}${reactId.replace(/:/g, "")}`
}

interface ScrollingGridProps {
  /** Grid cell size in pixels */
  cellSize?: number
  /** Animation duration in seconds */
  duration?: number
  /** Animation direction - 'normal' scrolls down-right, 'reverse' scrolls up-left */
  direction?: 'normal' | 'reverse'
  /** Grid line color */
  lineColor?: string
  /** Background color */
  backgroundColor?: string
  /** Grid line opacity (0-1) */
  lineOpacity?: number
  /** Grid line width in pixels */
  lineWidth?: number
  /** Show dots at intersections */
  showDots?: boolean
  /** Dot size in pixels */
  dotSize?: number
  /** Additional CSS classes */
  className?: string
}

/**
 * Infinite scrolling grid background effect with optional dots
 * Creates an animated grid pattern that scrolls infinitely,
 * perfect for industrial/infrastructure themes.
 */
export function ScrollingGrid({
  cellSize = 50,
  duration = 0.92,
  direction = 'reverse',
  lineColor = '#ffffff',
  backgroundColor = 'transparent',
  lineOpacity = 0.1,
  lineWidth = 1,
  showDots = false,
  dotSize = 4,
  className = "",
}: ScrollingGridProps) {
  const animId = cssIdPrefix("grid", useId())
  
  // Generate SVG data URL for grid pattern with optional dot
  const svgPattern = useMemo(() => {
    const dotRadius = dotSize / 2
    const dotMarkup = showDots 
      ? `<circle cx="0" cy="0" r="${dotRadius}" fill="${lineColor}" fill-opacity="${Math.min(1, lineOpacity * 1.5)}"/>` 
      : ''
    
    return `
      <svg xmlns="http://www.w3.org/2000/svg" width="${cellSize}" height="${cellSize}">
        <rect width="${cellSize}" height="${cellSize}" fill="${backgroundColor === 'transparent' ? 'none' : backgroundColor}"/>
        <path d="M ${cellSize} 0 L 0 0 0 ${cellSize}" fill="none" stroke="${lineColor}" stroke-width="${lineWidth}" stroke-opacity="${lineOpacity}"/>
        ${dotMarkup}
      </svg>
    `.trim()
  }, [cellSize, lineColor, lineWidth, lineOpacity, backgroundColor, showDots, dotSize])

  const encodedSvg = `data:image/svg+xml,${encodeURIComponent(svgPattern)}`

  return (
    <>
      <style>{`
        @keyframes ${animId}-reverse {
          100% {
            background-position: ${cellSize}px ${cellSize}px;
          }
        }
        @keyframes ${animId}-normal {
          0% {
            background-position: ${cellSize}px ${cellSize}px;
          }
        }
      `}</style>
      <div
        className={cn(
          "absolute inset-0 pointer-events-none",
          className
        )}
        style={{
          backgroundImage: `url("${encodedSvg}")`,
          backgroundRepeat: 'repeat',
          backgroundPosition: '0 0',
          animation: `${animId}-${direction} ${duration}s infinite linear`,
        }}
      />
    </>
  )
}

/**
 * Industrial/Infrastructure themed variant with dots and gradient opacity
 * Perfect for Hyphae 1 "Deployed Everywhere" section
 * Uses multiple overlaid layers for depth effect
 */
export function InfrastructureGrid({
  className = "",
  ...props
}: Omit<ScrollingGridProps, 'lineColor' | 'lineOpacity' | 'showDots' | 'dotSize' | 'lineWidth'>) {
  const { resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const isDark = mounted ? resolvedTheme === "dark" : false
  const lineColor = isDark ? "#e2e8f0" : "#0f172a"
  /* Dark: keep lines visible on slate-950 / neuromorphic-dark sections (too low reads as “no grid”). */
  const lineOpacity = isDark ? 0.22 : 0.45
  const dotRgb = isDark ? "226, 232, 240" : "15, 23, 42"

  const containerRef = useRef<HTMLDivElement>(null)
  /** Overlay dot grid: adaptive cell size so cols*rows stays bounded (tall sections were 5k+ DOM nodes and froze Hyphae / long pages). */
  const [dimensions, setDimensions] = useState({ cols: 0, rows: 0, dotCellSize: 50 })
  const gridCellSize = 50

  useLayoutEffect(() => {
    const MAX_DOT_CELLS = 720
    const MIN_DOT_CELL = 50
    const MAX_DOT_CELL = 420

    const updateDimensions = () => {
      const el = containerRef.current
      if (!el) return
      const w = el.offsetWidth
      const h = el.offsetHeight
      if (w < 1 || h < 1) return

      let dotCs = MIN_DOT_CELL
      let cols = Math.ceil(w / dotCs) + 2
      let rows = Math.ceil(h / dotCs) + 2
      while (cols * rows > MAX_DOT_CELLS && dotCs < MAX_DOT_CELL) {
        dotCs += 24
        cols = Math.ceil(w / dotCs) + 2
        rows = Math.ceil(h / dotCs) + 2
      }
      setDimensions({ cols, rows, dotCellSize: dotCs })
    }

    updateDimensions()
    window.addEventListener("resize", updateDimensions)
    const el = containerRef.current
    const ro =
      typeof ResizeObserver !== "undefined" && el
        ? new ResizeObserver(() => updateDimensions())
        : null
    ro?.observe(el as Element)

    return () => {
      window.removeEventListener("resize", updateDimensions)
      ro?.disconnect()
    }
  }, [])

  const animId = cssIdPrefix("infragrid", useId())
  const dotCellSize = dimensions.dotCellSize

  // Generate dots with varying opacity based on distance from center
  const dots = useMemo(() => {
    if (dimensions.cols === 0) return []
    const centerX = dimensions.cols / 2
    const centerY = dimensions.rows / 2
    const maxDist = Math.sqrt(centerX * centerX + centerY * centerY)

    const result = []
    for (let row = 0; row < dimensions.rows; row++) {
      for (let col = 0; col < dimensions.cols; col++) {
        const dx = col - centerX
        const dy = row - centerY
        const dist = Math.sqrt(dx * dx + dy * dy)
        const opacity = Math.max(0.25, 1 - (dist / maxDist) * 0.75)
        result.push({
          x: col * dotCellSize,
          y: row * dotCellSize,
          opacity,
          size: 4 + (1 - dist / maxDist) * 4,
        })
      }
    }
    return result
  }, [dimensions.cols, dimensions.rows, dotCellSize])

  return (
    <div ref={containerRef} className={cn("absolute inset-0 overflow-hidden pointer-events-none", className)}>
      {/* Base scrolling grid - more prominent */}
      <ScrollingGrid
        lineColor={lineColor}
        lineOpacity={lineOpacity}
        lineWidth={isDark ? 1 : 1.5}
        cellSize={gridCellSize}
        duration={1.2}
        showDots={false}
        className=""
        {...props}
      />
      
      {/* Overlay dots with varying opacity and size */}
      <style>{`
        @keyframes ${animId}-scroll {
          100% {
            transform: translate(${dotCellSize}px, ${dotCellSize}px);
          }
        }
      `}</style>
      <div 
        style={{
          position: 'absolute',
          top: -dotCellSize,
          left: -dotCellSize,
          right: 0,
          bottom: 0,
          animation: `${animId}-scroll 1.2s infinite linear`,
        }}
      >
        {dots.map((dot, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: dot.x,
              top: dot.y,
              width: dot.size,
              height: dot.size,
              borderRadius: '50%',
              backgroundColor: lineColor,
              opacity: dot.opacity,
              transform: 'translate(-50%, -50%)',
              boxShadow:
                dot.opacity > 0.5
                  ? `0 0 4px rgba(${dotRgb}, ${isDark ? 0.25 : 0.35})`
                  : 'none',
            }}
          />
        ))}
      </div>
    </div>
  )
}

/**
 * White/light themed variant for clean aesthetics
 */
export function CleanGrid({
  className = "",
  ...props
}: Omit<ScrollingGridProps, 'lineColor' | 'lineOpacity'>) {
  return (
    <ScrollingGrid
      lineColor="#e2e8f0"
      lineOpacity={0.3}
      cellSize={50}
      duration={1.2}
      className={className}
      {...props}
    />
  )
}
