/**
 * Activity (Circulatory) Topology Types
 * Nodes and connections for routes, APIs, memory, sitemap, workflows, devices, DB
 * Used by Activity tab in MYCA AI Studio - not agents
 */

export type ActivityNodeType =
  | "page"
  | "api"
  | "app"
  | "device"
  | "database"
  | "memory"
  | "workflow"
  | "system"

export type ActivityConnectionType =
  | "http"
  | "read"
  | "write"
  | "trigger"
  | "sitemap_link"
  | "query"
  | "stream"

/** Node health for live pipeline visualization */
export type ActivityNodeStatus = "healthy" | "degraded" | "error"

export interface ActivityNode {
  id: string
  label: string
  type: ActivityNodeType
  url?: string
  system?: string
  metadata?: Record<string, unknown>
  /** 3D position [x, y, z]: frontend left (negative X), API center, infrastructure right (positive X) */
  position?: [number, number, number]
  /** Live status for system/infra nodes when health is known */
  status?: ActivityNodeStatus
}

/** Traffic for flow visualization (particles, line style) */
export interface ActivityConnectionTraffic {
  requestRate: number   // maps to messagesPerSecond in topology
  latencyMs: number
  bytesPerSecond?: number
  errorRate?: number
}

export interface ActivityConnection {
  id: string
  sourceId: string
  targetId: string
  type: ActivityConnectionType
  label?: string
  method?: string
  /** For pipeline flow: request rate and latency (drives particles and line style) */
  traffic?: ActivityConnectionTraffic
  active?: boolean
  animated?: boolean
  intensity?: number
  bidirectional?: boolean
}

export interface ActivityTopologyData {
  nodes: ActivityNode[]
  connections: ActivityConnection[]
  lastUpdated?: string
  /** Counts of system nodes by status (for UI/MAS) */
  summary?: { healthy: number; degraded: number; error: number }
}
