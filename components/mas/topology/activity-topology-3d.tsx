"use client"

/**
 * Activity (Circulatory) Topology – 3D View
 * Frontend (left) → APIs (center) → Infrastructure (right). Same stack as Agent Topology.
 */

import { useState, useEffect, useCallback, useMemo, useRef, Suspense } from "react"
import { Canvas, useFrame } from "@react-three/fiber"
import { OrbitControls, Html, Text, Environment } from "@react-three/drei"
import * as THREE from "three"
import type { ActivityNode, ActivityConnection, ActivityTopologyData, ActivityNodeType } from "./activity-types"

// Colors by node type (hex)
const NODE_COLORS: Record<ActivityNodeType, string> = {
  page: "#3b82f6",
  api: "#06b6d4",
  app: "#8b5cf6",
  device: "#f97316",
  database: "#14b8a6",
  memory: "#a855f7",
  workflow: "#eab308",
  system: "#22c55e",
}

// Shapes by type
const NODE_SHAPES: Record<ActivityNodeType, "sphere" | "box" | "cylinder" | "torus"> = {
  page: "sphere",
  api: "box",
  app: "sphere",
  device: "box",
  database: "cylinder",
  memory: "torus",
  workflow: "torus",
  system: "box",
}

function ActivityNodeMesh({
  node,
  selected,
  onClick,
}: {
  node: ActivityNode
  selected: boolean
  onClick: () => void
}) {
  const meshRef = useRef<THREE.Mesh>(null)
  const pos = node.position ?? [0, 0, 0]
  const color = NODE_COLORS[node.type]
  const shape = NODE_SHAPES[node.type]
  const scale = selected ? 1.4 : 1

  useFrame((_, delta) => {
    if (meshRef.current && !selected) {
      meshRef.current.rotation.y += delta * 0.3
    }
  })

  const geometry = useMemo(() => {
    switch (shape) {
      case "box":
        return <boxGeometry args={[1.2 * scale, 0.9 * scale, 1.2 * scale]} />
      case "cylinder":
        return <cylinderGeometry args={[0.6 * scale, 0.6 * scale, 1.2 * scale, 16]} />
      case "torus":
        return <torusGeometry args={[0.6 * scale, 0.25 * scale, 8, 24]} />
      default:
        return <sphereGeometry args={[0.7 * scale, 20, 20]} />
    }
  }, [shape, scale])

  return (
    <group position={[pos[0], pos[1], pos[2]]}>
      <mesh
        ref={meshRef}
        onClick={(e) => (e.stopPropagation(), onClick())}
        onPointerOver={(e) => (e.stopPropagation(), (e.target as HTMLElement).style.cursor = "pointer")}
        onPointerOut={(e) => ((e.target as HTMLElement).style.cursor = "auto")}
      >
        {geometry}
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={selected ? 0.4 : 0.15}
          metalness={0.3}
          roughness={0.6}
        />
      </mesh>
      <Html center distanceFactor={12} style={{ pointerEvents: "none", userSelect: "none" }}>
        <div className="text-[10px] font-medium text-white/90 whitespace-nowrap bg-black/60 px-1.5 py-0.5 rounded">
          {node.label.length > 14 ? node.label.slice(0, 13) + "…" : node.label}
        </div>
      </Html>
    </group>
  )
}

function ConnectionLineSeg({ conn, nodeMap }: { conn: ActivityConnection; nodeMap: Map<string, ActivityNode> }) {
  const src = nodeMap.get(conn.sourceId)?.position ?? [0, 0, 0]
  const tgt = nodeMap.get(conn.targetId)?.position ?? [0, 0, 0]
  const array = useMemo(() => new Float32Array([...src, ...tgt]), [src, tgt])
  return (
    <line>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={2} array={array} itemSize={3} />
      </bufferGeometry>
      <lineBasicMaterial color="#475569" transparent opacity={0.5} />
    </line>
  )
}

function SceneInner({
  data,
  selectedId,
  onSelect,
}: {
  data: ActivityTopologyData
  selectedId: string | null
  onSelect: (node: ActivityNode) => void
}) {
  const nodeMap = useMemo(() => new Map(data.nodes.map((n) => [n.id, n])), [data.nodes])
  return (
    <>
      <ambientLight intensity={0.4} />
      <pointLight position={[50, 50, 50]} intensity={1} />
      <pointLight position={[-50, -50, 50]} intensity={0.5} />
      {data.connections.map((conn) => (
        <ConnectionLineSeg key={conn.id} conn={conn} nodeMap={nodeMap} />
      ))}
      {data.nodes.map((node) => (
        <ActivityNodeMesh
          key={node.id}
          node={node}
          selected={selectedId === node.id}
          onClick={() => onSelect(node)}
        />
      ))}
      <OrbitControls makeDefault enableDamping dampingFactor={0.05} minDistance={10} maxDistance={200} />
      <gridHelper args={[120, 40, "#334155", "#1e293b"]} position={[0, -25, 0]} />
    </>
  )
}

export function ActivityTopology3D({
  className,
  selectedId = null,
  onNodeClick,
  onDataLoad,
}: {
  className?: string
  /** Controlled: highlight this node */
  selectedId?: string | null
  onNodeClick?: (node: ActivityNode) => void
  /** Called when topology data has loaded (for parent to show detail panel) */
  onDataLoad?: (data: ActivityTopologyData) => void
}) {
  const [data, setData] = useState<ActivityTopologyData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    fetch("/api/natureos/activity-topology", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("Failed to load"))))
      .then((json) => {
        if (!cancelled) {
          setData(json)
          onDataLoad?.(json)
        }
      })
      .catch((e) => {
        if (!cancelled) setError(e?.message ?? "Unknown error")
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [onDataLoad])

  const handleSelect = useCallback(
    (node: ActivityNode) => {
      onNodeClick?.(node)
    },
    [onNodeClick]
  )

  if (loading) {
    return (
      <div className={className + " flex items-center justify-center min-h-[500px] bg-muted/30 rounded-lg"}>
        <p className="text-muted-foreground">Loading activity topology…</p>
      </div>
    )
  }
  if (error || !data) {
    return (
      <div className={className + " flex items-center justify-center min-h-[500px] bg-muted/30 rounded-lg"}>
        <p className="text-destructive">{error || "No data"}</p>
      </div>
    )
  }

  return (
    <div className={className + " relative rounded-lg overflow-hidden bg-[#0f172a]"} style={{ minHeight: 560 }}>
      <Suspense fallback={<div className="absolute inset-0 flex items-center justify-center text-white/60">Loading 3D…</div>}>
        <Canvas camera={{ position: [80, 20, 80], fov: 50 }} gl={{ antialias: true, alpha: false }}>
          <SceneInner data={data} selectedId={selectedId ?? null} onSelect={handleSelect} />
        </Canvas>
      </Suspense>
      {/* Layer labels */}
      <div className="absolute left-4 top-4 pointer-events-none flex gap-8 text-xs font-medium text-white/70">
        <span>Frontend (pages, apps)</span>
        <span>APIs</span>
        <span>Infrastructure (memory, DB, devices, workflows)</span>
      </div>
    </div>
  )
}
