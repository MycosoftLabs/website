export const COMMAND_CONTROL_SCHEMA = "fusarium-command-control/v1"
export const FUSARIUM_INTELLIGENCE_SCHEMA = "fusarium-intelligence/v1"

export const COMMAND_MODES = ["live", "replay", "forecast", "simulated"] as const
export type CommandMode = (typeof COMMAND_MODES)[number]
export type TimeWindow = "6h" | "24h" | "72h"
export type CommandCondition =
  | "loading"
  | "empty"
  | "ready"
  | "partial"
  | "stale"
  | "unauthorized"
  | "unavailable"
  | "simulated"

export type OperatorRole = "viewer" | "operator" | "analyst" | "admin"
export type V1DataMode =
  | "live"
  | "recorded"
  | "replay"
  | "simulated"
  | "unavailable"
  | "degraded"

export interface TimeRange {
  start: string
  end: string
}

export interface CommandContext {
  missionId: string | null
  contextId: string | null
  missionAreaId: string
  missionAreaLabel: string
  timeWindow: TimeWindow
  timeRange: TimeRange
  mode: CommandMode
  selectedObjectId: string | null
  selectedEvidenceId: string | null
  selectedSourceId: string | null
  selectedDeviceId: string | null
  operatorId: string
  operatorRole: OperatorRole
  classification: "UNCLASSIFIED"
}

export interface PageInfo {
  nextCursor: string | null
  hasMore: boolean
  limit: number
}

export interface Page<T> {
  items: T[]
  page: PageInfo
}

export interface MissionArea {
  id: string
  namespace: "operational" | "demo"
  name: string
  description: string
  revision: number
  classification: "UNCLASSIFIED"
}

export interface Mission {
  id: string
  namespace: "operational" | "demo"
  name: string
  description: string
  status: "draft" | "active" | "paused" | "complete" | "archived"
  selectedContextId: string | null
  revision: number
  classification: "UNCLASSIFIED"
}

export interface MissionContextRecord {
  id: string
  namespace: "operational" | "demo"
  missionId: string
  missionAreaId: string
  missionAreaLabel: string | null
  timeRange: TimeRange
  timeWindow: TimeWindow | null
  dataMode: V1DataMode
  selectedObjectId: string | null
  selectedEvidenceId: string | null
  selectedSourceId: string | null
  sourceApplication: string | null
  operatorId: string
  operatorRole: OperatorRole
  revision: number
  classification: "UNCLASSIFIED"
}

export interface Confidence {
  score: number | null
  label: "high" | "moderate" | "low" | "not_assessed"
  basis: string
}

export interface Freshness {
  observedAt: string | null
  receivedAt: string
  staleAfterSeconds: number | null
  state: "fresh" | "stale" | "unknown" | "simulated"
  basis: string
}

export interface EnvironmentalObject {
  id: string
  namespace: "operational" | "demo"
  missionId: string
  missionAreaId: string
  objectType: "sensor" | "change" | "track" | "process" | "area"
  domain: "atmosphere" | "water" | "land" | "living" | "infrastructure" | "process"
  name: string
  summary: string
  status: "baseline" | "watch" | "material" | "urgent" | "unknown" | "unavailable"
  missionConsequence: string | null
  sourceIds: string[]
  evidenceIds: string[]
  provenanceRef: string
  confidence: Confidence
  freshness: Freshness
  dataMode: V1DataMode
  synthetic: boolean
  classification: "UNCLASSIFIED"
}

export interface EvidenceRecord {
  id: string
  namespace: "operational" | "demo"
  missionId: string
  missionAreaId: string
  objectIds: string[]
  sourceId: string
  title: string
  summary: string
  sourceRef: string
  observedAt: string | null
  receivedAt: string
  confidence: Confidence
  confidenceBasis: string
  integrityState: string
  verificationState: string
  dataMode: V1DataMode
  synthetic: boolean
  classification: "UNCLASSIFIED"
}

export interface Observation {
  id: string
  namespace: "operational" | "demo"
  missionId: string
  missionAreaId: string
  sourceId: string
  domain: EnvironmentalObject["domain"]
  objectIds: string[]
  evidenceIds: string[]
  observedAt: string | null
  receivedAt: string
  payload: Record<string, unknown>
  dataMode: V1DataMode
  synthetic: boolean
  classification: "UNCLASSIFIED"
}

