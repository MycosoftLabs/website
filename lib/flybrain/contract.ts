/**
 * FlyBrain website contract — TypeScript mirror of
 * `mycosoft_mas/flybrain/schemas.py` (spec: docs/FLYBRAIN_MODULE_SEP14_2026.md).
 *
 * Every payload the MAS FlyBrain router returns is SIMULATED output of the
 * FlyWire v783 whole-brain LIF model (Shiu et al. 2024). Nothing here is a
 * biological measurement, and nothing on the website side ever fabricates a
 * detection, a rate, a probability, or a green status: a missing connectome,
 * detector or session is rendered as exactly that.
 *
 * Keep this file in lock-step with schemas.py. Do not add fields the MAS side
 * does not send.
 */

export const FLYBRAIN_SCHEMA_VERSION = "flybrain/v1"
export const FLYBRAIN_ORIGIN_SIMULATED = "SIMULATED"

/** Same-origin BFF mount. The browser never talks to MAS 188 directly. */
export const FLYBRAIN_BFF_BASE = "/api/fusarium/flybrain"
/** MAS router prefix the BFF forwards to. */
export const FLYBRAIN_MAS_PREFIX = "/api/flybrain"

export type PlugName = "standalone" | "droid" | "earthsim" | "nlm" | "itdx"
export type BackendName = "auto" | "numpy" | "torch"
export type ObservationKind = "detections" | "telemetry" | "earthsim" | "nlm" | "itdx_slice" | "raw_rates"
export type ChannelStatus = "SCORED" | "UNQUALIFIED" | "NOT_SUPPLIED"
export type SessionStatus = "ready" | "running" | "stopped" | "error"
export type HealthStatus = "healthy" | "degraded" | "unavailable"
export type NeuronRole = "sensory" | "motor" | "interneuron" | "custom"

// ---------------------------------------------------------------------------
// Atlas
// ---------------------------------------------------------------------------

export interface NeuronGroupSummary {
  name: string
  role?: NeuronRole
  description?: string
  size?: number
  derived?: boolean
  missing_ids?: number[]
  [key: string]: unknown
}

export interface AtlasSummary {
  schema_version: string
  source: Record<string, unknown>
  groups: NeuronGroupSummary[]
  sensorimotor: Record<string, unknown>
  connectome_loaded: boolean
}

// ---------------------------------------------------------------------------
// Stimulation / observations (inputs)
// ---------------------------------------------------------------------------

export interface StimulusCommand {
  group?: string | null
  flywire_ids?: number[] | null
  /** 0..2000 Hz Poisson drive. */
  rate_hz?: number
  mode?: "poisson" | "silence" | "unsilence" | "clear"
}

export interface Observation {
  kind: ObservationKind
  payload?: Record<string, unknown>
  t_ms?: number | null
  source?: string
}

// ---------------------------------------------------------------------------
// Vision
// ---------------------------------------------------------------------------

export interface Taxon {
  taxon_id: string | null
  scientific_name: string | null
  rank: string | null
  source: string
  matched: boolean
  note: string
}

export interface GeoPoint {
  lat: number
  lon: number
}

export interface Detection {
  id: string
  cls: string
  conf: number
  bbox_xyxy: [number, number, number, number]
  bbox_norm?: [number, number, number, number] | null
  source: string
  track_id?: string | null
  category: string
  taxon?: Taxon | null
  bearing_deg?: number | null
  range_m?: number | null
  range_source?: "measured" | "estimate" | null
  location?: GeoPoint | null
  /** [[lon, lat], ...] closed ring — only when range is known. */
  perimeter?: number[][] | null
  /** [[lon, lat], ...] track history. */
  pathway?: number[][] | null
  attributes: Record<string, unknown>
}

export interface DetectionFrame {
  schema_version: string
  t_ms: number | null
  frame_w: number | null
  frame_h: number | null
  engine: string | null
  model: string | null
  device: string | null
  sahi: boolean
  slices: number
  license: string | null
  /** false = no detector on MAS 188; `detections` is then always empty. */
  available: boolean
  detections: Detection[]
  note: string
  source: string
}

export interface VisionHealth {
  available: boolean
  engine: string | null
  model: string | null
  weights_path: string | null
  device: string | null
  sahi: boolean
  sahi_impl: string | null
  remote_url: string | null
  reason: string
}

// ---------------------------------------------------------------------------
// Brain state and actions (outputs)
// ---------------------------------------------------------------------------

export interface BrainState {
  schema_version: string
  origin: string
  session_id: string
  t_ms: number
  step: number
  n_neurons: number
  n_active: number
  spike_count_window: number
  window_ms: number
  /** group name -> mean Hz per neuron over the last window (simulated). */
  rates_hz: Record<string, number>
  stimulated_hz: Record<string, number>
  silenced: string[]
  backend: string
  realtime_ratio: number | null
  subgraph: Record<string, unknown> | null
}

export interface MotorAction {
  kind: "locomotion" | "attention" | "none"
  forward: number
  /** negative = left */
  turn: number
  heading_delta_deg: number
  throttle_pct: number
  target_bearing_deg: number | null
  confidence: number
  evidence: Record<string, unknown>
  note: string
}

export interface Waypoint {
  lat: number
  lon: number
  hold_seconds: number
  note: string
}

