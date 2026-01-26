"use client"

/**
 * 3D Topology Node Component
 * Individual node rendered in 3D space with animations
 */

import { useRef, useState, useMemo } from "react"
import { useFrame } from "@react-three/fiber"
import { Html, Text, Billboard } from "@react-three/drei"
import * as THREE from "three"
import type { TopologyNode, NodeType } from "./types"
import { CATEGORY_COLORS, STATUS_COLORS, NODE_TYPE_CONFIG } from "./types"

interface TopologyNodeProps {
  node: TopologyNode
  selected: boolean
  hovered: boolean
  onSelect: (id: string) => void
  onHover: (id: string | null) => void
  showLabels: boolean
  showMetrics: boolean
  animationSpeed: number
  isConnectionTarget?: boolean // When true, node is a potential connection target
}

// Custom pulsing glow shader
const glowVertexShader = `
  varying vec3 vNormal;
  void main() {
    vNormal = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const glowFragmentShader = `
  uniform vec3 glowColor;
  uniform float intensity;
  uniform float time;
  varying vec3 vNormal;
  void main() {
    float pulse = sin(time * 2.0) * 0.15 + 0.85;
    float glow = pow(0.7 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.0);
    gl_FragColor = vec4(glowColor, glow * intensity * pulse);
  }