export interface SourceReadiness {
  id: string
  namespace: "operational" | "demo"
  label: string
  sourceType: string
  endpointRef: string | null
  state: string
  configured: boolean
  verified: boolean
  live: boolean
  observedAt: string | null
  receivedAt: string
  lastSuccessAt: string | null
  staleAfterSeconds: number | null
  recordCount: number | null
  dataMode: V1DataMode
  synthetic: boolean
  reason: string
  classification: "UNCLASSIFIED"
}

export interface CoverageRecord {
  id: string
  namespace: "operational" | "demo"
  missionId: string
  missionAreaId: string
  sourceId: string
  domain: EnvironmentalObject["domain"]
  timeRange: TimeRange
  state: "observed" | "partial" | "gap" | "empty" | "unavailable" | "degraded"
  expectedRecords: number | null
  observedRecords: number | null
  gaps: string[]
  sourceState: string
  freshness: Freshness
  dataMode: V1DataMode
  synthetic: boolean
  classification: "UNCLASSIFIED"
}

export interface WatchCondition {
  id: string
  namespace: "operational" | "demo"
  missionId: string
  watchAreaId: string
  label: string
  rule: string
  consequence: string
  status: "active" | "holding" | "met" | "dismissed" | "unconfigured" | "simulated"
  objectIds: string[]
  evidenceIds: string[]
  requiresAnalystReview: boolean
  synthetic: boolean
  revision: number
  classification: "UNCLASSIFIED"
}

export type ReviewState = "pending" | "in_review" | "accepted" | "rejected" | "deferred"
export type ReviewDecision = "accepted" | "rejected" | "deferred"

export interface ReviewItem {
  id: string
  namespace: "operational" | "demo"
  missionId: string
  kind: "observation" | "evidence" | "environmental_judgment"
  state: ReviewState
  objectIds: string[]
  evidenceIds: string[]
  requestedBy: string
  assignedTo: string | null
  judgment: string | null
  dataMode: V1DataMode
  synthetic: boolean
  revision: number
  createdAt: string
  updatedAt: string
  classification: "UNCLASSIFIED"
}

export interface ActivityRecord {
  id: string
  sequence: number
  namespace: "operational" | "demo"
  missionId: string
  missionContextId: string | null
  actorId: string
  actorRole: OperatorRole
  occurredAt: string
  actionType: string
  objectIds: string[]
  evidenceIds: string[]
  beforeState: Record<string, unknown> | null
  afterState: Record<string, unknown> | null
  judgment: string | null
  auditMetadata: Record<string, unknown>
  dataMode: V1DataMode
  appendOnly: true
  classification: "UNCLASSIFIED"
}

export interface ContextHandoff {
  id: string
  namespace: "operational" | "demo"
  contextId: string
  missionId: string
  missionAreaId: string
  missionAreaLabel: string
  timeRange: TimeRange
  timeWindow: TimeWindow | null
  dataMode: V1DataMode
  selectedObjectId: string | null
  selectedEvidenceId: string | null
  selectedSourceId: string | null
  operatorId: string
  operatorRole: OperatorRole
  sourceApplication: string
  targetApplication: string
  revision: number
  createdAt: string
  classification: "UNCLASSIFIED"
}

export interface ComponentReadiness {
  id: string
  state: string
  configured: boolean
  verified: boolean
  required: boolean
  checkedAt: string
  lastSuccessAt: string | null
  dataMode: V1DataMode
  detail: string
  classification: "UNCLASSIFIED"
}

export interface ReadinessResponse {
  schemaRef: string
  status: "ready" | "degraded" | "not_ready"
  service: string
  version: string
  checkedAt: string
  bindExposure: ComponentReadiness
  identity: ComponentReadiness
  storage: ComponentReadiness
  backup: ComponentReadiness
  migrations: {
    state: string
    currentVersion: number
    targetVersion: number
    pending: number[]
    checkedAt: string
  }
  sourceReachability: ComponentReadiness[]
  connectorAuthorization: ComponentReadiness[]
  staging: ComponentReadiness
  identityMode: string
  developmentIdentity: boolean
  demoEnabled: boolean
  classification: "UNCLASSIFIED"
}

export interface ContractRoot {
  schemaRef: string
  service: string
  version: string
  classification: "UNCLASSIFIED"
  identityMode: string
  identityVerified: boolean
  persistence: string
  activityTransport: string
  productionAccredited: boolean
}

export type TransportState = "checking" | "reachable" | "unreachable"
export type IdentityTruth = "verified" | "unverified" | "rejected" | "not_required" | "unknown"
export type SchemaTruth = "valid" | "invalid" | "unknown"
export type DataPresence = "present" | "empty" | "unknown"

