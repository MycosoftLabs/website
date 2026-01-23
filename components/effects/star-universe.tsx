"use client"

import { useEffect, useRef } from "react"

interface StarUniverseProps {
  /** Number of stars to render */
  starCount?: number
  /** Number of speed layers (affects star size variety) */
  layerCount?: number
  /** Maximum animation duration in seconds */
  maxTime?: number
  /** Star color - defaults to white */
  starColor?: string
  /** Additional CSS classes for the container */
  className?: string
}

/**
 * Animated star/particle universe background effect
 * Based on: https://codepen.io/sacsam005/pen/BaJmaXy
 * 
 * Creates animated particles that flow horizontally across the screen,
 * perfect for bioaerosol/spore collection theme on SporeBase page.
 */
export function StarUniverse({
  starCount = 400,
  layerCount = 5,
  maxTime = 30,
  starColor = "white",
  className = "",
}: StarUniverseProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const starsRef = useRef<HTMLDivElement[]>([])
  const animationsRef = useRef<Animation[]>([])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    // Get dimensions
    const width = window.innerWidth
    const height = window.innerHeight

    // Clear existing stars
    container.innerHTML = ""
    starsRef.current = []
    animationsRef.current = []

    // Create stars
    for (let i = 0; i < starCount; i++) {
      const ypos = Math.round(Math.random() * height)
      const star = document.createElement("div")
      const speed = 1000 * (Math.random() * maxTime + 1)
      
      // Calculate star size class based on speed (slower = larger)
      const sizeClass = 3 - Math.floor(speed / 1000 / 8)
      
      // Apply star styles
      star.style.position = "absolute"
      star.style.backgroundColor = starColor
      star.style.opacity = "1"
      star.style.borderRadius = "50%"
      
      // Size based on speed layer
      switch (sizeClass) {
        case 0:
          star.style.width = "1px"
          star.style.height = "1px"
          break
        case 1:
          star.style.width = "2px"
          star.style.height = "2px"
          break
        case 2:
          star.style.width = "3px"
          star.style.height = "3px"
          break
        case 3:
        default:
          star.style.width = "4px"
          star.style.height = "4px"
          break
      }

      container.appendChild(star)
      starsRef.current.push(star)

      // Animate the star
      const animation = star.animate(
        [
          {
            transform: `translate3d(${width}px, ${ypos}px, 0)`,
          },
          {
            transform: `translate3d(-${Math.random() * 256}px, ${ypos}px, 0)`,
          },
        ],
        {
          delay: Math.random() * -speed,
          duration: speed,
          iterations: Infinity,
        }
      )
      
      animationsRef.current.push(animation)
    }

    // Cleanup on unmount
    return () => {
      animationsRef.current.forEach((anim) => anim.cancel())
      if (container) {
        container.innerHTML = ""
      }
    }
  }, [starCount, maxTime, starColor])

  // Handle resize
  useEffect(() => {
    const handleResize = () => {
      // Re-initialize on resize by triggering effect
      const container = containerRef.current
      if (container) {
        // Cancel existing animations
        animationsRef.current.forEach((anim) => anim.cancel())
        
        // Trigger re-render by updating container
        container.innerHTML = ""
        
        // Force re-create stars
        const event = new Event("resize")
        window.dispatchEvent(event)
      }
    }

    let resizeTimeout: NodeJS.Timeout
    const debouncedResize = () => {
      clearTimeout(resizeTimeout)
      resizeTimeout = setTimeout(handleResize, 250)
    }

    window.addEventListener("resize", debouncedResize)
    return () => {
      window.removeEventListener("resize", debouncedResize)
      clearTimeout(resizeTimeout)
    }
  }, [])

  return (
    <div
      ref={containerRef}
      className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}
      aria-hidden="true"
    />
  )
}

/**
 * Spore-themed variant with orange/amber particles
 * Perfect for the SporeBase page
 */
export function SporeUniverse({
  starCount = 200,
  maxTime = 25,
  className = "",
}: Omit<StarUniverseProps, 'starColor' | 'layerCount'>) {
  const containerRef = useRef<HTMLDivElement>(null)
  const animationsRef = useRef<Animation[]>([])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const width = window.innerWidth
    const height = window.innerHeight

    container.innerHTML = ""
    animationsRef.current = []

    // Color palette for spores
    const sporeColors = [
      "rgba(251, 146, 60, 0.8)",  // orange-400
      "rgba(245, 158, 11, 0.7)",  // amber-500
      "rgba(217, 119, 6, 0.6)",   // amber-600
      "rgba(255, 255, 255, 0.4)", // white
      "rgba(251, 191, 36, 0.5)",  // amber-400
    ]

    for (let i = 0; i < starCount; i++) {
      const ypos = Math.round(Math.random() * height)
      const spore = document.createElement("div")
      const speed = 1000 * (Math.random() * maxTime + 3) // Minimum 3 seconds
      
      // Random size between 1-5px
      const size = Math.random() * 4 + 1
      
      // Random color from palette
      const color = sporeColors[Math.floor(Math.random() * sporeColors.length)]
      
      spore.style.position = "absolute"
      spore.style.backgroundColor = color
      spore.style.width = `${size}px`
      spore.style.height = `${size}px`
      spore.style.borderRadius = "50%"
      spore.style.boxShadow = `0 0 ${size * 2}px ${color}`
      
      container.appendChild(spore)

      // Animate with slight vertical drift
      const yDrift = (Math.random() - 0.5) * 100
      
      const animation = spore.animate(
        [
          {
            transform: `translate3d(${width + 50}px, ${ypos}px, 0)`,
            opacity: 0,
          },
          {
            transform: `translate3d(${width * 0.7}px, ${ypos + yDrift * 0.3}px, 0)`,
            opacity: 1,
          },
          {
            transform: `translate3d(${width * 0.3}px, ${ypos + yDrift * 0.7}px, 0)`,
            opacity: 0.8,
          },
          {
            transform: `translate3d(-50px, ${ypos + yDrift}px, 0)`,
            opacity: 0,
          },
        ],
        {
          delay: Math.random() * -speed,
          duration: speed,
          iterations: Infinity,
          easing: "linear",
        }
      )
      
      animationsRef.current.push(animation)
    }

    return () => {
      animationsRef.current.forEach((anim) => anim.cancel())
      if (container) container.innerHTML = ""
    }
  }, [starCount, maxTime])

  return (
    <div
      ref={containerRef}
      className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}
      aria-hidden="true"
    />
  )
}
