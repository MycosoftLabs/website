"use client"

import { useEffect, useRef } from "react"
import * as THREE from "three"

interface ParticleConstellationProps {
  opacity?: number
  particleCount?: number
  particleColor?: number
  lineColor?: number
  sphereRadius?: number
}

// Inspired by Codepen by billimarie - Three.js particle constellation
// Creates particles in a sphere formation connected by lines that respond to mouse movement
export function ParticleConstellation({
  opacity = 0.5,
  particleCount = 100,
  particleColor = 0xffffff,
  lineColor = 0xffffff,
  sphereRadius = 450
}: ParticleConstellationProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const animationRef = useRef<number>(0)
  const mouseRef = useRef({ x: 0, y: 0 })
  const sceneRef = useRef<THREE.Scene | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const rect = container.getBoundingClientRect()
    const width = rect.width || window.innerWidth
    const height = rect.height || window.innerHeight

    // Scene setup
    const scene = new THREE.Scene()
    sceneRef.current = scene

    // Camera setup
    const camera = new THREE.PerspectiveCamera(75, width / height, 1, 10000)
    camera.position.z = 100
    cameraRef.current = camera

    // Renderer setup - use WebGL
    const renderer = new THREE.WebGLRenderer({ 
      alpha: true,
      antialias: true 
    })
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setClearColor(0x000000, 0) // Transparent background
    container.appendChild(renderer.domElement)
    rendererRef.current = renderer

    // Create particles
    const particleGeometry = new THREE.BufferGeometry()
    const positions: number[] = []
    
    for (let i = 0; i < particleCount; i++) {
      // Create random point on unit sphere then scale
      const x = Math.random() * 2 - 1
      const y = Math.random() * 2 - 1
      const z = Math.random() * 2 - 1
      
      // Normalize to unit sphere
      const len = Math.sqrt(x * x + y * y + z * z)
      const scale = (Math.random() * 10 + sphereRadius) / len
      
      positions.push(x * scale, y * scale, z * scale)
    }
    
    particleGeometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(positions, 3)
    )

    // Particle material
    const particleMaterial = new THREE.PointsMaterial({
      color: particleColor,
      size: 3,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.8
    })

    const particles = new THREE.Points(particleGeometry, particleMaterial)
    scene.add(particles)

    // Create lines connecting particles
    const lineMaterial = new THREE.LineBasicMaterial({
      color: lineColor,
      opacity: 0.3,
      transparent: true
    })

    const lineGeometry = new THREE.BufferGeometry()
    lineGeometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(positions, 3)
    )

    const line = new THREE.Line(lineGeometry, lineMaterial)
    scene.add(line)

    // Also add a loop line for visual interest
    const loopGeometry = new THREE.BufferGeometry()
    const loopPositions = [...positions, positions[0], positions[1], positions[2]]
    loopGeometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(loopPositions, 3)
    )
    const loopLine = new THREE.LineLoop(loopGeometry, lineMaterial)
    scene.add(loopLine)

    // Mouse handlers
    const handleMouseMove = (event: MouseEvent) => {
      const rect = container.getBoundingClientRect()
      mouseRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
      mouseRef.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
    }

    const handleTouchMove = (event: TouchEvent) => {
      if (event.touches.length === 1) {
        const rect = container.getBoundingClientRect()
        mouseRef.current.x = ((event.touches[0].clientX - rect.left) / rect.width) * 2 - 1
        mouseRef.current.y = -((event.touches[0].clientY - rect.top) / rect.height) * 2 + 1
      }
    }

    // Resize handler
    const handleResize = () => {
      const rect = container.getBoundingClientRect()
      const newWidth = rect.width || window.innerWidth
      const newHeight = rect.height || window.innerHeight

      camera.aspect = newWidth / newHeight
      camera.updateProjectionMatrix()
      renderer.setSize(newWidth, newHeight)
    }

    container.addEventListener("mousemove", handleMouseMove)
    container.addEventListener("touchmove", handleTouchMove)
    window.addEventListener("resize", handleResize)

    // Animation loop
    const animate = () => {
      animationRef.current = requestAnimationFrame(animate)

      // Smooth camera follow mouse
      const targetX = mouseRef.current.x * 200
      const targetY = mouseRef.current.y * 200 + 200

      camera.position.x += (targetX - camera.position.x) * 0.05
      camera.position.y += (targetY - camera.position.y) * 0.05
      camera.lookAt(scene.position)

      // Slowly rotate the particles
      particles.rotation.y += 0.001
      line.rotation.y += 0.001
      loopLine.rotation.y += 0.001

      renderer.render(scene, camera)
    }

    animate()

    // Cleanup
    return () => {
      cancelAnimationFrame(animationRef.current)
      container.removeEventListener("mousemove", handleMouseMove)
      container.removeEventListener("touchmove", handleTouchMove)
      window.removeEventListener("resize", handleResize)
      
      if (renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement)
      }
      
      renderer.dispose()
      particleGeometry.dispose()
      particleMaterial.dispose()
      lineGeometry.dispose()
      loopGeometry.dispose()
      lineMaterial.dispose()
    }
  }, [particleCount, particleColor, lineColor, sphereRadius])

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 overflow-hidden"
      style={{ opacity }}
    />
  )
}
