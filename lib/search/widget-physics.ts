/**
 * Widget Physics Library
 * 
 * Provides physics-based animations for the Fluid Search Canvas:
 * - Floating/drifting effect
 * - Magnetic attraction to cursor
 * - Spring physics for interactions
 * - Particle connections between related widgets
 * - Parallax depth layers
 */

import { MotionValue, useSpring, useTransform } from "framer-motion"

// =============================================================================
// CONFIGURATION
// =============================================================================

export const PHYSICS_CONFIG = {
  // Floating animation
  float: {
    amplitude: 8, // pixels
    period: 4000, // ms for one cycle
    variance: 0.3, // randomness in timing
  },
  
  // Magnetic attraction
  magnetic: {
    strength: 0.08, // how much widgets move toward cursor (0-1)
    range: 200, // pixels - cursor must be within this range
    dampening: 0.92, // how quickly attraction fades
  },
  
  // Spring physics
  spring: {
    stiffness: 120,
    damping: 20,
    mass: 1,
  },
  
  // Focus scale
  focus: {
    scaleFocused: 1.15,
    scaleHovered: 1.05,
    scaleMinimized: 0.85,
    scaleDefault: 1,
  },
  
  // Depth layers (z-index ranges)
  depth: {
    background: 1,
    midground: 10,
    foreground: 20,
    focused: 100,
  },
  
  // Particle connections
  particles: {
    count: 20,
    speed: 0.5,
    connectionDistance: 150,
    particleSize: 2,
    opacity: 0.3,
  },
}

// =============================================================================
// FLOATING ANIMATION
// =============================================================================

/**
 * Generate floating animation variants for Framer Motion
 */
export function getFloatAnimation(seed: number = 0) {
  const variance = 1 + (seed % 10) * 0.05 // 0-50% variance
  const delay = (seed % 7) * 0.3 // Staggered start
  
  return {
    y: [0, -PHYSICS_CONFIG.float.amplitude * variance, 0],
    x: [0, PHYSICS_CONFIG.float.amplitude * 0.3 * variance, 0],
    transition: {
      y: {
        duration: PHYSICS_CONFIG.float.period / 1000 * variance,
        repeat: Infinity,
        ease: "easeInOut",
        delay,
      },
      x: {
        duration: (PHYSICS_CONFIG.float.period / 1000) * 1.3 * variance,
        repeat: Infinity,
        ease: "easeInOut",
        delay: delay + 0.5,
      },
    },
  }
}

/**
 * Get unique float animation for each widget type
 */
export function getWidgetFloatVariants(widgetType: string) {
  const typeSeeds: Record<string, number> = {
    species: 1,
    chemistry: 2,
    genetics: 3,
    research: 4,
    ai: 5,
    media: 6,
    location: 7,
    news: 8,
    "myca-suggestions": 9,
  }
  
  const seed = typeSeeds[widgetType] || 0
  return getFloatAnimation(seed)
}

// =============================================================================
// MAGNETIC CURSOR ATTRACTION
// =============================================================================

interface MagneticOffset {
  x: number
  y: number
}

/**
 * Calculate magnetic offset based on cursor position
 */
export function calculateMagneticOffset(
  cursorX: number,
  cursorY: number,
  elementCenterX: number,
  elementCenterY: number,
): MagneticOffset {
  const dx = cursorX - elementCenterX
  const dy = cursorY - elementCenterY
  const distance = Math.sqrt(dx * dx + dy * dy)
  
  if (distance > PHYSICS_CONFIG.magnetic.range) {
    return { x: 0, y: 0 }
  }
  
  // Strength decreases with distance
  const strength = (1 - distance / PHYSICS_CONFIG.magnetic.range) * PHYSICS_CONFIG.magnetic.strength
  
  return {
    x: dx * strength,
    y: dy * strength,
  }
}

/**
 * Create spring-based motion values for magnetic effect
 */