export interface EndpointTruth {
  id: string
  label: string
  endpoint: string
  required: boolean
  transport: TransportState
  httpStatus: number | null
  identity: IdentityTruth
  schema: SchemaTruth
  freshness: Freshness["state"]
  provenance: string
  coverage: "covered" | "partial" | "gap" | "unknown" | "simulated"
  dataPresence: DataPresence
  recordCount: number | null
  receivedAt: string | null
  note: string
}

export interface PolicyGate {
  id: string
  label: string
  result: "pass" | "hold" | "unavailable" | "simulated"
  reason: string
}

export interface RecipientRoute {
  id: string
  label: string
  kind: "local-review" | "external-disabled"
  endpoint: string
  identity: string
  schema: string
  readiness: "reviewable" | "blocked" | "unavailable" | "simulated"
  lastAcknowledgment: string | null
  note: string
}

export interface ObservationRecommendation {
  id: string
  label: string
  rationale: string
  objectIds: string[]
  evidenceIds: string[]
  state: "draft" | "review_requested" | "unavailable" | "simulated"
  externalSideEffects: "NONE"
  synthetic: boolean
}

export interface DecisionDisclosure {
  proposedChange: string
  affectedObjectIds: string[]
  evidenceIds: string[]
  policyResult: PolicyGate
  externalSideEffects: string
  requiredHumanApproval: string
}

export interface IntelligencePackagePreview {
  id: string
  title: string
  before: string[]
  proposed: string[]
  evidenceIds: string[]
  objectIds: string[]
  provenance: string[]
  messageReadiness: "local_preview_ready" | "held" | "unavailable" | "simulated"
  externalRelease: "DISABLED"
  exportPreview: Record<string, unknown>
  synthetic: boolean
}

export interface CommandSnapshot {
  schema: typeof COMMAND_CONTROL_SCHEMA
  generatedAt: string
  condition: CommandCondition
  note: string
  context: CommandContext
  contract: ContractRoot | null
  mission: Mission | null
  missionAreas: MissionArea[]
  missions: Mission[]
  contexts: MissionContextRecord[]
  readiness: ReadinessResponse | null
  connectors: ComponentReadiness[]
  sources: SourceReadiness[]
  coverage: CoverageRecord[]
  observations: Observation[]
  objects: EnvironmentalObject[]
  evidence: EvidenceRecord[]
  reviews: ReviewItem[]
  watchConditions: WatchCondition[]
  activity: ActivityRecord[]
  handoffs: ContextHandoff[]
  truth: EndpointTruth[]
  policyGates: PolicyGate[]
  recipients: RecipientRoute[]
  recommendations: ObservationRecommendation[]
  packagePreview: IntelligencePackagePreview
  gaps: string[]
}

export interface ReviewMutation {
  reviewId: string
  expectedRevision: number
  missionId: string
  missionContextId: string | null
  objectIds: string[]
  evidenceIds: string[]
  previousState: ReviewState
  decision: ReviewDecision
  judgment: string
}

export interface ReviewMutationResult {
  review: ReviewItem
  activity: ActivityRecord | null
  warning: string | null
}

export function isPage<T>(value: unknown): value is Page<T> {
  if (!value || typeof value !== "object") return false
  const record = value as Partial<Page<T>>
  return Array.isArray(record.items) && Boolean(record.page && typeof record.page === "object")
}

export function deriveCommandCondition(
  truth: readonly EndpointTruth[],
  recordCount: number,
  mode: CommandMode,
): CommandCondition {
  if (mode === "simulated") return "simulated"
  if (mode === "forecast") return "unavailable"
  if (truth.some((item) => item.transport === "checking")) return "loading"

  const required = truth.filter((item) => item.required)
  const contractRoot = required.find((item) => item.id === "contract-root")
  if (contractRoot && contractRoot.schema !== "valid") {
    return contractRoot.identity === "rejected" ? "unauthorized" : "unavailable"
  }
  const reachable = required.filter((item) => item.transport === "reachable")
  if (reachable.length === 0) {
    return required.some((item) => item.identity === "rejected") ? "unauthorized" : "unavailable"
  }
  if (
    reachable.length !== required.length ||
    required.some((item) => item.schema === "invalid" || item.identity === "rejected")
  ) {
    return "partial"
  }
  if (recordCount === 0) return "empty"
  const recordsWithFreshness = required.filter((item) => item.dataPresence === "present")
  if (recordsWithFreshness.length > 0 && recordsWithFreshness.every((item) => item.freshness === "stale")) {
    return "stale"
  }
  return "ready"
}

