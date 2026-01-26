"use client"

/**
 * Advanced 3D Agent Topology Visualization v2.1
 * Full-featured 3D command center for MAS orchestration
 * 
 * Features:
 * - 223+ agent support with force-directed layout
 * - Real-time WebSocket updates from MAS Dashboard API
 * - Security incident overlay with causality chains
 * - Path tracing with latency visualization
 * - Historical playback with timeline scrubbing
 * - Agent spawning from templates
 * - Level-of-detail (LOD) rendering
 */

import { useState, useEffect, useCallback, useMemo, Suspense, useRef } from "react"
import { Canvas, useFrame, useThree } from "@react-three/fiber"
import {
  OrbitControls,
  Stars,
  Environment,
  PerspectiveCamera,
  Text,
  Billboard,
  Html,
  Effects,
} from "@react-three/drei"
import { EffectComposer, Bloom, ChromaticAberration } from "@react-three/postprocessing"
import * as THREE from "three"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import {
  Maximize2,
  Minimize2,
  RefreshCw,
  Play,
  Pause,
  Search,
  Filter,
  Layers,
  Eye,
  EyeOff,
  Zap,
  Activity,
  Network,
  Settings,
  X,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Wifi,
  WifiOff,
  AlertTriangle,
  Route,
  History,
  Plus,
  Box,
  Square,
} from "lucide-react"
import { TopologyNode3D } from "./topology-node"
import { TopologyConnection3D } from "./topology-connection"
import { NodeDetailPanel } from "./node-detail-panel"
import { IncidentOverlay } from "./incident-overlay"
import { PathTracer } from "./path-tracer"
import { TimelinePlayer } from "./timeline-player"
import { AgentSpawner } from "./agent-spawner"
import { AgentQuery } from "./agent-query"
import { TelemetryWidgets } from "./telemetry-widgets"
import { LayoutManager } from "./layout-manager"
import { useLODSystem, LODIndicator, type DetailLevel } from "./lod-system"
import { useTopologyWebSocket, executeAgentAction } from "./use-topology-websocket"
import { TOTAL_AGENT_COUNT } from "./agent-registry"
import type {
  TopologyData,
  TopologyNode,
  TopologyConnection,
  DataPacket,
  TopologyFilter,
  TopologyViewState,
  NodeCategory,
  NodeStatus,
  TopologyIncident,
  TopologySnapshot,
  ExtendedTopologyData,
  DetectedGap,
} from "./types"
import { CATEGORY_COLORS, STATUS_COLORS } from "./types"

interface AdvancedTopology3DProps {
  className?: string
  fullScreen?: boolean
  onToggleFullScreen?: () => void
}

// Camera controller for smooth animations - only animates to selected node, does NOT override user controls
function CameraController({ 
  target, 
  shouldAnimate,
  onAnimationComplete 
}: { 
  target: THREE.Vector3
  shouldAnimate: boolean
  onAnimationComplete: () => void
}) {
  const { camera } = useThree()
  const animatingRef = useRef(false)
  const startPosRef = useRef<THREE.Vector3 | null>(null)
  const progressRef = useRef(0)
  
  useFrame(() => {
    if (!shouldAnimate) {
      animatingRef.current = false
      startPosRef.current = null
      progressRef.current = 0
      return
    }
    
    // Start animation
    if (!animatingRef.current) {
      animatingRef.current = true
      startPosRef.current = camera.position.clone()
      progressRef.current = 0
    }
    
    // Animate to target
    progressRef.current += 0.02
    if (progressRef.current >= 1) {
      onAnimationComplete()
      return
    }
    
    // Smooth ease-out animation
    const t = 1 - Math.pow(1 - progressRef.current, 3)
    const targetPos = new THREE.Vector3(target.x, target.y + 15, target.z + 25)
    
    if (startPosRef.current) {
      camera.position.lerpVectors(startPosRef.current, targetPos, t)
    }
  })
  
  return null
}

