/**
 * Advanced Agent Topology Types
 * Types for the 3D visualization system
 */

export type NodeType = 
  | "orchestrator"
  | "agent"
  | "service" 
  | "database"
  | "integration"
  | "user"
  | "device"
  | "workflow"
  | "queue"

export type NodeCategory =
  | "core"
  | "financial"
  | "mycology"
  | "research"
  | "dao"
  | "communication"
  | "data"
  | "infrastructure"
  | "simulation"
  | "security"
  | "integration"
  | "device"
  | "chemistry"
  | "nlm"

export type NodeStatus = 
  | "active"
  | "busy"
  | "idle"
  | "offline"
  | "error"
  | "starting"
  | "stopping"

export type ConnectionType =
  | "data"       // Data transfer
  | "message"    // Message/event
  | "command"    // Command/instruction
  | "query"      // Database query
  | "stream"     // Real-time stream
  | "sync"       // Synchronization
  | "heartbeat"  // Health check pings
  | "broadcast"  // One-to-many
  | "subscribe"  // Pub/sub subscription
  | "rpc"        // Remote procedure call

// Line style for connection visualization
export type LineStyle = "solid" | "dashed" | "dotted"

// Data packet types for visualization
export type PacketType = 
  | "request"    // Outgoing request (white dots)
  | "response"   // Incoming response (blue dots)
  | "event"      // Event notification (cyan dots)
  | "error"      // Error packet (red dots)
  | "heartbeat"  // Health ping (green dots)
  | "broadcast"  // Broadcast message (purple dots)

// Packet priority for visualization
export type PacketPriority = "low" | "normal" | "high" | "critical"

export interface TopologyNode {
  id: string
  name: string
  shortName: string
  type: NodeType
  category: NodeCategory
  status: NodeStatus
  description: string
  
  // 3D positioning
  position: [number, number, number]
  
  // Metrics
  metrics: {
    cpuPercent: number
    memoryMb: number
    tasksCompleted: number
    tasksQueued: number
    messagesPerSecond: number
    errorRate: number
    uptime: number
    lastActive: string
  }
  
  // Connections (by node ID)
  connections: string[]
  
  // Visual properties
  size: number
  priority: number
  
  // Operational
  canStart: boolean
  canStop: boolean
  canRestart: boolean
  canConfigure: boolean
}

export interface TopologyConnection {
  id: string
  sourceId: string
  targetId: string
  type: ConnectionType
  
  // Traffic metrics
  traffic: {
    messagesPerSecond: number
    bytesPerSecond: number
    latencyMs: number
    errorRate: number
  }
  
  // Visual properties
  animated: boolean
  active: boolean
  intensity: number // 0-1, affects glow and particle speed
  bidirectional: boolean
}

export interface DataPacket {
  id: string
  connectionId: string
  sourceId: string
  targetId: string
  type: PacketType
  priority: PacketPriority
  size: number           // Affects dot size: small (<100), medium (100-1000), large (>1000)
  latency: number        // Affects dot speed: fast (<50ms), normal (50-200ms), slow (>200ms)
  timestamp: number
  progress: number       // 0-1, position along connection line
  direction: "forward" | "reverse" // For bidirectional connections
  streamId?: string      // Group packets into streams
  payload?: Record<string, unknown>
}

// Enhanced TopologyConnection with visual properties
export interface TopologyConnectionVisual extends TopologyConnection {
  lineStyle: LineStyle
  streams: ConnectionStream[]
  packetQueue: DataPacket[]
}

// Represents a single stream on a connection (multiple can exist)
export interface ConnectionStream {
  id: string
  connectionId: string
  type: PacketType
  active: boolean
  direction: "forward" | "reverse" | "bidirectional"
  intensity: number    // 0-1, affects particle density
  color?: string       // Override default color
}

export interface TopologyData {
  nodes: TopologyNode[]
  connections: TopologyConnection[]
  packets: DataPacket[]
  
