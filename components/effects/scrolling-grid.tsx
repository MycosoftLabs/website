"use client"

import { cn } from "@/lib/utils"
import { useMemo, useEffect, useRef, useState } from "react"

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
  // Generate unique animation ID
  const animId = useMemo(() => `grid-${Math.random().toString(36).substr(2, 9)}`, [])
  
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
  const containerRef = useRef<HTMLDivElement>(null)
  const [dimensions, setDimensions] = useState({ cols: 0, rows: 0 })
  const cellSize = 50 // Larger cells for more visibility
  
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const w = containerRef.current.offsetWidth
        const h = containerRef.current.offsetHeight
        setDimensions({
          cols: Math.ceil(w / cellSize) + 2,
          rows: Math.ceil(h / cellSize) + 2
        })
      }
    }
    updateDimensions()
    window.addEventListener('resize', updateDimensions)
    return () => window.removeEventListener('resize', updateDimensions)
  }, [])

  const animId = useMemo(() => `infragrid-${Math.random().toString(36).substr(2, 9)}`, [])
  
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
        // Opacity varies: much higher in center, lower at edges - more dramatic difference
        const opacity = Math.max(0.25, 1 - (dist / maxDist) * 0.75)
        result.push({
          x: col * cellSize,
          y: row * cellSize,
          opacity,
          size: 4 + (1 - dist / maxDist) * 4 // Size also varies: 4-8px
        })
      }
    }
    return result
  }, [dimensions, cellSize])

  return (
    <div ref={containerRef} className={cn("absolute inset-0 overflow-hidden pointer-events-none", className)}>
      {/* Base scrolling grid - more prominent */}
      <ScrollingGrid
        lineColor="#1e293b"  // Slate-800 - darker for light background
        lineOpacity={0.5}    // Higher opacity for visibility
        lineWidth={1.5}      // Slightly thicker lines
        cellSize={cellSize}
        duration={1.2}
        showDots={false}
        className=""
        {...props}
      />
      
      {/* Overlay dots with varying opacity and size */}
      <style>{`
        @keyframes ${animId}-scroll {
          100% {
            transform: translate(${cellSize}px, ${cellSize}px);
          }
        }
      `}</style>
      <div 
        style={{
          position: 'absolute',
          top: -cellSize,
          left: -cellSize,
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
              backgroundColor: '#1e293b', // Slate-800
              opacity: dot.opacity,
              transform: 'translate(-50%, -50%)',
              boxShadow: dot.opacity > 0.5 ? '0 0 4px rgba(30, 41, 59, 0.3)' : 'none',
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