// Grid floor for spatial reference
function GridFloor() {
  return (
    <group position={[0, -10, 0]}>
      <gridHelper args={[100, 50, "#1e293b", "#0f172a"]} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[100, 100]} />
        <meshStandardMaterial color="#020617" transparent opacity={0.8} />
      </mesh>
    </group>
  )
}

// Ambient particles for atmosphere
function AmbientParticles() {
  const particlesRef = useRef<THREE.Points>(null)
  const count = 500
  
  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 80
      pos[i * 3 + 1] = (Math.random() - 0.5) * 40
      pos[i * 3 + 2] = (Math.random() - 0.5) * 80
    }
    return pos
  }, [])
  
  useFrame((state) => {
    if (particlesRef.current) {
      particlesRef.current.rotation.y = state.clock.elapsedTime * 0.01
    }
  })
  
  return (
    <points ref={particlesRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial size={0.05} color="#4f46e5" transparent opacity={0.4} />
    </points>
  )
}

// System stats HUD
function SystemStatsHUD({ data }: { data: TopologyData }) {
  return (
    <div className="absolute top-4 left-4 bg-black/70 backdrop-blur-md rounded-lg p-4 text-white font-mono text-xs border border-white/10">
      <div className="flex items-center gap-2 mb-3">
        <Activity className="h-4 w-4 text-green-400" />
        <span className="font-bold">SYSTEM METRICS</span>
      </div>
      <div className="grid grid-cols-2 gap-x-6 gap-y-1">
        <div className="text-gray-400">Nodes</div>
        <div><span className="text-green-400">{data.stats.activeNodes}</span>/{data.stats.totalNodes}</div>
        <div className="text-gray-400">Links</div>
        <div><span className="text-blue-400">{data.stats.activeConnections}</span>/{data.stats.totalConnections}</div>
        <div className="text-gray-400">Msg/s</div>
        <div className="text-cyan-400">{data.stats.messagesPerSecond.toFixed(0)}</div>
        <div className="text-gray-400">Latency</div>
        <div className="text-yellow-400">{data.stats.avgLatencyMs.toFixed(1)}ms</div>
        <div className="text-gray-400">Load</div>
        <div className={data.stats.systemLoad > 0.7 ? "text-red-400" : data.stats.systemLoad > 0.5 ? "text-yellow-400" : "text-green-400"}>
          {(data.stats.systemLoad * 100).toFixed(0)}%
        </div>
      </div>
    </div>
  )
}