export interface NavPath {
  schema_version: string
  start: GeoPoint | null
  goal: GeoPoint | null
  waypoints: Waypoint[]
  geojson: Record<string, unknown> | null
  blocked_cells: number
  total_cells: number
  cost: number | null
  feasible: boolean
  turn_bias: number
  note: string
}

/** Same shape as `itdx_api._channel` rows. */
export interface ITDXChannelRow {
  status: ChannelStatus
  agent_id: string | null
  p: number | null
  uncertainty: number | null
  error: string | null
  note: string
  live: Record<string, unknown>
  sources: Array<Record<string, unknown>>
  reason: string | null
  capability_class: string | null
  sample_count: number | null
}

export interface ITDXChannelsRequest {
  map_slice: Record<string, unknown>
  session_id?: string | null
  detections?: DetectionFrame | Record<string, unknown> | null
}

export interface ITDXChannelsResponse {
  schema_version: string
  channels: {
    pathways: ITDXChannelRow
    navigation: ITDXChannelRow
    biology: ITDXChannelRow
    information: ITDXChannelRow
  }
  nav: NavPath | null
  session_id: string | null
}

// ---------------------------------------------------------------------------
// Sessions
// ---------------------------------------------------------------------------

export interface SubgraphSpec {
  seed_groups: string[]
  hops?: number
  min_weight?: number
  max_neurons?: number
}

export interface SessionConfig {
  plug?: PlugName
  backend?: BackendName
  dt_ms?: number
  window_ms?: number
  seed?: number | null
  subgraph?: SubgraphSpec | null
  /** Website sessions are always dry-run; the panel never exposes an actuate switch. */
  dry_run?: boolean
  record?: boolean
  device_id?: string | null
  plug_config?: Record<string, unknown>
  label?: string
}

export interface SessionInfo {
  schema_version: string
  session_id: string
  created_at: string
  config: SessionConfig
  status: SessionStatus
  backend: string
  n_neurons: number
  n_synapses: number
  subgraph: Record<string, unknown> | null
  ticks: number
  t_ms: number
  autopilot: boolean
  error: string | null
  plug: Record<string, unknown>
}

export interface TickRequest {
  observations?: Observation[]
  window_ms?: number | null
  stimuli?: StimulusCommand[]
  act?: boolean
}

export interface TickResult {
  schema_version: string
  origin: string
  session_id: string
  tick: number
  t_ms: number
  brain: BrainState
  action: MotorAction
  nav: NavPath | null
  detections: DetectionFrame | null
  plug: string
  dry_run: boolean
  plug_result: Record<string, unknown>
  avani: Record<string, unknown> | null
  encoded_rates_hz: Record<string, number>
  notes: string[]
  wall_ms: number
}

export interface SpikeRecord {
  session_id: string
  from_ms: number
  to_ms: number
  count: number
  times_ms: number[]
  neuron_indices: number[]
  flywire_ids: number[]
  truncated: boolean
}

export interface AutopilotRequest {
  enabled: boolean
  period_s?: number
}

// ---------------------------------------------------------------------------
// Health
// ---------------------------------------------------------------------------

export interface ConnectomeManifest {
  loaded: boolean
  data_dir: string | null
  completeness_path: string | null
  connectivity_path: string | null
  n_neurons: number
  n_synapses: number
  sha256_ok: boolean | null
  sha256: Record<string, string>
  version: string
  license: string
  reason: string
}

export interface FlyBrainHealth {
  status: HealthStatus
  schema_version: string
  connectome: ConnectomeManifest
  vision: VisionHealth
  backend: string
  torch_available: boolean
  cuda_available: boolean
  sessions: number
  autopilots: number
  plugs: string[]
  note: string
}

// ---------------------------------------------------------------------------
// BFF allow-list (spec §10 endpoint table)
// ---------------------------------------------------------------------------

export type BffMethod = "GET" | "POST" | "DELETE"

export interface BffRoute {
  /** Path template relative to /api/flybrain; `{id}` / `{deviceId}` are validated ids. */
  path: string
  methods: readonly BffMethod[]
}

/** Exactly the MAS `/api/flybrain/*` routes the website BFF will forward. Anything else is 404. */
export const FLYBRAIN_BFF_ROUTES: readonly BffRoute[] = [
  { path: "/health", methods: ["GET"] },
  { path: "/connectome/manifest", methods: ["GET"] },
  { path: "/atlas", methods: ["GET"] },
  { path: "/sessions", methods: ["GET", "POST"] },
  { path: "/sessions/{id}", methods: ["GET", "DELETE"] },
  { path: "/sessions/{id}/tick", methods: ["POST"] },
  { path: "/sessions/{id}/state", methods: ["GET"] },
  { path: "/sessions/{id}/spikes", methods: ["GET"] },
  { path: "/sessions/{id}/stimulate", methods: ["POST"] },
  { path: "/sessions/{id}/reset", methods: ["POST"] },
  { path: "/sessions/{id}/autopilot", methods: ["POST"] },
  { path: "/vision/health", methods: ["GET"] },
  { path: "/vision/detect", methods: ["POST"] },
  { path: "/itdx/channels", methods: ["POST"] },
  { path: "/nlm/observation", methods: ["POST"] },
  { path: "/droid/{deviceId}/guidance", methods: ["GET"] },
] as const

/** Session / device id rule shared by the BFF and the MAS router. */
export const FLYBRAIN_ID_PATTERN = /^[A-Za-z0-9_.:-]{1,64}$/
