export const THREAT_ASSESSMENT_SCHEMA = "fusarium-threat-assessment/v1"

export const INVESTIGATION_MODES = ["live", "replay", "forecast", "simulated"] as const
export const THREAT_TIME_WINDOWS = ["6h", "24h", "72h"] as const
export const OPERATOR_ROLES = ["viewer", "operator", "analyst", "admin"] as const
export const REVIEW_DISPOSITIONS = [
  "Draft",
  "Evidence check",
  "Human review",
  "Approved package",
] as const

export type InvestigationMode = (typeof INVESTIGATION_MODES)[number]
export type ThreatTimeWindow = (typeof THREAT_TIME_WINDOWS)[number]
export type OperatorRole = (typeof OPERATOR_ROLES)[number]
export type ReviewDisposition = (typeof REVIEW_DISPOSITIONS)[number]

export type EnvironmentalDomain =
  | "atmosphere"
  | "water"
  | "land"
  | "living"
  | "infrastructure"
  | "process"

export type AssessmentSeverity =
  | "urgent"
  | "material"
  | "watch"
  | "baseline"
  | "unknown"
  | "unavailable"

export type AssessmentUrgency =
  | "immediate"
  | "within_6h"
  | "within_24h"
  | "monitor"
  | "not_assessed"

export type FreshnessState = "fresh" | "stale" | "unknown" | "simulated"
export type ConfidenceLabel = "high" | "moderate" | "low" | "not_assessed"

export type ThreatCondition =
  | "loading"
  | "empty"
  | "ready"
  | "partial"
  | "stale"
  | "unavailable"
  | "unauthorized"
  | "replay"
  | "forecast"
  | "simulated"

export interface ThreatAssessmentContext {
  missionId: string
  missionLabel: string
  missionAreaId: string
  missionAreaLabel: string
  timeWindow: ThreatTimeWindow
  mode: InvestigationMode
  role: OperatorRole
  operatorId: string
  selectedAssessmentId: string | null
  selectedObjectId: string | null
  selectedEvidenceId: string | null
  selectedSourceId: string | null
  classification: "UNCLASSIFIED"
}

export type ReachabilityState = "checking" | "reached" | "unreachable" | "not_attempted"
export type IdentityState =
  | "not_required"
  | "development_header_unverified"
  | "rejected"
  | "unknown"
export type SchemaState = "valid" | "invalid" | "unknown" | "not_supported"
export type ProvenanceState = "complete" | "partial" | "missing" | "not_applicable" | "unknown"
export type CoverageState = "complete" | "partial" | "collected_empty" | "unknown" | "not_supported"
export type DataPresenceState = "present" | "empty" | "unknown" | "not_applicable"

/**
 * A transport being reachable is deliberately not equivalent to usable data.
 * Every axis is rendered independently in the Source Readiness panel.
 */
export interface EndpointTruth {
  id: string
  label: string
  endpoint: string
  method: "GET" | "POST" | "LOCAL"
  reachability: ReachabilityState
  identity: IdentityState
  schema: SchemaState
  freshness: FreshnessState
  provenance: ProvenanceState
  coverage: CoverageState
  dataPresence: DataPresenceState
  httpStatus: number | null
  recordCount: number | null
  receivedAt: string | null
  note: string
  synthetic: boolean
}

export interface ConfidenceValue {
  score: number | null
  label: ConfidenceLabel
  basis: string
}

export interface ThreatEvidence {
  id: string
  title: string
  summary: string
  sourceId: string
  sourceLabel: string
  sourceRef: string
  objectIds: string[]
  observedAt: string | null
  receivedAt: string | null
  freshness: FreshnessState
  confidence: ConfidenceValue
  integrityState: "unknown" | "unverified" | "verified" | "failed"
  verificationState: "unavailable" | "pending" | "verified" | "failed"
  lineage: string[]
  conflictNote: string | null
  dataMode: string
  synthetic: boolean
}

export interface CausalRelationship {
  id: string
  fromObjectId: string
  toObjectId: string
  relationshipType: string
  label: string
  confidence: ConfidenceValue
  evidenceIds: string[]
  /** True only when the supplied relationship type explicitly uses causal language. */
  explicitlyCausal: boolean
  dataMode: string
  synthetic: boolean
}

export type ExplanationKind = "causal" | "competing" | "context"

export interface AssessmentExplanation {
  id: string
  label: string
  kind: ExplanationKind
  confidence: ConfidenceValue
  evidenceIds: string[]
  note: string
}

export interface ReviewStatus {
  disposition: ReviewDisposition
  backendState: "pending" | "in_review" | "accepted" | "rejected" | "deferred" | null
  updatedAt: string | null
  judgment: string | null
  mappingNote: string
}

