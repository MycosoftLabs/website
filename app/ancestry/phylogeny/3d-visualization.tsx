"use client"

import { useEffect, useRef, useState } from "react"
import * as THREE from "three"
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls"

interface Node {
  id: string
  name: string
  children?: Node[]
  distance?: number
  parent?: Node
  position?: THREE.Vector3
  object?: THREE.Object3D
}

interface PhylogenyVisualizationProps {
  rootSpeciesId: number
}

export default function PhylogenyVisualization({ rootSpeciesId }: PhylogenyVisualizationProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const sceneRef = useRef<{
    scene: THREE.Scene
    camera: THREE.PerspectiveCamera
    renderer: THREE.WebGLRenderer
    controls: OrbitControls
  } | null>(null)

  // Mock tree data for fallback
  const mockTreeData: Node = {
    id: "root",
    name: "Agaricales",
    children: [
      {
        id: "1",
        name: "Agaricaceae",
        children: [
          { id: "1.1", name: "Agaricus bisporus", distance: 0.05 },
          { id: "1.2", name: "Lepiota cristata", distance: 0.07 },
        ],
        distance: 0.1,
      },
      {
        id: "2",
        name: "Amanitaceae",
        children: [
          { id: "2.1", name: "Amanita muscaria", distance: 0.06 },
          { id: "2.2", name: "Amanita phalloides", distance: 0.08 },
        ],
        distance: 0.15,
      },
      {
        id: "3",
        name: "Psathyrellaceae",
        children: [
          { id: "3.1", name: "Coprinopsis cinerea", distance: 0.09 },
          { id: "3.2", name: "Psathyrella candolleana", distance: 0.11 },
        ],
        distance: 0.2,
      },
    ],
  }

  async function fetchData(rootId: number) {
    try {
      setLoading(true)
      setError(null)

      // Try to get data from memory cache first
      // We'll use a simple in-memory approach instead of the Vercel Blob
      const cacheKey = `tree_data_${rootId}`
      const cachedData = sessionStorage.getItem(cacheKey)

      if (cachedData) {
        return JSON.parse(cachedData)
      }

      // If no cached data, fetch from API
      const response = await fetch(`/api/ancestry/tree/${rootId}`)

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`API returned ${response.status}: ${response.statusText} - ${errorText}`)
      }

      const data = await response.json()

      // Cache the data in sessionStorage
      sessionStorage.setItem(cacheKey, JSON.stringify(data))

      return data
    } catch (err) {
      console.error("Error fetching tree data:", err)
      setError("Failed to fetch tree data. Using sample visualization instead.")
      // Return mock data as fallback
      return mockTreeData
    } finally {
      setLoading(false)
    }
  }

  function createVisualization(treeData: Node) {
    if (!containerRef.current) return

    // Clean up previous scene if it exists
    if (sceneRef.current) {
      const { scene, renderer, controls } = sceneRef.current

      // Remove all objects from the scene
      while (scene.children.length > 0) {
        scene.remove(scene.children[0])
      }

      // Dispose of the renderer
      renderer.dispose()

      // Dispose of the controls
      controls.dispose()
    }

    // Create a new scene
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0xf0f0f0)

    // Create a camera
    const camera = new THREE.PerspectiveCamera(
      75,
      containerRef.current.clientWidth / containerRef.current.clientHeight,
      0.1,
      1000,
    )
    camera.position.z = 15

    // Create a renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight)
    containerRef.current.innerHTML = ""
    containerRef.current.appendChild(renderer.domElement)

    // Add orbit controls
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.05

    // Store references
    sceneRef.current = { scene, camera, renderer, controls }

    // Add ambient light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6)
    scene.add(ambientLight)

    // Add directional light
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8)
    directionalLight.position.set(1, 1, 1)
    scene.add(directionalLight)

    // Calculate positions for the tree nodes
    calculateNodePositions(treeData, 0, 0, 0, 10, Math.PI * 2)

    // Create visual elements for the tree
    createTreeVisuals(treeData, scene)

    // Animation loop
    function animate() {
      requestAnimationFrame(animate)
      controls.update()
      renderer.render(scene, camera)
    }

    animate()

    // Handle window resize
    const handleResize = () => {
      if (!containerRef.current) return
      camera.aspect = containerRef.current.clientWidth / containerRef.current.clientHeight
      camera.updateProjectionMatrix()
      renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight)
    }

    window.addEventListener("resize", handleResize)

    // Return cleanup function
    return () => {
      window.removeEventListener("resize", handleResize)
    }
  }

  function calculateNodePositions(
    node: Node,
    x: number,
    y: number,
    startAngle: number,
    radius: number,
    angleSpan: number,
  ) {
    node.position = new THREE.Vector3(x, y, 0)

    if (!node.children || node.children.length === 0) return

    const angleStep = angleSpan / node.children.length
    let currentAngle = startAngle

    node.children.forEach((child) => {
      const childDistance = child.distance || 1
      const childX = x + radius * Math.cos(currentAngle) * childDistance
      const childY = y + radius * Math.sin(currentAngle) * childDistance
      calculateNodePositions(child, childX, childY, currentAngle, radius * 0.8, angleStep * 0.8)
      currentAngle += angleStep
    })
  }

  function createTreeVisuals(node: Node, scene: THREE.Scene, parentPosition?: THREE.Vector3) {
    if (!node.position) return

    // Create sphere for node
    const geometry = new THREE.SphereGeometry(0.2, 32, 32)
    const material = new THREE.MeshStandardMaterial({ color: 0x44aa88 })
    const sphere = new THREE.Mesh(geometry, material)
    sphere.position.copy(node.position)
    scene.add(sphere)
    node.object = sphere

    // Create label for node
    const canvas = document.createElement("canvas")
    const context = canvas.getContext("2d")
    if (context) {
      canvas.width = 256
      canvas.height = 64
      context.fillStyle = "#ffffff"
      context.fillRect(0, 0, canvas.width, canvas.height)

      context.font = "24px Arial"
      context.fillStyle = "#000000"
      context.textAlign = "center"
      context.fillText(node.name, canvas.width / 2, canvas.height / 2 + 8)

      const texture = new THREE.CanvasTexture(canvas)
      const labelMaterial = new THREE.SpriteMaterial({ map: texture })
      const label = new THREE.Sprite(labelMaterial)
      label.position.set(node.position.x, node.position.y + 0.5, node.position.z)
      label.scale.set(2, 0.5, 1)
      scene.add(label)
    }

    // Create line to parent
    if (parentPosition) {
      const points = [parentPosition, node.position]
      const lineGeometry = new THREE.BufferGeometry().setFromPoints(points)
      const lineMaterial = new THREE.LineBasicMaterial({ color: 0x999999 })
      const line = new THREE.Line(lineGeometry, lineMaterial)
      scene.add(line)
    }

    // Process children
    if (node.children) {
      node.children.forEach((child) => {
        createTreeVisuals(child, scene, node.position)
      })
    }
  }

  useEffect(() => {
    let cleanup: (() => void) | undefined

    async function initVisualization() {
      try {
        setLoading(true)
        const treeData = await fetchData(rootSpeciesId)
        cleanup = createVisualization(treeData)
      } catch (err) {
        console.error("Error building phylogeny visualization:", err)
        setError("Failed to create visualization. Please try again later.")
      } finally {
        setLoading(false)
      }
    }

    initVisualization()

    return () => {
      if (cleanup) cleanup()
    }
  }, [rootSpeciesId])

  return (
    <div className="w-full">
      {loading && (
        <div className="flex justify-center items-center h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-600"></div>
        </div>
      )}

      {error && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded mb-4">
          <p>{error}</p>
        </div>
      )}

      <div
        ref={containerRef}
        className="w-full h-[400px] rounded-lg overflow-hidden"
        style={{ display: loading ? "none" : "block" }}
      ></div>
    </div>
  )
}
