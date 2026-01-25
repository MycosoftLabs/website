"use client"

/**
 * 3D Topology Connection Component
 * Animated lines with data flow particles between nodes
 */

import { useRef, useMemo } from "react"
import { useFrame } from "@react-three/fiber"
import { Line, QuadraticBezierLine } from "@react-three/drei"
import * as THREE from "three"
import type { TopologyConnection, TopologyNode, DataPacket } from "./types"
import { CONNECTION_COLORS } from "./types"

interface TopologyConnectionProps {
  connection: TopologyConnection
  sourceNode: TopologyNode
  targetNode: TopologyNode
  packets: DataPacket[]
  selected: boolean
  hovered: boolean
  animationSpeed: number
  showParticles: boolean
}

// Particle component for data flow visualization
function DataParticle({
  connection,
  sourcePos,
  targetPos,
  packet,
  animationSpeed,
}: {
  connection: TopologyConnection
  sourcePos: THREE.Vector3
  targetPos: THREE.Vector3
  packet: DataPacket
  animationSpeed: number
}) {
  const meshRef = useRef<THREE.Mesh>(null)
  const progressRef = useRef(packet.progress)
  
  const color = useMemo(() => new THREE.Color(CONNECTION_COLORS[connection.type]), [connection.type])
  
  // Calculate mid-point with arc
  const midPoint = useMemo(() => {
    const mid = sourcePos.clone().add(targetPos).multiplyScalar(0.5)
    const direction = targetPos.clone().sub(sourcePos)
    const perpendicular = new THREE.Vector3(-direction.z, direction.y * 0.3, direction.x).normalize()
    const arcHeight = direction.length() * 0.15
    return mid.add(perpendicular.multiplyScalar(arcHeight))
  }, [sourcePos, targetPos])
  
  useFrame((_, delta) => {
    if (!meshRef.current) return
    
    // Update progress
    progressRef.current += delta * animationSpeed * (0.3 + connection.intensity * 0.5)
    if (progressRef.current >= 1) {
      progressRef.current = 0
    }
    
    const t = progressRef.current
    
    // Quadratic bezier curve position
    const pos = new THREE.Vector3()
    pos.x = (1 - t) * (1 - t) * sourcePos.x + 2 * (1 - t) * t * midPoint.x + t * t * targetPos.x
    pos.y = (1 - t) * (1 - t) * sourcePos.y + 2 * (1 - t) * t * midPoint.y + t * t * targetPos.y
    pos.z = (1 - t) * (1 - t) * sourcePos.z + 2 * (1 - t) * t * midPoint.z + t * t * targetPos.z
    
    meshRef.current.position.copy(pos)
    
    // Pulsing scale
    const pulse = Math.sin(t * Math.PI) * 0.3 + 0.7
    meshRef.current.scale.setScalar(pulse)
  })
  
  const particleSize = packet.type === "error" ? 0.15 : 0.1
  const particleColor = packet.type === "error" ? "#ef4444" : color
  
  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[particleSize, 8, 8]} />
      <meshBasicMaterial color={particleColor} transparent opacity={0.9} />
    </mesh>
  )
}

