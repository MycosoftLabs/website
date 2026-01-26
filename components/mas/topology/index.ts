/**
 * Advanced Agent Topology Module v2.1
 * 3D visualization and control system for MAS
 * 
 * Features:
 * - 223+ agent support with force-directed layout (Cytoscape.js)
 * - Real-time WebSocket updates from MAS Dashboard API
 * - Security incident overlay with causality chains
 * - Path tracing with latency visualization
 * - Historical playback with timeline scrubbing
 * - Agent spawning from templates
 * - Level-of-detail (LOD) rendering
 */

// Core 3D Components
export { AdvancedTopology3D } from "./advanced-topology-3d"
export { TopologyNode3D } from "./topology-node"
export { TopologyConnection3D } from "./topology-connection"
export { NodeDetailPanel } from "./node-detail-panel"
export { MetricsChart } from "./metrics-chart"

// v2.1 Layout Engine
export { CytoscapeLayout } from "./cytoscape-layout"

// v2.1 Real-Time Data
export { 
  useTopologyWebSocket, 
  useTopologyLogStream,
  fetchTopologyData,
  executeAgentAction,
  submitTask,
} from "./use-topology-websocket"

// v2.1 Overlays & Tools
export { IncidentOverlay } from "./incident-overlay"
export { PathTracer } from "./path-tracer"
export { TimelinePlayer } from "./timeline-player"
export { AgentSpawner } from "./agent-spawner"
export { AgentQuery } from "./agent-query"
export { TelemetryWidgets } from "./telemetry-widgets"
export { LayoutManager } from "./layout-manager"

// v2.1 LOD System
export { 
  useLODSystem,
  LODIndicator,
  filterNodesByLOD,
  filterConnectionsByLOD,
  generateCategoryClusters,
  calculateLODLevel,
  DEFAULT_LOD_CONFIG,
} from "./lod-system"
export type { DetailLevel, LODState, LODConfig, CategoryCluster } from "./lod-system"

// Agent Registry
export { 
  COMPLETE_AGENT_REGISTRY, 
  TOTAL_AGENT_COUNT,
  CATEGORY_STATS,
  getAgentById,
  getAgentsByCategory,
  getActiveAgents,
  generateDefaultConnections,
} from "./agent-registry"

// Types
export * from "./types"
