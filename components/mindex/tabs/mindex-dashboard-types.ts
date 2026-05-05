import type { LucideIcon } from "lucide-react"

export type WidgetSection =
  | "overview"
  | "encyclopedia"
  | "data"
  | "integrity"
  | "ledger"
  | "network"
  | "bio"
  | "chemistry"
  | "devices"
  | "mwave"
  | "agents"

export interface NavItem {
  id: WidgetSection
  label: string
  icon: LucideIcon
  color: string
}

export interface MINDEXHealth {
  status: "healthy" | "unhealthy" | "degraded"
  api: boolean
  database: boolean
  etl: string
  version?: string
  uptime?: number
}

export interface MINDEXStats {
  total_taxa: number
  total_observations: number
  total_external_ids: number
  taxa_by_source: Record<string, number>
  observations_by_source: Record<string, number>
  observations_with_location: number
  observations_with_images: number
  taxa_with_observations: number
  observation_date_range: { earliest: string | null; latest: string | null }
  etl_status: "running" | "idle" | "unknown"
  genome_records: number
  trait_records: number
  synonym_records: number
}

export interface Taxon {
  id: string
  canonical_name: string
  rank: string
  common_name?: string
  authority?: string
  description?: string
  source: string
  metadata?: unknown
  created_at: string
  updated_at: string
}

export interface Observation {
  id: string
  taxon_id: string
  observed_at: string
  location?: { type: string; coordinates: number[] }
  media?: unknown[]
  source: string
  metadata?: unknown
}

export interface DockerContainer {
  id: string
  name: string
  status: string
  image: string
  ports: string[]
  health?: string
}

/** Response from MINDEX `GET /health/all` (via BFF `/api/mindex/health/all`). */
export interface MindexHealthAll {
  service?: string
  timestamp?: string
  components?: Record<string, unknown>
  counts?: Record<string, number | null | undefined>
}

export interface ETLStatus {
  status: string
  sync_interval_hours: number
  max_records_per_source: number
  recent_syncs: Array<{
    source: string
    data_type: string
    records_count: number
    errors_count: number
    completed_at: string
    status: string
  }>
  available_sources: string[]
}