`

function NodeGeometry({ type, scale }: { type: NodeType; scale: number }) {
  const config = NODE_TYPE_CONFIG[type]
  const finalScale = scale * config.scale

  switch (config.shape) {
    case "octahedron":
      return <octahedronGeometry args={[finalScale, 0]} />
    case "box":
      return <boxGeometry args={[finalScale * 1.2, finalScale * 0.8, finalScale * 1.2]} />
    case "cylinder":
      return <cylinderGeometry args={[finalScale * 0.6, finalScale * 0.6, finalScale * 1.2, 16]} />
    case "torus":
      return <torusGeometry args={[finalScale * 0.6, finalScale * 0.25, 8, 24]} />
    default:
      return <sphereGeometry args={[finalScale, 24, 24]} />
  }
}

export function TopologyNode3D({
  node,
  selected,
  hovered,
  onSelect,
  onHover,
  showLabels,
  showMetrics,
  animationSpeed,
  isConnectionTarget = false,
}: TopologyNodeProps) {
  const meshRef = useRef<THREE.Mesh>(null)
  const glowRef = useRef<THREE.Mesh>(null)
  const connectionRingRef = useRef<THREE.Mesh>(null)
  const [localHover, setLocalHover] = useState(false)
  
  // Use connection target color when in connection mode
  const baseColor = isConnectionTarget && localHover ? "#22d3ee" : CATEGORY_COLORS[node.category]
  const color = useMemo(() => new THREE.Color(baseColor), [baseColor])
  const statusColor = useMemo(() => new THREE.Color(STATUS_COLORS[node.status]), [node.status])
  
  // Glow material
  const glowMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        glowColor: { value: color },
        intensity: { value: selected ? 1.0 : hovered ? 0.7 : 0.4 },
        time: { value: 0 },
      },
      vertexShader: glowVertexShader,
      fragmentShader: glowFragmentShader,
      transparent: true,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
    })
  }, [color, selected, hovered])
  
  // Animation loop
  useFrame((state, delta) => {
    if (meshRef.current) {
      // Gentle rotation for active nodes
      if (node.status === "active" || node.status === "busy") {
        meshRef.current.rotation.y += delta * 0.2 * animationSpeed
      }
      
      // Pulse scale for busy nodes or connection targets
      if (node.status === "busy" || (isConnectionTarget && localHover)) {
        const pulse = Math.sin(state.clock.elapsedTime * 3) * 0.05 + 1
        meshRef.current.scale.setScalar(pulse)
      }
      
      // Hover effect - larger for connection targets
      if (localHover || hovered || selected) {
        const targetScale = isConnectionTarget && localHover ? 1.3 : 1.15
        meshRef.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.1)
      } else {
        meshRef.current.scale.lerp(new THREE.Vector3(1, 1, 1), 0.1)
      }
    }
    
    if (glowRef.current && glowMaterial.uniforms) {
      glowMaterial.uniforms.time.value = state.clock.elapsedTime
      // Brighter glow for connection targets
      const targetIntensity = isConnectionTarget 
        ? (localHover ? 1.2 : 0.6) 
        : (selected ? 1.0 : localHover || hovered ? 0.7 : 0.3)
      glowMaterial.uniforms.intensity.value = THREE.MathUtils.lerp(
        glowMaterial.uniforms.intensity.value,
        targetIntensity,
        0.1
      )
    }
    
    // Animate connection target ring
    if (connectionRingRef.current && isConnectionTarget) {
      connectionRingRef.current.rotation.z = state.clock.elapsedTime * 2
      const scale = 1 + Math.sin(state.clock.elapsedTime * 4) * 0.1
      connectionRingRef.current.scale.setScalar(scale)
    }
  })
  
  const handleClick = (e: THREE.Event) => {
    e.stopPropagation()
    onSelect(node.id)
  }
  
  const handlePointerOver = (e: THREE.Event) => {
    e.stopPropagation()
    setLocalHover(true)
    onHover(node.id)
    // Show crosshair cursor for connection targets
    document.body.style.cursor = isConnectionTarget ? "crosshair" : "pointer"
  }
  
  const handlePointerOut = () => {
    setLocalHover(false)
    onHover(null)
    document.body.style.cursor = "auto"
  }
  
  return (
    <group position={node.position}>
      {/* Main node mesh */}
      <mesh
        ref={meshRef}
        onClick={handleClick}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
        castShadow
        receiveShadow
      >
        <NodeGeometry type={node.type} scale={node.size} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={node.status === "active" ? 0.3 : node.status === "error" ? 0.5 : 0.1}
          metalness={0.4}
          roughness={0.3}
        />
      </mesh>
      
      {/* Outer glow */}
      <mesh ref={glowRef} scale={1.3}>
        <NodeGeometry type={node.type} scale={node.size} />
        <primitive object={glowMaterial} attach="material" />
      </mesh>
      
      {/* Status indicator ring */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, -node.size * 0.6, 0]}>
        <ringGeometry args={[node.size * 0.8, node.size * 0.95, 32]} />
        <meshBasicMaterial color={statusColor} transparent opacity={0.8} />
      </mesh>
      
      {/* Connection target indicator ring - shows when in connection mode */}
      {isConnectionTarget && (
        <mesh ref={connectionRingRef} rotation={[Math.PI / 2, 0, 0]} position={[0, node.size * 0.1, 0]}>
          <ringGeometry args={[node.size * 1.3, node.size * 1.5, 32]} />
          <meshBasicMaterial color="#22d3ee" transparent opacity={localHover ? 0.8 : 0.4} />
        </mesh>
      )}
      
      {/* Label */}
      {(showLabels || localHover || hovered || selected) && (
        <Billboard follow lockX={false} lockY={false} lockZ={false}>
          <Text
            position={[0, node.size * 1.5, 0]}
            fontSize={0.6}
            color="white"
            anchorX="center"
            anchorY="middle"
            outlineWidth={0.05}
            outlineColor="#000000"
          >
            {node.shortName}
          </Text>
        </Billboard>
      )}
      
      {/* Metrics display on hover */}
      {(showMetrics || localHover || hovered) && node.type !== "user" && (
        <Html
          position={[node.size * 2, 0, 0]}
          style={{
            pointerEvents: "none",
            opacity: localHover || hovered ? 1 : 0.7,
            transition: "opacity 0.2s",
          }}
          distanceFactor={10}
        >
          <div className="bg-black/80 backdrop-blur-sm rounded-lg px-2 py-1 text-xs text-white whitespace-nowrap border border-white/10">
            <div className="font-semibold" style={{ color: CATEGORY_COLORS[node.category] }}>
              {node.shortName}
            </div>
            <div className="text-gray-300">
              CPU: {node.metrics.cpuPercent.toFixed(1)}%
            </div>
            <div className="text-gray-300">
              RAM: {node.metrics.memoryMb}MB
            </div>
            <div className="text-gray-300">
              {node.metrics.messagesPerSecond.toFixed(0)}/s
            </div>
          </div>
        </Html>
      )}
    </group>
  )
}
