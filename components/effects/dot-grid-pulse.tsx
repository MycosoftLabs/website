"use client"

import { cn } from "@/lib/utils"
import { useMemo } from "react"

interface DotGridPulseProps {
  /** Number of columns */
  cols?: number
  /** Number of rows */
  rows?: number
  /** Dot size in viewport width units (vw) */
  dotSize?: number
  /** Gutter size in viewport width units (vw) */
  gutter?: number
  /** Line weight in pixels */
  lineWeight?: number
  /** Animation speed in seconds */
  speed?: number
  /** Foreground/dot color */
  color?: string
  /** Additional CSS classes */
  className?: string
}

/**
 * 100 Dots Into The Void - CSS only animation
 * Based on: https://codepen.io/sandrina-p/pen/mdbRKgg
 * Inspired by: Dave Whyte (beesandbombs)
 * 
 * Creates a grid of pulsing dots with connecting lines that animate
 * from the center outward, perfect for infrastructure themes.
 */
export function DotGridPulse({
  cols = 12,
  rows = 12,
  dotSize = 1.75,
  gutter = 3,
  lineWeight = 2,
  speed = 2.5,
  color = "white",
  className = "",
}: DotGridPulseProps) {
  // Generate unique animation ID to prevent conflicts
  const animId = useMemo(() => `dotgrid-${Math.random().toString(36).substr(2, 9)}`, [])
  
  const cells = cols * rows
  const centerRow = Math.ceil(rows / 2)
  const centerCol = Math.ceil(cols / 2)
  
  // Calculate body size to ensure full coverage
  const bodySize = `calc(100% + ${100 / cols}%)`

  // Generate cell styles with distance-based opacity and animation delay
  const getCellStyles = (index: number) => {
    const rowIndex = Math.floor(index / cols) + 1
    const colIndex = (index % cols) + 1
    
    // Calculate power based on distance from center (like original SCSS)
    const centerRowPower = (centerRow - Math.abs(centerRow - rowIndex)) / 4
    const centerColPower = (centerCol - Math.abs(centerCol - colIndex)) / 4
    
    // Opacity increases toward center
    const opacity = (centerColPower + centerRowPower) * 0.5
    // Animation delay - center starts first
    const animationDelay = (centerColPower + centerRowPower) * -0.5
    
    return { opacity, animationDelay }
  }

  return (
    <>
      <style>{`
        /* Keyframes for dot pulsing - scale animation */
        @keyframes ${animId}-dotPulse {
          0%, 35% { 
            transform: translate3d(-50%, -50%, 0) scale(0); 
          }
          65%, 100% { 
            transform: translate3d(-50%, -50%, 0) scale(1); 
          }
        }
        
        /* Horizontal line rotation animation */
        @keyframes ${animId}-lineYpulse {
          0%, 35% { 
            transform: translate3d(0, -50%, 0) rotate(0deg); 
          }
          65%, 100% { 
            transform: translate3d(0, -50%, 0) rotate(90deg); 
          }
        }
        
        /* Vertical line rotation animation */
        @keyframes ${animId}-lineXpulse {
          0%, 35% { 
            transform: translate3d(-50%, 0, 0) rotate(0deg); 
          }
          65%, 100% { 
            transform: translate3d(-50%, 0, 0) rotate(90deg); 
          }
        }
      `}</style>
      
      <div 
        className={cn("absolute inset-0 overflow-hidden pointer-events-none", className)}
        style={{ background: 'transparent' }}
      >
        {/* Centered container with oversized dimensions */}
        <div 
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: bodySize,
            height: bodySize,
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          {Array.from({ length: cells }, (_, index) => {
            const { opacity, animationDelay } = getCellStyles(index)
            const delayStr = `${animationDelay}s`
            
            // Calculate cell size as percentage of container
            const cellSize = `${100 / cols}%`
            
            return (
              <div 
                key={index}
                style={{
                  position: 'relative',
                  width: cellSize,
                  aspectRatio: '1/1',
                }}
              >
                {/* Horizontal line (::before equivalent) */}
                <div
                  style={{
                    content: "''",
                    position: 'absolute',
                    background: color,
                    borderRadius: '4px',
                    top: 0,
                    left: `calc(${dotSize / 2}vw + ${gutter / 2}vw)`,
                    width: `calc(100% - ${dotSize}vw - ${gutter}vw)`,
                    height: `${lineWeight}px`,
                    transformOrigin: 'center',
                    animation: `${animId}-lineYpulse ${speed}s infinite alternate-reverse ease-in`,
                    animationDelay: delayStr,
                    opacity: opacity,
                  }}
                />
                
                {/* Vertical line (::after equivalent) */}
                <div
                  style={{
                    content: "''",
                    position: 'absolute',
                    background: color,
                    borderRadius: '4px',
                    top: `calc(${dotSize / 2}vw + ${gutter / 2}vw)`,
                    left: 0,
                    width: `${lineWeight}px`,
                    height: `calc(100% - ${dotSize}vw - ${gutter}vw)`,
                    transformOrigin: 'center',
                    animation: `${animId}-lineXpulse ${speed}s infinite alternate-reverse ease-in`,
                    animationDelay: delayStr,
                    opacity: opacity,
                  }}
                />
                
                {/* First dot */}
                <div
                  style={{
                    position: 'absolute',
                    width: `${dotSize}vw`,
                    height: `${dotSize}vw`,
                    background: color,
                    borderRadius: '50%',
                    animation: `${animId}-dotPulse ${speed}s infinite alternate ease-in`,
                    animationDelay: delayStr,
                    opacity: opacity,
                  }}
                />
                
                {/* Second dot (center, half scale, reverse animation) */}
                <div
                  style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    width: `${dotSize}vw`,
                    height: `${dotSize}vw`,
                    background: color,
                    borderRadius: '50%',
                    transform: 'translate(-50%, -50%) scale(0.5)',
                    animation: `${animId}-dotPulse ${speed}s infinite alternate-reverse ease-in`,
                    animationDelay: delayStr,
                    opacity: opacity,
                  }}
                />
              </div>
            )
          })}
        </div>
      </div>
    </>
  )
}

/**
 * Infrastructure-themed variant with white dots
 * Perfect for Hyphae 1 CTA section - dark background
 */
export function InfrastructureDotGrid({
  className = "",
  ...props
}: Omit<DotGridPulseProps, 'color'>) {
  return (
    <DotGridPulse
      cols={12}
      rows={10}
      dotSize={1.5}
      gutter={2.5}
      lineWeight={2}
      speed={2.5}
      color="rgba(255, 255, 255, 0.95)"
      className={className}
      {...props}
    />
  )
}