  // System-wide stats
  stats: {
    totalNodes: number
    activeNodes: number
    totalConnections: number
    activeConnections: number
    messagesPerSecond: number
    avgLatencyMs: number
    systemLoad: number
    uptimeSeconds: number
  }
  
  lastUpdated: string
}

export interface TopologyFilter {
  categories: NodeCategory[]
  types: NodeType[]
  statuses: NodeStatus[]
  searchQuery: string
  showInactive: boolean
  showConnections: boolean
  showLabels: boolean
  showMetrics: boolean
}

export interface TopologyViewState {
  zoom: number
  rotation: [number, number, number]
  center: [number, number, number]
  selectedNodeId: string | null
  hoveredNodeId: string | null
  detailLevel: "overview" | "category" | "node" | "detail"
  animationSpeed: number
  particleEnabled: boolean
}

// Node category colors for visualization
export const CATEGORY_COLORS: Record<NodeCategory, string> = {
  core: "#8b5cf6",       // Purple
  financial: "#3b82f6",  // Blue
  mycology: "#22c55e",   // Green
  research: "#06b6d4",   // Cyan
  dao: "#eab308",        // Yellow
  communication: "#ec4899", // Pink
  data: "#14b8a6",       // Teal
  infrastructure: "#f97316", // Orange
  simulation: "#f59e0b", // Amber
  security: "#ef4444",   // Red
  integration: "#a855f7", // Violet
  device: "#84cc16",     // Lime
  chemistry: "#d946ef",  // Fuchsia
  nlm: "#6366f1",        // Indigo
}

// Node type icons/shapes
export const NODE_TYPE_CONFIG: Record<NodeType, { shape: "sphere" | "box" | "octahedron" | "cylinder" | "torus"; scale: number }> = {
  orchestrator: { shape: "octahedron", scale: 2.5 },
  agent: { shape: "sphere", scale: 1 },
  service: { shape: "box", scale: 1.2 },
  database: { shape: "cylinder", scale: 1.3 },
  integration: { shape: "torus", scale: 0.9 },
  user: { shape: "sphere", scale: 0.8 },
  device: { shape: "box", scale: 0.9 },
  workflow: { shape: "octahedron", scale: 1.1 },
  queue: { shape: "cylinder", scale: 0.8 },
}

// Connection type visual configs
export const CONNECTION_COLORS: Record<ConnectionType, string> = {
  data: "#22c55e",      // Green
  message: "#3b82f6",   // Blue
  command: "#f97316",   // Orange
  query: "#14b8a6",     // Teal
  stream: "#8b5cf6",    // Purple
  sync: "#eab308",      // Yellow
  heartbeat: "#10b981", // Emerald
  broadcast: "#ec4899", // Pink
  subscribe: "#06b6d4", // Cyan
  rpc: "#f59e0b",       // Amber
}

// Packet type colors for dots
export const PACKET_COLORS: Record<PacketType, string> = {
  request: "#ffffff",   // White
  response: "#3b82f6",  // Blue
  event: "#06b6d4",     // Cyan
  error: "#ef4444",     // Red
  heartbeat: "#22c55e", // Green
  broadcast: "#a855f7", // Purple
}

// Line style configurations
export const LINE_STYLES: Record<LineStyle, { dashArray?: string; opacity: number }> = {
  solid: { opacity: 0.8 },
  dashed: { dashArray: "8,4", opacity: 0.6 },
  dotted: { dashArray: "2,4", opacity: 0.5 },
}

// Packet size thresholds (bytes)
export const PACKET_SIZE_THRESHOLDS = {
  small: 100,
  medium: 1000,
  large: 10000,
} as const

// Latency thresholds (ms)
export const LATENCY_THRESHOLDS = {
  fast: 50,
  normal: 200,
  slow: 500,
} as const

// Status colors
export const STATUS_COLORS: Record<NodeStatus, string> = {
  active: "#22c55e",
  busy: "#3b82f6",
  idle: "#eab308",
  offline: "#6b7280",
  error: "#ef4444",
  starting: "#f97316",
  stopping: "#f59e0b",
}

