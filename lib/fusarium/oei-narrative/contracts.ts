export const OEI_NARRATIVE_SCHEMA = "fusarium-oei-narrative/v1"

export const OEI_MODES = ["live", "replay", "forecast", "simulated"] as const
export const OEI_TIME_WINDOWS = ["6h", "24h", "72h"] as const
export const OEI_ROLES = ["viewer", "operator", "analyst", "admin"] as const

export type OeiMode = (typeof OEI_MODES)[number]
export type OeiTimeWindow = (typeof OEI_TIME_WINDOWS)[number]
export type OeiRole = (typeof OEI_ROLES)[number]
export type OeiWorkflowStage = "draft" | "evidence_check" | "human_review" | "approved_package"
export type OeiCondition =
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

export type OeiTransportState = "reachable" | "unreachable" | "unauthorized" | "unknown" | "not_applicable"
export type OeiDimensionState = "verified" | "valid" | "present" | "partial" | "empty" | "stale" | "unknown" | "unavailable" | "unverified" | "not_applicable"

export interface OeiContext {
  missionId: string
  missionLabel: string
  contextId: string | null
  missionAreaId: string
  missionAreaLabel: string
  timeWindow: OeiTimeWindow
  mode: OeiMode
  selectedObjectId: string | null
  selectedEvidenceId: string | null
  selectedSourceId: string | null
  role: OeiRole
  operatorId: string
  classification: "UNCLASSIFIED"
}

export interface OeiSourceAssessment {
  id: string
  label: string
  endpoint: string
  transport: OeiTransportState
  httpStatus: number | null
  identityMode: string
  identityVerified: false
  schema: OeiDimensionState
  freshness: OeiDimensionState
  provenance: OeiDimensionState
  coverage: OeiDimensionState
  dataPresence: OeiDimensionState
  receivedAt: string | null
  observedAt: string | null
  recordCount: number | null
  synthetic: boolean
  note: string
}

export interface V1Page<T> {
  items: T[]
  page: { nextCursor: string | null; hasMore: boolean; limit: number }
}

export interface V1Mission {
  id: string
  namespace: "operational" | "demo"
  name: string
  description: string
  status: "draft" | "active" | "paused" | "complete" | "archived"
  selectedContextId: string | null
  revision: number
  createdAt: string
  updatedAt: string
  classification: "UNCLASSIFIED"
}

export interface V1Bounds {
  boundingBox?: { west: number; south: number; east: number; north: number } | null
  polygon?: { points: Array<{ latitude: number; longitude: number }> } | null
  label?: string | null
}

export interface V1MissionArea {
  id: string
  namespace: "operational" | "demo"
  name: string
  description: string
  bounds: V1Bounds | null
  revision: number
  createdAt: string
  updatedAt: string
  classification: "UNCLASSIFIED"
}

export interface V1MissionContext {
  id: string
  namespace: "operational" | "demo"
  missionId: string
  missionAreaId: string
  missionAreaLabel: string | null
  timeRange: { start: string; end: string }
  timeWindow: OeiTimeWindow | null
  dataMode: "live" | "recorded" | "replay" | "simulated" | "unavailable" | "degraded"
  selectedObjectId: string | null
  selectedEvidenceId: string | null
  selectedSourceId: string | null
  sourceApplication: string | null
  operatorId: string
  operatorRole: string
  revision: number
  createdAt: string
  updatedAt: string
  classification: "UNCLASSIFIED"
}

export interface V1Confidence {
  score: number | null
  label: "high" | "moderate" | "low" | "not_assessed"
  basis: string
}

export interface V1Freshness {
  observedAt: string | null
  receivedAt: string
  staleAfterSeconds: number | null
  state: "fresh" | "stale" | "unknown" | "simulated"
  basis: "source_timestamp" | "receipt_timestamp" | "replay_clock" | "scenario_clock" | "unavailable"
}

export interface V1EnvironmentalChange {
  id: string
  field: string
  direction: "rising" | "falling" | "steady" | "mixed" | "not_assessed"
  previousValue: unknown
  currentValue: unknown
  unit: string | null
  observedAt: string | null
  evidenceIds: string[]
  classification: "UNCLASSIFIED"
}

