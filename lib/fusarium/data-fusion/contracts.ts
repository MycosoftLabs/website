export const DATA_FUSION_SCHEMA = "fusarium-data-fusion/v1"

export const FUSION_STAGES = [
  "source",
  "observation",
  "normalization",
  "fusion_run",
  "environmental_object",
  "assessment",
  "narrative",
] as const

export type FusionStage = (typeof FUSION_STAGES)[number]
export type FusionMode = "live" | "replay" | "forecast" | "simulated"
export type FusionTimeWindow = "6h" | "24h" | "72h"
export type OperatorRole = "viewer" | "operator" | "analyst" | "admin"
export type FusionCondition =
  | "loading"
  | "ready"
  | "empty"
  | "partial"
  | "stale"
  | "degraded"
  | "unauthorized"
  | "unavailable"
  | "replay"
  | "forecast"
  | "simulated"

export type EnvironmentalDomain =
  | "atmosphere"
  | "water"
  | "land"
  | "living"
  | "infrastructure"
  | "process"

export const ENVIRONMENTAL_DOMAINS: readonly EnvironmentalDomain[] = [
  "atmosphere",
  "water",
  "land",
  "living",
  "infrastructure",
  "process",
]

export const DOMAIN_LABELS: Record<EnvironmentalDomain, string> = {
  atmosphere: "Atmosphere",
  water: "Water",
  land: "Land / soil",
  living: "Living systems",
  infrastructure: "Infrastructure",
  process: "Processes",
}

export const FUSION_MODALITIES = [
  "spectral",
  "acoustic",
  "bioelectric",
  "thermal",
  "chemical",
  "mechanical",
] as const

export type FusionModality = (typeof FUSION_MODALITIES)[number]

export const MODALITY_LABELS: Record<FusionModality, string> = {
  spectral: "Spectral",
  acoustic: "Acoustic",
  bioelectric: "Bioelectric",
  thermal: "Thermal",
  chemical: "Chemical",
  mechanical: "Mechanical",
}

export interface FusionContext {
  contextId: string | null
  missionId: string
  missionAreaId: string
  missionAreaLabel: string
  timeWindow: FusionTimeWindow
  timeRange: { start: string; end: string } | null
  mode: FusionMode
  operatorRole: OperatorRole
  selectedNodeId: string | null
  selectedObjectId: string | null
  selectedEvidenceId: string | null
  selectedSourceId: string | null
  classification: "UNCLASSIFIED"
}

export type EndpointReachability =
  | "reachable"
  | "unreachable"
  | "unauthorized"
  | "degraded"
  | "unknown"
  | "simulated"
export type IdentityVerification = "verified" | "unverified" | "rejected" | "unknown" | "simulated"
export type SchemaValidity = "valid" | "invalid" | "unknown" | "simulated"
export type FreshnessState = "fresh" | "stale" | "unknown" | "simulated"
export type ProvenanceState = "traced" | "declared" | "missing" | "unknown" | "simulated"
export type CoverageState =
  | "observed"
  | "partial"
  | "gap"
  | "empty"
  | "unavailable"
  | "degraded"
  | "unknown"
  | "simulated"
export type DataPresence =
  | "present"
  | "empty"
  | "measured_absence"
  | "missing"
  | "unknown"
  | "simulated"

export interface SourceTruth {
  id: string
  label: string
  endpointRef: string | null
  sourceType: string
  endpointReachability: EndpointReachability
  identityVerification: IdentityVerification
  schemaValidity: SchemaValidity
  freshness: FreshnessState
  provenance: ProvenanceState
  coverage: CoverageState
  dataPresence: DataPresence
  observedAt: string | null
  receivedAt: string | null
  recordCount: number | null
  reason: string
  synthetic: boolean
}

export interface ModalityCoverage {
  modality: FusionModality
  label: string
  state: CoverageState
  observedRecords: number | null
  expectedRecords: number | null
  freshness: FreshnessState
  sourceIds: string[]
  gaps: string[]
  synthetic: boolean
}

export type LineageNodeState =
  | "available"
  | "partial"
  | "conflict"
  | "late"
  | "missing"
  | "unavailable"
  | "rejected"
  | "accepted"
  | "pending"
  | "simulated"

export interface NodeFact {
  label: string
  value: string
  state?: "ok" | "warn" | "bad" | "muted" | "simulated"
}

export interface ReviewDisposition {
  state: "pending" | "in_review" | "accepted" | "rejected" | "deferred"
  reviewId: string | null
  revision: number | null
  localOnly: boolean
  judgment: string | null
}