export function useMagneticSpring() {
  const x = useSpring(0, PHYSICS_CONFIG.spring)
  const y = useSpring(0, PHYSICS_CONFIG.spring)
  
  return { x, y }
}

// =============================================================================
// SCALE ANIMATIONS
// =============================================================================

export interface ScaleState {
  focused: boolean
  hovered: boolean
  minimized: boolean
}

/**
 * Get scale value based on widget state
 */
export function getWidgetScale(state: ScaleState): number {
  if (state.focused) return PHYSICS_CONFIG.focus.scaleFocused
  if (state.minimized) return PHYSICS_CONFIG.focus.scaleMinimized
  if (state.hovered) return PHYSICS_CONFIG.focus.scaleHovered
  return PHYSICS_CONFIG.focus.scaleDefault
}

/**
 * Get Framer Motion scale animation variants
 */
export const scaleVariants = {
  initial: { scale: 0.9, opacity: 0 },
  animate: { scale: 1, opacity: 1 },
  exit: { scale: 0.9, opacity: 0 },
  focused: { scale: PHYSICS_CONFIG.focus.scaleFocused },
  minimized: { scale: PHYSICS_CONFIG.focus.scaleMinimized },
  hovered: { scale: PHYSICS_CONFIG.focus.scaleHovered },
}

// =============================================================================
// DEPTH/PARALLAX
// =============================================================================

export type DepthLayer = "background" | "midground" | "foreground" | "focused"

/**
 * Get z-index for depth layer
 */
export function getDepthZIndex(layer: DepthLayer): number {
  return PHYSICS_CONFIG.depth[layer]
}

/**
 * Calculate parallax offset based on scroll/mouse position
 */
export function calculateParallaxOffset(
  mouseX: number,
  mouseY: number,
  containerWidth: number,
  containerHeight: number,
  depth: number = 1, // 0 = no parallax, 1 = max parallax
): { x: number; y: number } {
  const centerX = containerWidth / 2
  const centerY = containerHeight / 2
  
  const offsetX = (mouseX - centerX) * 0.02 * depth
  const offsetY = (mouseY - centerY) * 0.02 * depth
  
  return { x: offsetX, y: offsetY }
}

/**
 * Get parallax multiplier for widget type
 */
export function getParallaxDepth(widgetType: string): number {
  const depths: Record<string, number> = {
    ai: 0.3, // Closest to viewer
    "myca-suggestions": 0.35,
    species: 0.5,
    chemistry: 0.6,
    genetics: 0.7,
    research: 0.8,
    media: 0.4,
    location: 0.5,
    news: 0.6,
  }
  return depths[widgetType] || 0.5
}

// =============================================================================
// PARTICLE CONNECTIONS (Mycelium effect)
// =============================================================================

export interface Particle {
  id: number
  x: number
  y: number
  vx: number
  vy: number
  size: number
}

/**
 * Initialize particles for background animation
 */
export function initializeParticles(width: number, height: number): Particle[] {
  const particles: Particle[] = []
  
  for (let i = 0; i < PHYSICS_CONFIG.particles.count; i++) {
    particles.push({
      id: i,
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * PHYSICS_CONFIG.particles.speed,
      vy: (Math.random() - 0.5) * PHYSICS_CONFIG.particles.speed,
      size: PHYSICS_CONFIG.particles.particleSize * (0.5 + Math.random()),
    })
  }
  
  return particles
}

/**
 * Update particle positions
 */
export function updateParticles(
  particles: Particle[],
  width: number,
  height: number,
): Particle[] {
  return particles.map(p => {
    let x = p.x + p.vx
    let y = p.y + p.vy
    
    // Wrap around edges
    if (x < 0) x = width
    if (x > width) x = 0
    if (y < 0) y = height
    if (y > height) y = 0
    
    return { ...p, x, y }
  })
}

/**
 * Find connections between particles
 */
