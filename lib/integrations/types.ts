/**
 * Integration Types
 *
 * Stable TypeScript types used by the UI for MINDEX, NatureOS, and MYCA MAS
 */

// ============================================
// MINDEX Types (Canonical Data Layer)
// ============================================

export interface Device {
  id: string
  name: string
  type: "mushroom1" | "sporebase" | "trufflebot" | "alarm" | "petreus" | "mycotenna" | "mycoalarm"
  status: "online" | "offline" | "maintenance" | "error"
  lastSeen: string
  location?: {
    latitude: number
    longitude: number
    region?: string
  }
  firmwareVersion?: string
  metadata?: Record<string, unknown>
}

export interface TelemetrySample {
  deviceId: string
  timestamp: string
  metrics: {
    batteryLevel?: number
    signalStrength?: number
    temperature?: number
    humidity?: number
    soilMoisture?: number
    sporeCount?: number
    airQuality?: number
    co2Level?: number
    networkConnections?: number
    [key: string]: number | undefined
  }
  alerts?: Alert[]
}

export interface Alert {
  id: string
  type: "warning" | "error" | "info" | "critical"
  message: string
  timestamp: string
  acknowledged?: boolean
}

export interface Taxon {
  id: string
  scientificName: string
  commonName?: string
  kingdom: string
  phylum?: string
  class?: string
  order?: string
  family?: string
  genus?: string
  species?: string
  description?: string
  imageUrl?: string
  edibility?: "edible" | "inedible" | "toxic" | "unknown"
  medicinalProperties?: string[]
  habitat?: string[]
}

export interface Observation {
  id: string
  taxonId?: string
  taxon?: Taxon
  location: {
    latitude: number
    longitude: number
    accuracy?: number
    elevation?: number
  }
  observedAt: string
  observerId?: string
  imageUrls?: string[]
  notes?: string
  verified?: boolean
  deviceId?: string
}

// ============================================
// MYCA MAS Types (Agent Orchestration)
// ============================================

export interface AgentRun {
  id: string
  agentId: string
  agentName: string
  status: "pending" | "running" | "completed" | "failed" | "cancelled"
  startedAt: string
  completedAt?: string
  input?: Record<string, unknown>
  output?: Record<string, unknown>
  logs?: AgentLog[]
  error?: string
  metadata?: Record<string, unknown>
}

export interface AgentLog {
  timestamp: string
  level: "debug" | "info" | "warn" | "error"
  message: string
  data?: Record<string, unknown>
}

export interface Agent {
  id: string
  name: string
  description?: string
  type: "automation" | "analysis" | "monitoring" | "integration"
  status: "active" | "inactive" | "deprecated"
  tools?: string[]
  lastRunAt?: string
  runCount?: number
}

// ============================================
// Health & System Types
// ============================================

export interface ServiceHealth {
  service: string
  status: "healthy" | "degraded" | "unhealthy" | "unknown"
  latencyMs?: number
  message?: string
  lastChecked: string
}

export interface SystemHealth {
  ok: boolean
  timestamp: string
  services: {
    mindex: ServiceHealth
    mycaMas: ServiceHealth
    natureos?: ServiceHealth
  }
}

// ============================================
// API Response Types
// ============================================

export interface ApiResponse<T> {
  data: T
  meta?: {
    total?: number
    page?: number
    pageSize?: number
    hasMore?: boolean
  }
}

export interface ApiError {
  code: string
  message: string
  details?: Record<string, unknown>
}

export interface PaginationParams {
  page?: number
  pageSize?: number
  sortBy?: string
  sortOrder?: "asc" | "desc"
}

export interface SearchParams extends PaginationParams {
  query: string
  filters?: Record<string, string | string[]>
}
