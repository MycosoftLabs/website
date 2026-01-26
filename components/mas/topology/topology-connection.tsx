"use client"

/**
 * 3D Topology Connection Component v2.0
 * Enhanced multi-stream rendering with parallel lines and distinct particles
 * 
 * Updated: Jan 26, 2026
 * 
 * Features:
 * - Multiple connection streams between same nodes
 * - Parallel offset lines for multi-type connections
 * - Distinct particle colors by packet type
 * - Variable particle size based on packet size
 * - Variable particle speed based on latency
 * - Bidirectional flow visualization
 */

import { useRef, useMemo } from "react"
import { useFrame } from "@react-three/fiber"
import * as THREE from "three"
import type { TopologyConnection, TopologyNode, DataPacket, PacketType, ConnectionType, LineStyle } from "./types"
import { 
  CONNECTION_COLORS, 
  PACKET_COLORS, 
  PACKET_SIZE_THRESHOLDS, 
  LATENCY_THRESHOLDS 
} from "./types"

interface TopologyConnectionProps {
  connection: TopologyConnection
  sourceNode: TopologyNode
  targetNode: TopologyNode
  packets: DataPacket[]
  selected: boolean
  hovered: boolean
  animationSpeed: number
  showParticles: boolean
  streamOffset?: number  // For parallel stream rendering
}

interface MultiStreamConnectionProps {
  connections: TopologyConnection[]
  sourceNode: TopologyNode
  targetNode: TopologyNode
  packets: DataPacket[]
  selected: boolean
  hovered: boolean
  animationSpeed: number
  showParticles: boolean
}

// Get particle size based on packet size
function getParticleSize(size: number): number {
  if (size < PACKET_SIZE_THRESHOLDS.small) return 0.08
  if (size < PACKET_SIZE_THRESHOLDS.medium) return 0.12
  if (size < PACKET_SIZE_THRESHOLDS.large) return 0.16
  return 0.2
}

// Get particle speed multiplier based on latency
function getLatencySpeedMultiplier(latency: number): number {
  if (latency < LATENCY_THRESHOLDS.fast) return 1.5
  if (latency < LATENCY_THRESHOLDS.normal) return 1.0
  if (latency < LATENCY_THRESHOLDS.slow) return 0.6
  return 0.3
}

// Get packet color
function getPacketColor(type: PacketType): string {
  return PACKET_COLORS[type] || "#ffffff"
}

// Enhanced particle component with size/speed variations
function DataParticle({
  connection,
  sourcePos,
  targetPos,
  midPoint,
  packet,
  animationSpeed,
  offsetY = 0,
}: {
  connection: TopologyConnection
  sourcePos: THREE.Vector3
  targetPos: THREE.Vector3
  midPoint: THREE.Vector3
  packet: DataPacket
  animationSpeed: number
  offsetY?: number
}) {
  const meshRef = useRef<THREE.Mesh>(null)
  const progressRef = useRef(packet.progress)
  const glowRef = useRef<THREE.Mesh>(null)
  
  const packetType = packet.type as PacketType
  const color = useMemo(() => new THREE.Color(getPacketColor(packetType)), [packetType])
  
  // Adjust mid point with offset for parallel streams
  const adjustedMid = useMemo(() => {
    return midPoint.clone().add(new THREE.Vector3(0, offsetY, 0))
  }, [midPoint, offsetY])
  
  // Get particle properties
  const particleSize = getParticleSize(packet.size)
  const latencyMultiplier = getLatencySpeedMultiplier(packet.latency || 100)
  const isPriority = packet.priority === "high" || packet.priority === "critical"
  
  useFrame((_, delta) => {
    if (!meshRef.current) return
    
    // Determine direction
    const isReverse = packet.direction === "reverse"
    
    // Update progress
    const speed = delta * animationSpeed * (0.3 + connection.intensity * 0.5) * latencyMultiplier
    progressRef.current += isReverse ? -speed : speed
    
    if (progressRef.current >= 1) progressRef.current = 0
    if (progressRef.current < 0) progressRef.current = 1
    
    const t = progressRef.current
    
    // Quadratic bezier curve position
    const pos = new THREE.Vector3()
    const start = isReverse ? targetPos : sourcePos
    const end = isReverse ? sourcePos : targetPos
    
    pos.x = (1 - t) * (1 - t) * start.x + 2 * (1 - t) * t * adjustedMid.x + t * t * end.x
    pos.y = (1 - t) * (1 - t) * start.y + 2 * (1 - t) * t * adjustedMid.y + t * t * end.y
    pos.z = (1 - t) * (1 - t) * start.z + 2 * (1 - t) * t * adjustedMid.z + t * t * end.z
    
    meshRef.current.position.copy(pos)
    
    // Pulsing scale - more pronounced for priority packets
    const pulseAmplitude = isPriority ? 0.5 : 0.3
    const pulse = Math.sin(t * Math.PI) * pulseAmplitude + (1 - pulseAmplitude)
    meshRef.current.scale.setScalar(pulse)
    
    // Glow for priority packets
    if (glowRef.current) {
      glowRef.current.position.copy(pos)
      glowRef.current.scale.setScalar(pulse * 1.5)
    }
  })
  
  const isError = packetType === "error"
  
  return (
    <group>
      <mesh ref={meshRef}>
        <sphereGeometry args={[particleSize, 12, 12]} />
        <meshBasicMaterial 
          color={color} 
          transparent 
          opacity={isError ? 1.0 : 0.9} 
        />
      </mesh>
      
      {/* Glow effect for priority/error packets */}
      {(isPriority || isError) && (
        <mesh ref={glowRef}>
          <sphereGeometry args={[particleSize * 2, 8, 8]} />
          <meshBasicMaterial 
            color={color} 
            transparent 
            opacity={0.3}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      )}
    </group>
  )
}