export function findParticleConnections(particles: Particle[]): Array<[number, number, number]> {
  const connections: Array<[number, number, number]> = []
  
  for (let i = 0; i < particles.length; i++) {
    for (let j = i + 1; j < particles.length; j++) {
      const dx = particles[i].x - particles[j].x
      const dy = particles[i].y - particles[j].y
      const distance = Math.sqrt(dx * dx + dy * dy)
      
      if (distance < PHYSICS_CONFIG.particles.connectionDistance) {
        const opacity = 1 - distance / PHYSICS_CONFIG.particles.connectionDistance
        connections.push([i, j, opacity])
      }
    }
  }
  
  return connections
}

// =============================================================================
// WIDGET LAYOUT HELPERS
// =============================================================================

export interface WidgetPosition {
  x: number
  y: number
  width: number
  height: number
}

/**
 * Calculate grid positions for widgets
 */
export function calculateWidgetGrid(
  widgetCount: number,
  containerWidth: number,
  containerHeight: number,
  widgetWidth: number = 300,
  widgetHeight: number = 200,
  padding: number = 20,
): WidgetPosition[] {
  const positions: WidgetPosition[] = []
  
  const cols = Math.floor((containerWidth - padding) / (widgetWidth + padding))
  const actualCols = Math.max(1, Math.min(cols, widgetCount))
  const rows = Math.ceil(widgetCount / actualCols)
  
  const totalWidth = actualCols * widgetWidth + (actualCols - 1) * padding
  const startX = (containerWidth - totalWidth) / 2
  
  const totalHeight = rows * widgetHeight + (rows - 1) * padding
  const startY = (containerHeight - totalHeight) / 2
  
  for (let i = 0; i < widgetCount; i++) {
    const col = i % actualCols
    const row = Math.floor(i / actualCols)
    
    positions.push({
      x: startX + col * (widgetWidth + padding),
      y: startY + row * (widgetHeight + padding),
      width: widgetWidth,
      height: widgetHeight,
    })
  }
  
  return positions
}

/**
 * Save widget layout to localStorage
 */
export function saveWidgetLayout(layoutId: string, positions: Record<string, WidgetPosition>) {
  try {
    localStorage.setItem(`search-widget-layout-${layoutId}`, JSON.stringify(positions))
  } catch {
    // Ignore localStorage errors
  }
}

/**
 * Load widget layout from localStorage
 */
export function loadWidgetLayout(layoutId: string): Record<string, WidgetPosition> | null {
  try {
    const saved = localStorage.getItem(`search-widget-layout-${layoutId}`)
    return saved ? JSON.parse(saved) : null
  } catch {
    return null
  }
}

// =============================================================================
// ANIMATION PRESETS
// =============================================================================

export const widgetEnterAnimation = {
  initial: { opacity: 0, scale: 0.8, y: 20 },
  animate: { 
    opacity: 1, 
    scale: 1, 
    y: 0,
    transition: {
      type: "spring",
      stiffness: 200,
      damping: 20,
    }
  },
  exit: { 
    opacity: 0, 
    scale: 0.9, 
    y: -10,
    transition: { duration: 0.2 }
  },
}

export const widgetDragAnimation = {
  drag: true,
  dragMomentum: true,
  dragElastic: 0.1,
  whileDrag: { 
    scale: 1.05, 
    boxShadow: "0 20px 40px rgba(0,0,0,0.2)",
    zIndex: 1000,
  },
}

export const widgetHoverAnimation = {
  whileHover: {
    scale: PHYSICS_CONFIG.focus.scaleHovered,
    boxShadow: "0 10px 30px rgba(0,0,0,0.15)",
    transition: { type: "spring", stiffness: 300, damping: 20 },
  },
}

export const glowPulseAnimation = {
  animate: {
    boxShadow: [
      "0 0 20px rgba(34, 197, 94, 0.2)",
      "0 0 40px rgba(34, 197, 94, 0.4)",
      "0 0 20px rgba(34, 197, 94, 0.2)",
    ],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: "easeInOut",
    },
  },
}