// Animated line with glow effect
function AnimatedLine({
  start,
  end,
  mid,
  color,
  intensity,
  animated,
  animationSpeed,
}: {
  start: THREE.Vector3
  end: THREE.Vector3
  mid: THREE.Vector3
  color: string
  intensity: number
  animated: boolean
  animationSpeed: number
}) {
  const lineRef = useRef<THREE.Line>(null)
  const dashOffsetRef = useRef(0)
  
  const points = useMemo(() => {
    const curve = new THREE.QuadraticBezierCurve3(start, mid, end)
    return curve.getPoints(32)
  }, [start, mid, end])
  
  const lineColor = useMemo(() => new THREE.Color(color), [color])
  
  useFrame((_, delta) => {
    if (lineRef.current && animated) {
      dashOffsetRef.current -= delta * animationSpeed * 2 * intensity
      const material = lineRef.current.material as THREE.LineDashedMaterial
      if (material.dashOffset !== undefined) {
        material.dashOffset = dashOffsetRef.current
      }
    }
  })
  
  return (
    <group>
      {/* Main line */}
      <line ref={lineRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={points.length}
            array={new Float32Array(points.flatMap(p => [p.x, p.y, p.z]))}
            itemSize={3}
          />
        </bufferGeometry>
        <lineDashedMaterial
          color={lineColor}
          linewidth={1}
          dashSize={0.3}
          gapSize={0.15}
          transparent
          opacity={0.4 + intensity * 0.4}
        />
      </line>
      
      {/* Glow line */}
      <line>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={points.length}
            array={new Float32Array(points.flatMap(p => [p.x, p.y, p.z]))}
            itemSize={3}
          />
        </bufferGeometry>
        <lineBasicMaterial
          color={lineColor}
          transparent
          opacity={intensity * 0.2}
          blending={THREE.AdditiveBlending}
        />
      </line>
    </group>
  )
}

export function TopologyConnection3D({
  connection,
  sourceNode,
  targetNode,
  packets,
  selected,
  hovered,
  animationSpeed,
  showParticles,
}: TopologyConnectionProps) {
  const sourcePos = useMemo(() => new THREE.Vector3(...sourceNode.position), [sourceNode.position])
  const targetPos = useMemo(() => new THREE.Vector3(...targetNode.position), [targetNode.position])
  
  // Calculate mid-point for curved line
  const midPoint = useMemo(() => {
    const mid = sourcePos.clone().add(targetPos).multiplyScalar(0.5)
    const direction = targetPos.clone().sub(sourcePos)
    const perpendicular = new THREE.Vector3(-direction.z, 0.5, direction.x).normalize()
    const arcHeight = direction.length() * 0.12
    return mid.add(perpendicular.multiplyScalar(arcHeight))
  }, [sourcePos, targetPos])
  
  const color = CONNECTION_COLORS[connection.type]
  const intensity = selected || hovered ? 1 : connection.intensity
  
  // Filter packets for this connection
  const connectionPackets = useMemo(() => {
    return packets.filter(p => p.connectionId === connection.id).slice(0, 5)
  }, [packets, connection.id])
  
  if (!connection.active) {
    // Render dim line for inactive connections
    return (
      <AnimatedLine
        start={sourcePos}
        end={targetPos}
        mid={midPoint}
        color="#4b5563"
        intensity={0.2}
        animated={false}
        animationSpeed={0}
      />
    )
  }
  
  return (
    <group>
      {/* Main connection line */}
      <AnimatedLine
        start={sourcePos}
        end={targetPos}
        mid={midPoint}
        color={color}
        intensity={intensity}
        animated={connection.animated}
        animationSpeed={animationSpeed}
      />
      
      {/* Bidirectional indicator */}
      {connection.bidirectional && (
        <AnimatedLine
          start={targetPos}
          end={sourcePos}
          mid={midPoint.clone().add(new THREE.Vector3(0, 0.3, 0))}
          color={color}
          intensity={intensity * 0.6}
          animated={connection.animated}
          animationSpeed={animationSpeed * 0.8}
        />
      )}
      
      {/* Data flow particles */}
      {showParticles && connectionPackets.map(packet => (
        <DataParticle
          key={packet.id}
          connection={connection}
          sourcePos={packet.sourceId === sourceNode.id ? sourcePos : targetPos}
          targetPos={packet.targetId === targetNode.id ? targetPos : sourcePos}
          packet={packet}
          animationSpeed={animationSpeed}
        />
      ))}
      
      {/* Additional animated particles for high-traffic connections */}
      {showParticles && connection.traffic.messagesPerSecond > 30 && (
        <>
          <DataParticle
            connection={connection}
            sourcePos={sourcePos}
            targetPos={targetPos}
            packet={{ id: "auto-1", connectionId: connection.id, sourceId: "", targetId: "", type: "event", size: 100, timestamp: 0, progress: 0.3 }}
            animationSpeed={animationSpeed}
          />
          <DataParticle
            connection={connection}
            sourcePos={sourcePos}
            targetPos={targetPos}
            packet={{ id: "auto-2", connectionId: connection.id, sourceId: "", targetId: "", type: "event", size: 100, timestamp: 0, progress: 0.7 }}
            animationSpeed={animationSpeed}
          />
        </>
      )}
    </group>
  )
}
