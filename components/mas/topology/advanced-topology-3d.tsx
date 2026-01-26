"use client"

/**
 * Advanced 3D Agent Topology Visualization v2.2
 * Complete Command Center Redesign - Jan 2026
 * 
 * New Features:
 * - Bottom control bar with centered MYCA AI
 * - Collapsible left/right side panels
 * - Integrated security incidents (not popup)
 * - Metabase-style NLQ in all search/AI interactions
 * - Compact inline metrics
 * - True fullscreen mode
 * - Clean, no-overlay layout
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
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
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
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Wifi,
  WifiOff,
  AlertTriangle,
  Route,
  History,
  Plus,
  Box,
  Square,
  Sparkles,
  Bot,
  Send,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Cpu,
  Heart,
  AlertCircle,
  CheckCircle,
  Clock,
  Database,
  MessageSquare,
  Terminal,
  Workflow,
  Brain,
} from "lucide-react"
import { TopologyNode3D } from "./topology-node"
import { TopologyConnection3D, MultiStreamConnection, groupConnectionsByNodePair } from "./topology-connection"
import { NodeDetailPanel } from "./node-detail-panel"
import { NodeWidgetContainer } from "./node-widgets"
import { 
  EnhancedPathTracer, 
  EnhancedSpawnAgent, 
  ConnectionWidget, 
  OrchestratorCommandCenter,
  type AgentSpawnConfig,
  type ConnectionConfig,
} from "./topology-tools"
import { ConnectionLegend } from "./connection-legend"
import { useLODSystem, LODIndicator, type DetailLevel } from "./lod-system"
import { useTopologyWebSocket, executeAgentAction } from "./use-topology-websocket"
import { TOTAL_AGENT_COUNT } from "./agent-registry"
import { 
  validateAgentConnections, 
  getValidationSummary,
  generateAllAutoConnections,
  type ConnectionValidationResult,
  type ValidationSummary,
} from "@/lib/services/connection-validator"
import { 
  autoConnectAgent,
  getConnectionHealth,
  createAutoConnectorHandlers,
} from "@/lib/services/auto-connector"
import type { ConnectionType } from "./types"
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

// Camera controller for smooth animations
function CameraController({ 
  target, 
  shouldAnimate,
  onAnimationComplete,
  isNodeSelected
}: { 
  target: THREE.Vector3
  shouldAnimate: boolean
  onAnimationComplete: () => void
  isNodeSelected: boolean
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
    
    if (!animatingRef.current) {
      animatingRef.current = true
      startPosRef.current = camera.position.clone()
      progressRef.current = 0
    }
    
    progressRef.current += 0.025
    if (progressRef.current >= 1) {
      onAnimationComplete()
      return
    }
    
    // Smooth easing function
    const t = 1 - Math.pow(1 - progressRef.current, 3)
    
    // Calculate optimal camera position:
    // - Position camera at an angle (slightly to the right and above)
    // - Distance depends on whether a node is selected
    const distance = isNodeSelected ? 35 : 50
    const heightOffset = isNodeSelected ? 12 : 20
    const sideOffset = isNodeSelected ? 8 : 0
    
    const targetPos = new THREE.Vector3(
      target.x + sideOffset,
      target.y + heightOffset,
      target.z + distance
    )
    
    if (startPosRef.current) {
      camera.position.lerpVectors(startPosRef.current, targetPos, t)
      // Make camera look at the target
      camera.lookAt(target)
    }
  })
  
  return null
}

// Grid floor for spatial reference - EXPANDED for 223+ agents
function GridFloor() {
  return (
    <group position={[0, -15, 0]}>
      <gridHelper args={[250, 100, "#1e293b", "#0f172a"]} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[250, 250]} />
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
          args={[positions, 3]}
        />
      </bufferGeometry>
      <pointsMaterial size={0.05} color="#4f46e5" transparent opacity={0.4} />
    </points>
  )
}

// Compact inline stats bar (top)
function CompactStatsBar({ data, incidents }: { data: TopologyData; incidents: TopologyIncident[] }) {
  const activeIncidents = incidents.filter(i => i.status === "active").length
  
  return (
    <div className="flex items-center gap-3 px-3 py-1.5 bg-black/80 backdrop-blur-md rounded-full text-[10px] font-mono text-white/80 border border-white/10">
      <div className="flex items-center gap-1.5">
        <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
        <span>{data.stats?.activeNodes ?? 0}/{data.stats?.totalNodes ?? 0}</span>
      </div>
      <div className="w-px h-3 bg-white/20" />
      <div className="flex items-center gap-1.5">
        <Zap className="h-3 w-3 text-cyan-400" />
        <span>{(data.stats?.messagesPerSecond ?? 0).toFixed(0)}/s</span>
      </div>
      <div className="w-px h-3 bg-white/20" />
      <div className="flex items-center gap-1.5">
        <Clock className="h-3 w-3 text-yellow-400" />
        <span>{(data.stats?.avgLatencyMs ?? 0).toFixed(0)}ms</span>
      </div>
      <div className="w-px h-3 bg-white/20" />
      <div className="flex items-center gap-1.5">
        <Cpu className={cn("h-3 w-3", (data.stats?.systemLoad ?? 0) > 0.7 ? "text-red-400" : "text-green-400")} />
        <span>{((data.stats?.systemLoad ?? 0) * 100).toFixed(0)}%</span>
      </div>
      {activeIncidents > 0 && (
        <>
          <div className="w-px h-3 bg-white/20" />
          <div className="flex items-center gap-1.5 text-red-400">
            <ShieldAlert className="h-3 w-3" />
            <span>{activeIncidents}</span>
          </div>
        </>
      )}
    </div>
  )
}

// Metabase-style NLQ Search with AI
function MycaSearchBar({ 
  onSearch, 
  onNodeSelect,
  nodes,
  placeholder = "Ask MYCA anything..."
}: { 
  onSearch: (query: string) => void
  onNodeSelect: (nodeId: string) => void
  nodes: TopologyNode[]
  placeholder?: string
}) {
  const [query, setQuery] = useState("")
  const [isOpen, setIsOpen] = useState(false)
  const [suggestions, setSuggestions] = useState<string[]>([])
  
  const handleSearch = useCallback(() => {
    if (query.trim()) {
      onSearch(query)
      // Simple keyword matching for demo - in production, this calls MYCA AI
      const lowQuery = query.toLowerCase()
      const matched = nodes.filter(n => 
        n.name.toLowerCase().includes(lowQuery) || 
        n.category.toLowerCase().includes(lowQuery)
      )
      if (matched.length === 1) {
        onNodeSelect(matched[0].id)
      }
    }
  }, [query, onSearch, nodes, onNodeSelect])
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch()
    }
  }
  
  return (
    <div className="relative flex-1 max-w-md">
      <div className="flex items-center gap-2 px-3 py-2 bg-black/60 backdrop-blur-md rounded-full border border-white/10 focus-within:border-cyan-500/50 transition-colors">
        <Sparkles className="h-4 w-4 text-cyan-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="flex-1 bg-transparent text-white text-sm placeholder:text-white/40 focus:outline-none"
        />
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-6 w-6 text-white/60 hover:text-cyan-400"
          onClick={handleSearch}
        >
          <Send className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  )
}

// Left Panel - Categories & Filters
function LeftPanel({ 
  isOpen, 
  onToggle, 
  filter, 
  setFilter,
  onToggleCategory,
  incidents,
  onIncidentClick
}: { 
  isOpen: boolean
  onToggle: () => void
  filter: TopologyFilter
  setFilter: (f: TopologyFilter) => void
  onToggleCategory: (cat: NodeCategory) => void
  incidents: TopologyIncident[]
  onIncidentClick: (incident: TopologyIncident) => void
}) {
  const categories = Object.entries(CATEGORY_COLORS) as [NodeCategory, string][]
  const activeIncidents = incidents.filter(i => i.status === "active" || i.status === "investigating")
  const resolvedIncidents = incidents.filter(i => i.status === "resolved")
  
  return (
    <div className={cn(
      "absolute left-0 top-12 bottom-16 z-20 transition-all duration-300 ease-in-out",
      isOpen ? "w-56" : "w-0"
    )}>
      {/* Toggle button - positioned below the back button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={onToggle}
        className={cn(
          "absolute top-2 z-30 h-8 w-8 bg-black/70 hover:bg-black/90 text-white border border-white/10 transition-all",
          isOpen ? "left-[224px]" : "left-2"
        )}
      >
        {isOpen ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeftOpen className="h-4 w-4" />}
      </Button>
      
      {isOpen && (
        <div className="h-full bg-black/80 backdrop-blur-md border-r border-white/10 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="p-3 space-y-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/40" />
                <Input
                  placeholder="Filter nodes..."
                  value={filter.searchQuery}
                  onChange={(e) => setFilter({ ...filter, searchQuery: e.target.value })}
                  className="pl-8 h-8 text-xs bg-white/5 border-white/10 text-white placeholder:text-white/40"
                />
              </div>
              
              {/* Categories */}
              <div>
                <div className="text-[10px] font-semibold text-white/50 uppercase tracking-wider mb-2">Categories</div>
                <div className="space-y-1">
                  {categories.map(([cat, color]) => (
                    <button
                      key={cat}
                      onClick={() => onToggleCategory(cat)}
                      className={cn(
                        "flex items-center gap-2 w-full px-2 py-1.5 rounded text-xs transition-all",
                        filter.categories.length === 0 || filter.categories.includes(cat) 
                          ? "bg-white/10 text-white" 
                          : "text-white/40 hover:bg-white/5"
                      )}
                    >
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                      <span className="capitalize">{cat}</span>
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Security Incidents (Integrated, not popup) */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="h-3.5 w-3.5 text-white/50" />
                  <span className="text-[10px] font-semibold text-white/50 uppercase tracking-wider">Security</span>
                  {activeIncidents.length > 0 && (
                    <Badge variant="destructive" className="h-4 px-1.5 text-[9px]">{activeIncidents.length}</Badge>
                  )}
                </div>
                
                {activeIncidents.length === 0 ? (
                  <div className="flex items-center gap-2 px-2 py-2 rounded bg-green-500/10 text-green-400 text-xs">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    <span>No active incidents</span>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {activeIncidents.map((incident) => (
                      <button
                        key={incident.id}
                        onClick={() => onIncidentClick(incident)}
                        className="flex items-center gap-2 w-full px-2 py-1.5 rounded bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs transition-colors"
                      >
                        <AlertTriangle className="h-3 w-3" />
                        <span className="truncate">{incident.title}</span>
                      </button>
                    ))}
                    {resolvedIncidents.slice(0, 3).map((incident) => (
                      <button
                        key={incident.id}
                        onClick={() => onIncidentClick(incident)}
                        className="flex items-center gap-2 w-full px-2 py-1.5 rounded bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-400 text-xs transition-colors"
                      >
                        <AlertCircle className="h-3 w-3" />
                        <span className="truncate">{incident.title}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              
              {/* View Toggles */}
              <div>
                <div className="text-[10px] font-semibold text-white/50 uppercase tracking-wider mb-2">Display</div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs text-white/70">Labels</Label>
                    <Switch
                      checked={filter.showLabels}
                      onCheckedChange={(v) => setFilter({ ...filter, showLabels: v })}
                      className="scale-75"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label className="text-xs text-white/70">Connections</Label>
                    <Switch
                      checked={filter.showConnections}
                      onCheckedChange={(v) => setFilter({ ...filter, showConnections: v })}
                      className="scale-75"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label className="text-xs text-white/70">Inactive</Label>
                    <Switch
                      checked={filter.showInactive}
                      onCheckedChange={(v) => setFilter({ ...filter, showInactive: v })}
                      className="scale-75"
                    />
                  </div>
                </div>
              </div>
            </div>
          </ScrollArea>
        </div>
      )}
    </div>
  )
}

// Right Panel - Telemetry & Details
function RightPanel({ 
  isOpen, 
  onToggle, 
  data,
  selectedNode,
  onNodeClose,
  onNodeAction
}: { 
  isOpen: boolean
  onToggle: () => void
  data: TopologyData
  selectedNode: TopologyNode | null
  onNodeClose: () => void
  onNodeAction: (nodeId: string, action: string, params?: Record<string, unknown>) => Promise<void>
}) {
  // Calculate telemetry data with null safety
  const cpuAvg = data.nodes.length > 0 
    ? data.nodes.reduce((acc, n) => acc + (n.metrics?.cpuPercent || 0), 0) / data.nodes.length
    : 0
  const memAvg = data.nodes.length > 0 
    ? data.nodes.reduce((acc, n) => acc + ((n.metrics?.memoryMb || 0) / 10), 0) / data.nodes.length
    : 0
  const healthyCount = data.nodes.filter(n => n.status === "active" || n.status === "idle").length
  const errorCount = data.nodes.filter(n => n.status === "error").length
  
  return (
    <div className={cn(
      "absolute right-0 top-12 bottom-16 z-20 transition-all duration-300 ease-in-out",
      isOpen ? "w-64" : "w-0"
    )}>
      {/* Toggle button - positioned below header elements */}
      <Button
        variant="ghost"
        size="icon"
        onClick={onToggle}
        className={cn(
          "absolute top-2 z-30 h-8 w-8 bg-black/70 hover:bg-black/90 text-white border border-white/10 transition-all",
          isOpen ? "right-[256px]" : "right-2"
        )}
      >
        {isOpen ? <PanelRightClose className="h-4 w-4" /> : <PanelRightOpen className="h-4 w-4" />}
      </Button>
      
      {isOpen && (
        <div className="h-full bg-black/80 backdrop-blur-md border-l border-white/10 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="p-3 space-y-4">
              {/* Telemetry Gauges */}
              <div>
                <div className="text-[10px] font-semibold text-white/50 uppercase tracking-wider mb-3">System Health</div>
                <div className="grid grid-cols-3 gap-2">
                  <TelemetryGauge label="CPU" value={cpuAvg} max={100} unit="%" color="cyan" />
                  <TelemetryGauge label="Memory" value={memAvg} max={100} unit="%" color="purple" />
                  <TelemetryGauge label="Health" value={(healthyCount / data.nodes.length) * 100} max={100} unit="%" color="green" />
                </div>
              </div>
              
              {/* Status LEDs */}
              <div>
                <div className="text-[10px] font-semibold text-white/50 uppercase tracking-wider mb-2">Status</div>
                <div className="grid grid-cols-2 gap-2">
                  <StatusLED label="System" status={errorCount === 0 ? "ok" : "warning"} />
                  <StatusLED label="Agents" status={healthyCount > data.nodes.length * 0.9 ? "ok" : "warning"} />
                  <StatusLED label="Network" status={data.stats.avgLatencyMs < 50 ? "ok" : "warning"} />
                  <StatusLED label="Load" status={data.stats.systemLoad < 0.7 ? "ok" : data.stats.systemLoad < 0.9 ? "warning" : "error"} />
                </div>
              </div>
              
              {/* Category Breakdown */}
              <div>
                <div className="text-[10px] font-semibold text-white/50 uppercase tracking-wider mb-2">Categories</div>
                <div className="space-y-1.5">
                  {Object.entries(CATEGORY_COLORS).map(([cat, color]) => {
                    const catNodes = data.nodes.filter(n => n.category === cat)
                    const active = catNodes.filter(n => n.status === "active" || n.status === "idle").length
                    return (
                      <div key={cat} className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                        <span className="flex-1 text-xs text-white/70 capitalize">{cat}</span>
                        <span className="text-xs text-white/50">{active}/{catNodes.length}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
              
              {/* Note: Node details are now shown in the floating NodeWidgetContainer */}
            </div>
          </ScrollArea>
        </div>
      )}
    </div>
  )
}

// Telemetry Gauge Component
function TelemetryGauge({ label, value, max, unit, color }: { 
  label: string
  value: number
  max: number
  unit: string
  color: "cyan" | "purple" | "green" | "red"
}) {
  const percent = Math.min((value / max) * 100, 100)
  const colorClass = {
    cyan: "text-cyan-400",
    purple: "text-purple-400",
    green: "text-green-400",
    red: "text-red-400"
  }[color]
  
  return (
    <div className="flex flex-col items-center">
      <div className="relative w-12 h-12">
        <svg className="w-full h-full -rotate-90">
          <circle
            cx="24"
            cy="24"
            r="20"
            fill="none"
            stroke="rgba(255,255,255,0.1)"
            strokeWidth="4"
          />
          <circle
            cx="24"
            cy="24"
            r="20"
            fill="none"
            stroke="currentColor"
            strokeWidth="4"
            strokeDasharray={`${percent * 1.26} 126`}
            className={colorClass}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={cn("text-[10px] font-bold", colorClass)}>{value.toFixed(0)}</span>
        </div>
      </div>
      <span className="text-[9px] text-white/50 mt-1">{label}</span>
    </div>
  )
}

// Status LED Component
function StatusLED({ label, status }: { label: string; status: "ok" | "warning" | "error" }) {
  const colors = {
    ok: "bg-green-400 shadow-green-400/50",
    warning: "bg-yellow-400 shadow-yellow-400/50",
    error: "bg-red-400 shadow-red-400/50 animate-pulse"
  }
  
  return (
    <div className="flex items-center gap-2 px-2 py-1.5 rounded bg-white/5">
      <div className={cn("w-2 h-2 rounded-full shadow-sm", colors[status])} />
      <span className="text-[10px] text-white/70">{label}</span>
    </div>
  )
}

// Bottom Control Bar
function BottomControlBar({
  data,
  viewState,
  setViewState,
  filter,
  setFilter,
  isPlaying,
  setIsPlaying,
  onRefresh,
  loading,
  wsConnected,
  gaps,
  onSpawnAgent,
  onPathTrace,
  onTimeline,
  onCommandCenter,
  onLegend,
  onConnectionHealth,
  connectionValidation,
  isFullscreen,
  onToggleFullscreen,
  connectionMode,
  onToggleConnectionMode,
}: {
  data: TopologyData
  viewState: TopologyViewState
  setViewState: (v: TopologyViewState) => void
  filter: TopologyFilter
  setFilter: (f: TopologyFilter) => void
  isPlaying: boolean
  setIsPlaying: (p: boolean) => void
  onRefresh: () => void
  loading: boolean
  wsConnected: boolean
  gaps: DetectedGap[]
  onSpawnAgent: () => void
  onPathTrace: () => void
  onTimeline: () => void
  onCommandCenter: () => void
  onLegend: () => void
  onConnectionHealth: () => void
  connectionValidation: ValidationSummary | null
  isFullscreen: boolean
  onToggleFullscreen: () => void
  connectionMode?: boolean
  onToggleConnectionMode?: () => void
}) {
  const [mycaQuery, setMycaQuery] = useState("")
  
  const handleMycaSubmit = useCallback(() => {
    if (mycaQuery.trim()) {
      // In production, this calls MYCA AI with full context
      console.log("[MYCA Query]:", mycaQuery)
      // Parse intent and route to appropriate handler
      const query = mycaQuery.toLowerCase()
      if (query.includes("spawn") || query.includes("create agent")) {
        onSpawnAgent()
      } else if (query.includes("path") || query.includes("route") || query.includes("trace")) {
        onPathTrace()
      } else if (query.includes("history") || query.includes("timeline")) {
        onTimeline()
      } else if (query.includes("command") || query.includes("control") || query.includes("orchestrator") || query.includes("terminal")) {
        onCommandCenter()
      }
      setMycaQuery("")
    }
  }, [mycaQuery, onSpawnAgent, onPathTrace, onTimeline, onCommandCenter])
  
  return (
    <div className="absolute bottom-0 left-0 right-0 h-14 bg-black/90 backdrop-blur-md border-t border-white/10 z-30">
      <div className="h-full flex items-center justify-between px-4 gap-4">
        {/* Left Tools */}
        <div className="flex items-center gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className={cn(
                    "h-8 px-3 hover:bg-white/10",
                    connectionMode 
                      ? "text-purple-400 bg-purple-500/20 border border-purple-500/30" 
                      : "text-white/70 hover:text-white"
                  )}
                  onClick={onToggleConnectionMode}
                >
                  <Network className="h-4 w-4 mr-1.5" />
                  <span className="text-xs">Connect</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {connectionMode ? "Exit connection mode" : "Click two nodes to connect them"}
              </TooltipContent>
            </Tooltip>
            
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-8 px-3 text-white/70 hover:text-white hover:bg-white/10"
                  onClick={onPathTrace}
                >
                  <Route className="h-4 w-4 mr-1.5" />
                  <span className="text-xs">Path</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Path Tracer</TooltipContent>
            </Tooltip>
            
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-8 px-3 text-white/70 hover:text-white hover:bg-white/10"
                  onClick={onSpawnAgent}
                >
                  <Plus className="h-4 w-4 mr-1.5" />
                  <span className="text-xs">Spawn</span>
                  {gaps.length > 0 && (
                    <Badge className="ml-1.5 h-4 px-1 text-[9px] bg-cyan-500/20 text-cyan-400">{gaps.length}</Badge>
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>Spawn Agent ({gaps.length} gaps detected)</TooltipContent>
            </Tooltip>
            
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-8 px-3 text-white/70 hover:text-white hover:bg-white/10"
                  onClick={onTimeline}
                >
                  <History className="h-4 w-4 mr-1.5" />
                  <span className="text-xs">Timeline</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Historical Playback</TooltipContent>
            </Tooltip>
            
            <div className="w-px h-6 bg-white/10 mx-1" />
            
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-8 px-3 text-purple-400 hover:text-purple-300 hover:bg-purple-500/10 border border-purple-500/30"
                  onClick={onCommandCenter}
                >
                  <Brain className="h-4 w-4 mr-1.5" />
                  <span className="text-xs">Command</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Orchestrator Command Center</TooltipContent>
            </Tooltip>
            
            <div className="w-px h-6 bg-white/10 mx-1" />
            
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-8 px-3 text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10"
                  onClick={onLegend}
                >
                  <Eye className="h-4 w-4 mr-1.5" />
                  <span className="text-xs">Legend</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Connection Legend & Filters</TooltipContent>
            </Tooltip>
            
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className={cn(
                    "h-8 px-3 hover:bg-white/10",
                    connectionValidation && connectionValidation.disconnectedAgents > 0
                      ? "text-red-400 hover:text-red-300"
                      : connectionValidation && connectionValidation.overallScore < 80
                        ? "text-yellow-400 hover:text-yellow-300"
                        : "text-green-400 hover:text-green-300"
                  )}
                  onClick={onConnectionHealth}
                >
                  <Network className="h-4 w-4 mr-1.5" />
                  <span className="text-xs">Health</span>
                  {connectionValidation && connectionValidation.disconnectedAgents > 0 && (
                    <Badge className="ml-1.5 h-4 px-1 text-[9px] bg-red-500/20 text-red-400">
                      {connectionValidation.disconnectedAgents}
                    </Badge>
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                Connection Health: {connectionValidation?.overallScore ?? 0}% | 
                {connectionValidation?.disconnectedAgents ?? 0} disconnected
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        
        {/* Center - MYCA AI Search */}
        <div className="flex-1 max-w-2xl">
          <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-500/10 via-purple-500/10 to-cyan-500/10 rounded-full border border-cyan-500/20 focus-within:border-cyan-500/50 transition-colors">
            <Brain className="h-5 w-5 text-cyan-400" />
            <input
              type="text"
              value={mycaQuery}
              onChange={(e) => setMycaQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleMycaSubmit()}
              placeholder="Ask MYCA... (e.g., 'Show path from MYCA to Financial', 'Spawn security agent', 'Show timeline')"
              className="flex-1 bg-transparent text-white text-sm placeholder:text-white/40 focus:outline-none"
            />
            <div className="flex items-center gap-1.5 text-[10px] text-white/30">
              <Database className="h-3 w-3" />
              <Workflow className="h-3 w-3" />
              <Terminal className="h-3 w-3" />
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-7 w-7 text-cyan-400 hover:text-cyan-300"
              onClick={handleMycaSubmit}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        {/* Right Tools */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-white/5 text-[10px]">
            {wsConnected ? (
              <>
                <Wifi className="h-3 w-3 text-green-400" />
                <span className="text-green-400">LIVE</span>
              </>
            ) : (
              <>
                <WifiOff className="h-3 w-3 text-yellow-400" />
                <span className="text-yellow-400">POLL</span>
              </>
            )}
          </div>
          
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 text-white/70 hover:text-white"
            onClick={() => setIsPlaying(!isPlaying)}
          >
            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </Button>
          
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 text-white/70 hover:text-white"
            onClick={onRefresh}
            disabled={loading}
          >
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          </Button>
          
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 text-white/70 hover:text-white"
            onClick={onToggleFullscreen}
          >
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Button>
        </div>
      </div>
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
  connectionMode,
  connectionModeSource,
  onNodeClick,
}: {
  data: TopologyData
  filter: TopologyFilter
  viewState: TopologyViewState
  setViewState: (v: TopologyViewState) => void
  onNodeAction: (nodeId: string, action: string, params?: Record<string, unknown>) => Promise<void>
  connectionMode?: boolean
  connectionModeSource?: TopologyNode | null
  onNodeClick?: (nodeId: string) => void
}) {
  const [shouldAnimateCamera, setShouldAnimateCamera] = useState(false)
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null)
  const lastSelectedRef = useRef<string | null>(null)
  
  const filteredNodes = useMemo(() => {
    return data.nodes.filter(node => {
      // Ensure node has position
      if (!node.position || !Array.isArray(node.position) || node.position.length < 3) {
        return false
      }
      if (filter.categories.length > 0 && !filter.categories.includes(node.category)) {
        return false
      }
      if (!filter.showInactive && (node.status === "offline" || node.status === "error")) {
        return false
      }
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
  
  const filteredConnections = useMemo(() => {
    if (!filter.showConnections) return []
    const nodeIds = new Set(filteredNodes.map(n => n.id))
    return data.connections.filter(
      c => nodeIds.has(c.sourceId) && nodeIds.has(c.targetId)
    )
  }, [data.connections, filteredNodes, filter.showConnections])
  
  const selectedNode = useMemo(() => {
    return filteredNodes.find(n => n.id === viewState.selectedNodeId)
  }, [filteredNodes, viewState.selectedNodeId])
  
  useEffect(() => {
    if (viewState.selectedNodeId && viewState.selectedNodeId !== lastSelectedRef.current) {
      setShouldAnimateCamera(true)
      lastSelectedRef.current = viewState.selectedNodeId
    }
  }, [viewState.selectedNodeId])
  
  const cameraTarget = useMemo(() => {
    if (selectedNode && selectedNode.position) {
      return new THREE.Vector3(...selectedNode.position)
    }
    return new THREE.Vector3(0, 0, 0)
  }, [selectedNode])
  
  return (
    <>
      <PerspectiveCamera makeDefault position={[0, 60, 120]} fov={60} />
      <CameraController 
        target={cameraTarget} 
        shouldAnimate={shouldAnimateCamera}
        onAnimationComplete={() => setShouldAnimateCamera(false)}
        isNodeSelected={!!viewState.selectedNodeId}
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
      
      <ambientLight intensity={0.4} />
      <directionalLight position={[30, 50, 30]} intensity={0.8} castShadow />
      <pointLight position={[-50, 40, -50]} intensity={0.5} color="#4f46e5" />
      <pointLight position={[50, 40, 50]} intensity={0.3} color="#22d3ee" />
      
      <Stars radius={200} depth={100} count={3000} factor={5} saturation={0} fade speed={0.5} />
      <GridFloor />
      <AmbientParticles />
      
      {/* Connections */}
      {filteredConnections.map((connection) => {
        const sourceNode = filteredNodes.find(n => n.id === connection.sourceId)
        const targetNode = filteredNodes.find(n => n.id === connection.targetId)
        if (!sourceNode || !targetNode || !sourceNode.position || !targetNode.position) return null
        
        return (
          <TopologyConnection3D
            key={connection.id}
            connection={connection}
            sourceNode={sourceNode}
            targetNode={targetNode}
            packets={data.packets?.filter(p => p.connectionId === connection.id) || []}
            selected={viewState.selectedNodeId === connection.sourceId || viewState.selectedNodeId === connection.targetId}
            hovered={hoveredNodeId === connection.sourceId || hoveredNodeId === connection.targetId}
            animationSpeed={viewState.animationSpeed}
            showParticles={viewState.particleEnabled}
          />
        )
      })}
      
      {/* Nodes */}
      {filteredNodes.map((node) => (
        <TopologyNode3D
          key={node.id}
          node={node}
          selected={node.id === viewState.selectedNodeId || (connectionMode && connectionModeSource?.id === node.id)}
          hovered={node.id === hoveredNodeId}
          onSelect={(id) => {
            if (connectionMode && onNodeClick) {
              onNodeClick(id)
            } else {
              setViewState({ ...viewState, selectedNodeId: id })
            }
          }}
          onHover={setHoveredNodeId}
          showLabels={filter.showLabels}
          showMetrics={filter.showMetrics}
          animationSpeed={viewState.animationSpeed}
          isConnectionTarget={connectionMode && connectionModeSource?.id !== node.id}
        />
      ))}
      
      <EffectComposer>
        <Bloom luminanceThreshold={0.8} intensity={0.5} levels={3} />
      </EffectComposer>
    </>
  )
}

// Modal Components for Tools
function PathTracerModal({ isOpen, onClose, nodes, connections, onHighlight }: {
  isOpen: boolean
  onClose: () => void
  nodes: TopologyNode[]
  connections: TopologyConnection[]
  onHighlight: (nodeIds: string[]) => void
}) {
  const [source, setSource] = useState("")
  const [target, setTarget] = useState("")
  
  if (!isOpen) return null
  
  const handleTrace = () => {
    // Simple path finding - in production use Dijkstra or A*
    if (source && target) {
      const sourceNode = nodes.find(n => n.name.toLowerCase().includes(source.toLowerCase()))
      const targetNode = nodes.find(n => n.name.toLowerCase().includes(target.toLowerCase()))
      if (sourceNode && targetNode) {
        onHighlight([sourceNode.id, targetNode.id])
      }
    }
    onClose()
  }
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-slate-900 rounded-lg p-4 w-80 border border-white/10">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white font-medium">Path Tracer</h3>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4 text-white/50" />
          </Button>
        </div>
        <div className="space-y-3">
          <Input
            placeholder="Source agent..."
            value={source}
            onChange={(e) => setSource(e.target.value)}
            className="bg-white/5 border-white/10 text-white"
          />
          <Input
            placeholder="Target agent..."
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            className="bg-white/5 border-white/10 text-white"
          />
          <Button onClick={handleTrace} className="w-full">Trace Path</Button>
        </div>
      </div>
    </div>
  )
}

function SpawnAgentModal({ isOpen, onClose, gaps, onSpawn }: {
  isOpen: boolean
  onClose: () => void
  gaps: DetectedGap[]
  onSpawn: (gapId: string) => void
}) {
  if (!isOpen) return null
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-slate-900 rounded-lg p-4 w-96 border border-white/10">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white font-medium">Spawn Agent</h3>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4 text-white/50" />
          </Button>
        </div>
        {gaps.length === 0 ? (
          <div className="text-center text-white/50 py-8">
            <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-400" />
            <p>No gaps detected - all systems covered</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-64 overflow-auto">
            {gaps.map((gap, index) => (
              <button
                key={gap.id || `gap-${index}`}
                onClick={() => { onSpawn(gap.id); onClose(); }}
                className="w-full flex items-center gap-3 p-3 rounded bg-white/5 hover:bg-white/10 text-left transition-colors"
              >
                <Plus className="h-4 w-4 text-cyan-400" />
                <div>
                  <div className="text-sm text-white">{gap.suggestedAgentType}</div>
                  <div className="text-xs text-white/50">{gap.description}</div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// Auto-fix progress state
interface AutoFixProgress {
  status: "idle" | "analyzing" | "creating" | "complete" | "error"
  total: number
  completed: number
  created: number
  skipped: number
  currentAgent?: string
  message?: string
  error?: string
}

// Connection Health Panel - Shows validation results and auto-fix options
function ConnectionHealthPanel({ 
  validation, 
  onClose, 
  onAutoFix 
}: { 
  validation: ValidationSummary
  onClose: () => void
  onAutoFix: () => void 
}) {
  const [autoFixProgress, setAutoFixProgress] = useState<AutoFixProgress>({
    status: "idle",
    total: 0,
    completed: 0,
    created: 0,
    skipped: 0,
  })
  
  const scoreColor = validation.overallScore >= 80 
    ? "text-green-400" 
    : validation.overallScore >= 50 
      ? "text-yellow-400" 
      : "text-red-400"
  
  // Handle auto-fix with progress
  const handleAutoFix = async () => {
    setAutoFixProgress({
      status: "analyzing",
      total: validation.autoFixableCount,
      completed: 0,
      created: 0,
      skipped: 0,
      message: "Analyzing disconnected agents...",
    })
    
    // Small delay to show analyzing state
    await new Promise(r => setTimeout(r, 500))
    
    setAutoFixProgress(prev => ({
      ...prev,
      status: "creating",
      message: "Creating connections...",
    }))
    
    try {
      // Call the parent handler which creates connections
      await onAutoFix()
      
      setAutoFixProgress({
        status: "complete",
        total: validation.autoFixableCount,
        completed: validation.autoFixableCount,
        created: validation.autoFixableCount,
        skipped: 0,
        message: `Successfully created ${validation.autoFixableCount} connections!`,
      })
      
      // Auto-close after success
      setTimeout(() => {
        setAutoFixProgress({ status: "idle", total: 0, completed: 0, created: 0, skipped: 0 })
      }, 3000)
    } catch (error) {
      setAutoFixProgress({
        status: "error",
        total: validation.autoFixableCount,
        completed: 0,
        created: 0,
        skipped: 0,
        error: error instanceof Error ? error.message : "Failed to create connections",
      })
    }
  }
  
  return (
    <div className="absolute bottom-20 right-4 z-40 w-80 bg-black/90 backdrop-blur-md rounded-xl border border-white/10 shadow-2xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-white/5">
        <div className="flex items-center gap-2">
          <Network className="h-4 w-4 text-cyan-400" />
          <span className="text-sm font-semibold text-white">Connection Health</span>
        </div>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose}>
          <X className="h-3 w-3" />
        </Button>
      </div>
      
      <div className="p-4 space-y-4">
        {/* Score */}
        <div className="text-center">
          <div className={cn("text-4xl font-bold", scoreColor)}>{validation.overallScore}%</div>
          <div className="text-xs text-white/50">Overall Connectivity Score</div>
        </div>
        
        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="p-2 rounded bg-green-500/10">
            <div className="text-lg font-bold text-green-400">{validation.fullyConnectedAgents}</div>
            <div className="text-[10px] text-green-400/70">Connected</div>
          </div>
          <div className="p-2 rounded bg-yellow-500/10">
            <div className="text-lg font-bold text-yellow-400">{validation.partiallyConnectedAgents}</div>
            <div className="text-[10px] text-yellow-400/70">Partial</div>
          </div>
          <div className="p-2 rounded bg-red-500/10">
            <div className="text-lg font-bold text-red-400">{validation.disconnectedAgents}</div>
            <div className="text-[10px] text-red-400/70">Disconnected</div>
          </div>
        </div>
        
        {/* Critical Issues */}
        {validation.criticalIssues.length > 0 && (
          <div className="space-y-1">
            <div className="text-xs text-white/50">Critical Issues:</div>
            <ScrollArea className="h-24">
              {validation.criticalIssues.slice(0, 5).map((issue) => (
                <div 
                  key={issue.agentId} 
                  className="flex items-center gap-2 p-1.5 rounded bg-red-500/10 mb-1"
                >
                  <AlertTriangle className="h-3 w-3 text-red-400 flex-shrink-0" />
                  <span className="text-[11px] text-white/70 truncate">
                    {issue.agentName}: No orchestrator path
                  </span>
                </div>
              ))}
            </ScrollArea>
          </div>
        )}
        
        {/* Auto-fix Progress */}
        {autoFixProgress.status !== "idle" && (
          <div className="p-3 rounded-lg bg-white/5 border border-white/10 space-y-2">
            <div className="flex items-center gap-2">
              {autoFixProgress.status === "analyzing" && (
                <RefreshCw className="h-4 w-4 text-cyan-400 animate-spin" />
              )}
              {autoFixProgress.status === "creating" && (
                <Zap className="h-4 w-4 text-yellow-400 animate-pulse" />
              )}
              {autoFixProgress.status === "complete" && (
                <CheckCircle className="h-4 w-4 text-green-400" />
              )}
              {autoFixProgress.status === "error" && (
                <AlertTriangle className="h-4 w-4 text-red-400" />
              )}
              <span className="text-xs text-white">
                {autoFixProgress.message || autoFixProgress.error}
              </span>
            </div>
            
            {autoFixProgress.status === "creating" && (
              <div className="space-y-1">
                <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-cyan-500 transition-all duration-300"
                    style={{ width: `${(autoFixProgress.completed / autoFixProgress.total) * 100}%` }}
                  />
                </div>
                <div className="text-[10px] text-white/50 text-center">
                  {autoFixProgress.completed} / {autoFixProgress.total}
                </div>
              </div>
            )}
            
            {autoFixProgress.status === "complete" && (
              <div className="text-[10px] text-green-400/70 text-center">
                Created: {autoFixProgress.created} | Skipped: {autoFixProgress.skipped}
              </div>
            )}
          </div>
        )}
        
        {/* Auto-fix Button */}
        {validation.autoFixableCount > 0 && autoFixProgress.status === "idle" && (
          <Button 
            className="w-full bg-cyan-600 hover:bg-cyan-500"
            onClick={handleAutoFix}
          >
            <Zap className="h-4 w-4 mr-2" />
            Auto-Fix {validation.autoFixableCount} Connections
          </Button>
        )}
        
        {validation.disconnectedAgents === 0 && validation.partiallyConnectedAgents === 0 && autoFixProgress.status === "idle" && (
          <div className="text-center py-2">
            <CheckCircle className="h-8 w-8 text-green-400 mx-auto mb-1" />
            <div className="text-sm text-green-400">All agents connected!</div>
          </div>
        )}
      </div>
    </div>
  )
}

function TimelineModal({ isOpen, onClose, onLoad }: {
  isOpen: boolean
  onClose: () => void
  onLoad: (timestamp: Date) => void
}) {
  const [selectedTime, setSelectedTime] = useState<Date>(new Date())
  
  if (!isOpen) return null
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-slate-900 rounded-lg p-4 w-96 border border-white/10">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white font-medium">Timeline Playback</h3>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4 text-white/50" />
          </Button>
        </div>
        <div className="space-y-4">
          <div className="text-center text-white/50 py-4">
            <History className="h-8 w-8 mx-auto mb-2" />
            <p>Select a point in time to view historical state</p>
          </div>
          <Slider
            defaultValue={[100]}
            max={100}
            step={1}
            onValueChange={([v]) => {
              const hours = Math.floor((100 - v) * 0.24) // 0-24 hours ago
              const time = new Date(Date.now() - hours * 60 * 60 * 1000)
              setSelectedTime(time)
            }}
          />
          <div className="text-center text-xs text-white/50">
            {selectedTime.toLocaleString()}
          </div>
          <Button onClick={() => { onLoad(selectedTime); onClose(); }} className="w-full">
            Load Snapshot
          </Button>
        </div>
      </div>
    </div>
  )
}

// Main Component
export function AdvancedTopology3D({
  className = "h-[600px]",
  fullScreen = false,
  onToggleFullScreen,
}: AdvancedTopology3DProps) {
  // Panel states
  const [leftPanelOpen, setLeftPanelOpen] = useState(true)
  const [rightPanelOpen, setRightPanelOpen] = useState(true)
  const [isInternalFullscreen, setIsInternalFullscreen] = useState(false)
  
  // Modal states
  const [pathTracerOpen, setPathTracerOpen] = useState(false)
  const [spawnAgentOpen, setSpawnAgentOpen] = useState(false)
  const [timelineOpen, setTimelineOpen] = useState(false)
  const [commandCenterOpen, setCommandCenterOpen] = useState(false)
  const [connectionWidgetOpen, setConnectionWidgetOpen] = useState(false)
  const [connectionSource, setConnectionSource] = useState<TopologyNode | null>(null)
  const [connectionTarget, setConnectionTarget] = useState<TopologyNode | null>(null)
  
  // Connection mode - for drag-to-connect functionality
  const [connectionMode, setConnectionMode] = useState(false)
  const [connectionModeSource, setConnectionModeSource] = useState<TopologyNode | null>(null)
  
  // New v2.1 states for enhanced connections
  const [legendOpen, setLegendOpen] = useState(false)
  const [connectionHealthOpen, setConnectionHealthOpen] = useState(false)
  const [visibleConnectionTypes, setVisibleConnectionTypes] = useState<Set<ConnectionType>>(
    new Set(["data", "message", "command", "query", "stream", "sync", "heartbeat", "broadcast", "subscribe", "rpc"])
  )
  const [connectionValidation, setConnectionValidation] = useState<ValidationSummary | null>(null)
  const [highlightedConnectionType, setHighlightedConnectionType] = useState<ConnectionType | null>(null)
  
  // Core state
  const [data, setData] = useState<ExtendedTopologyData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const [filter, setFilter] = useState<TopologyFilter>({
    categories: [],
    types: [],
    statuses: [],
    searchQuery: "",
    showLabels: true,
    showMetrics: false,
    showConnections: true,
    showInactive: true,
  })
  
  const [viewState, setViewState] = useState<TopologyViewState>({
    zoom: 30,
    rotation: [0, 0, 0],
    center: [0, 0, 0],
    selectedNodeId: null,
    hoveredNodeId: null,
    detailLevel: "overview",
    particleEnabled: true,
    animationSpeed: 1,
  })
  
  const [isPlaying, setIsPlaying] = useState(true)
  const [isLive, setIsLive] = useState(true)
  const [highlightedNodeIds, setHighlightedNodeIds] = useState<string[]>([])
  
  // WebSocket connection
  const wsState = useTopologyWebSocket({
    onAgentUpdate: (agentId, status, metrics) => {
      if (isLive) {
        setData(prev => {
          if (!prev) return prev
          const updatedNodes = prev.nodes.map(n => 
            n.id === agentId ? { ...n, status, metrics: metrics || n.metrics } : n
          )
          return { ...prev, nodes: updatedNodes }
        })
      }
    },
    onIncidentCreated: (incident) => {
      if (isLive) {
        setData(prev => prev ? { ...prev, incidents: [...(prev.incidents || []), incident] } : prev)
      }
    },
  })
  
  // Fetch initial data
  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch("/api/mas/topology")
      if (!response.ok) throw new Error("Failed to fetch topology")
      
      const result = await response.json()
      setData(result)
    } catch (err) {
      console.error("Topology fetch error:", err)
      setError(err instanceof Error ? err.message : "Unknown error")
    } finally {
      setLoading(false)
    }
  }, [])
  
  useEffect(() => {
    fetchData()
  }, [fetchData])
  
  // Refresh on interval when not using WebSocket
  useEffect(() => {
    if (!wsState.state.connected && isPlaying && isLive) {
      const interval = setInterval(fetchData, 5000)
      return () => clearInterval(interval)
    }
  }, [wsState.state.connected, isPlaying, isLive, fetchData])
  
  // Compute connection validation when data changes
  useEffect(() => {
    if (data?.nodes && data?.connections) {
      const results = validateAgentConnections(data.nodes, data.connections)
      const summary = getValidationSummary(results)
      setConnectionValidation(summary)
    }
  }, [data?.nodes, data?.connections])
  
  // Handle connection type visibility toggle
  const handleToggleConnectionType = useCallback((type: ConnectionType) => {
    setVisibleConnectionTypes(prev => {
      const newSet = new Set(prev)
      if (newSet.has(type)) {
        newSet.delete(type)
      } else {
        newSet.add(type)
      }
      return newSet
    })
  }, [])
  
  // Handle auto-fix connections - uses bulk API for efficiency
  const handleAutoFixConnections = useCallback(async () => {
    if (!data || !connectionValidation) return
    
    const results = validateAgentConnections(data.nodes, data.connections)
    const autoConnections = generateAllAutoConnections(results, data.nodes)
    
    if (autoConnections.length === 0) {
      console.log("No connections to auto-fix")
      return
    }
    
    console.log(`[Auto-Fix] Creating ${autoConnections.length} connections...`)
    
    try {
      // Use bulk PATCH endpoint for efficiency
      const response = await fetch("/api/mas/connections", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          connections: autoConnections.map(conn => ({
            sourceId: conn.sourceId,
            targetId: conn.targetId,
            type: conn.type,
            bidirectional: conn.bidirectional,
            priority: 5,
          }))
        })
      })
      
      if (!response.ok) {
        throw new Error(`Auto-fix failed: ${response.statusText}`)
      }
      
      const result = await response.json()
      console.log(`[Auto-Fix] Complete:`, result)
      
      // Refresh topology data
      await fetchData()
      
      return result
    } catch (err) {
      console.error("Auto-fix connection error:", err)
      throw err
    }
  }, [data, connectionValidation, fetchData])
  
  // Handle node actions
  const handleNodeAction = useCallback(async (nodeId: string, action: string, params?: Record<string, unknown>) => {
    try {
      const validAction = action as "spawn" | "stop" | "restart" | "configure"
      await executeAgentAction(nodeId, validAction, params)
      await fetchData()
    } catch (err) {
      console.error("Node action error:", err)
    }
  }, [fetchData])
  
  // Handle category toggle
  const handleToggleCategory = useCallback((category: NodeCategory) => {
    setFilter(prev => {
      const current = prev.categories
      if (current.includes(category)) {
        return { ...prev, categories: current.filter(c => c !== category) }
      } else if (current.length === 0) {
        return { ...prev, categories: [category] }
      } else {
        return { ...prev, categories: [...current, category] }
      }
    })
  }, [])
  
  // Handle incident click
  const handleIncidentClick = useCallback((incident: TopologyIncident) => {
    if (incident.affectedNodeIds.length > 0) {
      setViewState(prev => ({ ...prev, selectedNodeId: incident.affectedNodeIds[0] }))
    }
  }, [])
  
  // Handle spawn with full config
  const handleSpawnAgent = useCallback(async (config: AgentSpawnConfig) => {
    try {
      await fetch("/api/mas/agents/spawn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config)
      })
      await fetchData()
    } catch (err) {
      console.error("Spawn error:", err)
    }
  }, [fetchData])
  
  // Handle orchestrator action
  const handleOrchestratorAction = useCallback(async (action: string, params: Record<string, unknown>) => {
    console.log("[Orchestrator Action]", action, params)
    try {
      await fetch("/api/mas/orchestrator/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, params })
      })
      await fetchData()
    } catch (err) {
      console.error("Orchestrator action error:", err)
    }
  }, [fetchData])
  
  // Handle connection creation
  const handleCreateConnection = useCallback(async (config: ConnectionConfig) => {
    console.log("[Create Connection]", config)
    try {
      await fetch("/api/mas/connections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config)
      })
      await fetchData()
    } catch (err) {
      console.error("Connection create error:", err)
    }
  }, [fetchData])
  
  // Handle node click in connection mode
  const handleNodeClickForConnection = useCallback((nodeId: string) => {
    if (!data) return
    
    const clickedNode = data.nodes.find(n => n.id === nodeId)
    if (!clickedNode) return
    
    if (connectionMode && connectionModeSource) {
      // This is the target node
      if (connectionModeSource.id !== nodeId) {
        setConnectionTarget(clickedNode)
        setConnectionSource(connectionModeSource)
        setConnectionWidgetOpen(true)
        // Exit connection mode
        setConnectionMode(false)
        setConnectionModeSource(null)
      }
    } else if (connectionMode) {
      // This is the source node
      setConnectionModeSource(clickedNode)
    } else {
      // Normal click - select node
      setViewState({ ...viewState, selectedNodeId: nodeId })
    }
  }, [data, connectionMode, connectionModeSource, viewState])
  
  // Start connection mode from a selected node
  const startConnectionMode = useCallback((sourceNode: TopologyNode) => {
    setConnectionMode(true)
    setConnectionModeSource(sourceNode)
    // Deselect to allow clicking target
    setViewState(prev => ({ ...prev, selectedNodeId: null }))
  }, [])
  
  // Handle connection deletion
  const handleDeleteConnection = useCallback(async (connectionId: string) => {
    console.log("[Delete Connection]", connectionId)
    try {
      await fetch(`/api/mas/connections/${connectionId}`, {
        method: "DELETE"
      })
      await fetchData()
    } catch (err) {
      console.error("Connection delete error:", err)
    }
  }, [fetchData])
  
  // Fullscreen handling - use browser native Fullscreen API
  const containerRef = useRef<HTMLDivElement>(null)
  const isFullscreen = fullScreen || isInternalFullscreen
  
  const toggleFullscreen = useCallback(async () => {
    if (onToggleFullScreen) {
      onToggleFullScreen()
      return
    }
    
    try {
      if (!document.fullscreenElement) {
        // Enter fullscreen
        if (containerRef.current) {
          await containerRef.current.requestFullscreen()
          setIsInternalFullscreen(true)
          document.body.classList.add("dashboard-fullscreen")
        }
      } else {
        // Exit fullscreen
        await document.exitFullscreen()
        setIsInternalFullscreen(false)
        document.body.classList.remove("dashboard-fullscreen")
      }
    } catch (err) {
      console.error("Fullscreen error:", err)
      // Fallback to CSS-only fullscreen
      setIsInternalFullscreen(!isInternalFullscreen)
      if (!isInternalFullscreen) {
        document.body.classList.add("dashboard-fullscreen")
      } else {
        document.body.classList.remove("dashboard-fullscreen")
      }
    }
  }, [onToggleFullScreen, isInternalFullscreen])
  
  // Listen for fullscreen change events
  useEffect(() => {
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) {
        setIsInternalFullscreen(false)
        document.body.classList.remove("dashboard-fullscreen")
      }
    }
    
    document.addEventListener("fullscreenchange", handleFullscreenChange)
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange)
  }, [])
  
  // Selected node
  const selectedNode = useMemo(() => {
    if (!data || !viewState.selectedNodeId) return null
    return data.nodes.find(n => n.id === viewState.selectedNodeId) || null
  }, [data, viewState.selectedNodeId])
  
  if (error) {
    return (
      <div className={cn("flex items-center justify-center bg-black", className)}>
        <div className="text-center text-white">
          <div className="text-red-400 mb-2">Failed to load topology</div>
          <Button onClick={fetchData} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </div>
      </div>
    )
  }
  
  return (
    <div 
      ref={containerRef}
      className={cn(
        "relative bg-black overflow-hidden",
        isFullscreen ? "fixed inset-0 z-50" : className
      )}
    >
      {/* 3D Canvas */}
      <Canvas shadows className="w-full h-full">
        <Suspense fallback={null}>
          {data && (
            <TopologyScene
              data={data}
              filter={filter}
              viewState={viewState}
              setViewState={setViewState}
              onNodeAction={handleNodeAction}
              connectionMode={connectionMode}
              connectionModeSource={connectionModeSource}
              onNodeClick={handleNodeClickForConnection}
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
      
      {/* Connection Mode Indicator */}
      {connectionMode && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-40 animate-in slide-in-from-top duration-200">
          <div className="flex items-center gap-3 px-4 py-2 bg-purple-600 rounded-full shadow-lg shadow-purple-500/30 border border-purple-400/30">
            <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
            <span className="text-white font-medium text-sm">
              {connectionModeSource 
                ? `Click a node to connect from "${connectionModeSource.shortName}"`
                : "Click a node to start connection"
              }
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-white/80 hover:text-white hover:bg-white/10"
              onClick={() => {
                setConnectionMode(false)
                setConnectionModeSource(null)
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
      
      {data && (
        <>
          {/* Compact Stats Bar (top center) */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10">
            <CompactStatsBar data={data} incidents={data.incidents || []} />
          </div>
          
          {/* Left Panel */}
          <LeftPanel
            isOpen={leftPanelOpen}
            onToggle={() => setLeftPanelOpen(!leftPanelOpen)}
            filter={filter}
            setFilter={setFilter}
            onToggleCategory={handleToggleCategory}
            incidents={data.incidents || []}
            onIncidentClick={handleIncidentClick}
          />
          
          {/* Right Panel */}
          <RightPanel
            isOpen={rightPanelOpen}
            onToggle={() => setRightPanelOpen(!rightPanelOpen)}
            data={data}
            selectedNode={selectedNode}
            onNodeClose={() => setViewState({ ...viewState, selectedNodeId: null })}
            onNodeAction={handleNodeAction}
          />
          
          {/* Bottom Control Bar */}
          <BottomControlBar
            data={data}
            viewState={viewState}
            setViewState={setViewState}
            filter={filter}
            setFilter={setFilter}
            isPlaying={isPlaying}
            setIsPlaying={setIsPlaying}
            onRefresh={fetchData}
            loading={loading}
            wsConnected={wsState.state.connected}
            gaps={data.gaps || []}
            onSpawnAgent={() => setSpawnAgentOpen(true)}
            onPathTrace={() => setPathTracerOpen(true)}
            onTimeline={() => setTimelineOpen(true)}
            onCommandCenter={() => setCommandCenterOpen(true)}
            onLegend={() => setLegendOpen(true)}
            onConnectionHealth={() => setConnectionHealthOpen(true)}
            connectionValidation={connectionValidation}
            isFullscreen={isFullscreen}
            onToggleFullscreen={toggleFullscreen}
            connectionMode={connectionMode}
            onToggleConnectionMode={() => {
              setConnectionMode(!connectionMode)
              if (connectionMode) {
                setConnectionModeSource(null)
              }
            }}
          />
          
          {/* Version indicator */}
          <div className="absolute bottom-16 right-4 text-white/30 text-[10px] font-mono">
            v2.2 | {data.stats.activeNodes}/{data.stats.totalNodes}
          </div>
        </>
      )}
      
      {/* Enhanced Modals */}
      <EnhancedPathTracer
        isOpen={pathTracerOpen}
        onClose={() => setPathTracerOpen(false)}
        nodes={data?.nodes || []}
        connections={data?.connections || []}
        onHighlight={setHighlightedNodeIds}
        onExecuteAction={handleOrchestratorAction}
      />
      
      <EnhancedSpawnAgent
        isOpen={spawnAgentOpen}
        onClose={() => setSpawnAgentOpen(false)}
        gaps={data?.gaps || []}
        nodes={data?.nodes || []}
        onSpawn={handleSpawnAgent}
        onExecuteAction={handleOrchestratorAction}
      />
      
      <OrchestratorCommandCenter
        isOpen={commandCenterOpen}
        onClose={() => setCommandCenterOpen(false)}
        nodes={data?.nodes || []}
        connections={data?.connections || []}
        onExecuteAction={handleOrchestratorAction}
      />
      
      <ConnectionWidget
        isOpen={connectionWidgetOpen}
        onClose={() => {
          setConnectionWidgetOpen(false)
          setConnectionSource(null)
          setConnectionTarget(null)
        }}
        sourceNode={connectionSource}
        targetNode={connectionTarget}
        allNodes={data?.nodes}
        allConnections={data?.connections}
        onCreateConnection={handleCreateConnection}
        onDeleteConnection={handleDeleteConnection}
        onExecuteAction={handleOrchestratorAction}
      />
      
      {/* Connection Legend */}
      <ConnectionLegend
        isOpen={legendOpen}
        onClose={() => setLegendOpen(false)}
        visibleTypes={visibleConnectionTypes}
        onToggleType={handleToggleConnectionType}
        onHoverType={setHighlightedConnectionType}
      />
      
      {/* Connection Health Panel */}
      {connectionHealthOpen && connectionValidation && (
        <ConnectionHealthPanel
          validation={connectionValidation}
          onClose={() => setConnectionHealthOpen(false)}
          onAutoFix={handleAutoFixConnections}
        />
      )}
      
      {/* Node Widget - Floating centered widget for selected node */}
      {selectedNode && (
        <>
          {/* Backdrop - click to deselect */}
          <div 
            className="fixed inset-0 bg-black/30 z-40 animate-in fade-in-0 duration-200"
            onClick={() => setViewState({ ...viewState, selectedNodeId: null })}
          />
          
          {/* Widget */}
          <NodeWidgetContainer
            node={selectedNode}
            onClose={() => setViewState({ ...viewState, selectedNodeId: null })}
            onAction={handleNodeAction}
          />
        </>
      )}
    </div>
  )
}
