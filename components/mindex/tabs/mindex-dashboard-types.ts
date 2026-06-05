import type { LucideIcon } from "lucide-react"

export type WidgetSection =
  | "overview"
  | "data"
  | "library"
  | "encyclopedia"
  | "pipeline"
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
  kingdom?: string | null
  lineage?: string[] | null
  lineage_ids?: string[] | null
  common_name?: string
  authority?: string
  description?: string
  source: string
  external_ids?: Record<string, string | number | null | undefined> | null
  obs_count?: number
  image_count?: number
  video_count?: number
  audio_count?: number
  genome_count?: number
  compound_link_count?: number
  interaction_count?: number
  publication_count?: number
  characteristic_count?: number
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
  sync_interval_hours?: number
  max_records_per_source?: number
  recent_syncs?: Array<{
    source: string
    data_type: string
    records_count: number
    errors_count: number
    completed_at: string
    status: string
  }>
  available_sources?: string[]
  jobs?: EtlJobInfo[]
  core_counts?: Record<string, number>
  active_runs?: Array<Record<string, unknown>>
}

export interface EtlJobInfo {
  name: string
  source: string
  description: string
  priority?: number
  interval_hours?: number | null
}

export interface MindexConsole {
  data_source?: string
  timestamp?: string
  error?: string
  stats?: MINDEXStats & {
    taxa_by_source?: Record<string, number>
    observations_by_source?: Record<string, number>
  }
  etl?: ETLStatus & {
    jobs?: EtlJobInfo[]
    job_count?: number
    docker_etl_containers?: boolean
    scheduler_note?: string
  }
  storage?: {
    nas_mount_path?: string
    nas_host?: string
    nas_writable?: boolean
    nas?: {
      available?: boolean
      total_gb?: number
      used_gb?: number
      free_gb?: number
      usage_pct?: number
      mount_path?: string
      error?: string
    }
  }
  earth?: {
    domains?: Record<string, number>
    total_entities?: number
  }
  images?: {
    total_taxa?: number
    taxa_with_images?: number
    taxa_without_images?: number
    coverage_percent?: number
  }
  recent_runs?: Array<Record<string, unknown>>
}

export interface MindexFieldDevice {
  id: string
  registry_id?: string | null
  name: string
  type?: string | null
  role?: string | null
  status?: string | null
  location?: { lat: number; lon: number } | null
  location_label?: string | null
  lastSeen?: string | null
  telemetry?: Record<string, unknown> | null
  source?: string | null
  agent_url?: string | null
  host?: string | null
  port?: string | number | null
}

export interface MindexFieldDeviceSummary {
  success?: boolean
  devices: MindexFieldDevice[]
  count: number
  sources?: {
    mas?: number
    operator?: number
    field_deployments?: number
  }
  mas_url?: string
  timestamp?: string
  error?: string
}