export interface V1SourceReadiness {
  id: string
  namespace: "operational" | "demo"
  label: string
  sourceType: string
  endpointRef: string | null
  state: "unconfigured" | "configured" | "verified" | "live" | "degraded" | "unauthorized" | "unreachable" | "stale"
  configured: boolean
  verified: boolean
  live: boolean
  observedAt: string | null
  receivedAt: string
  lastSuccessAt: string | null
  staleAfterSeconds: number | null
  recordCount: number | null
  dataMode: "live" | "recorded" | "replay" | "simulated" | "unavailable" | "degraded"
  synthetic: boolean
  reason: string
  revision: number
  classification: "UNCLASSIFIED"
}

export interface V1EnvironmentalObject {
  id: string
  namespace: "operational" | "demo"
  missionId: string
  missionAreaId: string
  objectType: "sensor" | "change" | "track" | "process" | "area"
  domain: "atmosphere" | "water" | "land" | "living" | "infrastructure" | "process"
  name: string
  summary: string
  spatialBounds: V1Bounds | null
  temporalBounds: { start: string; end: string | null }
  status: "baseline" | "watch" | "material" | "urgent" | "unknown" | "unavailable"
  relationshipIds: string[]
  changes: V1EnvironmentalChange[]
  trend: "rising" | "falling" | "steady" | "mixed" | "not_assessed"
  missionConsequence: string | null
  confidence: V1Confidence
  freshness: V1Freshness
  sourceIds: string[]
  evidenceIds: string[]
  provenanceRef: string
  dataMode: "live" | "recorded" | "replay" | "simulated" | "unavailable" | "degraded"
  synthetic: boolean
  revision: number
  classification: "UNCLASSIFIED"
}

export interface V1EnvironmentalRelationship {
  id: string
  namespace: "operational" | "demo"
  missionId: string
  fromObjectId: string
  toObjectId: string
  relationshipType: string
  label: string
  confidence: V1Confidence
  evidenceIds: string[]
  dataMode: "live" | "recorded" | "replay" | "simulated" | "unavailable" | "degraded"
  synthetic: boolean
  revision: number
  classification: "UNCLASSIFIED"
}

export interface V1EvidenceRecord {
  id: string
  namespace: "operational" | "demo"
  missionId: string
  missionAreaId: string
  objectIds: string[]
  sourceId: string
  title: string
  summary: string
  sourceRef: string
  lineage: {
    sourceRecordIds: string[]
    parentEvidenceIds: string[]
    transformations: Array<{
      id: string
      name: string
      version: string
      inputRefs: string[]
      parameters: Record<string, unknown>
      performedAt: string
      actorRef: string | null
      classification: "UNCLASSIFIED"
    }>
  }
  observedAt: string | null
  receivedAt: string
  confidence: V1Confidence
  confidenceBasis: string
  integrityState: "unknown" | "unverified" | "verified" | "failed"
  verificationState: "unavailable" | "pending" | "verified" | "failed"
  integrityRef: string | null
  dataMode: "live" | "recorded" | "replay" | "simulated" | "unavailable" | "degraded"
  synthetic: boolean
  metadata: Record<string, unknown>
  revision: number
  classification: "UNCLASSIFIED"
}

export interface V1ReviewItem {
  id: string
  namespace: "operational" | "demo"
  missionId: string
  kind: "observation" | "evidence" | "environmental_judgment"
  state: "pending" | "in_review" | "accepted" | "rejected" | "deferred"
  objectIds: string[]
  evidenceIds: string[]
  requestedBy: string
  assignedTo: string | null
  judgment: string | null
  dataMode: "live" | "recorded" | "replay" | "simulated" | "unavailable" | "degraded"
  synthetic: boolean
  revision: number
  createdAt: string
  updatedAt: string
  classification: "UNCLASSIFIED"
}

export interface V1ActivityRecord {
  id: string
  sequence: number
  namespace: "operational" | "demo"
  missionId: string
  missionContextId: string | null
  actorId: string
  actorRole: string
  occurredAt: string
  actionType: string
  objectIds: string[]
  evidenceIds: string[]
  beforeState: Record<string, unknown> | null
  afterState: Record<string, unknown> | null
  judgment: string | null
  auditMetadata: Record<string, unknown>
  dataMode: "live" | "recorded" | "replay" | "simulated" | "unavailable" | "degraded"
  appendOnly: true
  classification: "UNCLASSIFIED"
}