// Category legend
function CategoryLegend({ filter, onToggleCategory }: { filter: TopologyFilter; onToggleCategory: (cat: NodeCategory) => void }) {
  const categories = Object.entries(CATEGORY_COLORS) as [NodeCategory, string][]
  
  return (
    <div className="absolute bottom-4 left-4 bg-black/70 backdrop-blur-md rounded-lg p-3 text-white text-xs border border-white/10">
      <div className="font-bold mb-2">Categories</div>
      <div className="grid grid-cols-2 gap-1">
        {categories.map(([cat, color]) => (
          <button
            key={cat}
            onClick={() => onToggleCategory(cat)}
            className={`flex items-center gap-2 px-2 py-1 rounded transition-opacity ${
              filter.categories.length === 0 || filter.categories.includes(cat) ? "opacity-100" : "opacity-30"
            }`}
          >
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
            <span className="capitalize">{cat}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

// Control panel
function ControlPanel({
  viewState,
  setViewState,
  filter,
  setFilter,
  isPlaying,
  setIsPlaying,
  onRefresh,
  loading,
}: {
  viewState: TopologyViewState
  setViewState: (v: TopologyViewState) => void
  filter: TopologyFilter
  setFilter: (f: TopologyFilter) => void
  isPlaying: boolean
  setIsPlaying: (p: boolean) => void
  onRefresh: () => void
  loading: boolean
}) {
  const [expanded, setExpanded] = useState(true)
  
  return (
    <div className="absolute top-4 right-4 bg-black/70 backdrop-blur-md rounded-lg text-white border border-white/10 w-64">
      <div
        className="flex items-center justify-between p-3 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2 font-bold text-sm">
          <Settings className="h-4 w-4" />
          Controls
        </div>
        {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </div>
      
      {expanded && (
        <div className="p-3 pt-0 space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search nodes..."
              value={filter.searchQuery}
              onChange={(e) => setFilter({ ...filter, searchQuery: e.target.value })}
              className="pl-8 h-8 text-xs bg-white/5 border-white/10"
            />
          </div>
          
          {/* Playback */}
          <div className="flex items-center justify-between">
            <Label className="text-xs">Animation</Label>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setIsPlaying(!isPlaying)}
              >
                {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={onRefresh}
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              </Button>
            </div>
          </div>
          
          {/* Animation Speed */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs">Speed</Label>
              <span className="text-xs text-gray-400">{viewState.animationSpeed.toFixed(1)}x</span>
            </div>
            <Slider
              value={[viewState.animationSpeed]}
              onValueChange={([v]) => setViewState({ ...viewState, animationSpeed: v })}
              min={0.1}
              max={3}
              step={0.1}
              className="h-4"
            />
          </div>
          
          {/* Toggles */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs">Show Labels</Label>
              <Switch
                checked={filter.showLabels}
                onCheckedChange={(v) => setFilter({ ...filter, showLabels: v })}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-xs">Show Metrics</Label>
              <Switch
                checked={filter.showMetrics}
                onCheckedChange={(v) => setFilter({ ...filter, showMetrics: v })}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-xs">Show Connections</Label>
              <Switch
                checked={filter.showConnections}
                onCheckedChange={(v) => setFilter({ ...filter, showConnections: v })}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-xs">Data Particles</Label>
              <Switch
                checked={viewState.particleEnabled}
                onCheckedChange={(v) => setViewState({ ...viewState, particleEnabled: v })}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-xs">Show Inactive</Label>
              <Switch
                checked={filter.showInactive}
                onCheckedChange={(v) => setFilter({ ...filter, showInactive: v })}
              />
            </div>
          </div>
          
          {/* Reset View */}
          <Button
            variant="outline"
            size="sm"
            className="w-full text-xs"
            onClick={() => setViewState({
              ...viewState,
              zoom: 30,
              rotation: [0, 0, 0],
              center: [0, 0, 0],
              selectedNodeId: null,
            })}
          >
            <RotateCcw className="h-3 w-3 mr-2" />
            Reset View
          </Button>
        </div>
      )}
    </div>
  )
}

// Main 3D Scene
function TopologyScene({
  data,
  filter,
  viewState,
  setViewState,
  onNodeAction,
}: {
  data: TopologyData
  filter: TopologyFilter
  viewState: TopologyViewState
  setViewState: (v: TopologyViewState) => void
  onNodeAction: (nodeId: string, action: string, params?: Record<string, unknown>) => Promise<void>
}) {
  const [shouldAnimateCamera, setShouldAnimateCamera] = useState(false)
  const lastSelectedRef = useRef<string | null>(null)
  
  // Filter nodes based on filter state
  const filteredNodes = useMemo(() => {
    return data.nodes.filter(node => {
      // Category filter
      if (filter.categories.length > 0 && !filter.categories.includes(node.category)) {
        return false
      }
      
      // Status filter
      if (!filter.showInactive && (node.status === "offline" || node.status === "error")) {
        return false
      }
      
      // Search filter
      if (filter.searchQuery) {
        const query = filter.searchQuery.toLowerCase()
        if (
          !node.name.toLowerCase().includes(query) &&
          !node.shortName.toLowerCase().includes(query) &&
          !String(node.id).toLowerCase().includes(query)
        ) {
          return false
        }
      }
      
      return true
    })
  }, [data.nodes, filter])
  
  // Get connections for filtered nodes
  const filteredConnections = useMemo(() => {
    if (!filter.showConnections) return []
    
    const nodeIds = new Set(filteredNodes.map(n => n.id))
    return data.connections.filter(
      c => nodeIds.has(c.sourceId) && nodeIds.has(c.targetId)
    )
  }, [data.connections, filteredNodes, filter.showConnections])
  
  // Get selected node
  const selectedNode = useMemo(() => {
    return filteredNodes.find(n => n.id === viewState.selectedNodeId)
  }, [filteredNodes, viewState.selectedNodeId])
  
  // Detect when a new node is selected and trigger camera animation
  useEffect(() => {
    if (viewState.selectedNodeId && viewState.selectedNodeId !== lastSelectedRef.current) {
      setShouldAnimateCamera(true)
      lastSelectedRef.current = viewState.selectedNodeId
    }
  }, [viewState.selectedNodeId])
  
  // Camera target
  const cameraTarget = useMemo(() => {
    if (selectedNode) {
      return new THREE.Vector3(...selectedNode.position)
    }
    return new THREE.Vector3(0, 0, 0)
  }, [selectedNode])
  
  return (
    <>
      {/* Camera with full controls - zoom, pan, rotate */}
      <PerspectiveCamera makeDefault position={[0, 30, 50]} fov={60} />
      <CameraController 
        target={cameraTarget} 
        shouldAnimate={shouldAnimateCamera}
        onAnimationComplete={() => setShouldAnimateCamera(false)}
      />
      <OrbitControls
        enableDamping
        dampingFactor={0.1}
        minDistance={5}
        maxDistance={200}
        enablePan
        panSpeed={1}
        rotateSpeed={0.5}
        zoomSpeed={1.2}
      />
      
      {/* Environment */}
      <ambientLight intensity={0.3} />
      <directionalLight position={[10, 20, 10]} intensity={0.8} castShadow />
      <pointLight position={[-20, 20, -20]} intensity={0.5} color="#4f46e5" />
      <pointLight position={[20, -10, 20]} intensity={0.3} color="#06b6d4" />
      <Stars radius={100} depth={50} count={2000} factor={4} fade speed={0.5} />
          <AmbientParticles />
      <AmbientParticles />
      <GridFloor />
      
      {/* Connections */}
      {filteredConnections.map(connection => {
        const sourceNode = data.nodes.find(n => n.id === connection.sourceId)
        const targetNode = data.nodes.find(n => n.id === connection.targetId)
        if (!sourceNode || !targetNode) return null
        
        return (
          <TopologyConnection3D
            key={connection.id}
            connection={connection}
            sourceNode={sourceNode}
            targetNode={targetNode}
            packets={data.packets.filter(p => p.connectionId === connection.id)}
            selected={viewState.selectedNodeId === connection.sourceId || viewState.selectedNodeId === connection.targetId}
            hovered={viewState.hoveredNodeId === connection.sourceId || viewState.hoveredNodeId === connection.targetId}
            animationSpeed={viewState.animationSpeed}
            showParticles={viewState.particleEnabled}
          />
        )
      })}
      
      {/* Nodes */}
      {filteredNodes.map(node => (
        <TopologyNode3D
          key={node.id}
          node={node}
          selected={viewState.selectedNodeId === node.id}
          hovered={viewState.hoveredNodeId === node.id}
          onSelect={(id) => setViewState({ ...viewState, selectedNodeId: id })}
          onHover={(id) => setViewState({ ...viewState, hoveredNodeId: id })}
          showLabels={filter.showLabels}
          showMetrics={filter.showMetrics}
          animationSpeed={viewState.animationSpeed}
        />
      ))}
      
      {/* Post-processing effects */}
      <EffectComposer>
        <Bloom
          luminanceThreshold={0.2}
          luminanceSmoothing={0.9}
          intensity={0.8}
        />
      </EffectComposer>
    </>
  )
}

// Main component
export function AdvancedTopology3D({
  className = "",
  fullScreen = false,
  onToggleFullScreen,
}: AdvancedTopology3DProps) {
  const [data, setData] = useState<ExtendedTopologyData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isPlaying, setIsPlaying] = useState(true)
  const [isLive, setIsLive] = useState(true)
  
  // v2.1: Incident and path highlighting state
  const [highlightedNodeIds, setHighlightedNodeIds] = useState<string[]>([])
  const [highlightedEdgeIds, setHighlightedEdgeIds] = useState<string[]>([])
  
  const [viewState, setViewState] = useState<TopologyViewState>({
    zoom: 30,
    rotation: [0, 0, 0],
    center: [0, 0, 0],
    selectedNodeId: null,
    hoveredNodeId: null,
    detailLevel: "overview",
    animationSpeed: 1,
    particleEnabled: true,
  })
  
  const [filter, setFilter] = useState<TopologyFilter>({
    categories: [],
    types: [],
    statuses: [],
    searchQuery: "",
    showInactive: true,
    showConnections: true,
    showLabels: true,
    showMetrics: false,
  })
  
  // v2.1: WebSocket connection for real-time updates
  const wsHandlers = useMemo(() => ({
    onAgentUpdate: (agentId: string, status: NodeStatus, metrics?: TopologyNode["metrics"]) => {
      setData(prev => {
        if (!prev) return prev
        return {
          ...prev,
          nodes: prev.nodes.map(n => 
            n.id === agentId ? { ...n, status, metrics: metrics || n.metrics } : n
          ),
        }
      })
    },
    onIncidentCreated: (incident: TopologyIncident) => {
      setData(prev => {
        if (!prev) return prev
        return { ...prev, incidents: [...prev.incidents, incident] }
      })
    },
    onIncidentResolved: (incidentId: string) => {
      setData(prev => {
        if (!prev) return prev
        return { ...prev, incidents: prev.incidents.filter(i => i.id !== incidentId) }
      })
    },
  }), [])
  
  const { state: wsState, connect: wsConnect, disconnect: wsDisconnect } = useTopologyWebSocket(wsHandlers)
  
  // Connect WebSocket when in live mode (deferred to avoid initial connection spam)
  useEffect(() => {
    // Only attempt WebSocket connection after initial data load succeeds
    if (isLive && data && !loading) {
      // Delay WebSocket connection attempt
      const timer = setTimeout(() => {
        wsConnect()
      }, 2000)
      return () => {
        clearTimeout(timer)
        wsDisconnect()
      }
    }
    return () => wsDisconnect()
  }, [isLive, data, loading, wsConnect, wsDisconnect])
  
  // Fetch topology data
  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch("/api/mas/topology?incidents=true")
      if (!res.ok) throw new Error("Failed to fetch topology")
      const topologyData: ExtendedTopologyData = await res.json()
      setData(topologyData)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error")
    } finally {
      setLoading(false)
    }
  }, [])
  
  useEffect(() => {
    fetchData()
  }, [fetchData])
  
  // Auto-refresh when playing (fallback if WebSocket not connected)
  useEffect(() => {
    if (!isPlaying || !isLive) return
    // Reduce polling frequency when WebSocket is connected
    const interval = setInterval(fetchData, wsState.connected ? 30000 : 5000)
    return () => clearInterval(interval)
  }, [isPlaying, isLive, wsState.connected, fetchData])
  
  // v2.1: Handle node actions via real MAS orchestrator
  const handleNodeAction = async (nodeId: string, action: string, params?: Record<string, unknown>) => {
    try {
      const result = await executeAgentAction(nodeId, action as "spawn" | "stop" | "restart" | "configure", params)
      if (result.success) {
        // Refresh data after action
        await fetchData()
      } else {
        console.error("Node action failed:", result.message)
      }
    } catch (err) {
      console.error("Node action error:", err)
    }
  }
  
  // v2.1: Handle agent spawn
  const handleSpawnAgent = async (template: string, config: Record<string, unknown>) => {
    try {
      const result = await executeAgentAction("spawn", "spawn", { template, ...config })
      if (result.success) {
        await fetchData()
      }
      return result
    } catch (err) {
      return { success: false, message: err instanceof Error ? err.message : "Spawn failed" }
    }
  }
  
  // v2.1: Handle incident resolution
  const handleIncidentResolve = async (incidentId: string) => {
    try {
      await fetch(`/api/security/incidents/${incidentId}/resolve`, { method: "POST" })
      await fetchData()
    } catch (err) {
      console.error("Incident resolve error:", err)
    }
  }
  
  // v2.1: Handle path highlighting
  const handleHighlightPath = useCallback((nodeIds: string[], edgeIds: string[]) => {
    setHighlightedNodeIds(nodeIds)
    setHighlightedEdgeIds(edgeIds)
  }, [])
  
  const handleClearHighlight = useCallback(() => {
    setHighlightedNodeIds([])
    setHighlightedEdgeIds([])
  }, [])
  
  // v2.1: Handle historical snapshot load
  const handleSnapshotLoad = useCallback((snapshot: TopologySnapshot) => {
    setIsLive(false)
    setData(prev => prev ? {
      ...prev,
      nodes: snapshot.nodes,
      connections: snapshot.connections,
      stats: snapshot.stats,
      incidents: snapshot.incidents,
      lastUpdated: snapshot.timestamp,
    } : null)
  }, [])
  
  // Toggle category filter
  const handleToggleCategory = (category: NodeCategory) => {
    setFilter(prev => {
      const current = prev.categories
      if (current.includes(category)) {
        return { ...prev, categories: current.filter(c => c !== category) }
      } else if (current.length === 0) {
        // First selection - select only this category
        return { ...prev, categories: [category] }
      } else {
        return { ...prev, categories: [...current, category] }
      }
    })
  }
  
  // Get selected node for detail panel
  const selectedNode = useMemo(() => {
    if (!data || !viewState.selectedNodeId) return null
    return data.nodes.find(n => n.id === viewState.selectedNodeId)
  }, [data, viewState.selectedNodeId])
  
  if (error) {
    return (
      <Card className={`${className} flex items-center justify-center bg-black`}>
        <div className="text-center text-white">
          <div className="text-red-400 mb-2">Failed to load topology</div>
          <Button onClick={fetchData} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </div>
      </Card>
    )
  }
  
  return (
    <div className={`relative bg-black overflow-hidden ${fullScreen ? "fixed inset-0 z-50" : className}`}>
      {/* 3D Canvas */}
      <Canvas 
        shadows 
        className="w-full h-full"
      >
        <Suspense fallback={null}>
          {data && (
            <TopologyScene
              data={data}
              filter={filter}
              viewState={viewState}
              setViewState={setViewState}
              onNodeAction={handleNodeAction}
            />
          )}
        </Suspense>
      </Canvas>
      
      {/* Loading overlay */}
      {loading && !data && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="text-center text-white">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2" />
            <div>Loading topology...</div>
          </div>
        </div>
      )}
      
      {/* HUD Elements */}
      {data && (
        <>
          <SystemStatsHUD data={data} />
          
          {/* Metabase-style natural language query */}
          <AgentQuery
            nodes={data.nodes}
            connections={data.connections}
            onNodeSelect={(nodeId) => setViewState(prev => ({ ...prev, selectedNodeId: nodeId }))}
            onHighlightNodes={setHighlightedNodeIds}
          />
          
          <CategoryLegend filter={filter} onToggleCategory={handleToggleCategory} />
          <ControlPanel
            viewState={viewState}
            setViewState={setViewState}
            filter={filter}
            setFilter={setFilter}
            isPlaying={isPlaying}
            setIsPlaying={setIsPlaying}
            onRefresh={fetchData}
            loading={loading}
          />
        </>
      )}
      
      {/* Full-screen toggle */}
      {onToggleFullScreen && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-4 right-72 bg-black/50 hover:bg-black/70 text-white"
          onClick={onToggleFullScreen}
        >
          {fullScreen ? <Minimize2 className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}
        </Button>
      )}
      
      {/* WebSocket connection status and Layout Manager */}
      <div className="absolute top-4 right-[340px] flex items-center gap-2">
        {/* View Mode - currently 3D only, 2D mode planned for future */}
        <Button
          variant="ghost"
          size="sm"
          className="bg-black/70 hover:bg-black/90 text-white border border-white/10 px-3 cursor-default"
          title="3D View (use mouse to pan, zoom, and rotate)"
        >
          <Box className="h-4 w-4 mr-2" />
          <span className="text-xs">3D</span>
        </Button>
        
        {/* Layout Manager */}
        <LayoutManager
          currentViewState={viewState}
          currentFilter={filter}
          onLoadLayout={(newViewState, newFilter) => {
            setViewState(newViewState)
            setFilter(newFilter)
          }}
        />
        
        {/* Connection Status */}
        <div className="flex items-center gap-2 px-3 py-1.5 bg-black/70 backdrop-blur-md rounded-lg border border-white/10">
          {wsState.connected ? (
            <>
              <Wifi className="h-4 w-4 text-green-400" />
              <span className="text-xs text-green-400">LIVE</span>
            </>
          ) : (
            <>
              <WifiOff className="h-4 w-4 text-yellow-400" />
              <span className="text-xs text-yellow-400">POLLING</span>
            </>
          )}
        </div>
      </div>
      
      {/* Node Detail Panel */}
      {selectedNode && data && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10">
          <NodeDetailPanel
            node={selectedNode}
            connections={data.connections}
            allNodes={data.nodes}
            onClose={() => setViewState({ ...viewState, selectedNodeId: null })}
            onAction={handleNodeAction}
          />
        </div>
      )}
      
      {/* v2.1: Incident Overlay */}
      {data && data.incidents && (
        <IncidentOverlay
          incidents={data.incidents}
          predictions={data.predictions || []}
          nodes={data.nodes}
          onNodeHighlight={(nodeIds) => setHighlightedNodeIds(nodeIds)}
          onNodeSelect={(nodeId) => setViewState(prev => ({ ...prev, selectedNodeId: nodeId }))}
          onIncidentResolve={handleIncidentResolve}
        />
      )}
      
      {/* v2.1: Path Tracer */}
      {data && (
        <PathTracer
          nodes={data.nodes}
          connections={data.connections}
          onHighlightPath={handleHighlightPath}
          onClearHighlight={handleClearHighlight}
          onNodeSelect={(nodeId) => setViewState(prev => ({ ...prev, selectedNodeId: nodeId }))}
        />
      )}
      
      {/* v2.1: Agent Spawner */}
      {data && (
        <AgentSpawner
          gaps={data.gaps || []}
          onSpawn={handleSpawnAgent}
        />
      )}
      
      {/* v2.1: Timeline Player */}
      {data && (
        <TimelinePlayer
          currentData={data}
          onSnapshotLoad={handleSnapshotLoad}
          onLiveMode={() => {
            setIsLive(true)
            fetchData()
          }}
          isLive={isLive}
        />
      )}
      
      {/* Serial-Studio inspired telemetry widgets */}
      {data && (
        <TelemetryWidgets
          nodes={data.nodes}
          selectedNodeId={viewState.selectedNodeId}
        />
      )}
      
      {/* Title with version and agent count */}
      <div className="absolute bottom-4 right-4 text-white/50 text-xs font-mono">
        MYCA Topology v2.1 | {data?.stats.activeNodes || 0}/{data?.stats.totalNodes || 0} active | {TOTAL_AGENT_COUNT} registered
      </div>
    </div>
  )
}