// Animated line with enhanced styling
function AnimatedLine({
  start,
  end,
  mid,
  color,
  intensity,
  animated,
  animationSpeed,
  lineStyle = "solid",
  lineWidth = 1,
  offsetY = 0,
}: {
  start: THREE.Vector3
  end: THREE.Vector3
  mid: THREE.Vector3
  color: string
  intensity: number
  animated: boolean
  animationSpeed: number
  lineStyle?: LineStyle
  lineWidth?: number
  offsetY?: number
}) {
  const lineRef = useRef<THREE.Line>(null)
  const dashOffsetRef = useRef(0)
  
  // Adjust mid point for parallel offset
  const adjustedMid = useMemo(() => {
    return mid.clone().add(new THREE.Vector3(0, offsetY, 0))
  }, [mid, offsetY])
  
  const points = useMemo(() => {
    const curve = new THREE.QuadraticBezierCurve3(start, adjustedMid, end)
    return curve.getPoints(32)
  }, [start, adjustedMid, end])
  
  const lineColor = useMemo(() => new THREE.Color(color), [color])
  
  // Get dash properties based on line style
  const dashProps = useMemo(() => {
    switch (lineStyle) {
      case "dashed": return { dashSize: 0.4, gapSize: 0.2 }
      case "dotted": return { dashSize: 0.1, gapSize: 0.15 }
      default: return { dashSize: 1000, gapSize: 0 } // Solid
    }
  }, [lineStyle])
  
  useFrame((_, delta) => {
    if (lineRef.current && animated) {
      dashOffsetRef.current -= delta * animationSpeed * 2 * intensity
      const material = lineRef.current.material as THREE.LineDashedMaterial
      if (material.dashOffset !== undefined) {
        material.dashOffset = dashOffsetRef.current
      }
    }
  })
  
  const opacity = lineStyle === "solid" ? 0.5 + intensity * 0.4 : 0.3 + intensity * 0.3
  
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
          linewidth={lineWidth}
          dashSize={dashProps.dashSize}
          gapSize={dashProps.gapSize}
          transparent
          opacity={opacity}
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

// Direction arrow indicator
function DirectionArrow({
  position,
  direction,
  color,
}: {
  position: THREE.Vector3
  direction: THREE.Vector3
  color: string
}) {
  const arrowColor = useMemo(() => new THREE.Color(color), [color])
  
  return (
    <mesh position={position} rotation={[0, Math.atan2(direction.x, direction.z), 0]}>
      <coneGeometry args={[0.08, 0.2, 6]} />
      <meshBasicMaterial color={arrowColor} transparent opacity={0.7} />
    </mesh>
  )
}

// Single connection renderer
export function TopologyConnection3D({
  connection,
  sourceNode,
  targetNode,
  packets,
  selected,
  hovered,
  animationSpeed,
  showParticles,
  streamOffset = 0,
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
  
  const color = CONNECTION_COLORS[connection.type] || CONNECTION_COLORS.message
  const intensity = selected || hovered ? 1 : connection.intensity
  
  // Determine line style based on connection state
  const lineStyle: LineStyle = useMemo(() => {
    if (!connection.active) return "dotted"
    if (connection.traffic.messagesPerSecond === 0) return "dashed"
    return "solid"
  }, [connection.active, connection.traffic.messagesPerSecond])
  
  // Filter packets for this connection
  const connectionPackets = useMemo(() => {
    return packets
      .filter(p => p.connectionId === connection.id)
      .slice(0, 8) // Limit to 8 packets for performance
  }, [packets, connection.id])
  
  // Generate synthetic packets for visualization if none exist
  const displayPackets = useMemo(() => {
    if (connectionPackets.length > 0) return connectionPackets
    if (!showParticles || !connection.active) return []
    
    // Generate 1-3 particles based on traffic
    const count = Math.min(3, Math.max(1, Math.floor(connection.traffic.messagesPerSecond / 20)))
    return Array.from({ length: count }, (_, i) => ({
      id: `synth-${connection.id}-${i}`,
      connectionId: connection.id,
      sourceId: sourceNode.id,
      targetId: targetNode.id,
      type: "event" as PacketType,
      priority: "normal" as const,
      size: 100,
      latency: connection.traffic.latencyMs,
      timestamp: Date.now(),
      progress: i / count,
      direction: "forward" as const,
    }))
  }, [connectionPackets, showParticles, connection, sourceNode.id, targetNode.id])
  
  if (!connection.active) {
    // Render dim dotted line for inactive connections
    return (
      <AnimatedLine
        start={sourcePos}
        end={targetPos}
        mid={midPoint}
        color="#4b5563"
        intensity={0.2}
        animated={false}
        animationSpeed={0}
        lineStyle="dotted"
        offsetY={streamOffset}
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
        lineStyle={lineStyle}
        offsetY={streamOffset}
      />
      
      {/* Bidirectional indicator - second line with offset */}
      {connection.bidirectional && (
        <AnimatedLine
          start={targetPos}
          end={sourcePos}
          mid={midPoint.clone().add(new THREE.Vector3(0, 0.25, 0))}
          color={color}
          intensity={intensity * 0.6}
          animated={connection.animated}
          animationSpeed={animationSpeed * 0.8}
          lineStyle="dashed"
          offsetY={streamOffset + 0.25}
        />
      )}
      
      {/* Data flow particles */}
      {showParticles && displayPackets.map((packet, idx) => (
        <DataParticle
          key={packet.id || `packet-${idx}`}
          connection={connection}
          sourcePos={sourcePos}
          targetPos={targetPos}
          midPoint={midPoint}
          packet={packet}
          animationSpeed={animationSpeed}
          offsetY={streamOffset}
        />
      ))}
      
      {/* Reverse flow particles for bidirectional connections */}
      {showParticles && connection.bidirectional && displayPackets.length > 0 && (
        <DataParticle
          connection={connection}
          sourcePos={targetPos}
          targetPos={sourcePos}
          midPoint={midPoint.clone().add(new THREE.Vector3(0, 0.25, 0))}
          packet={{
            ...displayPackets[0],
            id: `reverse-${displayPackets[0].id}`,
            direction: "reverse",
            progress: (displayPackets[0].progress + 0.5) % 1,
            type: "response" as PacketType,
          }}
          animationSpeed={animationSpeed * 0.8}
          offsetY={streamOffset + 0.25}
        />
      )}
    </group>
  )
}

// Multi-stream connection renderer for multiple connections between same nodes
export function MultiStreamConnection({
  connections,
  sourceNode,
  targetNode,
  packets,
  selected,
  hovered,
  animationSpeed,
  showParticles,
}: MultiStreamConnectionProps) {
  // Calculate offset for each stream
  const streamSpacing = 0.3
  const startOffset = -((connections.length - 1) * streamSpacing) / 2
  
  return (
    <group>
      {connections.map((connection, index) => (
        <TopologyConnection3D
          key={connection.id}
          connection={connection}
          sourceNode={sourceNode}
          targetNode={targetNode}
          packets={packets}
          selected={selected}
          hovered={hovered}
          animationSpeed={animationSpeed}
          showParticles={showParticles}
          streamOffset={startOffset + index * streamSpacing}
        />
      ))}
    </group>
  )
}

// Group connections by node pair for multi-stream rendering
export function groupConnectionsByNodePair(
  connections: TopologyConnection[]
): Map<string, TopologyConnection[]> {
  const groups = new Map<string, TopologyConnection[]>()
  
  for (const conn of connections) {
    // Create consistent key regardless of direction
    const ids = [conn.sourceId, conn.targetId].sort()
    const key = `${ids[0]}-${ids[1]}`
    
    if (!groups.has(key)) {
      groups.set(key, [])
    }
    groups.get(key)!.push(conn)
  }
  
  return groups
}

// Connection traffic indicator (small badge showing messages/sec)
export function ConnectionTrafficBadge({
  connection,
  sourceNode,
  targetNode,
}: {
  connection: TopologyConnection
  sourceNode: TopologyNode
  targetNode: TopologyNode
}) {
  const midPos = useMemo(() => {
    const source = new THREE.Vector3(...sourceNode.position)
    const target = new THREE.Vector3(...targetNode.position)
    return source.clone().add(target).multiplyScalar(0.5)
  }, [sourceNode.position, targetNode.position])
  
  const mps = connection.traffic.messagesPerSecond
  if (mps < 1) return null
  
  // Color based on traffic intensity
  const color = mps > 100 ? "#ef4444" : mps > 50 ? "#f59e0b" : "#22c55e"
  
  return (
    <group position={midPos}>
      {/* Traffic indicator sphere */}
      <mesh>
        <sphereGeometry args={[0.15, 8, 8]} />
        <meshBasicMaterial color={color} transparent opacity={0.6} />
      </mesh>
    </group>
  )
}