export interface EvidenceCompleteness {
  state: "complete" | "partial" | "unknown"
  declared: number | null
  resolved: number | null
  note: string
}

export interface EnvironmentalAssessment {
  id: string
  objectId: string
  name: string
  domain: EnvironmentalDomain
  summary: string
  severity: AssessmentSeverity
  urgency: AssessmentUrgency
  confidence: ConfidenceValue
  uncertainty: string
  forecastHorizon: string | null
  affectedObjectIds: string[]
  affectedSystems: EnvironmentalDomain[]
  missionConsequence: string | null
  evidenceIds: string[]
  evidenceCompleteness: EvidenceCompleteness
  freshness: FreshnessState
  observedAt: string | null
  sourceIds: string[]
  relationshipIds: string[]
  explanations: AssessmentExplanation[]
  review: ReviewStatus
  changedSinceReview: boolean | null
  changedSinceReviewNote: string
  evidenceConflict: "detected" | "unknown"
  evidenceConflictNote: string
  dataMode: string
  synthetic: boolean
  rankBasis: string[]
  contractGaps: string[]
}

export interface AssessmentHistoryEvent {
  id: string
  occurredAt: string | null
  label: string
  detail: string
  objectIds: string[]
  evidenceIds: string[]
  mode: string
  synthetic: boolean
}

export interface ThreatAssessmentSnapshot {
  schema: typeof THREAT_ASSESSMENT_SCHEMA
  context: ThreatAssessmentContext
  generatedAt: string
  condition: ThreatCondition
  classification: "UNCLASSIFIED"
  identityMode: string | null
  identityVerified: boolean | null
  assessments: EnvironmentalAssessment[]
  evidence: ThreatEvidence[]
  relationships: CausalRelationship[]
  history: AssessmentHistoryEvent[]
  sourceTruth: EndpointTruth[]
  gaps: string[]
  note: string
}

export interface ThreatAssessmentProvider {
  load(context: ThreatAssessmentContext, signal?: AbortSignal): Promise<ThreatAssessmentSnapshot>
}

export const DOMAIN_LABELS: Record<EnvironmentalDomain, string> = {
  atmosphere: "Air / atmosphere",
  water: "Water",
  land: "Land / soil",
  living: "Living systems",
  infrastructure: "Infrastructure",
  process: "Environmental process",
}

export function confidenceFromUnknown(value: unknown): ConfidenceValue {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { score: null, label: "not_assessed", basis: "Confidence was not supplied." }
  }
  const record = value as Record<string, unknown>
  const score = typeof record.score === "number" && record.score >= 0 && record.score <= 1
    ? record.score
    : null
  const label = record.label
  const normalizedLabel: ConfidenceLabel =
    score !== null && ["high", "moderate", "low"].includes(String(label))
      ? (label as ConfidenceLabel)
      : "not_assessed"
  return {
    score,
    label: normalizedLabel,
    basis:
      typeof record.basis === "string" && record.basis.trim()
        ? record.basis.trim()
        : score === null
          ? "Confidence was not supplied."
          : normalizedLabel === "not_assessed"
            ? "A score was supplied without a valid qualitative label; no label was inferred."
            : "Score supplied without a confidence basis.",
  }
}

export function reviewDispositionForBackendState(
  state: ReviewStatus["backendState"],
): ReviewDisposition {
  if (state === "pending" || state === "deferred") return "Evidence check"
  if (state === "in_review") return "Human review"
  if (state === "accepted") return "Approved package"
  return "Draft"
}

export function rankEnvironmentalAssessments(
  assessments: readonly EnvironmentalAssessment[],
): EnvironmentalAssessment[] {
  const severity: Record<AssessmentSeverity, number> = {
    urgent: 5,
    material: 4,
    watch: 3,
    baseline: 2,
    unknown: 1,
    unavailable: 0,
  }
  const urgency: Record<AssessmentUrgency, number> = {
    immediate: 4,
    within_6h: 3,
    within_24h: 2,
    monitor: 1,
    not_assessed: 0,
  }
  return [...assessments].sort((left, right) => {
    const leftScore =
      severity[left.severity] * 100 +
      urgency[left.urgency] * 10 +
      (left.evidenceConflict === "detected" ? 4 : 0) +
      (left.changedSinceReview === true ? 2 : 0) +
      (left.missionConsequence ? 1 : 0)
    const rightScore =
      severity[right.severity] * 100 +
      urgency[right.urgency] * 10 +
      (right.evidenceConflict === "detected" ? 4 : 0) +
      (right.changedSinceReview === true ? 2 : 0) +
      (right.missionConsequence ? 1 : 0)
    return rightScore - leftScore || left.name.localeCompare(right.name)
  })
}