export interface FusionLineageNode {
  id: string
  stage: FusionStage
  label: string
  eyebrow: string
  summary: string
  state: LineageNodeState
  recordRef: string | null
  domain: EnvironmentalDomain | null
  observedAt: string | null
  receivedAt: string | null
  sourceIds: string[]
  objectIds: string[]
  evidenceIds: string[]
  confidence: number | null
  uncertainty: string | null
  contribution: number | null
  modelRef: string | null
  dataMode: FusionMode | "recorded" | "unavailable" | "degraded"
  synthetic: boolean
  facts: NodeFact[]
  disposition: ReviewDisposition | null
}

export interface FusionLineageEdge {
  id: string
  fromId: string
  toId: string
  label: string
  confidence: number | null
  evidenceIds: string[]
  synthetic: boolean
}

export interface CorrelationGroup {
  id: string
  label: string
  state: "correlated" | "conflict" | "unavailable" | "simulated"
  nodeIds: string[]
  evidenceIds: string[]
  basis: string
  synthetic: boolean
}

export interface QueueItem {
  id: string
  kind: "conflict" | "late" | "missing"
  label: string
  detail: string
  nodeIds: string[]
  observedAt: string | null
  synthetic: boolean
}

export interface SourceContribution {
  id: string
  sourceId: string
  label: string
  contribution: number | null
  basis: string
  synthetic: boolean
}

export interface FusionModelState {
  state: "available" | "unavailable" | "simulated"
  name: string | null
  version: string | null
  schemaVersion: string | null
  evaluatedAt: string | null
  basis: string
  synthetic: boolean
}

export interface FusionRun {
  id: string
  state: "queued" | "running" | "complete" | "failed" | "unavailable" | "simulated"
  startedAt: string | null
  completedAt: string | null
  inputNodeIds: string[]
  outputNodeIds: string[]
  modelName: string | null
  modelVersion: string | null
  confidence: number | null
  uncertainty: string | null
  reviewState: ReviewDisposition["state"] | "unavailable"
  reason: string
  dataMode: FusionLineageNode["dataMode"]
  synthetic: boolean
}

export interface TimelineEvent {
  id: string
  at: string | null
  label: string
  detail: string
  nodeIds: string[]
  state: "recorded" | "unknown_time" | "replay" | "forecast" | "simulated"
  synthetic: boolean
}

export interface TransportOutcome<T = unknown> {
  endpoint: string
  ok: boolean
  status: number | null
  receivedAt: string
  payload: T | null
  error: string | null
  schemaValid: boolean | null
}

export interface FusionSnapshot {
  schema: typeof DATA_FUSION_SCHEMA
  generatedAt: string
  context: FusionContext
  condition: FusionCondition
  identityMode: "development_header_unverified" | "unknown" | "simulated"
  operatorId: string
  sourceTruth: SourceTruth[]
  coverage: ModalityCoverage[]
  nodes: FusionLineageNode[]
  edges: FusionLineageEdge[]
  correlations: CorrelationGroup[] | null
  conflicts: QueueItem[] | null
  lateMissing: QueueItem[] | null
  contributions: SourceContribution[] | null
  model: FusionModelState
  runs: FusionRun[] | null
  timeline: TimelineEvent[]
  gaps: string[]
  note: string
}

export interface FusionProvider {
  load(context: FusionContext, signal?: AbortSignal): Promise<FusionSnapshot>
}

export function emptyCoverage(
  reason = "No coverage record was returned for this environmental modality.",
  state: CoverageState = "unavailable",
): ModalityCoverage[] {
  return FUSION_MODALITIES.map((modality) => ({
    modality,
    label: MODALITY_LABELS[modality],
    state,
    observedRecords: null,
    expectedRecords: null,
    freshness: "unknown",
    sourceIds: [],
    gaps: [reason],
    synthetic: false,
  }))
}

export function dataPresenceFromCount(recordCount: number | null, reachable: boolean): DataPresence {
  if (!reachable) return "unknown"
  if (recordCount === null) return "unknown"
  return recordCount === 0 ? "empty" : "present"
}

export function sourceTruthLabel(value: SourceTruth[keyof Pick<SourceTruth,
  "endpointReachability" | "identityVerification" | "schemaValidity" | "freshness" | "provenance" | "coverage" | "dataPresence"
>]): string {
  return String(value).replaceAll("_", " ")
}

export function stageLabel(stage: FusionStage): string {
  const labels: Record<FusionStage, string> = {
    source: "Source / sensor",
    observation: "Observation",
    normalization: "Normalization",
    fusion_run: "Fusion run",
    environmental_object: "Object / change",
    assessment: "Assessment",
    narrative: "Narrative",
  }
  return labels[stage]
}

export function isReviewCapable(role: OperatorRole): boolean {
  return role === "analyst" || role === "admin"
}
