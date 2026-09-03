export const SITUATIONAL_AWARENESS_SCHEMA = "fusarium-situational-awareness/v1"

export const ENVIRONMENTAL_DOMAINS = [
  "atmosphere",
  "water",
  "land",
  "living",
  "infrastructure",
  "process",
] as const

export type EnvironmentalDomain = (typeof ENVIRONMENTAL_DOMAINS)[number]
export type SituationalDataMode = "system" | "demo"
export type SituationalTimeWindow = "6h" | "24h" | "72h"
export type SituationalView = "map" | "earth" | "list" | "timeline"
export type FormSpacePresentation = "model" | "compare" | "interaction"
export type SituationalCondition =
  | "loading"
  | "empty"
  | "partial"
  | "stale"
  | "error"
  | "unauthorized"
  | "ready"
  | "simulated"

export type SourceState =
  | "loading"
  | "live"
  | "empty"
  | "stale"
  | "degraded"
  | "unauthorized"
  | "unreachable"
  | "simulated"

export type FreshnessState = "fresh" | "stale" | "unknown" | "simulated"
export type ConfidenceLabel = "high" | "moderate" | "low" | "not_assessed"
export type ObjectSeverity = "baseline" | "watch" | "material" | "urgent" | "unknown"
export type ObjectKind = "sensor" | "change" | "track" | "process" | "area"
export type TrendDirection = "rising" | "falling" | "steady" | "mixed" | "not_assessed"

export interface SituationalContext {
  missionAreaId: string
  missionAreaLabel: string
  timeWindow: SituationalTimeWindow
  dataMode: SituationalDataMode
  view: SituationalView
  selectedModelId: string
  formSpacePresentation: FormSpacePresentation
  selectedObjectId: string | null
  selectedEvidenceId: string | null
  sourceId: string | null
  classification: "UNCLASSIFIED"
}

export interface Position {
  /** Normalized display coordinates. These are not asserted geographic coordinates. */
  x: number
  y: number
  latitude?: number
  longitude?: number
}

export interface ComparisonPoint {
  label: string
  value: number | null
  unit?: string
  state: "observed" | "forecast" | "unavailable" | "simulated"
}

export interface EvidenceRecord {
  id: string
  title: string
  sourceId: string
  sourceLabel: string
  sourceRef: string
  summary: string
  observedAt: string | null
  receivedAt: string
  confidence: number | null
  confidenceLabel: ConfidenceLabel
  freshness: FreshnessState
  staleAfterSeconds: number | null
  freshnessBasis: string
  lineage: string[]
  classification: "UNCLASSIFIED"
  synthetic: boolean
}

export interface EnvironmentalObject {
  id: string
  kind: ObjectKind
  name: string
  domain: EnvironmentalDomain
  summary: string
  locationLabel: string | null
  position: Position | null
  observedAt: string | null
  receivedAt: string
  freshness: FreshnessState
  staleAfterSeconds: number | null
  freshnessBasis: string
  confidence: number | null
  confidenceLabel: ConfidenceLabel
  severity: ObjectSeverity
  trend: TrendDirection
  statusLabel: string
  sourceIds: string[]
  evidenceIds: string[]
  relationshipIds: string[]
  missionConsequence: string | null
  history: ComparisonPoint[]
  current: ComparisonPoint | null
  forecast: ComparisonPoint[]
  classification: "UNCLASSIFIED"
  synthetic: boolean
}

export interface EnvironmentalRelationship {
  id: string
  fromId: string
  toId: string
  type: string
  label: string
  confidence: number | null
  evidenceIds: string[]
  synthetic: boolean
}

export interface DomainState {
  id: EnvironmentalDomain
  label: string
  observedObjectCount: number
  coverage: "observed" | "gap" | "not_bound" | "simulated"
  trend: TrendDirection
  samples: number[]
  note: string
}

export interface SourceStatus {
  id: string
  label: string
  endpoint: string
  state: SourceState
  httpStatus: number | null
  receivedAt: string | null
  observedAt: string | null
  recordCount: number | null
  /** Minimal top-level response-shape validation; not a claim that every record is semantically valid. */
  schemaValid: boolean | null
  /** Whether the response envelope/records satisfy the UNCLASSIFIED-only display policy. */
  classificationAccepted: boolean | null
  /** Transport succeeded and both the minimal shape and classification checks passed. */
  responseAccepted: boolean
  synthetic: boolean
  note: string
}

export interface WatchArea {
  id: string
  name: string
  description: string
  polygon: Array<{ x: number; y: number }>
  status: "active" | "unconfigured" | "simulated"
  synthetic: boolean
}

export interface WatchCondition {
  id: string
  label: string
  status: "holding" | "met" | "unconfigured" | "simulated"
  rule: string
  consequence: string
  objectIds: string[]
  synthetic: boolean
}

export interface SituationalSnapshot {
  schema: typeof SITUATIONAL_AWARENESS_SCHEMA
  context: SituationalContext
  generatedAt: string
  condition: SituationalCondition
  classification: "UNCLASSIFIED"
  sources: SourceStatus[]
  objects: EnvironmentalObject[]
  evidence: EvidenceRecord[]
  relationships: EnvironmentalRelationship[]
  domains: DomainState[]
  watchAreas: WatchArea[]
  watchConditions: WatchCondition[]
  gaps: string[]
  note: string
}

export interface SituationalAwarenessProvider {
  load(context: SituationalContext, signal?: AbortSignal): Promise<SituationalSnapshot>
}

export const DOMAIN_LABELS: Record<EnvironmentalDomain, string> = {
  atmosphere: "Atmosphere",
  water: "Water",
  land: "Land / soil",
  living: "Living systems",
  infrastructure: "Infrastructure",
  process: "Processes",
}

export function confidenceLabel(score: number | null): ConfidenceLabel {
  if (score === null) return "not_assessed"
  if (score >= 0.8) return "high"
  if (score >= 0.55) return "moderate"
  return "low"
}

export function isStale(observedAt: string | null, staleAfterSeconds: number, nowMs: number): boolean {
  if (!observedAt) return false
  const observedMs = Date.parse(observedAt)
  return Number.isFinite(observedMs) && nowMs - observedMs > staleAfterSeconds * 1000
}

export function deriveCondition(
  sources: readonly SourceStatus[],
  objects: readonly EnvironmentalObject[],
): SituationalCondition {
  if (sources.some((source) => source.synthetic)) return "simulated"
  const reachable = sources.filter((source) => ["live", "empty", "stale"].includes(source.state))
  if (reachable.length === 0 && sources.some((source) => source.state === "unauthorized")) {
    return "unauthorized"
  }
  if (reachable.length === 0) return "error"
  if (reachable.length !== sources.length) return "partial"
  if (objects.length === 0) return "empty"
  if (objects.every((object) => object.freshness === "stale")) {
    return "stale"
  }
  if (objects.some((object) => object.freshness !== "fresh")) return "partial"
  return "ready"
}

export function emptyDomains(note = "No records were supplied for this domain."): DomainState[] {
  return ENVIRONMENTAL_DOMAINS.map((id) => ({
    id,
    label: DOMAIN_LABELS[id],
    observedObjectCount: 0,
    coverage: "gap",
    trend: "not_assessed",
    samples: [],
    note,
  }))
}