export interface V1ContextHandoff {
  id: string
  namespace: "operational" | "demo"
  contextId: string
  missionId: string
  missionAreaId: string
  missionAreaLabel: string
  timeRange: { start: string; end: string }
  timeWindow: OeiTimeWindow | null
  dataMode: "live" | "recorded" | "replay" | "simulated" | "unavailable" | "degraded"
  selectedObjectId: string | null
  selectedEvidenceId: string | null
  selectedSourceId: string | null
  operatorId: string
  operatorRole: string
  sourceApplication: string
  targetApplication: string
  revision: number
  createdAt: string
  classification: "UNCLASSIFIED"
}

export interface OeiClaim {
  id: string
  text: string
  objectIds: string[]
  evidenceIds: string[]
  confidence: V1Confidence
  uncertainty: string
  caveats: string[]
  competingExplanations: string[]
  changedSincePrevious: boolean
  authoringBasis: "source_summary" | "operator_entered" | "sanitized_fixture"
}

export interface OeiClaimAssessment {
  claimId: string
  state: "supported" | "caveated" | "blocked"
  missingEvidenceIds: string[]
  reasons: string[]
}

export interface OeiNarrativeVersion {
  id: string
  ordinal: number
  label: string
  createdAt: string
  createdBy: string
  stage: OeiWorkflowStage
  title: string
  executiveSummary: string
  claims: OeiClaim[]
  immutable: boolean
  synthetic: boolean
}

export interface OeiPublicationRecord {
  id: string
  versionId: string
  packageLabel: string
  approvedAt: string
  approvedBy: string
  releaseMarking: "UNCLASSIFIED"
  releaseScope: "PREVIEW ONLY · NO EXTERNAL DELIVERY"
  immutable: boolean
  synthetic: boolean
}

export interface OeiNarrativeSnapshot {
  schema: typeof OEI_NARRATIVE_SCHEMA
  context: OeiContext
  condition: OeiCondition
  generatedAt: string
  identityMode: string
  identityVerified: false
  persistence: "unavailable" | "browser_local" | "sanitized_fixture"
  persistenceNote: string
  mission: V1Mission | null
  missionArea: V1MissionArea | null
  missionContext: V1MissionContext | null
  availableMissions: V1Mission[]
  availableMissionAreas: V1MissionArea[]
  availableContexts: V1MissionContext[]
  sourceRecords: V1SourceReadiness[]
  objects: V1EnvironmentalObject[]
  relationships: V1EnvironmentalRelationship[]
  evidence: V1EvidenceRecord[]
  reviews: V1ReviewItem[]
  activity: V1ActivityRecord[]
  handoffs: V1ContextHandoff[]
  claims: OeiClaim[]
  versions: OeiNarrativeVersion[]
  publicationHistory: OeiPublicationRecord[]
  sources: OeiSourceAssessment[]
  gaps: string[]
  note: string
}

function unique(values: readonly string[]): string[] {
  return [...new Set(values.filter(Boolean))]
}