export function buildPolicyGates(input: {
  context: CommandContext
  review: ReviewItem | null
  evidence: readonly EvidenceRecord[]
  objects: readonly EnvironmentalObject[]
  readiness: ReadinessResponse | null
}): PolicyGate[] {
  const linkedEvidence = input.review
    ? input.evidence.filter((item) => input.review?.evidenceIds.includes(item.id))
    : []
  const linkedObjects = input.review
    ? input.objects.filter((item) => input.review?.objectIds.includes(item.id))
    : []
  const simulated = input.context.mode === "simulated"
  const identityVerified = Boolean(
    input.readiness?.identity.verified &&
      input.readiness.developmentIdentity === false &&
      input.readiness.identityMode !== "development_header_unverified",
  )

  return [
    {
      id: "classification",
      label: "Trust boundary",
      result: "pass",
      reason: "This surface accepts UNCLASSIFIED records only.",
    },
    {
      id: "identity",
      label: "Identity verification",
      result: identityVerified ? "pass" : "hold",
      reason: identityVerified
        ? "The runtime reports a non-development verified identity."
        : "development_header_unverified and component health flags are not trusted identity assertions.",
    },
    {
      id: "authorization",
      label: "Mutation authorization",
      result: "hold",
      reason:
        "No server-verified scoped authorization contract exists. Client query values, role metadata, and development headers are non-authoritative.",
    },
    {
      id: "objects",
      label: "Affected objects",
      result: simulated ? "simulated" : linkedObjects.length > 0 ? "pass" : "hold",
      reason: linkedObjects.length > 0
        ? `${linkedObjects.length} environmental object record(s) are linked.`
        : "No affected environmental object is linked.",
    },
    {
      id: "evidence",
      label: "Evidence linkage",
      result: simulated ? "simulated" : linkedEvidence.length > 0 ? "pass" : "hold",
      reason: linkedEvidence.length > 0
        ? `${linkedEvidence.length} evidence record(s) are linked; inspect verification and integrity separately.`
        : "No evidence record is linked.",
    },
    {
      id: "human-review",
      label: "Human decision",
      result: simulated
        ? "simulated"
        : input.review?.state === "accepted"
          ? "pass"
          : input.review
            ? "hold"
            : "unavailable",
      reason: input.review
        ? `Review ${input.review.id} is ${input.review.state.replace("_", " ")}.`
        : "No persisted review is available for this package.",
    },
    {
      id: "external-release",
      label: "External side effects",
      result: "hold",
      reason: "External transmission and command issuance are not implemented on this surface.",
    },
  ]
}

export function buildDecisionDisclosure(
  review: ReviewItem,
  decision: ReviewDecision,
  judgment: string,
): DecisionDisclosure {
  return {
    proposedChange: `Change local review ${review.id} from ${review.state} to ${decision}${judgment.trim() ? " with a recorded human judgment" : ""}.`,
    affectedObjectIds: [...review.objectIds],
    evidenceIds: [...review.evidenceIds],
    policyResult: {
      id: "local-review-write",
      label: "Server authorization required",
      result: "hold",
      reason: review.synthetic || review.dataMode === "simulated"
        ? "Simulated reviews are browser-local previews and never enter operational persistence."
        : "Server-verified identity and scoped review authorization are unavailable; the disposition remains a local preview.",
    },
    externalSideEffects: "NONE; LOCAL PREVIEW ONLY; NO MUTATION, EXPORT, RELEASE, SEND, TASKING, COMMAND, OR CONNECTOR CALL",
    requiredHumanApproval:
      "Human inspection is required for the preview, but it cannot substitute for unavailable server-verified identity and scoped authorization.",
  }
}

export function assertReviewMutation(mutation: ReviewMutation, review: ReviewItem): void {
  if (review.id !== mutation.reviewId || review.revision !== mutation.expectedRevision) {
    throw new Error("Review changed since this decision preview was prepared. Refresh before deciding.")
  }
  if (review.namespace !== "operational" || review.synthetic || review.dataMode === "simulated") {
    throw new Error("Simulated or non-operational reviews are read-only.")
  }
  if (!mutation.judgment.trim()) throw new Error("A human judgment is required for a review decision.")
  if (!(["accepted", "rejected", "deferred"] as const).includes(mutation.decision)) {
    throw new Error("Unsupported review decision.")
  }
}
