"use client"

import { useEffect, useRef, useCallback } from "react"

interface StaggerDotsProps {
  /** Grid columns */
  columns?: number
  /** Grid rows */
  rows?: number
  /** Dot size in pixels */
  dotSize?: number
  /** Gap between dots in pixels */
  gap?: number
  /** Cursor color - the scanning sensor dot */
  cursorColor?: string
  /** Dot color */
  dotColor?: string
  /** Animation interval in ms */
  animationInterval?: number
  /** Additional CSS classes */
  className?: string
}

interface DotState {
  x: number
  y: number
  scale: number
  translateX: number
  translateY: number
}

/**
 * Animated stagger dot grid effect
 * Based on: https://codepen.io/juliangarnier/pen/MZXQNV
 * 
 * Creates a grid of dots with a moving cursor that triggers
 * ripple animations, perfect for sensor data visualization.
 */
export function StaggerDots({
  columns = 20,
  rows = 10,
  dotSize = 12,
  gap = 20,
  cursorColor = "#22c55e", // Green instead of red
  dotColor = "rgba(255, 255, 255, 0.15)",
  animationInterval = 2500,
  className = "",
}: StaggerDotsProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const dotsRef = useRef<(HTMLDivElement | null)[]>([])
  const cursorRef = useRef<HTMLDivElement>(null)
  const animationRef = useRef<number | null>(null)
  const indexRef = useRef<number>(0)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  const numberOfDots = columns * rows
  const cellSize = dotSize + gap

  // Get stagger values from index
  const getStagger = useCallback((fromIndex: number, targetIndex: number, axis: 'x' | 'y') => {
    const fromCol = fromIndex % columns
    const fromRow = Math.floor(fromIndex / columns)
    const targetCol = targetIndex % columns
    const targetRow = Math.floor(targetIndex / columns)
    
    if (axis === 'x') {
      return (targetCol - fromCol) * cellSize
    }
    return (targetRow - fromRow) * cellSize
  }, [columns, cellSize])

  // Get distance from index
  const getDistance = useCallback((fromIndex: number, targetIndex: number) => {
    const fromCol = fromIndex % columns
    const fromRow = Math.floor(fromIndex / columns)
    const targetCol = targetIndex % columns
    const targetRow = Math.floor(targetIndex / columns)
    
    return Math.sqrt(
      Math.pow(targetCol - fromCol, 2) + Math.pow(targetRow - fromRow, 2)
    )
  }, [columns])

  // Animate dots with ripple effect
  const animateDots = useCallback((fromIndex: number) => {
    dotsRef.current.forEach((dot, i) => {
      if (!dot) return
      
      const distance = getDistance(fromIndex, i)
      const delay = distance * 40 // Staggered delay based on distance
      const maxDistance = Math.sqrt(columns * columns + rows * rows)
      const scale = 1 + (1.5 * (1 - distance / maxDistance))
      
      // Phase 1: Contract
      setTimeout(() => {
        dot.style.transition = 'transform 100ms ease-out'
        dot.style.transform = `scale(0.7)`
      }, delay)
      
      // Phase 2: Expand with scale based on distance
      setTimeout(() => {
        dot.style.transition = 'transform 225ms ease-out'
        dot.style.transform = `scale(${scale})`
      }, delay + 100)
      
      // Phase 3: Return to normal
      setTimeout(() => {
        dot.style.transition = 'transform 1200ms cubic-bezier(0.215, 0.61, 0.355, 1)'
        dot.style.transform = 'scale(1)'
      }, delay + 325)
    })
  }, [columns, rows, getDistance])

  // Move cursor to new random position
  const moveCursor = useCallback(() => {
    if (!cursorRef.current) return
    
    const newIndex = Math.floor(Math.random() * numberOfDots)
    const col = newIndex % columns
    const row = Math.floor(newIndex / columns)
    
    // Animate cursor movement
    cursorRef.current.style.transition = 'transform 800ms cubic-bezier(0.075, 0.82, 0.165, 1)'
    cursorRef.current.style.transform = `translate(${col * cellSize}px, ${row * cellSize}px) scale(1.5)`
    
    // Trigger ripple from old position
    animateDots(indexRef.current)
    
    // Update index
    indexRef.current = newIndex
    
    // Cursor pulse animation
    setTimeout(() => {
      if (!cursorRef.current) return
      cursorRef.current.style.transition = 'transform 120ms ease-out'
      cursorRef.current.style.transform = `translate(${col * cellSize}px, ${row * cellSize}px) scale(0.75)`
    }, 0)
    
    setTimeout(() => {
      if (!cursorRef.current) return
      cursorRef.current.style.transition = 'transform 220ms ease-out'
      cursorRef.current.style.transform = `translate(${col * cellSize}px, ${row * cellSize}px) scale(2.5)`
    }, 120)
    
    setTimeout(() => {
      if (!cursorRef.current) return
      cursorRef.current.style.transition = 'transform 450ms cubic-bezier(0.215, 0.61, 0.355, 1)'
      cursorRef.current.style.transform = `translate(${col * cellSize}px, ${row * cellSize}px) scale(1.5)`
    }, 340)
    
    // Schedule next animation
    timeoutRef.current = setTimeout(moveCursor, animationInterval)
  }, [numberOfDots, columns, cellSize, animateDots, animationInterval])

  // Initialize
  useEffect(() => {
    // Set initial cursor position
    const initialIndex = Math.floor(Math.random() * numberOfDots)
    indexRef.current = initialIndex
    
    if (cursorRef.current) {
      const col = initialIndex % columns
      const row = Math.floor(initialIndex / columns)
      cursorRef.current.style.transform = `translate(${col * cellSize}px, ${row * cellSize}px) scale(1.5)`
    }
    
    // Start animation loop
    timeoutRef.current = setTimeout(moveCursor, 500)
    
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [numberOfDots, columns, cellSize, moveCursor])

  return (
    <div 
      ref={containerRef}
      className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}
    >
      <div 
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
        style={{
          width: columns * cellSize,
          height: rows * cellSize,
        }}
      >
        {/* Cursor - the scanning sensor dot */}
        <div
          ref={cursorRef}
          className="absolute z-10"
          style={{
            width: dotSize * 1.8,
            height: dotSize * 1.8,
            borderRadius: '50%',
            backgroundColor: cursorColor,
            boxShadow: `0 0 20px ${cursorColor}, 0 0 40px ${cursorColor}50`,
            marginLeft: (dotSize - dotSize * 1.8) / 2 + gap / 2,
            marginTop: (dotSize - dotSize * 1.8) / 2 + gap / 2,
          }}
        />
        
        {/* Dots grid */}
        <div 
          className="flex flex-wrap"
          style={{
            width: columns * cellSize,
            height: rows * cellSize,
          }}
        >
          {Array.from({ length: numberOfDots }).map((_, i) => (
            <div
              key={i}
              ref={(el) => { dotsRef.current[i] = el }}
              style={{
                width: dotSize,
                height: dotSize,
                margin: gap / 2,
                borderRadius: '50%',
                backgroundColor: dotColor,
                backgroundImage: 'linear-gradient(180deg, rgba(255,255,255,0.3) 8%, rgba(200,200,200,0.1) 100%)',
              }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

/**
 * Sensor-themed variant with green scanning cursor and cyan dots
 * Perfect for Mushroom 1 Advanced Sensor Suite section
 */
export function SensorStagger({
  className = "",
  ...props
}: Omit<StaggerDotsProps, 'cursorColor' | 'dotColor'>) {
  return (
    <StaggerDots
      columns={18}
      rows={8}
      dotSize={10}
      gap={24}
      cursorColor="#22c55e" // Green sensor cursor
      dotColor="rgba(34, 211, 238, 0.12)" // Subtle cyan dots
      animationInterval={2200}
      className={className}
      {...props}
    />
  )
}