export function assessClaim(
  claim: OeiClaim,
  evidence: readonly V1EvidenceRecord[],
  objects: readonly V1EnvironmentalObject[],
): OeiClaimAssessment {
  const evidenceById = new Map(evidence.map((item) => [item.id, item]))
  const objectIds = new Set(objects.map((item) => item.id))
  const missingEvidenceIds = unique(claim.evidenceIds).filter((id) => !evidenceById.has(id))
  const missingObjectIds = unique(claim.objectIds).filter((id) => !objectIds.has(id))
  const reasons: string[] = []

  if (!claim.text.trim()) reasons.push("Claim wording is empty.")
  if (claim.objectIds.length === 0) reasons.push("No supporting environmental object is linked.")
  if (claim.evidenceIds.length === 0) reasons.push("No evidence is linked.")
  if (missingEvidenceIds.length > 0) reasons.push("One or more evidence references do not resolve.")
  if (missingObjectIds.length > 0) reasons.push("One or more supporting environmental objects do not resolve.")
  const resolved = claim.evidenceIds.map((id) => evidenceById.get(id)).filter(Boolean) as V1EvidenceRecord[]
  const untracedObjectIds = unique(claim.objectIds).filter(
    (objectId) => !resolved.some((item) => item.objectIds.includes(objectId)),
  )
  if (untracedObjectIds.length > 0) {
    reasons.push("One or more supporting objects are not traced by any linked evidence record.")
  }
  if (resolved.some((item) => !item.sourceRef || !item.lineage)) {
    reasons.push("One or more linked evidence records lacks a source reference or lineage object.")
  }
  if (resolved.some((item) => item.verificationState === "failed" || item.integrityState === "failed")) {
    reasons.push("Linked evidence contains a failed verification or integrity state.")
  }
  if (reasons.length > 0) {
    return { claimId: claim.id, state: "blocked", missingEvidenceIds, reasons }
  }
  const caveated =
    resolved.some((item) => item.verificationState !== "verified" || item.integrityState !== "verified") ||
    claim.confidence.score === null ||
    Boolean(claim.uncertainty.trim()) ||
    claim.caveats.length > 0
  return {
    claimId: claim.id,
    state: caveated ? "caveated" : "supported",
    missingEvidenceIds: [],
    reasons: caveated
      ? ["Evidence resolves, but confidence, verification, integrity, uncertainty, or caveats require human review."]
      : ["Every evidence and object reference resolves without a failed verification state."],
  }
}

export function workflowBlockers(
  stage: OeiWorkflowStage,
  claims: readonly OeiClaim[],
  evidence: readonly V1EvidenceRecord[],
  objects: readonly V1EnvironmentalObject[],
  reviews: readonly V1ReviewItem[],
  durablePublicationAvailable: boolean,
): string[] {
  if (stage === "draft") return []
  if (claims.length === 0) return ["At least one evidence-linked claim is required."]
  const assessments = claims.map((claim) => assessClaim(claim, evidence, objects))
  const blocked = assessments.filter((assessment) => assessment.state === "blocked")
  const blockers: string[] = blocked.length > 0 ? [`${blocked.length} claim${blocked.length === 1 ? " is" : "s are"} blocked by missing or failed evidence.`] : []
  const claimObjectIds = unique(claims.flatMap((claim) => claim.objectIds))
  const claimEvidenceIds = unique(claims.flatMap((claim) => claim.evidenceIds))
  const scopedJudgmentReviews = reviews.filter(
    (review) =>
      review.kind === "environmental_judgment" &&
      claimObjectIds.every((id) => review.objectIds.includes(id)) &&
      claimEvidenceIds.every((id) => review.evidenceIds.includes(id)),
  )
  if (stage === "human_review" || stage === "approved_package") {
    const assigned = scopedJudgmentReviews.some((review) => Boolean(review.assignedTo))
    if (!assigned) blockers.push("No assigned human environmental-judgment review covers every claim object and evidence reference.")
  }
  if (stage === "approved_package") {
    const accepted = scopedJudgmentReviews.some((review) => review.state === "accepted")
    if (!accepted) blockers.push("No accepted human environmental-judgment review covers this claim and evidence package.")
    if (!durablePublicationAvailable) blockers.push("Narrative publication persistence is unavailable; package approval remains preview-only.")
  }
  return blockers
}

export function deriveChangedClaimIds(
  current: readonly OeiClaim[],
  previous: readonly OeiClaim[],
): Set<string> {
  const previousById = new Map(previous.map((claim) => [claim.id, claim]))
  const changed = new Set<string>()
  for (const claim of current) {
    const before = previousById.get(claim.id)
    if (!before || JSON.stringify({ text: before.text, objectIds: before.objectIds, evidenceIds: before.evidenceIds, uncertainty: before.uncertainty, caveats: before.caveats, competingExplanations: before.competingExplanations }) !== JSON.stringify({ text: claim.text, objectIds: claim.objectIds, evidenceIds: claim.evidenceIds, uncertainty: claim.uncertainty, caveats: claim.caveats, competingExplanations: claim.competingExplanations })) {
      changed.add(claim.id)
    }
  }
  return changed
}