// ============================================
// v2.1 Additions - Incident & Layout Types
// ============================================

export type IncidentSeverity = "critical" | "high" | "medium" | "low" | "info"
export type IncidentStatus = "active" | "investigating" | "resolved" | "ignored"

export interface TopologyIncident {
  id: string
  title: string
  description: string
  severity: IncidentSeverity
  status: IncidentStatus
  affectedNodeIds: string[]
  causedByNodeId?: string
  detectedAt: string
  resolvedAt?: string
  resolverAgentId?: string
  causalityChain?: CausalityLink[]
  playbook?: string
  confidence: number // 0-1
}

export interface CausalityLink {
  fromNodeId: string
  toNodeId: string
  probability: number
  impactType: "direct" | "cascade" | "dependency"
}

export interface TopologySnapshot {
  id: string
  timestamp: string
  nodes: TopologyNode[]
  connections: TopologyConnection[]
  stats: TopologyData["stats"]
  incidents: TopologyIncident[]
}

export interface LayoutPreset {
  id: string
  name: string
  userId?: string
  algorithm: "cola" | "force" | "hierarchical" | "radial" | "grid"
  nodePositions?: Record<string, [number, number, number]>
  settings: LayoutSettings
  createdAt: string
  updatedAt: string
}

export interface LayoutSettings {
  nodeSpacing: number
  edgeLength: number
  avoidOverlap: boolean
  animate: boolean
  animationDuration: number
  showLabels: boolean
  showMetrics: boolean
  clusterByCategory: boolean
  edgeBundling: boolean
}

// WebSocket message types for real-time updates
export type TopologyWSMessageType =
  | "agent_update"
  | "agent_event"
  | "metric_update"
  | "connection_update"
  | "incident_created"
  | "incident_updated"
  | "incident_resolved"
  | "task_assigned"
  | "task_completed"

export interface TopologyWSMessage {
  type: TopologyWSMessageType
  timestamp: string
  payload: unknown
}

export interface AgentUpdatePayload {
  agentId: string
  status: NodeStatus
  metrics?: TopologyNode["metrics"]
}

export interface IncidentUpdatePayload {
  incident: TopologyIncident
}

export interface ConnectionUpdatePayload {
  connectionId: string
  traffic: TopologyConnection["traffic"]
  active: boolean
}

// Gap detection types
export interface DetectedGap {
  id: string
  gapType: "route_coverage" | "device_monitoring" | "integration" | "security" | "data_pipeline"
  description: string
  suggestedAgentType: string
  suggestedCategory: NodeCategory
  priority: "critical" | "high" | "medium" | "low"
  autoSpawnRecommended: boolean
}

// Action types for topology operations
export type TopologyAction =
  | { type: "spawn"; agentType: string; category: NodeCategory; config?: Record<string, unknown> }
  | { type: "stop"; agentId: string; force?: boolean }
  | { type: "restart"; agentId: string }
  | { type: "configure"; agentId: string; config: Record<string, unknown> }
  | { type: "assign_task"; agentId: string; task: string; payload?: Record<string, unknown> }

// Extended topology data with incidents and gaps
export interface ExtendedTopologyData extends TopologyData {
  incidents: TopologyIncident[]
  gaps: DetectedGap[]
  predictions: TopologyIncident[] // Predicted future incidents
}

// Path trace result
export interface PathTraceResult {
  path: string[] // Node IDs in order
  edges: string[] // Edge IDs in order
  totalLatencyMs: number
  hopCount: number
  bottleneckNodeId?: string
}

// Historical playback state
export interface PlaybackState {
  isPlaying: boolean
  currentTime: Date
  startTime: Date
  endTime: Date
  speed: number // 1x, 2x, 4x, etc.
  snapshots: TopologySnapshot[]
  currentSnapshotIndex: number
}
