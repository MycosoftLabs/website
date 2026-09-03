import {
  DATA_FUSION_SCHEMA,
  type CoverageState,
  type EnvironmentalDomain,
  type FreshnessState,
  type FusionCondition,
  type FusionContext,
  type FusionLineageEdge,
  type FusionLineageNode,
  type FusionProvider,
  type FusionRun,
  type FusionSnapshot,
  type FusionStage,
  type LineageNodeState,
  type ModalityCoverage,
  type QueueItem,
  type SourceContribution,
  type SourceTruth,
  type TimelineEvent,
  type TransportOutcome,
  dataPresenceFromCount,
  emptyCoverage,
} from "./contracts"
import { isolateSimulationScopeFromOperational, timeRangeForContext } from "./deep-links"
import { buildSanitizedFusionScenario } from "./scenario"

const API_ROOT = "/api/fusarium/v1"
const OPERATOR_ID = "local.operator"
const PROVIDER_READ_ROLE = "viewer"
const DEFAULT_RUNTIME_SCOPE = "runtime-unscoped"
const IDENTIFIER = /^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$/
const UUID = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i
const UTC_OFFSET = /(?:Z|[+-]\d{2}:\d{2})$/i
const DATA_MODES = ["live", "recorded", "replay", "simulated", "unavailable", "degraded"] as const
const NAMESPACES = ["operational", "demo"] as const
const OPERATOR_ROLES = ["viewer", "operator", "analyst", "admin"] as const
const APPLICATION_SURFACES = ["overview", "situational-awareness", "threat-assessment", "data-fusion", "command-control", "oei-narrative", "stack-inventory"] as const
const CONNECTOR_STATES = ["unconfigured", "configured", "verified", "live", "degraded", "unauthorized", "unreachable", "stale"] as const
const ENVIRONMENTAL_DOMAINS = ["atmosphere", "water", "land", "living", "infrastructure", "process"] as const
const COVERAGE_STATES = ["observed", "partial", "gap", "empty", "unavailable", "degraded"] as const
const OBJECT_TYPES = ["sensor", "change", "track", "process", "area"] as const
const OBJECT_STATUSES = ["baseline", "watch", "material", "urgent", "unknown", "unavailable"] as const
const TREND_DIRECTIONS = ["rising", "falling", "steady", "mixed", "not_assessed"] as const
const REVIEW_KINDS = ["observation", "evidence", "environmental_judgment"] as const
const REVIEW_STATES = ["pending", "in_review", "accepted", "rejected", "deferred"] as const
const ACTIVITY_ACTIONS = [
  "context_selected", "object_selected", "evidence_reviewed", "observation_recorded",
  "review_created", "review_decided", "judgment_recorded", "handoff_created",
  "layout_changed", "watch_area_changed", "connector_state_changed",
  "threat_assessment_changed", "fusion_run_changed", "response_package_changed",
  "response_preview_created", "narrative_version_created", "narrative_preview_created",
  "stack_inventory_changed",
] as const
const FUSION_RUN_STATES = ["queued", "running", "complete", "failed", "unavailable", "simulated"] as const
const FUSION_STEP_STATES = ["pending", "running", "complete", "held", "failed", "unavailable", "simulated"] as const
const FUSION_CONFLICT_STATES = ["unresolved", "acknowledged", "resolved", "unavailable"] as const
const FUSION_REVIEW_STATES = ["pending", "in_review", "accepted", "rejected", "deferred", "unavailable"] as const

type UnknownRecord = Record<string, unknown>
type ItemValidator = (value: unknown) => value is UnknownRecord

interface V1Outcomes {
  readiness: TransportOutcome
  contexts: TransportOutcome
  sources: TransportOutcome
  coverage: TransportOutcome
  observations: TransportOutcome
  objects: TransportOutcome
  relationships: TransportOutcome
  evidence: TransportOutcome
  reviews: TransportOutcome
  activity: TransportOutcome
  fusionRuns: TransportOutcome
  narratives: TransportOutcome
}

function isRecord(value: unknown): value is UnknownRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value)
}

function stringValue(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null
}

function numberValue(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null
}

function stringList(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : []
}

function isString(value: unknown): value is string {
  return typeof value === "string"
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0
}

function isEnumValue(value: unknown, allowed: readonly string[]): value is string {
  return typeof value === "string" && allowed.includes(value)
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === "string"
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(isString)
}

function isUniqueStringArray(value: unknown): value is string[] {
  return isStringArray(value) && new Set(value).size === value.length
}

function isIdentifier(value: unknown): value is string {
  return typeof value === "string" && IDENTIFIER.test(value)
}

function isIdentifierArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(isIdentifier) && new Set(value).size === value.length
}

function isTimestamp(value: unknown): value is string {
  return typeof value === "string" && UTC_OFFSET.test(value.trim()) && Number.isFinite(Date.parse(value))
}

function isNullableTimestamp(value: unknown): value is string | null {
  return value === null || isTimestamp(value)
}

function isTimeRange(value: unknown, nullable = false): boolean {
  if (nullable && value === null) return true
  if (!isRecord(value) || !isTimestamp(value.start) || !isTimestamp(value.end)) return false
  return Date.parse(value.start) <= Date.parse(value.end)
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value)
}

function validModeScope(record: UnknownRecord): boolean {
  const simulated = record.dataMode === "simulated"
  return simulated
    ? record.namespace === "demo" && record.synthetic === true
    : record.namespace === "operational" && record.synthetic === false
}

function isDataMode(value: unknown): boolean {
  return isEnumValue(value, DATA_MODES)
}

function isConfidence(value: unknown): boolean {
  if (!isRecord(value) || !isEnumValue(value.label, ["high", "moderate", "low", "not_assessed"]) || !isNonEmptyString(value.basis)) return false
  const scoreValid = value.score === null || (isFiniteNumber(value.score) && value.score >= 0 && value.score <= 1)
  if (!scoreValid) return false
  return value.score === null ? value.label === "not_assessed" : value.label !== "not_assessed"
}

function isFreshness(value: unknown): boolean {
  if (!(
    isRecord(value) &&
    isNullableTimestamp(value.observedAt) &&
    isTimestamp(value.receivedAt) &&
    isEnumValue(value.state, ["fresh", "stale", "unknown", "simulated"]) &&
    isEnumValue(value.basis, ["source_timestamp", "receipt_timestamp", "replay_clock", "scenario_clock", "unavailable"]) &&
    (value.staleAfterSeconds === null || value.staleAfterSeconds === undefined || (Number.isInteger(value.staleAfterSeconds) && Number(value.staleAfterSeconds) >= 0))
  )) return false
  if (value.state === "simulated" && value.basis !== "scenario_clock") return false
  return value.basis !== "source_timestamp" || value.observedAt !== null
}

function isClassifiedRecord(value: unknown): value is UnknownRecord {
  return isRecord(value) && value.classification === "UNCLASSIFIED" && isIdentifier(value.id)
}

function isSourceRecord(value: unknown): value is UnknownRecord {
  if (!(
    isClassifiedRecord(value) &&
    isEnumValue(value.namespace, NAMESPACES) &&
    isNonEmptyString(value.label) &&
    isNonEmptyString(value.sourceType) &&
    isNullableString(value.endpointRef) &&
    isEnumValue(value.state, CONNECTOR_STATES) &&
    typeof value.configured === "boolean" &&
    typeof value.verified === "boolean" &&
    typeof value.live === "boolean" &&
    isTimestamp(value.receivedAt) &&
    (value.observedAt === null || value.observedAt === undefined || isTimestamp(value.observedAt)) &&
    (value.lastSuccessAt === null || value.lastSuccessAt === undefined || isTimestamp(value.lastSuccessAt)) &&
    (value.staleAfterSeconds === null || value.staleAfterSeconds === undefined || (Number.isInteger(value.staleAfterSeconds) && Number(value.staleAfterSeconds) >= 0)) &&
    (value.recordCount === null || (Number.isInteger(value.recordCount) && Number(value.recordCount) >= 0)) &&
    isDataMode(value.dataMode) &&
    typeof value.synthetic === "boolean" &&
    isNonEmptyString(value.reason) &&
    Number.isInteger(value.revision) && Number(value.revision) >= 0 &&
    validModeScope(value)
  )) return false
  if (value.live === true && value.state !== "live") return false
  return value.verified !== true || value.configured === true
}

function isMissionContextRecord(value: unknown): value is UnknownRecord {
  return (
    isClassifiedRecord(value) &&
    isEnumValue(value.namespace, NAMESPACES) &&
    isIdentifier(value.missionId) &&
    isIdentifier(value.missionAreaId) &&
    (value.missionAreaLabel === null || value.missionAreaLabel === undefined || isNonEmptyString(value.missionAreaLabel)) &&
    isTimeRange(value.timeRange) &&
    (value.timeWindow === null || value.timeWindow === undefined || isEnumValue(value.timeWindow, ["6h", "24h", "72h"])) &&
    isDataMode(value.dataMode) &&
    (value.selectedObjectId === null || value.selectedObjectId === undefined || isIdentifier(value.selectedObjectId)) &&
    (value.selectedEvidenceId === null || value.selectedEvidenceId === undefined || isIdentifier(value.selectedEvidenceId)) &&
    (value.selectedSourceId === null || value.selectedSourceId === undefined || isIdentifier(value.selectedSourceId)) &&
    (value.sourceApplication === null || value.sourceApplication === undefined || isEnumValue(value.sourceApplication, APPLICATION_SURFACES)) &&
    isIdentifier(value.operatorId) &&
    isEnumValue(value.operatorRole, OPERATOR_ROLES) &&
    Number.isInteger(value.revision) && Number(value.revision) >= 1 &&
    isTimestamp(value.createdAt) &&
    isTimestamp(value.updatedAt) &&
    Date.parse(value.createdAt) <= Date.parse(value.updatedAt) &&
    ((value.dataMode === "simulated" && value.namespace === "demo") ||
      (value.dataMode !== "simulated" && value.namespace === "operational"))
  )
}

function isCoverageRecord(value: unknown): value is UnknownRecord {
  return (
    isClassifiedRecord(value) &&
    isEnumValue(value.namespace, NAMESPACES) &&
    isIdentifier(value.missionId) &&
    isIdentifier(value.missionAreaId) &&
    isIdentifier(value.sourceId) &&
    isEnumValue(value.domain, ENVIRONMENTAL_DOMAINS) &&
    isTimeRange(value.timeRange) &&
    isEnumValue(value.state, COVERAGE_STATES) &&
    (value.expectedRecords === null || value.expectedRecords === undefined || (Number.isInteger(value.expectedRecords) && Number(value.expectedRecords) >= 0)) &&
    (value.observedRecords === null || value.observedRecords === undefined || (Number.isInteger(value.observedRecords) && Number(value.observedRecords) >= 0)) &&
    isStringArray(value.gaps) &&
    isEnumValue(value.sourceState, CONNECTOR_STATES) &&
    isFreshness(value.freshness) &&
    isDataMode(value.dataMode) &&
    typeof value.synthetic === "boolean" &&
    Number.isInteger(value.revision) && Number(value.revision) >= 0 &&
    validModeScope(value)
  )
}

function isObservationRecord(value: unknown): value is UnknownRecord {
  return (
    isClassifiedRecord(value) &&
    isEnumValue(value.namespace, NAMESPACES) &&
    isIdentifier(value.missionId) &&
    isIdentifier(value.missionAreaId) &&
    isIdentifier(value.sourceId) &&
    isNonEmptyString(value.sourceRecordId) &&
    (value.sourceDeviceId === null || value.sourceDeviceId === undefined || isIdentifier(value.sourceDeviceId)) &&
    isEnumValue(value.domain, ENVIRONMENTAL_DOMAINS) &&
    isIdentifierArray(value.objectIds) &&
    isIdentifierArray(value.evidenceIds) &&
    isNullableTimestamp(value.observedAt) &&
    isTimestamp(value.receivedAt) &&
    isRecord(value.payload) &&
    isDataMode(value.dataMode) &&
    typeof value.synthetic === "boolean" &&
    Number.isInteger(value.revision) && Number(value.revision) >= 0 &&
    validModeScope(value)
  )
}

function isEnvironmentalChange(value: unknown): boolean {
  return (
    isClassifiedRecord(value) &&
    isNonEmptyString(value.field) &&
    isEnumValue(value.direction, TREND_DIRECTIONS) &&
    (value.unit === null || value.unit === undefined || typeof value.unit === "string") &&
    (value.observedAt === null || value.observedAt === undefined || isTimestamp(value.observedAt)) &&
    isIdentifierArray(value.evidenceIds)
  )
}

function isObjectRecord(value: unknown): value is UnknownRecord {
  return (
    isClassifiedRecord(value) &&
    isEnumValue(value.namespace, NAMESPACES) &&
    isIdentifier(value.missionId) &&
    isIdentifier(value.missionAreaId) &&
    isEnumValue(value.objectType, OBJECT_TYPES) &&
    isEnumValue(value.domain, ENVIRONMENTAL_DOMAINS) &&
    isNonEmptyString(value.name) &&
    isString(value.summary) &&
    isRecord(value.temporalBounds) &&
    isTimestamp(value.temporalBounds.start) &&
    (value.temporalBounds.end === null || isTimestamp(value.temporalBounds.end)) &&
    (value.temporalBounds.end === null || Date.parse(value.temporalBounds.start) <= Date.parse(value.temporalBounds.end)) &&
    isEnumValue(value.status, OBJECT_STATUSES) &&
    isIdentifierArray(value.relationshipIds) &&
    Array.isArray(value.changes) && value.changes.every(isEnvironmentalChange) &&
    isEnumValue(value.trend, TREND_DIRECTIONS) &&
    (value.missionConsequence === null || value.missionConsequence === undefined || isString(value.missionConsequence)) &&
    isConfidence(value.confidence) &&
    isFreshness(value.freshness) &&
    isIdentifierArray(value.sourceIds) &&
    isIdentifierArray(value.evidenceIds) &&
    isNonEmptyString(value.provenanceRef) &&
    isDataMode(value.dataMode) &&
    typeof value.synthetic === "boolean" &&
    Number.isInteger(value.revision) && Number(value.revision) >= 0 &&
    validModeScope(value)
  )
}

function isRelationshipRecord(value: unknown): value is UnknownRecord {
  return (
    isClassifiedRecord(value) &&
    isEnumValue(value.namespace, NAMESPACES) &&
    isIdentifier(value.missionId) &&
    isIdentifier(value.fromObjectId) &&
    isIdentifier(value.toObjectId) &&
    value.fromObjectId !== value.toObjectId &&
    isNonEmptyString(value.relationshipType) &&
    isNonEmptyString(value.label) &&
    isConfidence(value.confidence) &&
    isIdentifierArray(value.evidenceIds) &&
    isDataMode(value.dataMode) &&
    typeof value.synthetic === "boolean" &&
    Number.isInteger(value.revision) && Number(value.revision) >= 0 &&
    validModeScope(value)
  )
}

function isTransformation(value: unknown): boolean {
  return (
    isClassifiedRecord(value) &&
    isNonEmptyString(value.name) &&
    isNonEmptyString(value.version) &&
    isUniqueStringArray(value.inputRefs) &&
    isRecord(value.parameters) &&
    isTimestamp(value.performedAt) &&
    (value.actorRef === null || value.actorRef === undefined || isIdentifier(value.actorRef))
  )
}

function isEvidenceRecord(value: unknown): value is UnknownRecord {
  return (
    isClassifiedRecord(value) &&
    isEnumValue(value.namespace, NAMESPACES) &&
    isIdentifier(value.missionId) &&
    isIdentifier(value.missionAreaId) &&
    isIdentifierArray(value.objectIds) &&
    isIdentifier(value.sourceId) &&
    isNonEmptyString(value.title) &&
    isString(value.summary) &&
    isNonEmptyString(value.sourceRef) &&
    isRecord(value.lineage) &&
    isUniqueStringArray(value.lineage.sourceRecordIds) &&
    isIdentifierArray(value.lineage.parentEvidenceIds) &&
    Array.isArray(value.lineage.transformations) &&
    value.lineage.transformations.every(isTransformation) &&
    isNullableTimestamp(value.observedAt) &&
    isTimestamp(value.receivedAt) &&
    isConfidence(value.confidence) &&
    isNonEmptyString(value.confidenceBasis) &&
    isEnumValue(value.integrityState, ["unknown", "unverified", "verified", "failed"]) &&
    isEnumValue(value.verificationState, ["unavailable", "pending", "verified", "failed"]) &&
    (value.integrityRef === null || value.integrityRef === undefined || isString(value.integrityRef)) &&
    isDataMode(value.dataMode) &&
    typeof value.synthetic === "boolean" &&
    Number.isInteger(value.revision) && Number(value.revision) >= 0 &&
    validModeScope(value)
  )
}

function isReviewRecord(value: unknown): value is UnknownRecord {
  if (!(
    isClassifiedRecord(value) &&
    isEnumValue(value.namespace, NAMESPACES) &&
    isIdentifier(value.missionId) &&
    isEnumValue(value.kind, REVIEW_KINDS) &&
    isEnumValue(value.state, REVIEW_STATES) &&
    isIdentifierArray(value.objectIds) &&
    isIdentifierArray(value.evidenceIds) &&
    isIdentifier(value.requestedBy) &&
    (value.assignedTo === null || isIdentifier(value.assignedTo)) &&
    (value.judgment === null || value.judgment === undefined || isString(value.judgment)) &&
    isDataMode(value.dataMode) &&
    typeof value.synthetic === "boolean" &&
    Number.isInteger(value.revision) && Number(value.revision) >= 1 &&
    isTimestamp(value.createdAt) &&
    isTimestamp(value.updatedAt) &&
    Date.parse(value.createdAt) <= Date.parse(value.updatedAt) &&
    validModeScope(value)
  )) return false
  const terminal = ["accepted", "rejected", "deferred"].includes(String(value.state))
  return terminal
    ? isIdentifier(value.decidedBy) && isTimestamp(value.decidedAt)
    : (value.decidedBy === null || value.decidedBy === undefined) && (value.decidedAt === null || value.decidedAt === undefined)
}

function isActivityRecord(value: unknown): value is UnknownRecord {
  return (
    isClassifiedRecord(value) &&
    Number.isInteger(value.sequence) && Number(value.sequence) >= 1 &&
    isEnumValue(value.namespace, NAMESPACES) &&
    isIdentifier(value.missionId) &&
    (value.missionContextId === null || value.missionContextId === undefined || isIdentifier(value.missionContextId)) &&
    isIdentifier(value.actorId) &&
    isEnumValue(value.actorRole, OPERATOR_ROLES) &&
    isTimestamp(value.occurredAt) &&
    (value.sourceTime === null || value.sourceTime === undefined || isTimestamp(value.sourceTime)) &&
    (value.eventTime === null || value.eventTime === undefined || isTimestamp(value.eventTime)) &&
    (value.receivedAt === null || value.receivedAt === undefined || isTimestamp(value.receivedAt)) &&
    isEnumValue(value.actionType, ACTIVITY_ACTIONS) &&
    isIdentifierArray(value.objectIds) &&
    isIdentifierArray(value.evidenceIds) &&
    isDataMode(value.dataMode) &&
    value.appendOnly === true &&
    ((value.dataMode === "simulated" && value.namespace === "demo") ||
      (value.dataMode !== "simulated" && value.namespace === "operational"))
  )
}

function isFusionLineageRecord(value: unknown): boolean {
  return (
    isRecord(value) &&
    isIdentifier(value.id) &&
    isNonEmptyString(value.kind) &&
    isNonEmptyString(value.label) &&
    (value.sourceId === undefined || value.sourceId === null || isIdentifier(value.sourceId)) &&
    (value.artifactRef === undefined || isNullableString(value.artifactRef)) &&
    (value.contentType === undefined || isNullableString(value.contentType)) &&
    (value.sourceTime === undefined || isNullableTimestamp(value.sourceTime)) &&
    (value.eventTime === undefined || isNullableTimestamp(value.eventTime)) &&
    (value.receivedAt === undefined || isNullableTimestamp(value.receivedAt))
  )
}

function isFusionEdgeRecord(value: unknown): boolean {
  return (
    isRecord(value) &&
    isIdentifier(value.id) &&
    isIdentifier(value.upstreamNodeId) &&
    isIdentifier(value.downstreamNodeId) &&
    value.upstreamNodeId !== value.downstreamNodeId &&
    isNonEmptyString(value.relation) &&
    (value.confidence === undefined || value.confidence === null || isConfidence(value.confidence))
  )
}

function isFusionStepRecord(value: unknown): boolean {
  if (!(
    isRecord(value) &&
    isIdentifier(value.id) &&
    Number.isInteger(value.sequence) && Number(value.sequence) >= 1 &&
    isNonEmptyString(value.name) &&
    isEnumValue(value.state, FUSION_STEP_STATES) &&
    (value.detail === undefined || isNullableString(value.detail)) &&
    isIdentifierArray(value.inputNodeIds) &&
    isIdentifierArray(value.outputNodeIds) &&
    (value.startedAt === undefined || isNullableTimestamp(value.startedAt)) &&
    (value.completedAt === undefined || isNullableTimestamp(value.completedAt)) &&
    (value.durationMs === undefined || value.durationMs === null || (Number.isInteger(value.durationMs) && Number(value.durationMs) >= 0))
  )) return false
  return !(isTimestamp(value.startedAt) && isTimestamp(value.completedAt) && Date.parse(value.completedAt) < Date.parse(value.startedAt))
}

function isFusionContributionRecord(value: unknown): boolean {
  return (
    isRecord(value) &&
    isIdentifier(value.id) &&
    isIdentifier(value.sourceId) &&
    isNonEmptyString(value.modality) &&
    isNonEmptyString(value.summary) &&
    isIdentifierArray(value.inputNodeIds) &&
    isIdentifierArray(value.evidenceIds) &&
    (value.contributionScore === null || (isFiniteNumber(value.contributionScore) && value.contributionScore >= 0 && value.contributionScore <= 1)) &&
    (value.confidence === undefined || value.confidence === null || isConfidence(value.confidence)) &&
    (value.sourceTime === undefined || isNullableTimestamp(value.sourceTime)) &&
    (value.eventTime === undefined || isNullableTimestamp(value.eventTime)) &&
    (value.receivedAt === undefined || isNullableTimestamp(value.receivedAt))
  )
}

function isFusionConflictRecord(value: unknown): boolean {
  if (!(
    isRecord(value) &&
    isIdentifier(value.id) &&
    isNonEmptyString(value.fieldPath) &&
    isNonEmptyString(value.summary) &&
    isIdentifierArray(value.nodeIds) &&
    value.nodeIds.length >= 2 &&
    isIdentifierArray(value.evidenceIds) &&
    isEnumValue(value.state, FUSION_CONFLICT_STATES) &&
    (value.resolution === undefined || isNullableString(value.resolution)) &&
    (value.confidence === undefined || value.confidence === null || isConfidence(value.confidence))
  )) return false
  return value.state !== "resolved" || isNonEmptyString(value.resolution)
}

function hasValidFusionGraph(value: UnknownRecord): boolean {
  const lineage = Array.isArray(value.lineageNodes) ? value.lineageNodes.filter(isRecord) : []
  const edges = Array.isArray(value.lineageEdges) ? value.lineageEdges.filter(isRecord) : []
  const steps = Array.isArray(value.steps) ? value.steps.filter(isRecord) : []
  const contributions = Array.isArray(value.contributions) ? value.contributions.filter(isRecord) : []
  const conflicts = Array.isArray(value.conflicts) ? value.conflicts.filter(isRecord) : []
  const uniqueIds = (items: UnknownRecord[]) => {
    const ids = items.map((item) => stringValue(item.id))
    return ids.every(Boolean) && new Set(ids).size === ids.length
  }
  if (![lineage, edges, steps, contributions, conflicts].every(uniqueIds)) return false
  const stepSequences = steps.map((step) => numberValue(step.sequence))
  if (stepSequences.some((sequence) => sequence === null) || new Set(stepSequences).size !== stepSequences.length) return false
  const nodeIds = new Set(lineage.map((item) => stringValue(item.id)).filter((item): item is string => Boolean(item)))
  if (![...stringList(value.inputNodeIds), ...stringList(value.outputNodeIds)].every((id) => nodeIds.has(id))) return false
  if (!edges.every((edge) => nodeIds.has(stringValue(edge.upstreamNodeId) || "") && nodeIds.has(stringValue(edge.downstreamNodeId) || ""))) return false
  if (!steps.every((step) => [...stringList(step.inputNodeIds), ...stringList(step.outputNodeIds)].every((id) => nodeIds.has(id)))) return false
  if (!contributions.every((item) => stringList(item.inputNodeIds).every((id) => nodeIds.has(id)))) return false
  if (!conflicts.every((item) => stringList(item.nodeIds).every((id) => nodeIds.has(id)))) return false
  if (isTimestamp(value.startedAt) && isTimestamp(value.completedAt) && Date.parse(value.completedAt) < Date.parse(value.startedAt)) return false
  if (isTimestamp(value.createdAt) && isTimestamp(value.updatedAt) && Date.parse(value.updatedAt) < Date.parse(value.createdAt)) return false
  const reviewState = stringValue(value.reviewState)
  const provenance = [value.reviewId, value.reviewRevision, value.reviewedBy]
  if (reviewState === "pending" || reviewState === "unavailable") {
    if (provenance.some((item) => item !== null && item !== undefined)) return false
  } else if (provenance.some((item) => item === null || item === undefined)) return false
  return true
}

function isFusionRunRecord(value: unknown): value is UnknownRecord {
  return (
    isClassifiedRecord(value) &&
    isEnumValue(value.namespace, NAMESPACES) &&
    isIdentifier(value.missionId) &&
    value.schemaRef === "fusarium-fusion-run-record/v1" &&
    (value.contextId === undefined || value.contextId === null || isIdentifier(value.contextId)) &&
    isEnumValue(value.state, FUSION_RUN_STATES) &&
    isTimeRange(value.timeRange, true) &&
    (value.startedAt === undefined || isNullableTimestamp(value.startedAt)) &&
    (value.completedAt === undefined || isNullableTimestamp(value.completedAt)) &&
    isIdentifierArray(value.inputNodeIds) &&
    isIdentifierArray(value.outputNodeIds) &&
    (value.modelName === undefined || isNullableString(value.modelName)) &&
    (value.modelVersion === undefined || isNullableString(value.modelVersion)) &&
    isIdentifierArray(value.modelRefs) &&
    Array.isArray(value.lineageNodes) &&
    value.lineageNodes.every(isFusionLineageRecord) &&
    Array.isArray(value.lineageEdges) &&
    value.lineageEdges.every(isFusionEdgeRecord) &&
    Array.isArray(value.steps) &&
    value.steps.every(isFusionStepRecord) &&
    Array.isArray(value.contributions) &&
    value.contributions.every(isFusionContributionRecord) &&
    Array.isArray(value.conflicts) &&
    value.conflicts.every(isFusionConflictRecord) &&
    (value.inputCount === null || (Number.isInteger(value.inputCount) && Number(value.inputCount) >= 0)) &&
    (value.outputCount === null || (Number.isInteger(value.outputCount) && Number(value.outputCount) >= 0)) &&
    (value.confidence === null || (isFiniteNumber(value.confidence) && value.confidence >= 0 && value.confidence <= 1)) &&
    (value.uncertainty === undefined || isNullableString(value.uncertainty)) &&
    isEnumValue(value.reviewState, FUSION_REVIEW_STATES) &&
    (value.reviewId === undefined || value.reviewId === null || isIdentifier(value.reviewId)) &&
    (value.reviewRevision === undefined || value.reviewRevision === null || (Number.isInteger(value.reviewRevision) && Number(value.reviewRevision) >= 1)) &&
    (value.reviewedBy === undefined || value.reviewedBy === null || isIdentifier(value.reviewedBy)) &&
    isNonEmptyString(value.reason) &&
    (value.summary === undefined || isNullableString(value.summary)) &&
    isDataMode(value.dataMode) &&
    typeof value.synthetic === "boolean" &&
    isString(value.globalId) && UUID.test(value.globalId) &&
    (value.sourceTime === undefined || isNullableTimestamp(value.sourceTime)) &&
    (value.eventTime === undefined || isNullableTimestamp(value.eventTime)) &&
    (value.receivedAt === undefined || isNullableTimestamp(value.receivedAt)) &&
    Number.isInteger(value.revision) && Number(value.revision) >= 1 &&
    isTimestamp(value.createdAt) &&
    isTimestamp(value.updatedAt) &&
    validModeScope(value) &&
    hasValidFusionGraph(value)
  )
}

function isNarrativeClaim(value: unknown): boolean {
  return (
    isRecord(value) &&
    isIdentifier(value.id) &&
    isNonEmptyString(value.text) &&
    isIdentifierArray(value.objectIds) &&
    isIdentifierArray(value.evidenceIds) &&
    (value.confidence === null || value.confidence === undefined || isConfidence(value.confidence)) &&
    (value.uncertainty === null || value.uncertainty === undefined || isString(value.uncertainty)) &&
    isStringArray(value.caveats) &&
    isStringArray(value.competingExplanations) &&
    (value.changedSincePrevious === null || value.changedSincePrevious === undefined || typeof value.changedSincePrevious === "boolean") &&
    isEnumValue(value.authoringBasis, ["source_summary", "operator_entered", "sanitized_fixture"])
  )
}

function isNarrativeCaveat(value: unknown): boolean {
  return (
    isRecord(value) &&
    isIdentifier(value.id) &&
    isNonEmptyString(value.text) &&
    isIdentifierArray(value.claimIds) &&
    isIdentifierArray(value.evidenceIds)
  )
}

function hasValidNarrative(value: UnknownRecord): boolean {
  const claims = Array.isArray(value.claims) ? value.claims.filter(isRecord) : []
  const caveats = Array.isArray(value.caveats) ? value.caveats.filter(isRecord) : []
  const claimIds = claims.map((item) => stringValue(item.id)).filter((item): item is string => Boolean(item))
  const caveatIds = caveats.map((item) => stringValue(item.id)).filter((item): item is string => Boolean(item))
  if (new Set(claimIds).size !== claimIds.length || new Set(caveatIds).size !== caveatIds.length) return false
  if (!caveats.every((item) => stringList(item.claimIds).every((id) => claimIds.includes(id)))) return false
  const ordinal = numberValue(value.ordinal)
  if (ordinal === 1 && value.parentVersionId !== null && value.parentVersionId !== undefined) return false
  if (ordinal !== null && ordinal > 1 && !isIdentifier(value.parentVersionId)) return false
  const review = [value.reviewId, value.reviewRevision, value.reviewedBy]
  if (value.stage === "draft") {
    return [...review, value.approvedBy].every((item) => item === null || item === undefined)
  }
  if (review.some((item) => item === null || item === undefined)) return false
  if (value.stage === "approved_package") return isIdentifier(value.approvedBy) && value.approvedBy === value.reviewedBy
  return value.approvedBy === null || value.approvedBy === undefined
}

function isNarrativeRecord(value: unknown): value is UnknownRecord {
  return (
    isClassifiedRecord(value) &&
    isEnumValue(value.namespace, NAMESPACES) &&
    isIdentifier(value.missionId) &&
    value.schemaRef === "fusarium-narrative-version-record/v1" &&
    isIdentifier(value.narrativeId) &&
    (value.parentVersionId === null || value.parentVersionId === undefined || isIdentifier(value.parentVersionId)) &&
    Number.isInteger(value.ordinal) && Number(value.ordinal) >= 1 &&
    isEnumValue(value.stage, ["draft", "evidence_check", "human_review", "approved_package"]) &&
    isNonEmptyString(value.title) &&
    isNonEmptyString(value.executiveSummary) &&
    isNonEmptyString(value.body) &&
    Array.isArray(value.claims) && value.claims.every(isNarrativeClaim) &&
    Array.isArray(value.caveats) && value.caveats.every(isNarrativeCaveat) &&
    isIdentifier(value.authoredBy) &&
    (value.reviewId === null || value.reviewId === undefined || isIdentifier(value.reviewId)) &&
    (value.reviewRevision === null || value.reviewRevision === undefined || (Number.isInteger(value.reviewRevision) && Number(value.reviewRevision) >= 1)) &&
    (value.reviewedBy === null || value.reviewedBy === undefined || isIdentifier(value.reviewedBy)) &&
    (value.approvedBy === null || value.approvedBy === undefined || isIdentifier(value.approvedBy)) &&
    value.immutable === true &&
    isDataMode(value.dataMode) &&
    typeof value.synthetic === "boolean" &&
    (value.sourceTime === undefined || isNullableTimestamp(value.sourceTime)) &&
    (value.eventTime === undefined || isNullableTimestamp(value.eventTime)) &&
    (value.receivedAt === undefined || isNullableTimestamp(value.receivedAt)) &&
    isString(value.globalId) && UUID.test(value.globalId) &&
    Number.isInteger(value.revision) && Number(value.revision) >= 1 &&
    isTimestamp(value.createdAt) &&
    isTimestamp(value.updatedAt) &&
    Date.parse(value.createdAt) <= Date.parse(value.updatedAt) &&
    validModeScope(value) &&
    hasValidNarrative(value)
  )
}

function pageItems(outcome: TransportOutcome): UnknownRecord[] | null {
  if (!outcome.ok || outcome.schemaValid !== true || !isRecord(outcome.payload) || !Array.isArray(outcome.payload.items)) return null
  return outcome.payload.items.filter(isRecord)
}

function isPagePayload(value: unknown, itemValidator: ItemValidator): boolean {
  if (!isRecord(value) || !Array.isArray(value.items) || !value.items.every(itemValidator) || !isRecord(value.page)) return false
  return (
    typeof value.page.limit === "number" &&
    Number.isInteger(value.page.limit) &&
    value.page.limit >= 1 &&
    value.page.limit <= 500 &&
    (value.page.nextCursor === null || typeof value.page.nextCursor === "string") &&
    typeof value.page.hasMore === "boolean" &&
    value.page.hasMore === (value.page.nextCursor !== null)
  )
}

function pageValidator(itemValidator: ItemValidator): (value: unknown) => boolean {
  return (value) => isPagePayload(value, itemValidator)
}

function validatePageOutcome(outcome: TransportOutcome, itemValidator: ItemValidator): TransportOutcome {
  if (!outcome.ok || isPagePayload(outcome.payload, itemValidator)) return outcome
  return {
    ...outcome,
    schemaValid: false,
    error: outcome.error || "HTTP 200: collection records did not match the expected v1 contract.",
  }
}

function isComponentReadiness(value: unknown): boolean {
  return (
    isRecord(value) &&
    value.classification === "UNCLASSIFIED" &&
    isIdentifier(value.id) &&
    isEnumValue(value.state, CONNECTOR_STATES) &&
    typeof value.configured === "boolean" &&
    typeof value.verified === "boolean" &&
    typeof value.required === "boolean" &&
    isTimestamp(value.checkedAt) &&
    (value.lastSuccessAt === null || value.lastSuccessAt === undefined || isTimestamp(value.lastSuccessAt)) &&
    isDataMode(value.dataMode) &&
    isNonEmptyString(value.detail) &&
    (!value.verified || value.configured)
  )
}

function isMigrationReadiness(value: unknown): boolean {
  if (!(
    isRecord(value) &&
    isEnumValue(value.state, CONNECTOR_STATES) &&
    Number.isInteger(value.currentVersion) && Number(value.currentVersion) >= 0 &&
    Number.isInteger(value.targetVersion) && Number(value.targetVersion) >= 0 &&
    Number(value.currentVersion) <= Number(value.targetVersion) &&
    Array.isArray(value.pending) &&
    value.pending.every((item) => Number.isInteger(item)) &&
    isTimestamp(value.checkedAt)
  )) return false
  const pending = value.pending as number[]
  return (
    new Set(pending).size === pending.length &&
    pending.every((version, index) => (
      version > Number(value.currentVersion) &&
      version <= Number(value.targetVersion) &&
      (index === 0 || version > pending[index - 1])
    ))
  )
}

function isReadinessPayload(value: unknown): value is UnknownRecord {
  return (
    isRecord(value) &&
    value.classification === "UNCLASSIFIED" &&
    value.schemaRef === "fusarium-intelligence/v1" &&
    isEnumValue(value.status, ["ready", "degraded", "not_ready"]) &&
    value.service === "fusarium-intelligence" &&
    isNonEmptyString(value.version) &&
    isTimestamp(value.checkedAt) &&
    isComponentReadiness(value.bindExposure) &&
    isComponentReadiness(value.identity) &&
    isComponentReadiness(value.storage) &&
    isComponentReadiness(value.backup) &&
    isMigrationReadiness(value.migrations) &&
    Array.isArray(value.sourceReachability) && value.sourceReachability.every(isComponentReadiness) &&
    Array.isArray(value.connectorAuthorization) && value.connectorAuthorization.every(isComponentReadiness) &&
    isComponentReadiness(value.staging) &&
    isNonEmptyString(value.identityMode) &&
    typeof value.developmentIdentity === "boolean" &&
    typeof value.demoEnabled === "boolean"
  )
}

function isReplayPayload(value: unknown): boolean {
  if (
    !isRecord(value) ||
    value.classification !== "UNCLASSIFIED" ||
    value.schemaRef !== "fusarium-intelligence/v1" ||
    !isPagePayload(value, isActivityRecord) ||
    !Array.isArray(value.items) ||
    !isRecord(value.query) ||
    !isRecord(value.query.timeRange)
  ) return false
  const replayQuery = value.query
  const replayTimeRange = replayQuery.timeRange
  if (!isRecord(replayTimeRange)) return false
  if (!(
    isIdentifier(replayQuery.missionId) &&
    isTimeRange(replayTimeRange) &&
    ["operational", "demo"].includes(String(replayQuery.namespace)) &&
    (replayQuery.cursor === null || replayQuery.cursor === undefined || typeof replayQuery.cursor === "string") &&
    Number.isInteger(replayQuery.limit) &&
    Number(replayQuery.limit) >= 1 &&
    Number(replayQuery.limit) <= 500
  )) return false
  const records = value.items.filter(isRecord)
  if (!records.every((record) => record.missionId === replayQuery.missionId && record.namespace === replayQuery.namespace)) return false
  const replayStart = Date.parse(String(replayTimeRange.start))
  const replayEnd = Date.parse(String(replayTimeRange.end))
  if (!records.every((record) => {
    const occurredAt = Date.parse(stringValue(record.occurredAt) || "")
    return Number.isFinite(occurredAt) && occurredAt >= replayStart && occurredAt <= replayEnd
  })) return false
  const keys = records.map((record) => `${stringValue(record.occurredAt) || ""}|${String(numberValue(record.sequence) ?? "")}|${stringValue(record.id) || ""}`)
  const sorted = [...records].sort((left, right) => {
    const time = (Date.parse(stringValue(left.occurredAt) || "") || 0) - (Date.parse(stringValue(right.occurredAt) || "") || 0)
    if (time !== 0) return time
    const sequence = (numberValue(left.sequence) ?? 0) - (numberValue(right.sequence) ?? 0)
    if (sequence !== 0) return sequence
    return (stringValue(left.id) || "").localeCompare(stringValue(right.id) || "")
  }).map((record) => `${stringValue(record.occurredAt) || ""}|${String(numberValue(record.sequence) ?? "")}|${stringValue(record.id) || ""}`)
  return keys.every((key, index) => key === sorted[index])
}

function safeSummary(payload: unknown, fallback: string): string {
  if (!isRecord(payload)) return fallback
  for (const key of ["summary", "description", "label", "name"]) {
    const value = stringValue(payload[key])
    if (value) return value.slice(0, 320)
  }
  return fallback
}

function confidenceScore(record: UnknownRecord): number | null {
  return isRecord(record.confidence) ? numberValue(record.confidence.score) : null
}

function confidenceBasis(record: UnknownRecord): string | null {
  return isRecord(record.confidence) ? stringValue(record.confidence.basis) : null
}

function freshnessState(record: UnknownRecord): FreshnessState {
  const raw = isRecord(record.freshness) ? record.freshness.state : record.state
  return raw === "fresh" || raw === "stale" || raw === "simulated" ? raw : "unknown"
}

function recordMode(record: UnknownRecord): FusionLineageNode["dataMode"] {
  const mode = stringValue(record.dataMode)
  if (
    mode === "live" ||
    mode === "replay" ||
    mode === "simulated" ||
    mode === "recorded" ||
    mode === "unavailable" ||
    mode === "degraded"
  ) return mode
  return "unavailable"
}

function recordState(record: UnknownRecord): LineageNodeState {
  const mode = recordMode(record)
  if (mode === "unavailable") return "unavailable"
  if (mode === "degraded") return "partial"
  const state = stringValue(record.state) || stringValue(record.status)
  if (state === "accepted" || state === "rejected" || state === "pending") return state
  if (state === "degraded" || state === "partial") return "partial"
  if (state === "unavailable" || state === "unreachable") return "unavailable"
  return "available"
}

function unavailableNode(stage: FusionStage, id: string, label: string, reason: string): FusionLineageNode {
  return {
    id,
    stage,
    label,
    eyebrow: "Provider gap",
    summary: reason,
    state: "unavailable",
    recordRef: null,
    domain: null,
    observedAt: null,
    receivedAt: null,
    sourceIds: [],
    objectIds: [],
    evidenceIds: [],
    confidence: null,
    uncertainty: "Unavailable",
    contribution: null,
    modelRef: null,
    dataMode: "unavailable",
    synthetic: false,
    facts: [{ label: "State", value: "Unavailable", state: "muted" }],
    disposition: null,
  }
}

function endpointReachability(outcome: TransportOutcome): SourceTruth["endpointReachability"] {
  if (outcome.status === 401 || outcome.status === 403) return "unauthorized"
  if (outcome.status !== null && outcome.status >= 500) return "degraded"
  if (outcome.ok) return "reachable"
  if (outcome.status === null) return "unreachable"
  return "unknown"
}

function systemTruth(outcome: TransportOutcome): SourceTruth {
  const reachability = endpointReachability(outcome)
  const payloadCount = pageItems(outcome)?.length ?? null
  return {
    id: "v1-source-contract",
    label: "Fusarium v1 source contract",
    endpointRef: outcome.endpoint,
    sourceType: "versioned provider boundary",
    endpointReachability: reachability,
    identityVerification:
      outcome.status === 401 || outcome.status === 403 ? "rejected" : "unverified",
    schemaValidity:
      outcome.schemaValid === true ? "valid" : outcome.schemaValid === false ? "invalid" : "unknown",
    freshness: "unknown",
    provenance: outcome.ok ? "declared" : "unknown",
    coverage: outcome.ok ? (payloadCount === 0 ? "empty" : "unknown") : "unavailable",
    dataPresence: dataPresenceFromCount(payloadCount, outcome.ok),
    observedAt: null,
    receivedAt: outcome.receivedAt,
    recordCount: payloadCount,
    reason:
      outcome.error ||
      (outcome.schemaValid === false
        ? "Endpoint answered, but the collection envelope did not match the v1 page shape."
        : payloadCount === 0
          ? "Endpoint answered with a valid empty collection. Empty is not an environmental all-clear."
          : "Endpoint answered. Identity remains an unverified development header."),
    synthetic: false,
  }
}

function mapSourceTruth(
  records: UnknownRecord[],
  sourceOutcome: TransportOutcome,
  coverageRecords: UnknownRecord[],
  evidenceRecords: UnknownRecord[],
): SourceTruth[] {
  if (records.length === 0) return [systemTruth(sourceOutcome)]
  return records.map((record) => {
    const id = stringValue(record.id) || "source-without-id"
    const state = stringValue(record.state)
    const mode = recordMode(record)
    const isUnavailableMode = mode === "unavailable"
    const isDegradedMode = mode === "degraded"
    const isLive = record.live === true && state === "live" && !isUnavailableMode && !isDegradedMode
    const count = numberValue(record.recordCount)
    const sourceCoverage = coverageRecords.filter((item) => item.sourceId === id)
    const sourceEvidence = evidenceRecords.filter((item) => item.sourceId === id)
    const coverageStates = sourceCoverage.map((item) => stringValue(item.state)).filter(Boolean)
    const coverage: CoverageState = isUnavailableMode
      ? "unavailable"
      : isDegradedMode
        ? "degraded"
        : coverageStates.includes("degraded")
        ? "degraded"
        : coverageStates.includes("partial")
          ? "partial"
          : coverageStates.includes("gap")
            ? "gap"
            : coverageStates.includes("observed")
              ? "observed"
              : coverageStates.includes("empty")
                ? "empty"
                : sourceCoverage.length > 0
                  ? "unknown"
                  : "unavailable"
    return {
      id,
      label: stringValue(record.label) || id,
      endpointRef: stringValue(record.endpointRef),
      sourceType: stringValue(record.sourceType) || "unspecified",
      endpointReachability:
        isUnavailableMode
          ? "unknown"
          : isDegradedMode
            ? "degraded"
            : state === "unauthorized"
          ? "unauthorized"
          : state === "unreachable"
            ? "unreachable"
            : state === "degraded"
              ? "degraded"
              : isLive
                ? "reachable"
                : "unknown",
      identityVerification: "unverified",
      schemaValidity:
        typeof record.id === "string" && typeof record.state === "string" ? "valid" : "invalid",
      freshness: isUnavailableMode || isDegradedMode ? "unknown" : state === "stale" ? "stale" : isLive ? "fresh" : "unknown",
      provenance: sourceEvidence.length > 0 ? "traced" : stringValue(record.endpointRef) ? "declared" : "missing",
      coverage,
      dataPresence: isUnavailableMode || isDegradedMode ? "unknown" : dataPresenceFromCount(count, isLive),
      observedAt: stringValue(record.observedAt),
      receivedAt: stringValue(record.receivedAt) || sourceOutcome.receivedAt,
      recordCount: count,
      reason: stringValue(record.reason) || "The v1 source record supplied no reason.",
      synthetic: record.synthetic === true,
    }
  })
}

function mapObservationNodes(records: UnknownRecord[]): FusionLineageNode[] {
  return records.map((record, index) => {
    const recordId = stringValue(record.id) || `unknown-${index}`
    const id = `observation:${recordId}`
    const evidenceIds = stringList(record.evidenceIds)
    const objectIds = stringList(record.objectIds)
    const sourceId = stringValue(record.sourceId)
    return {
      id,
      stage: "observation",
      label: safeSummary(record.payload, stringValue(record.sourceRecordId) || id),
      eyebrow: `Observation · ${stringValue(record.domain) || "domain unknown"}`,
      summary: `Source record ${stringValue(record.sourceRecordId) || "reference unavailable"}. Payload meaning is not inferred beyond supplied fields.`,
      state: recordState(record),
      recordRef: stringValue(record.sourceRecordId),
      domain: (stringValue(record.domain) as EnvironmentalDomain | null) || null,
      observedAt: stringValue(record.observedAt),
      receivedAt: stringValue(record.receivedAt),
      sourceIds: sourceId ? [sourceId] : [],
      objectIds,
      evidenceIds,
      confidence: null,
      uncertainty: "The observation contract carries no confidence or uncertainty interval.",
      contribution: null,
      modelRef: null,
      dataMode: recordMode(record),
      synthetic: record.synthetic === true,
      facts: [
        { label: "Observation", value: recordId, state: "muted" },
        { label: "Source", value: sourceId || "Unknown", state: sourceId ? "ok" : "muted" },
        { label: "Evidence", value: evidenceIds.length ? String(evidenceIds.length) : "None linked", state: evidenceIds.length ? "ok" : "muted" },
      ],
      disposition: null,
    }
  })
}

function mapNormalizationNodes(evidenceRecords: UnknownRecord[]): FusionLineageNode[] {
  const result: FusionLineageNode[] = []
  for (const evidence of evidenceRecords) {
    if (!isRecord(evidence.lineage) || !Array.isArray(evidence.lineage.transformations)) continue
    for (const [index, raw] of evidence.lineage.transformations.entries()) {
      if (!isRecord(raw)) continue
      const evidenceId = stringValue(evidence.id) || `evidence-${result.length}`
      const transformId = stringValue(raw.id) || `transform-${index}`
      const sourceId = stringValue(evidence.sourceId)
      const integrity = stringValue(evidence.integrityState) || "unknown"
      const verification = stringValue(evidence.verificationState) || "unavailable"
      const state: LineageNodeState =
        integrity === "failed" || verification === "failed"
          ? "rejected"
          : verification === "unavailable"
            ? "unavailable"
            : integrity === "verified" && verification === "verified"
              ? "available"
              : "partial"
      result.push({
        id: `normalization:${evidenceId}:${index}:${transformId}`,
        stage: "normalization",
        label: stringValue(raw.name) || "Declared evidence transformation",
        eyebrow: `Transformation · ${stringValue(raw.version) || "version unavailable"}`,
        summary: "Versioned evidence transformation supplied by v1. Integrity and verification are carried through explicitly; this is not a fusion-model execution.",
        state,
        recordRef: stringValue(evidence.sourceRef),
        domain: null,
        observedAt: stringValue(raw.performedAt),
        receivedAt: stringValue(evidence.receivedAt),
        sourceIds: sourceId ? [sourceId] : [],
        objectIds: stringList(evidence.objectIds),
        evidenceIds: [evidenceId],
        confidence: confidenceScore(evidence),
        uncertainty: confidenceBasis(evidence),
        contribution: null,
        modelRef: `${stringValue(raw.name) || "transformation"}@${stringValue(raw.version) || "unknown"}`,
        dataMode: recordMode(evidence),
        synthetic: evidence.synthetic === true,
        facts: [
          { label: "Inputs", value: String(stringList(raw.inputRefs).length), state: "ok" },
          { label: "Integrity", value: integrity, state: integrity === "verified" ? "ok" : integrity === "failed" ? "bad" : "warn" },
          { label: "Verification", value: verification, state: verification === "verified" ? "ok" : verification === "failed" ? "bad" : verification === "unavailable" ? "muted" : "warn" },
          { label: "Outcome", value: "No normalization outcome asserted", state: "muted" },
        ],
        disposition: null,
      })
    }
  }
  return result
}

function objectNode(record: UnknownRecord, id: string, label: string, summary: string): FusionLineageNode {
  const sourceIds = stringList(record.sourceIds)
  const evidenceIds = stringList(record.evidenceIds)
  const score = confidenceScore(record)
  const basis = confidenceBasis(record)
  const freshness = freshnessState(record)
  return {
    id,
    stage: "environmental_object",
    label,
    eyebrow: `${stringValue(record.objectType) || "Environmental object"} · ${stringValue(record.domain) || "domain unknown"}`,
    summary,
    state: freshness === "stale" ? "late" : recordState(record),
    recordRef: stringValue(record.provenanceRef),
    domain: (stringValue(record.domain) as EnvironmentalDomain | null) || null,
    observedAt: isRecord(record.temporalBounds) ? stringValue(record.temporalBounds.start) : null,
    receivedAt: isRecord(record.freshness) ? stringValue(record.freshness.receivedAt) : null,
    sourceIds,
    objectIds: [stringValue(record.id) || id],
    evidenceIds,
    confidence: score,
    uncertainty: basis
      ? `Confidence basis: ${basis}. No uncertainty interval is present in the v1 object contract.`
      : "No uncertainty interval is present in the v1 object contract.",
    contribution: null,
    modelRef: null,
    dataMode: recordMode(record),
    synthetic: record.synthetic === true,
    facts: [
      { label: "Status", value: stringValue(record.status) || "Unknown", state: "muted" },
      { label: "Evidence", value: evidenceIds.length ? String(evidenceIds.length) : "None linked", state: evidenceIds.length ? "ok" : "muted" },
      { label: "Mission consequence", value: stringValue(record.missionConsequence) || "Not assessed", state: stringValue(record.missionConsequence) ? "warn" : "muted" },
    ],
    disposition: null,
  }
}

function mapObjectNodes(records: UnknownRecord[]): FusionLineageNode[] {
  const result: FusionLineageNode[] = []
  for (const [index, record] of records.entries()) {
    const objectId = stringValue(record.id) || `object-${index}`
    result.push(objectNode(record, `object:${objectId}`, stringValue(record.name) || objectId, stringValue(record.summary) || "No object summary was supplied."))
    if (!Array.isArray(record.changes)) continue
    for (const [changeIndex, raw] of record.changes.entries()) {
      if (!isRecord(raw)) continue
      const changeId = stringValue(raw.id) || `${objectId}-change-${changeIndex}`
      const field = stringValue(raw.field) || "environmental field"
      const unit = stringValue(raw.unit)
      const current = raw.currentValue === null || raw.currentValue === undefined ? "Unknown" : String(raw.currentValue)
      result.push({
        ...objectNode(record, `change:${objectId}:${changeIndex}:${changeId}`, `${field} change`, `Nested change declared on ${stringValue(record.name) || objectId}.`),
        eyebrow: `Environmental change · ${stringValue(raw.direction) || "direction unknown"}`,
        observedAt: stringValue(raw.observedAt),
        evidenceIds: stringList(raw.evidenceIds),
        facts: [
          { label: "Previous", value: raw.previousValue === null || raw.previousValue === undefined ? "Unknown" : String(raw.previousValue), state: "muted" },
          { label: "Current", value: `${current}${unit ? ` ${unit}` : ""}`, state: "ok" },
        ],
      })
    }
  }
  return result
}

function mapAssessmentNodes(records: UnknownRecord[]): FusionLineageNode[] {
  return records
    .filter((record) => record.kind === "environmental_judgment")
    .map((record, index) => {
      const id = stringValue(record.id) || `review-${index}`
      const state = stringValue(record.state)
      const modeState = recordState(record)
      const assessmentState: LineageNodeState =
        modeState === "unavailable" || modeState === "partial"
          ? modeState
          : state === "accepted" || state === "rejected" || state === "pending"
            ? state
            : state === "in_review"
              ? "pending"
              : state === "deferred"
                ? "partial"
                : "unavailable"
      return {
        id: `assessment:${id}`,
        stage: "assessment",
        label: `Environmental judgment ${id}`,
        eyebrow: "Assessment · generic v1 review",
        summary: stringValue(record.judgment) || "No judgment text has been supplied.",
        state: assessmentState,
        recordRef: `${API_ROOT}/reviews/${encodeURIComponent(id)}`,
        domain: null,
        observedAt: stringValue(record.updatedAt),
        receivedAt: stringValue(record.updatedAt),
        sourceIds: [],
        objectIds: stringList(record.objectIds),
        evidenceIds: stringList(record.evidenceIds),
        confidence: null,
        uncertainty: "The generic review is not linked to a fusion-run contract.",
        contribution: null,
        modelRef: null,
        dataMode: recordMode(record),
        synthetic: record.synthetic === true,
        facts: [
          { label: "State", value: state || "Unknown", state: state === "rejected" ? "bad" : state === "accepted" ? "ok" : "warn" },
          { label: "Decided by", value: stringValue(record.decidedBy) || "Not decided", state: stringValue(record.decidedBy) ? "ok" : "muted" },
          { label: "Decided at", value: stringValue(record.decidedAt) || "Not decided", state: stringValue(record.decidedAt) ? "ok" : "muted" },
          { label: "Fusion run link", value: "Unavailable", state: "muted" },
        ],
        disposition: {
          state: state === "pending" || state === "in_review" || state === "accepted" || state === "rejected" || state === "deferred" ? state : "pending",
          reviewId: id,
          revision: numberValue(record.revision),
          localOnly: false,
          judgment: stringValue(record.judgment),
        },
      } satisfies FusionLineageNode
    })
}

function mapNarrativeNodes(records: UnknownRecord[]): FusionLineageNode[] {
  return records.map((record, index) => {
    const id = stringValue(record.id) || `narrative-${index}`
    const claims = Array.isArray(record.claims) ? record.claims.filter(isRecord) : []
    const caveats = Array.isArray(record.caveats) ? record.caveats.filter(isRecord) : []
    const objectIds = [...new Set(claims.flatMap((claim) => stringList(claim.objectIds)))]
    const evidenceIds = [...new Set([
      ...claims.flatMap((claim) => stringList(claim.evidenceIds)),
      ...caveats.flatMap((caveat) => stringList(caveat.evidenceIds)),
    ])]
    const modeState = recordState(record)
    const state: LineageNodeState = modeState === "unavailable" || modeState === "partial"
      ? modeState
      : record.stage === "approved_package"
        ? "accepted"
        : "pending"
    const reviewed = record.stage !== "draft"
    return {
      id: `narrative:${id}`,
      stage: "narrative",
      label: stringValue(record.title) || id,
      eyebrow: `Narrative version ${numberValue(record.ordinal) ?? "?"} · ${(stringValue(record.stage) || "stage unknown").replaceAll("_", " ")}`,
      summary: stringValue(record.executiveSummary) || "The narrative supplied no executive summary.",
      state,
      recordRef: `${API_ROOT}/narrative-versions/${encodeURIComponent(id)}`,
      domain: null,
      observedAt: stringValue(record.createdAt),
      receivedAt: stringValue(record.updatedAt),
      sourceIds: [],
      objectIds,
      evidenceIds,
      confidence: null,
      uncertainty: claims.length
        ? `${claims.length} explicit claim${claims.length === 1 ? "" : "s"}; inspect linked evidence and claim caveats before use.`
        : "No claims were supplied, so this version is not area-scoped.",
      contribution: null,
      modelRef: stringValue(record.schemaRef),
      dataMode: recordMode(record),
      synthetic: record.synthetic === true,
      facts: [
        { label: "Stage", value: (stringValue(record.stage) || "Unknown").replaceAll("_", " "), state: state === "accepted" ? "ok" : "warn" },
        { label: "Claims", value: String(claims.length), state: claims.length ? "ok" : "muted" },
        { label: "Caveats", value: String(caveats.length), state: caveats.length ? "warn" : "muted" },
        { label: "Immutable", value: record.immutable === true ? "Yes" : "No", state: record.immutable === true ? "ok" : "bad" },
      ],
      disposition: reviewed
        ? {
            state: record.stage === "approved_package" ? "accepted" : "in_review",
            reviewId: stringValue(record.reviewId),
            revision: numberValue(record.reviewRevision),
            localOnly: false,
            judgment: stringValue(record.executiveSummary),
          }
        : null,
    }
  })
}

function explicitEdges(
  sourceNodes: FusionLineageNode[],
  observations: FusionLineageNode[],
  normalizations: FusionLineageNode[],
  objects: FusionLineageNode[],
  assessments: FusionLineageNode[],
  narratives: FusionLineageNode[],
  relationships: UnknownRecord[],
  evidenceRecords: UnknownRecord[],
): FusionLineageEdge[] {
  const sourceByRecordId = new Map<string, string>()
  for (const node of sourceNodes) for (const sourceId of node.sourceIds) if (!sourceByRecordId.has(sourceId)) sourceByRecordId.set(sourceId, node.id)
  const objectByRecordId = new Map<string, string>()
  for (const node of objects) {
    if (!node.id.startsWith("object:")) continue
    for (const objectId of node.objectIds) if (!objectByRecordId.has(objectId)) objectByRecordId.set(objectId, node.id)
  }
  const edges: FusionLineageEdge[] = []
  for (const observation of observations) {
    for (const sourceId of observation.sourceIds) {
      const sourceNodeId = sourceByRecordId.get(sourceId)
      if (sourceNodeId) edges.push({ id: `edge:${sourceNodeId}:${observation.id}`, fromId: sourceNodeId, toId: observation.id, label: "produced", confidence: null, evidenceIds: observation.evidenceIds, synthetic: false })
    }
    for (const objectId of observation.objectIds) {
      const objectNodeId = objectByRecordId.get(objectId)
      if (objectNodeId) edges.push({ id: `edge:${observation.id}:${objectNodeId}`, fromId: observation.id, toId: objectNodeId, label: "explicit object link", confidence: null, evidenceIds: observation.evidenceIds, synthetic: false })
    }
  }
  for (const normalization of normalizations) {
    for (const objectId of normalization.objectIds) {
      const objectNodeId = objectByRecordId.get(objectId)
      if (objectNodeId) edges.push({ id: `edge:${normalization.id}:${objectNodeId}`, fromId: normalization.id, toId: objectNodeId, label: "evidence transformation link", confidence: normalization.confidence, evidenceIds: normalization.evidenceIds, synthetic: false })
    }
    for (const evidenceId of normalization.evidenceIds) {
      const evidence = evidenceRecords.find((record) => record.id === evidenceId)
      const sourceRecordIds = evidence && isRecord(evidence.lineage) ? stringList(evidence.lineage.sourceRecordIds) : []
      for (const observation of observations) {
        if (!observation.recordRef || !sourceRecordIds.includes(observation.recordRef)) continue
        edges.push({
          id: `edge:evidence-lineage:${observation.id}:${normalization.id}`,
          fromId: observation.id,
          toId: normalization.id,
          label: "declared evidence transformation input",
          confidence: normalization.confidence,
          evidenceIds: [evidenceId],
          synthetic: false,
        })
      }
    }
  }
  for (const change of objects.filter((node) => node.id.startsWith("change:"))) {
    const parentId = change.objectIds[0] ? objectByRecordId.get(change.objectIds[0]) : null
    if (parentId) edges.push({ id: `edge:${parentId}:${change.id}`, fromId: parentId, toId: change.id, label: "contains declared change", confidence: change.confidence, evidenceIds: change.evidenceIds, synthetic: false })
  }
  for (const assessment of assessments) {
    for (const objectId of assessment.objectIds) {
      const objectNodeId = objectByRecordId.get(objectId)
      if (objectNodeId) edges.push({ id: `edge:${objectNodeId}:${assessment.id}`, fromId: objectNodeId, toId: assessment.id, label: "review target", confidence: null, evidenceIds: assessment.evidenceIds, synthetic: false })
    }
  }
  for (const narrative of narratives) {
    for (const objectId of narrative.objectIds) {
      const objectNodeId = objectByRecordId.get(objectId)
      if (objectNodeId) edges.push({ id: `edge:${objectNodeId}:${narrative.id}`, fromId: objectNodeId, toId: narrative.id, label: "explicit narrative claim", confidence: null, evidenceIds: narrative.evidenceIds, synthetic: false })
    }
    for (const normalization of normalizations) {
      const sharedEvidence = normalization.evidenceIds.filter((id) => narrative.evidenceIds.includes(id))
      if (sharedEvidence.length) edges.push({ id: `edge:${normalization.id}:${narrative.id}`, fromId: normalization.id, toId: narrative.id, label: "declared narrative evidence", confidence: normalization.confidence, evidenceIds: sharedEvidence, synthetic: false })
    }
  }
  for (const relationship of relationships) {
    const fromId = stringValue(relationship.fromObjectId)
    const toId = stringValue(relationship.toObjectId)
    const fromNodeId = fromId ? objectByRecordId.get(fromId) : null
    const toNodeId = toId ? objectByRecordId.get(toId) : null
    if (!fromId || !toId || !fromNodeId || !toNodeId) continue
    edges.push({
      id: `edge:relationship:${stringValue(relationship.id) || `${fromId}:${toId}`}`,
      fromId: fromNodeId,
      toId: toNodeId,
      label: `explicit pairwise relationship · ${stringValue(relationship.relationshipType) || "unspecified"}`,
      confidence: confidenceScore(relationship),
      evidenceIds: stringList(relationship.evidenceIds),
      synthetic: relationship.synthetic === true,
    })
  }
  return edges
}

function fusionStage(kind: string): FusionStage {
  const normalized = kind.toLowerCase()
  if (normalized.includes("source") || normalized.includes("sensor") || normalized.includes("connector")) return "source"
  if (normalized.includes("observation")) return "observation"
  if (normalized.includes("normal") || normalized.includes("transform")) return "normalization"
  if (normalized.includes("object") || normalized.includes("change")) return "environmental_object"
  if (normalized.includes("assessment") || normalized.includes("review")) return "assessment"
  if (normalized.includes("narrative")) return "narrative"
  return "fusion_run"
}

function fusionExecutionState(value: unknown): LineageNodeState {
  const state = stringValue(value)
  if (state === "complete") return "available"
  if (state === "failed") return "rejected"
  if (state === "unavailable") return "unavailable"
  if (state === "queued" || state === "pending") return "pending"
  if (state === "running" || state === "held") return "partial"
  if (state === "simulated") return "simulated"
  return "unavailable"
}

function fusionRecordState(record: UnknownRecord, executionState: unknown = record.state): LineageNodeState {
  const mode = recordMode(record)
  if (mode === "unavailable") return "unavailable"
  if (mode === "degraded") return "partial"
  return fusionExecutionState(executionState)
}

function fusionArtifactState(record: UnknownRecord): LineageNodeState {
  const mode = recordMode(record)
  if (mode === "unavailable") return "unavailable"
  if (mode === "degraded") return "partial"
  return "available"
}

function fusionRunState(value: unknown): FusionRun["state"] {
  const state = stringValue(value)
  return state === "queued" || state === "running" || state === "complete" || state === "failed" || state === "unavailable" || state === "simulated"
    ? state
    : "unavailable"
}

function fusionReviewState(value: unknown): FusionRun["reviewState"] {
  const state = stringValue(value)
  return state === "pending" || state === "in_review" || state === "accepted" || state === "rejected" || state === "deferred"
    ? state
    : "unavailable"
}

function runLineageId(runId: string, nodeId: string): string {
  return `run-lineage:${runId}:${nodeId}`
}

interface OperationalRuns {
  nodes: FusionLineageNode[]
  edges: FusionLineageEdge[]
  conflicts: QueueItem[] | null
  contributions: SourceContribution[] | null
  runs: FusionRun[]
  model: FusionSnapshot["model"]
  timeline: TimelineEvent[]
}

function mapOperationalRuns(records: UnknownRecord[]): OperationalRuns {
  const ordered = [...records].sort((left, right) =>
    (parsedTime(right.completedAt) ?? parsedTime(right.updatedAt) ?? 0) -
    (parsedTime(left.completedAt) ?? parsedTime(left.updatedAt) ?? 0),
  )
  const nodes: FusionLineageNode[] = []
  const edges: FusionLineageEdge[] = []
  const runs: FusionRun[] = []
  const timeline: TimelineEvent[] = []

  for (const record of ordered) {
    const id = stringValue(record.id)
    if (!id) continue
    const runNodeId = `fusion-run:${id}`
    const lineage = Array.isArray(record.lineageNodes) ? record.lineageNodes.filter(isRecord) : []
    const lineageIds = new Set(lineage.map((item) => stringValue(item.id)).filter((item): item is string => Boolean(item)))
    const contributions = Array.isArray(record.contributions) ? record.contributions.filter(isRecord) : []
    const conflicts = Array.isArray(record.conflicts) ? record.conflicts.filter(isRecord) : []
    const evidenceIds = [...new Set([...contributions.flatMap((item) => stringList(item.evidenceIds)), ...conflicts.flatMap((item) => stringList(item.evidenceIds))])]
    const sourceIds = [...new Set(contributions.map((item) => stringValue(item.sourceId)).filter((item): item is string => Boolean(item)))]
    const reviewState = fusionReviewState(record.reviewState)
    const mode = recordMode(record)

    nodes.push({
      id: runNodeId,
      stage: "fusion_run",
      label: stringValue(record.summary) || `Fusion run ${id}`,
      eyebrow: `Fusion run · ${fusionRunState(record.state)}`,
      summary: stringValue(record.reason) || "The fusion-run contract supplied no reason.",
      state: fusionRecordState(record),
      recordRef: `${API_ROOT}/fusion-runs/${encodeURIComponent(id)}`,
      domain: null,
      observedAt: stringValue(record.startedAt),
      receivedAt: stringValue(record.receivedAt) || stringValue(record.updatedAt),
      sourceIds,
      objectIds: [],
      evidenceIds,
      confidence: numberValue(record.confidence),
      uncertainty: stringValue(record.uncertainty) || "The run supplied no uncertainty statement.",
      contribution: null,
      modelRef: stringValue(record.modelName)
        ? `${stringValue(record.modelName)}${stringValue(record.modelVersion) ? `@${stringValue(record.modelVersion)}` : ""}`
        : null,
      dataMode: mode,
      synthetic: record.synthetic === true,
      facts: [
        { label: "State", value: fusionRunState(record.state), state: fusionRunState(record.state) === "failed" ? "bad" : fusionRunState(record.state) === "complete" ? "ok" : "warn" },
        { label: "Inputs", value: numberValue(record.inputCount)?.toString() ?? String(stringList(record.inputNodeIds).length), state: "muted" },
        { label: "Outputs", value: numberValue(record.outputCount)?.toString() ?? String(stringList(record.outputNodeIds).length), state: "muted" },
        { label: "Review", value: reviewState.replaceAll("_", " "), state: reviewState === "accepted" ? "ok" : reviewState === "rejected" ? "bad" : "warn" },
      ],
      disposition: reviewState === "unavailable"
        ? null
        : {
            state: reviewState,
            reviewId: stringValue(record.reviewId),
            revision: numberValue(record.reviewRevision),
            localOnly: false,
            judgment: stringValue(record.summary),
          },
    })

    for (const item of lineage) {
      const lineageId = stringValue(item.id)
      if (!lineageId) continue
      const sourceId = stringValue(item.sourceId)
      nodes.push({
        id: runLineageId(id, lineageId),
        stage: fusionStage(stringValue(item.kind) || "fusion artifact"),
        label: stringValue(item.label) || lineageId,
        eyebrow: `Run lineage · ${stringValue(item.kind) || "artifact"}`,
        summary: `Explicit lineage node supplied by fusion run ${id}.`,
        state: fusionArtifactState(record),
        recordRef: stringValue(item.artifactRef),
        domain: null,
        observedAt: stringValue(item.eventTime) || stringValue(item.sourceTime),
        receivedAt: stringValue(item.receivedAt) || stringValue(record.receivedAt) || stringValue(record.updatedAt),
        sourceIds: sourceId ? [sourceId] : [],
        objectIds: [],
        evidenceIds: [],
        confidence: null,
        uncertainty: "The lineage-node contract supplies identity and timing, not an uncertainty interval.",
        contribution: null,
        modelRef: stringValue(record.modelName),
        dataMode: mode,
        synthetic: record.synthetic === true,
        facts: [
          { label: "Kind", value: stringValue(item.kind) || "Unknown", state: "muted" },
          { label: "Run", value: id, state: "ok" },
        ],
        disposition: null,
      })
    }

    for (const edge of Array.isArray(record.lineageEdges) ? record.lineageEdges.filter(isRecord) : []) {
      const edgeId = stringValue(edge.id)
      const upstream = stringValue(edge.upstreamNodeId)
      const downstream = stringValue(edge.downstreamNodeId)
      if (!edgeId || !upstream || !downstream || !lineageIds.has(upstream) || !lineageIds.has(downstream)) continue
      edges.push({
        id: `run-edge:${id}:${edgeId}`,
        fromId: runLineageId(id, upstream),
        toId: runLineageId(id, downstream),
        label: stringValue(edge.relation) || "run lineage",
        confidence: isRecord(edge.confidence) ? numberValue(edge.confidence.score) : null,
        evidenceIds: [],
        synthetic: record.synthetic === true,
      })
    }

    for (const inputId of stringList(record.inputNodeIds)) {
      if (lineageIds.has(inputId)) edges.push({ id: `run-input:${id}:${inputId}`, fromId: runLineageId(id, inputId), toId: runNodeId, label: "fusion run input", confidence: null, evidenceIds: [], synthetic: record.synthetic === true })
    }
    for (const outputId of stringList(record.outputNodeIds)) {
      if (lineageIds.has(outputId)) edges.push({ id: `run-output:${id}:${outputId}`, fromId: runNodeId, toId: runLineageId(id, outputId), label: "fusion run output", confidence: null, evidenceIds: [], synthetic: record.synthetic === true })
    }

    for (const step of Array.isArray(record.steps) ? record.steps.filter(isRecord) : []) {
      const stepId = stringValue(step.id)
      if (!stepId) continue
      const mappedStepId = `run-step:${id}:${stepId}`
      nodes.push({
        id: mappedStepId,
        stage: "fusion_run",
        label: stringValue(step.name) || stepId,
        eyebrow: `Fusion step ${numberValue(step.sequence) ?? "?"} · ${stringValue(step.state) || "unknown"}`,
        summary: stringValue(step.detail) || `Explicit workflow step supplied by fusion run ${id}.`,
        state: fusionRecordState(record, step.state),
        recordRef: `${API_ROOT}/fusion-runs/${encodeURIComponent(id)}#${encodeURIComponent(stepId)}`,
        domain: null,
        observedAt: stringValue(step.startedAt),
        receivedAt: stringValue(step.completedAt) || stringValue(record.updatedAt),
        sourceIds: [],
        objectIds: [],
        evidenceIds: [],
        confidence: null,
        uncertainty: "The step contract reports execution state but no confidence or uncertainty interval.",
        contribution: null,
        modelRef: stringValue(record.modelName),
        dataMode: mode,
        synthetic: record.synthetic === true,
        facts: [
          { label: "Sequence", value: numberValue(step.sequence)?.toString() || "Unknown", state: "muted" },
          { label: "Duration", value: numberValue(step.durationMs) === null ? "Unknown" : `${numberValue(step.durationMs)} ms`, state: "muted" },
        ],
        disposition: null,
      })
      for (const inputId of stringList(step.inputNodeIds)) if (lineageIds.has(inputId)) edges.push({ id: `step-input:${id}:${stepId}:${inputId}`, fromId: runLineageId(id, inputId), toId: mappedStepId, label: "step input", confidence: null, evidenceIds: [], synthetic: record.synthetic === true })
      for (const outputId of stringList(step.outputNodeIds)) if (lineageIds.has(outputId)) edges.push({ id: `step-output:${id}:${stepId}:${outputId}`, fromId: mappedStepId, toId: runLineageId(id, outputId), label: "step output", confidence: null, evidenceIds: [], synthetic: record.synthetic === true })
    }

    runs.push({
      id,
      state: fusionRunState(record.state),
      startedAt: stringValue(record.startedAt),
      completedAt: stringValue(record.completedAt),
      inputNodeIds: stringList(record.inputNodeIds).map((nodeId) => runLineageId(id, nodeId)),
      outputNodeIds: stringList(record.outputNodeIds).map((nodeId) => runLineageId(id, nodeId)),
      modelName: stringValue(record.modelName),
      modelVersion: stringValue(record.modelVersion),
      confidence: numberValue(record.confidence),
      uncertainty: stringValue(record.uncertainty),
      reviewState,
      reason: stringValue(record.reason) || "The fusion-run contract supplied no reason.",
      dataMode: mode,
      synthetic: record.synthetic === true,
    })
    timeline.push({
      id: `timeline:run:${id}`,
      at: stringValue(record.completedAt) || stringValue(record.startedAt) || stringValue(record.updatedAt),
      label: `Fusion run ${fusionRunState(record.state)}`,
      detail: stringValue(record.reason) || id,
      nodeIds: [runNodeId],
      state: "recorded",
      synthetic: record.synthetic === true,
    })
  }

  const latest = ordered[0] || null
  const latestContributions = latest && Array.isArray(latest.contributions) ? latest.contributions.filter(isRecord) : []
  const latestConflicts = latest && Array.isArray(latest.conflicts)
    ? latest.conflicts.filter(isRecord).filter((item) => item.state !== "resolved")
    : []
  const latestId = latest ? stringValue(latest.id) : null
  return {
    nodes,
    edges,
    runs,
    timeline,
    contributions: latest
      ? latestContributions.map((item) => ({
          id: stringValue(item.id) || `contribution:${stringValue(item.sourceId) || "unknown"}`,
          sourceId: stringValue(item.sourceId) || `unknown:${stringValue(item.id) || "contribution"}`,
          label: `${stringValue(item.modality) || "Source contribution"} · ${stringValue(item.summary) || "No summary"}`,
          contribution: numberValue(item.contributionScore),
          basis: `Explicit contribution ${stringValue(item.id) || "record"} from fusion run ${latestId || "unknown"}.`,
          synthetic: latest.synthetic === true,
        }))
      : null,
    conflicts: latest
      ? latestConflicts.map((item) => ({
          id: `run-conflict:${latestId || "unknown"}:${stringValue(item.id) || "conflict"}`,
          kind: "conflict",
          label: stringValue(item.fieldPath) || "Fusion conflict",
          detail: `${stringValue(item.summary) || "No conflict summary"} · ${stringValue(item.state) || "state unknown"}${stringValue(item.resolution) ? ` · ${stringValue(item.resolution)}` : ""}`,
          nodeIds: stringList(item.nodeIds).map((nodeId) => runLineageId(latestId || "unknown", nodeId)),
          observedAt: stringValue(latest.completedAt) || stringValue(latest.updatedAt),
          synthetic: latest.synthetic === true,
        }))
      : null,
    model: latest
      ? {
          state:
            (recordMode(latest) === "live" || recordMode(latest) === "recorded") &&
            (fusionRunState(latest.state) === "complete" || fusionRunState(latest.state) === "running") &&
            Boolean(stringValue(latest.modelName) || stringValue(latest.modelVersion) || stringList(latest.modelRefs).length)
              ? "available"
              : "unavailable",
          name: stringValue(latest.modelName),
          version: stringValue(latest.modelVersion),
          schemaVersion: stringValue(latest.schemaRef),
          evaluatedAt: stringValue(latest.completedAt) || stringValue(latest.updatedAt),
          basis:
            (recordMode(latest) === "live" || recordMode(latest) === "recorded") &&
            (fusionRunState(latest.state) === "complete" || fusionRunState(latest.state) === "running") &&
            Boolean(stringValue(latest.modelName) || stringValue(latest.modelVersion) || stringList(latest.modelRefs).length)
              ? `Model identity is supplied by fusion run ${latestId}. ${stringValue(latest.reason) || ""}`.trim()
              : `Fusion-run schema metadata is present for ${latestId}, but execution state, data mode, or model identity does not support an available-model claim.`,
          synthetic: latest.synthetic === true,
        }
      : { state: "unavailable", name: null, version: null, schemaVersion: null, evaluatedAt: null, basis: "No selected-area fusion run was returned.", synthetic: false },
  }
}

function activityTimeline(records: UnknownRecord[], mode: "recorded" | "replay" = "recorded"): TimelineEvent[] {
  return records.map((record, index) => ({
    id: stringValue(record.id) || `activity-${index}`,
    at: stringValue(record.occurredAt),
    label: (stringValue(record.actionType) || "activity").replaceAll("_", " "),
    detail: stringValue(record.judgment) || `Actor ${stringValue(record.actorId) || "unknown"} · append-only activity`,
    nodeIds: [...stringList(record.objectIds), ...stringList(record.evidenceIds)],
    state: mode,
    synthetic: record.namespace === "demo" || record.dataMode === "simulated",
  }))
}

function lateMissingQueue(sources: SourceTruth[]): QueueItem[] | null {
  const items = sources
    .filter((source) => ["unreachable", "unauthorized", "degraded"].includes(source.endpointReachability) || source.freshness === "stale" || source.dataPresence === "missing")
    .map((source) => ({
      id: `queue:${source.id}`,
      kind: source.freshness === "stale" ? ("late" as const) : ("missing" as const),
      label: `${source.label} ${source.freshness === "stale" ? "is stale" : "is not available"}`,
      detail: source.reason,
      nodeIds: [source.id],
      observedAt: source.observedAt,
      synthetic: false,
    }))
  return items.length ? items : null
}

function deriveCondition(outcomes: V1Outcomes, recordCount: number): FusionCondition {
  const values = Object.values(outcomes)
  const failures = values.filter((item) => !item.ok)
  if (failures.length === values.length) {
    if (failures.every((item) => item.status === 401 || item.status === 403)) return "unauthorized"
    return "unavailable"
  }
  if (failures.length > 0 || values.some((item) => item.schemaValid === false)) return "degraded"
  const readinessStatus = isRecord(outcomes.readiness.payload) ? stringValue(outcomes.readiness.payload.status) : null
  if (readinessStatus === "degraded" || readinessStatus === "not_ready") return "degraded"
  return recordCount === 0 ? "empty" : "ready"
}

function deriveScopedCondition(base: FusionCondition, records: UnknownRecord[]): FusionCondition {
  if (base !== "ready") return base
  if (records.some((record) => recordMode(record) === "degraded" || record.state === "degraded")) return "degraded"
  const unavailable = records.filter((record) => recordMode(record) === "unavailable")
  if (unavailable.length) {
    const operational = records.some((record) => {
      const mode = recordMode(record)
      return mode === "live" || mode === "recorded"
    })
    return operational ? "partial" : "unavailable"
  }
  if (records.some((record) => record.state === "stale" || (isRecord(record.freshness) && record.freshness.state === "stale"))) return "stale"
  return base
}

function parsedTime(value: unknown): number | null {
  const raw = stringValue(value)
  if (!raw) return null
  const parsed = Date.parse(raw)
  return Number.isFinite(parsed) ? parsed : null
}

function withinRange(value: unknown, startMs: number, endMs: number): boolean {
  const parsed = parsedTime(value)
  return parsed !== null && parsed >= startMs && parsed <= endMs
}

function overlapsRange(start: unknown, end: unknown, startMs: number, endMs: number): boolean {
  const recordStart = parsedTime(start)
  const recordEnd = parsedTime(end) ?? recordStart
  return recordStart !== null && recordEnd !== null && recordStart <= endMs && recordEnd >= startMs
}

function isOperationalRecord(record: UnknownRecord): boolean {
  const mode = recordMode(record)
  return record.namespace === "operational" && record.synthetic !== true && mode !== "simulated" && mode !== "replay"
}

function collectionOutcomes(outcomes: V1Outcomes): V1Outcomes {
  const readiness = outcomes.readiness.ok && !isReadinessPayload(outcomes.readiness.payload)
    ? {
        ...outcomes.readiness,
        schemaValid: false,
        error: outcomes.readiness.error || "HTTP 200: readiness did not match the complete v1 contract.",
      }
    : outcomes.readiness
  return {
    readiness,
    contexts: validatePageOutcome(outcomes.contexts, isMissionContextRecord),
    sources: validatePageOutcome(outcomes.sources, isSourceRecord),
    coverage: validatePageOutcome(outcomes.coverage, isCoverageRecord),
    observations: validatePageOutcome(outcomes.observations, isObservationRecord),
    objects: validatePageOutcome(outcomes.objects, isObjectRecord),
    relationships: validatePageOutcome(outcomes.relationships, isRelationshipRecord),
    evidence: validatePageOutcome(outcomes.evidence, isEvidenceRecord),
    reviews: validatePageOutcome(outcomes.reviews, isReviewRecord),
    activity: validatePageOutcome(outcomes.activity, isActivityRecord),
    fusionRuns: validatePageOutcome(outcomes.fusionRuns, isFusionRunRecord),
    narratives: validatePageOutcome(outcomes.narratives, isNarrativeRecord),
  }
}

export function buildOperationalSnapshot(
  context: FusionContext,
  outcomes: V1Outcomes,
  now = new Date().toISOString(),
): FusionSnapshot {
  const effectiveOutcomes = collectionOutcomes(outcomes)
  const nowMs = parsedTime(now) ?? Date.now()
  const selectedRange = timeRangeForContext(context, nowMs)
  if (!selectedRange) {
    return baseUnavailableSnapshot(
      context,
      "unavailable",
      outcomes.readiness,
      "The requested start/end range is invalid or lacks an explicit UTC offset. No rolling window was substituted.",
    )
  }
  const startMs = Date.parse(selectedRange.start)
  const endMs = Date.parse(selectedRange.end)
  const matchesContext = (record: UnknownRecord) =>
    isOperationalRecord(record) &&
    record.missionId === context.missionId &&
    record.missionAreaId === context.missionAreaId

  const matchingContextRecords = (pageItems(effectiveOutcomes.contexts) ?? []).filter(matchesContext)
  const contextRecords = context.contextId
    ? matchingContextRecords.filter((record) => record.id === context.contextId)
    : matchingContextRecords
  const scopedContextIds = new Set(contextRecords.map((record) => stringValue(record.id)).filter((value): value is string => Boolean(value)))
  const allSources = (pageItems(effectiveOutcomes.sources) ?? []).filter(isOperationalRecord)
  const coverageRecords = (pageItems(effectiveOutcomes.coverage) ?? []).filter((record) =>
    matchesContext(record) &&
    isRecord(record.timeRange) &&
    overlapsRange(record.timeRange.start, record.timeRange.end, startMs, endMs),
  )
  const observationRecords = (pageItems(effectiveOutcomes.observations) ?? []).filter((record) =>
    matchesContext(record) && withinRange(record.observedAt ?? record.receivedAt, startMs, endMs),
  )
  const objectRecords = (pageItems(effectiveOutcomes.objects) ?? []).filter((record) =>
    matchesContext(record) &&
    isRecord(record.temporalBounds) &&
    overlapsRange(record.temporalBounds.start, record.temporalBounds.end, startMs, endMs),
  )
  const evidenceRecords = (pageItems(effectiveOutcomes.evidence) ?? []).filter((record) =>
    matchesContext(record) && withinRange(record.observedAt ?? record.receivedAt, startMs, endMs),
  )
  const scopedObjectIds = new Set(objectRecords.map((record) => stringValue(record.id)).filter((value): value is string => Boolean(value)))
  const scopedEvidenceIds = new Set(evidenceRecords.map((record) => stringValue(record.id)).filter((value): value is string => Boolean(value)))
  const preRunScopedSourceIds = new Set([
    ...coverageRecords.map((record) => stringValue(record.sourceId)),
    ...observationRecords.map((record) => stringValue(record.sourceId)),
    ...objectRecords.flatMap((record) => stringList(record.sourceIds)),
    ...evidenceRecords.map((record) => stringValue(record.sourceId)),
  ].filter((value): value is string => Boolean(value)))
  const relationshipRecords = (pageItems(effectiveOutcomes.relationships) ?? []).filter((record) =>
    isOperationalRecord(record) &&
    record.missionId === context.missionId &&
    scopedObjectIds.has(stringValue(record.fromObjectId) || "") &&
    scopedObjectIds.has(stringValue(record.toObjectId) || ""),
  )
  const reviewRecords = (pageItems(effectiveOutcomes.reviews) ?? []).filter((record) => {
    const refs = [...stringList(record.objectIds), ...stringList(record.evidenceIds)]
    return (
      isOperationalRecord(record) &&
      record.missionId === context.missionId &&
      withinRange(record.updatedAt, startMs, endMs) &&
      refs.length > 0 &&
      stringList(record.objectIds).every((id) => scopedObjectIds.has(id)) &&
      stringList(record.evidenceIds).every((id) => scopedEvidenceIds.has(id))
    )
  })
  const scopedReviewIds = new Set(reviewRecords.map((record) => stringValue(record.id)).filter((value): value is string => Boolean(value)))
  const allNarrativeRecords = pageItems(effectiveOutcomes.narratives) ?? []
  const narrativeRecords = allNarrativeRecords.filter((record) => {
    const claims = Array.isArray(record.claims) ? record.claims.filter(isRecord) : []
    const caveats = Array.isArray(record.caveats) ? record.caveats.filter(isRecord) : []
    const claimObjectIds = claims.flatMap((claim) => stringList(claim.objectIds))
    const claimEvidenceIds = claims.flatMap((claim) => stringList(claim.evidenceIds))
    const caveatEvidenceIds = caveats.flatMap((caveat) => stringList(caveat.evidenceIds))
    return (
      isOperationalRecord(record) &&
      record.missionId === context.missionId &&
      withinRange(record.updatedAt, startMs, endMs) &&
      claimObjectIds.length + claimEvidenceIds.length > 0 &&
      claimObjectIds.every((id) => scopedObjectIds.has(id)) &&
      claimEvidenceIds.every((id) => scopedEvidenceIds.has(id)) &&
      caveatEvidenceIds.every((id) => scopedEvidenceIds.has(id))
    )
  })
  const activityRecords = (pageItems(effectiveOutcomes.activity) ?? []).filter((record) => {
    const refs = [...stringList(record.objectIds), ...stringList(record.evidenceIds)]
    return (
      isOperationalRecord(record) &&
      record.missionId === context.missionId &&
      withinRange(record.occurredAt, startMs, endMs) &&
      refs.length > 0 &&
      stringList(record.objectIds).every((id) => scopedObjectIds.has(id)) &&
      stringList(record.evidenceIds).every((id) => scopedEvidenceIds.has(id))
    )
  })
  const allFusionRunRecords = pageItems(effectiveOutcomes.fusionRuns) ?? []
  const scopedIdsByLineageKind = new Map<string, Set<string>>([
    ["source", preRunScopedSourceIds],
    ["coverage", new Set(coverageRecords.map((record) => stringValue(record.id)).filter((value): value is string => Boolean(value)))],
    ["modality_coverage", new Set(coverageRecords.map((record) => stringValue(record.id)).filter((value): value is string => Boolean(value)))],
    ["observation", new Set(observationRecords.map((record) => stringValue(record.id)).filter((value): value is string => Boolean(value)))],
    ["environmental_object", scopedObjectIds],
    ["object", scopedObjectIds],
    ["environmental_change", scopedObjectIds],
    ["change", scopedObjectIds],
    ["fusion_product", scopedObjectIds],
    ["product", scopedObjectIds],
    ["evidence", scopedEvidenceIds],
    ["relationship", new Set(relationshipRecords.map((record) => stringValue(record.id)).filter((value): value is string => Boolean(value)))],
    ["review", scopedReviewIds],
    ["assessment", scopedReviewIds],
    ["environmental_judgment", scopedReviewIds],
    ["activity", new Set(activityRecords.map((record) => stringValue(record.id)).filter((value): value is string => Boolean(value)))],
    ["context", scopedContextIds],
    ["mission_context", scopedContextIds],
    ["narrative", new Set(narrativeRecords.map((record) => stringValue(record.id)).filter((value): value is string => Boolean(value)))],
    ["narrative_version", new Set(narrativeRecords.map((record) => stringValue(record.id)).filter((value): value is string => Boolean(value)))],
  ])
  const artifactRefMatches = (artifactRef: string, scopedIds: Set<string>) => [...scopedIds].some((recordId) => (
    artifactRef === recordId || artifactRef.endsWith(`/${recordId}`) || artifactRef.endsWith(`#${recordId}`)
  ))
  const lineageArtifactIsScoped = (node: UnknownRecord) => {
    const artifactRef = stringValue(node.artifactRef)
    if (!artifactRef) return true
    const kind = stringValue(node.kind)?.toLowerCase().replaceAll("-", "_").replaceAll(" ", "_")
    const scopedIds = kind ? scopedIdsByLineageKind.get(kind) : null
    return Boolean(scopedIds && artifactRefMatches(artifactRef, scopedIds))
  }
  const fusionRunRecords = allFusionRunRecords.filter((record) => {
    const contextId = stringValue(record.contextId)
    const lineage = Array.isArray(record.lineageNodes) ? record.lineageNodes.filter(isRecord) : []
    const artifactRefs = lineage.filter((node) => Boolean(stringValue(node.artifactRef)))
    const lineageSourceIds = lineage.map((node) => stringValue(node.sourceId)).filter((value): value is string => Boolean(value))
    const contributions = Array.isArray(record.contributions) ? record.contributions.filter(isRecord) : []
    const contributionSourceIds = contributions.map((item) => stringValue(item.sourceId)).filter((value): value is string => Boolean(value))
    const contributionEvidenceIds = contributions.flatMap((item) => stringList(item.evidenceIds))
    const conflictEvidenceIds = Array.isArray(record.conflicts)
      ? record.conflicts.filter(isRecord).flatMap((item) => stringList(item.evidenceIds))
      : []
    const reviewId = stringValue(record.reviewId)
    const hasAreaBearingReference = (
      artifactRefs.length +
      lineageSourceIds.length +
      contributionSourceIds.length +
      contributionEvidenceIds.length +
      conflictEvidenceIds.length +
      (reviewId ? 1 : 0)
    ) > 0
    const suppliedTypedReferencesAreScoped = (
      artifactRefs.every(lineageArtifactIsScoped) &&
      lineageSourceIds.every((id) => preRunScopedSourceIds.has(id)) &&
      contributionSourceIds.every((id) => preRunScopedSourceIds.has(id)) &&
      contributionEvidenceIds.every((id) => scopedEvidenceIds.has(id)) &&
      conflictEvidenceIds.every((id) => scopedEvidenceIds.has(id)) &&
      (!reviewId || scopedReviewIds.has(reviewId))
    )
    const explicitlyLinkedToArea = contextId
      ? scopedContextIds.has(contextId) && suppliedTypedReferencesAreScoped
      : hasAreaBearingReference && suppliedTypedReferencesAreScoped
    const inSelectedTime = isRecord(record.timeRange)
      ? overlapsRange(record.timeRange.start, record.timeRange.end, startMs, endMs)
      : withinRange(record.completedAt ?? record.startedAt ?? record.updatedAt, startMs, endMs)
    return isOperationalRecord(record) && record.missionId === context.missionId && explicitlyLinkedToArea && inSelectedTime
  })
  const scopedSourceIds = new Set([
    ...preRunScopedSourceIds,
    ...fusionRunRecords.flatMap((record) => Array.isArray(record.contributions)
      ? record.contributions.filter(isRecord).map((item) => stringValue(item.sourceId))
      : []),
  ].filter((value): value is string => Boolean(value)))
  const sources = allSources.filter((record) => scopedSourceIds.has(stringValue(record.id) || ""))
  const sourceTruth = sources.length
    ? mapSourceTruth(sources, effectiveOutcomes.sources, coverageRecords, evidenceRecords)
    : allSources.length
      ? [{
          ...systemTruth(effectiveOutcomes.sources),
          recordCount: null,
          dataPresence: "unknown" as const,
          coverage: "unavailable" as const,
          reason: "The global source inventory returned records, but none was explicitly linked to the selected mission area and time window. Global record counts are not presented as area presence.",
        }]
      : mapSourceTruth([], effectiveOutcomes.sources, coverageRecords, evidenceRecords)

  const sourceNodes = sources.length
    ? sources.map((record, index) => {
        const truth = sourceTruth[index]
        return {
          id: `source:${truth.id}`,
          stage: "source" as const,
          label: truth.label,
          eyebrow: `Source · ${truth.sourceType}`,
          summary: truth.reason,
          state:
            recordMode(record) === "degraded"
              ? ("partial" as const)
              : recordMode(record) === "unavailable"
                ? ("unavailable" as const)
                : truth.endpointReachability === "reachable"
                  ? ("available" as const)
                  : ("unavailable" as const),
          recordRef: truth.endpointRef,
          domain: null,
          observedAt: truth.observedAt,
          receivedAt: truth.receivedAt,
          sourceIds: [truth.id],
          objectIds: [],
          evidenceIds: [],
          confidence: null,
          uncertainty: "Source readiness does not imply observation confidence.",
          contribution: null,
          modelRef: null,
          dataMode: recordMode(record),
          synthetic: truth.synthetic,
          facts: [
            { label: "Endpoint", value: truth.endpointReachability, state: truth.endpointReachability === "reachable" ? "ok" as const : "muted" as const },
            { label: "Presence", value: truth.dataPresence.replaceAll("_", " "), state: truth.dataPresence === "present" ? "ok" as const : "muted" as const },
          ],
          disposition: null,
        }
      })
    : [unavailableNode("source", "gap-source", "No source readiness records", effectiveOutcomes.sources.error || "The source collection is unavailable or validly empty.")]

  const observations = mapObservationNodes(observationRecords)
  const normalization = mapNormalizationNodes(evidenceRecords)
  const objects = mapObjectNodes(objectRecords)
  const assessments = mapAssessmentNodes(reviewRecords)
  const narratives = mapNarrativeNodes(narrativeRecords)
  const operationalRuns = mapOperationalRuns(fusionRunRecords)
  const runCapabilityAvailable = effectiveOutcomes.fusionRuns.ok && effectiveOutcomes.fusionRuns.schemaValid === true
  const stageNodes: FusionLineageNode[] = [
    ...sourceNodes,
    ...(observations.length ? observations : [unavailableNode("observation", "gap-observation", "No observations", effectiveOutcomes.observations.error || "No observation records were returned for this mission area and time window.")]),
    ...(normalization.length ? normalization : [unavailableNode("normalization", "gap-normalization", "Normalization result unavailable", "V1 exposes evidence transformations when present, but it has no normalization outcome or schema-status resource.")]),
    ...(operationalRuns.nodes.length
      ? operationalRuns.nodes
      : [unavailableNode(
          "fusion_run",
          "gap-fusion-run",
          "No selected-area fusion run",
          effectiveOutcomes.fusionRuns.error ||
            (allFusionRunRecords.length
              ? "Fusion runs were returned for this mission, but none was explicitly linked to the selected mission-area context and time window."
              : "The fusion-run resource returned a valid empty collection for this mission."),
        )]),
    ...(objects.length ? objects : [unavailableNode("environmental_object", "gap-object", "No environmental object or change", effectiveOutcomes.objects.error || "No object records were returned for this mission area and time window.")]),
    ...(assessments.length ? assessments : [unavailableNode("assessment", "gap-assessment", "Fusion assessment unavailable", "V1 reviews can carry environmental judgments, but no review is linked to a fusion-run record.")]),
    ...(narratives.length
      ? narratives
      : [unavailableNode(
          "narrative",
          "gap-narrative",
          "No selected-area narrative version",
          effectiveOutcomes.narratives.error ||
            (allNarrativeRecords.length
              ? "Narrative versions were returned for this mission, but none was linked exclusively to objects or evidence in the selected area and time window."
              : "The narrative-version resource returned a valid empty collection for this mission."),
        )]),
  ]

  const recordCount =
    sources.length +
    coverageRecords.length +
    observationRecords.length +
    objectRecords.length +
    relationshipRecords.length +
    evidenceRecords.length +
    reviewRecords.length +
    activityRecords.length +
    fusionRunRecords.length +
    narrativeRecords.length
  const condition = deriveScopedCondition(deriveCondition(effectiveOutcomes, recordCount), [
    ...sources,
    ...coverageRecords,
    ...observationRecords,
    ...objectRecords,
    ...relationshipRecords,
    ...evidenceRecords,
    ...reviewRecords,
    ...activityRecords,
    ...fusionRunRecords,
    ...narrativeRecords,
  ])
  const readinessPayload = isReadinessPayload(effectiveOutcomes.readiness.payload) ? effectiveOutcomes.readiness.payload : null
  const identityMode = readinessPayload?.identityMode === "development_header_unverified" ? "development_header_unverified" : "unknown"
  const gaps = [
    "Pairwise environmental relationships are not promoted into correlation groups.",
    "Absent coverage and recordCount=0 are collection states, never measured environmental absence.",
    "Forecast is not present in the v1 data-mode contract. Replay is append-only activity, not reconstructed environmental state.",
    "Fusion-run output is not promoted into narrative text unless an immutable narrative-version record explicitly links scoped objects or evidence.",
  ]
  if (!fusionRunRecords.length) {
    gaps.unshift(effectiveOutcomes.fusionRuns.error
      ? `Fusion-run capability: ${effectiveOutcomes.fusionRuns.error}`
      : "Fusion-run capability is bound, but no run was explicitly scoped to this mission area/context and time window.")
  } else {
    if (!operationalRuns.contributions?.length) gaps.unshift("The latest scoped fusion run supplied no source-contribution records.")
    if (!operationalRuns.conflicts?.length) gaps.unshift("The latest scoped fusion run supplied no active unresolved or acknowledged conflict records.")
  }
  if (!narrativeRecords.length) {
    gaps.unshift(effectiveOutcomes.narratives.error
      ? `Narrative-version capability: ${effectiveOutcomes.narratives.error}`
      : "Narrative-version capability is bound, but no immutable version was explicitly scoped to this mission area and time window.")
  }
  const readinessStatus = readinessPayload ? stringValue(readinessPayload.status) : null
  if (readinessStatus === "degraded" || readinessStatus === "not_ready") {
    gaps.unshift(`V1 readiness reports ${readinessStatus.replaceAll("_", " ")}; operational records remain read-only and the top-level condition cannot be READY.`)
  }
  if (effectiveOutcomes.readiness.error) gaps.unshift(`V1 readiness: ${effectiveOutcomes.readiness.error}`)

  return {
    schema: DATA_FUSION_SCHEMA,
    generatedAt: now,
    context,
    condition,
    identityMode,
    operatorId: OPERATOR_ID,
    sourceTruth,
    coverage: emptyCoverage("No explicit sensing-modality coverage contract is bound. Environmental-domain coverage is retained on source records."),
    nodes: stageNodes,
    edges: [
      ...explicitEdges(sourceNodes, observations, normalization, objects, assessments, narratives, relationshipRecords, evidenceRecords),
      ...operationalRuns.edges,
    ],
    correlations: null,
    conflicts: runCapabilityAvailable ? operationalRuns.conflicts ?? [] : null,
    lateMissing: lateMissingQueue(sourceTruth),
    contributions: runCapabilityAvailable ? operationalRuns.contributions ?? [] : null,
    model: operationalRuns.model,
    runs: runCapabilityAvailable ? operationalRuns.runs : null,
    timeline: [...activityTimeline(activityRecords), ...operationalRuns.timeline].sort((left, right) =>
      (parsedTime(left.at) ?? 0) - (parsedTime(right.at) ?? 0),
    ),
    gaps,
    note:
      condition === "empty"
        ? "The queried collections were validly empty. That does not mean the environment was measured and clear."
        : condition === "unavailable"
          ? "The v1 provider did not return operational records. No values were estimated in its place."
          : "Operational records are shown only where explicit v1 links exist; unsupported fusion stages remain unavailable.",
  }
}

function baseUnavailableSnapshot(
  context: FusionContext,
  condition: "forecast" | "replay" | "unavailable",
  readiness: TransportOutcome,
  note: string,
): FusionSnapshot {
  const stages = [
    unavailableNode("source", "gap-source", "Source state unavailable", readiness.error || "No source collection was requested for this mode."),
    unavailableNode("observation", "gap-observation", "Observations unavailable", note),
    unavailableNode("normalization", "gap-normalization", "Normalization unavailable", note),
    unavailableNode("fusion_run", "gap-fusion-run", "Fusion run unavailable", note),
    unavailableNode("environmental_object", "gap-object", "Environmental state unavailable", note),
    unavailableNode("assessment", "gap-assessment", "Assessment unavailable", note),
    unavailableNode("narrative", "gap-narrative", "Narrative unavailable", note),
  ]
  return {
    schema: DATA_FUSION_SCHEMA,
    generatedAt: readiness.receivedAt,
    context,
    condition,
    identityMode: isReadinessPayload(readiness.payload) && readiness.payload.identityMode === "development_header_unverified" ? "development_header_unverified" : "unknown",
    operatorId: OPERATOR_ID,
    sourceTruth: [systemTruth(readiness)],
    coverage: emptyCoverage(note),
    nodes: stages,
    edges: [],
    correlations: null,
    conflicts: null,
    lateMissing: null,
    contributions: null,
    model: { state: "unavailable", name: null, version: null, schemaVersion: null, evaluatedAt: null, basis: note, synthetic: false },
    runs: null,
    timeline: [],
    gaps: [note],
    note,
  }
}

export function buildReplaySnapshot(
  context: FusionContext,
  readiness: TransportOutcome,
  replay: TransportOutcome,
): FusionSnapshot {
  if (!replay.ok || replay.schemaValid !== true || !isRecord(replay.payload) || !Array.isArray(replay.payload.items)) {
    return baseUnavailableSnapshot(
      context,
      "replay",
      readiness,
      replay.error || "Activity replay is unavailable; no current environmental records are mixed into replay mode.",
    )
  }
  const records = replay.payload.items.filter(isRecord)
  const activityNodes: FusionLineageNode[] = records.map((record, index) => {
    const action = stringValue(record.actionType) || "activity"
    const stage: FusionStage = action.startsWith("review") || action === "judgment_recorded"
      ? "assessment"
      : action === "observation_recorded"
        ? "observation"
        : action === "connector_state_changed"
          ? "source"
          : "environmental_object"
    const id = stringValue(record.id) || `replay-activity-${index}`
    return {
      id: `replay:${id}`,
      stage,
      label: action.replaceAll("_", " "),
      eyebrow: "Append-only activity replay",
      summary: stringValue(record.judgment) || "Activity record; environmental state is not reconstructed.",
      state: "available",
      recordRef: `${API_ROOT}/activity#${id}`,
      domain: null,
      observedAt: stringValue(record.occurredAt),
      receivedAt: stringValue(record.occurredAt),
      sourceIds: [],
      objectIds: stringList(record.objectIds),
      evidenceIds: stringList(record.evidenceIds),
      confidence: null,
      uncertainty: "Activity replay does not reconstruct the historical fusion state.",
      contribution: null,
      modelRef: null,
      dataMode: "replay",
      synthetic: false,
      facts: [{ label: "Sequence", value: numberValue(record.sequence)?.toString() || "Unknown", state: "muted" }],
      disposition: null,
    }
  })
  const byStage = new Map<FusionStage, FusionLineageNode[]>()
  for (const item of activityNodes) byStage.set(item.stage, [...(byStage.get(item.stage) || []), item])
  const nodes = (["source", "observation", "normalization", "fusion_run", "environmental_object", "assessment", "narrative"] as FusionStage[]).flatMap((stage) =>
    byStage.get(stage) || [unavailableNode(stage, `replay-gap-${stage}`, `${stage.replaceAll("_", " ")} not reconstructed`, "Replay returns activity history only.")],
  )
  return {
    ...baseUnavailableSnapshot(context, "replay", readiness, "Replay is mission-wide append-only activity because the endpoint has no mission-area filter; it is not a reconstructed environmental or fusion state."),
    generatedAt: replay.receivedAt,
    sourceTruth: [systemTruth(readiness)],
    nodes,
    timeline: activityTimeline(records, "replay"),
    note: records.length
      ? "REPLAY shows mission-wide append-only activity in recorded order. The endpoint has no mission-area filter; current live objects, conclusions, and source values are intentionally not mixed in."
      : "The mission-wide replay query returned no activity. This is an empty activity window, not measured environmental absence.",
  }
}

async function requestOutcome(
  endpoint: string,
  context: FusionContext,
  signal: AbortSignal | undefined,
  validator: (payload: unknown) => boolean,
  init?: RequestInit,
): Promise<TransportOutcome> {
  const receivedAt = new Date().toISOString()
  try {
    const response = await fetch(endpoint, {
      ...init,
      cache: "no-store",
      signal,
      headers: {
        Accept: "application/json",
        ...(init?.headers || {}),
        "X-Operator-Id": OPERATOR_ID,
        // URL/UI role is display-only. Provider reads always use fixed least privilege.
        "X-Operator-Role": PROVIDER_READ_ROLE,
      },
    })
    let payload: unknown = null
    try {
      payload = await response.json()
    } catch {
      payload = null
    }
    const schemaValid = response.ok ? validator(payload) : null
    const detail = isRecord(payload) && isRecord(payload.detail) ? payload.detail : null
    const structuredError = isRecord(payload) && isRecord(payload.error) ? payload.error : null
    const error = response.ok
      ? schemaValid
        ? null
        : `HTTP ${response.status}: response schema did not match the expected v1 envelope.`
      : stringValue(structuredError?.message) || stringValue(detail?.reason) || stringValue(detail?.error) || `HTTP ${response.status}`
    return { endpoint, ok: response.ok, status: response.status, receivedAt, payload, error, schemaValid }
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error
    return {
      endpoint,
      ok: false,
      status: null,
      receivedAt,
      payload: null,
      error: error instanceof Error ? error.message : "Endpoint unreachable",
      schemaValid: null,
    }
  }
}

function cursorEndpoint(endpoint: string, cursor: string): string {
  return `${endpoint}${endpoint.includes("?") ? "&" : "?"}cursor=${encodeURIComponent(cursor)}`
}

async function requestPageOutcome(
  endpoint: string,
  context: FusionContext,
  signal: AbortSignal | undefined,
  itemValidator: ItemValidator,
): Promise<TransportOutcome> {
  const validator = pageValidator(itemValidator)
  const first = await requestOutcome(endpoint, context, signal, validator)
  if (!first.ok || first.schemaValid !== true || !isRecord(first.payload) || !Array.isArray(first.payload.items) || !isRecord(first.payload.page)) {
    return first
  }

  const items = [...first.payload.items]
  const seen = new Set<string>()
  let cursor = stringValue(first.payload.page.nextCursor)
  let receivedAt = first.receivedAt
  let pageCount = 1

  if (first.payload.page.hasMore === true && !cursor) {
    return { ...first, schemaValid: false, error: "Collection declared more records but supplied no next cursor." }
  }

  while (cursor) {
    if (seen.has(cursor) || pageCount >= 100) {
      return {
        ...first,
        schemaValid: false,
        error: seen.has(cursor)
          ? "Collection pagination repeated a cursor; the incomplete result was discarded."
          : "Collection pagination exceeded the 100-page safety bound; the incomplete result was discarded.",
      }
    }
    seen.add(cursor)
    const next = await requestOutcome(cursorEndpoint(endpoint, cursor), context, signal, validator)
    if (!next.ok || next.schemaValid !== true || !isRecord(next.payload) || !Array.isArray(next.payload.items) || !isRecord(next.payload.page)) {
      return { ...next, endpoint, payload: null, error: next.error || "A later collection page was unavailable; the incomplete result was discarded." }
    }
    items.push(...next.payload.items)
    receivedAt = next.receivedAt
    cursor = stringValue(next.payload.page.nextCursor)
    if (next.payload.page.hasMore === true && !cursor) {
      return { ...first, receivedAt, schemaValid: false, error: "Collection declared more records but supplied no next cursor." }
    }
    pageCount += 1
  }

  return {
    ...first,
    receivedAt,
    payload: {
      items,
      page: { limit: numberValue(first.payload.page.limit) || 200, nextCursor: null, hasMore: false },
    },
  }
}

function replayQueryMatches(
  payload: UnknownRecord,
  missionId: string,
  timeRange: { start: string; end: string },
  cursor: string | null,
): boolean {
  if (!isRecord(payload.query) || !isRecord(payload.query.timeRange)) return false
  return (
    payload.query.missionId === missionId &&
    payload.query.namespace === "operational" &&
    payload.query.timeRange.start === timeRange.start &&
    payload.query.timeRange.end === timeRange.end &&
    (payload.query.cursor ?? null) === cursor &&
    payload.query.limit === 200
  )
}

async function requestReplayOutcome(
  context: FusionContext,
  timeRange: { start: string; end: string },
  signal: AbortSignal | undefined,
): Promise<TransportOutcome> {
  const endpoint = `${API_ROOT}/replay`
  const requestPage = (cursor: string | null) => requestOutcome(endpoint, context, signal, isReplayPayload, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      missionId: context.missionId,
      namespace: "operational",
      timeRange,
      cursor,
      limit: 200,
    }),
  })
  const first = await requestPage(null)
  if (!first.ok || first.schemaValid !== true || !isRecord(first.payload) || !isRecord(first.payload.page) || !isRecord(first.payload.query) || !Array.isArray(first.payload.items)) return first
  if (!replayQueryMatches(first.payload, context.missionId, timeRange, null)) {
    return { ...first, payload: null, schemaValid: false, error: "Replay response did not echo the exact requested mission, namespace, time range, cursor, and limit." }
  }

  const items = [...first.payload.items]
  const seen = new Set<string>()
  let cursor = stringValue(first.payload.page.nextCursor)
  let receivedAt = first.receivedAt
  let pageCount = 1
  while (cursor) {
    if (seen.has(cursor) || pageCount >= 100) {
      return {
        ...first,
        payload: null,
        schemaValid: false,
        error: seen.has(cursor)
          ? "Replay pagination repeated a cursor; the incomplete history was discarded."
          : "Replay pagination exceeded the 100-page safety bound; the incomplete history was discarded.",
      }
    }
    seen.add(cursor)
    const requestedCursor = cursor
    const next = await requestPage(requestedCursor)
    if (!next.ok || next.schemaValid !== true || !isRecord(next.payload) || !isRecord(next.payload.page) || !Array.isArray(next.payload.items)) {
      return { ...next, endpoint, payload: null, error: next.error || "A later replay page was unavailable; the incomplete history was discarded." }
    }
    if (!replayQueryMatches(next.payload, context.missionId, timeRange, requestedCursor)) {
      return { ...next, endpoint, payload: null, schemaValid: false, error: "A replay page did not echo the exact requested scope; the incomplete history was discarded." }
    }
    items.push(...next.payload.items)
    receivedAt = next.receivedAt
    cursor = stringValue(next.payload.page.nextCursor)
    pageCount += 1
  }

  const aggregatePayload: UnknownRecord = {
    ...first.payload,
    query: { ...first.payload.query, cursor: null },
    items,
    page: { limit: 200, nextCursor: null, hasMore: false },
  }
  if (!isReplayPayload(aggregatePayload)) {
    return { ...first, receivedAt, payload: null, schemaValid: false, error: "The aggregated replay history violated ordering or scope invariants and was discarded." }
  }
  return { ...first, receivedAt, payload: aggregatePayload }
}

function query(endpoint: string, values: Record<string, string | number | null>): string {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(values)) if (value !== null) params.set(key, String(value))
  return `${API_ROOT}${endpoint}?${params.toString()}`
}

export const v1FusionProvider: FusionProvider = {
  async load(context, signal) {
    context = isolateSimulationScopeFromOperational(context)
    if (context.mode === "simulated") return buildSanitizedFusionScenario(context)

    const nowMs = Date.now()
    const readinessPromise = requestOutcome(`${API_ROOT}/readiness`, context, signal, isReadinessPayload)

    if (context.missionId === DEFAULT_RUNTIME_SCOPE) {
      const readiness = await readinessPromise
      if (context.missionAreaId === DEFAULT_RUNTIME_SCOPE) {
        return baseUnavailableSnapshot(
          context,
          "unavailable",
          readiness,
          "Mission context is not selected. Missing scope is not treated as a validly empty mission.",
        )
      }
      const candidateContexts = await requestPageOutcome(
        query("/contexts", { operatorId: OPERATOR_ID, limit: 200 }),
        context,
        signal,
        isMissionContextRecord,
      )
      const areaContexts = (pageItems(candidateContexts) ?? []).filter((record) =>
        isOperationalRecord(record) && record.missionAreaId === context.missionAreaId,
      )
      const missionIds = [...new Set(areaContexts.map((record) => stringValue(record.missionId)).filter((value): value is string => Boolean(value)))]
      if (!candidateContexts.ok || candidateContexts.schemaValid !== true || missionIds.length !== 1) {
        return baseUnavailableSnapshot(
          context,
          "unavailable",
          readiness,
          candidateContexts.error || (missionIds.length > 1
            ? "The inbound area belongs to multiple visible mission contexts; mission scope is ambiguous and no records were queried."
            : "The inbound area could not be resolved to an explicit mission context; no records were queried."),
        )
      }
      const selectedContext = areaContexts.sort((left, right) => (parsedTime(right.updatedAt) ?? 0) - (parsedTime(left.updatedAt) ?? 0))[0]
      context = {
        ...context,
        contextId: stringValue(selectedContext?.id),
        missionId: missionIds[0],
        missionAreaLabel: stringValue(selectedContext?.missionAreaLabel) || context.missionAreaId,
      }
    }

    const timeRange = timeRangeForContext(context, nowMs)
    if (!timeRange) {
      const readiness = await readinessPromise
      return baseUnavailableSnapshot(
        context,
        "unavailable",
        readiness,
        "The requested start/end range is invalid or lacks an explicit UTC offset. No rolling time window was substituted.",
      )
    }

    if (context.mode === "forecast") {
      const readiness = await readinessPromise
      return baseUnavailableSnapshot(
        context,
        "forecast",
        readiness,
        "FORECAST is a separate frontend mode, but v1 has no forecast data mode, forecast resource, or model/version contract. Live records are not substituted.",
      )
    }

    if (context.mode === "replay") {
      const [readiness, replay] = await Promise.all([
        readinessPromise,
        requestReplayOutcome(context, timeRange, signal),
      ])
      return buildReplaySnapshot(context, readiness, replay)
    }

    const common = { missionId: context.missionId, limit: 200 }
    const bounded = { ...common, start: timeRange.start, end: timeRange.end }
    const [readiness, contexts, sources, coverage, observations, objects, relationships, evidence, reviews, activity, fusionRuns, narratives] = await Promise.all([
      readinessPromise,
      requestPageOutcome(query("/contexts", { missionId: context.missionId, operatorId: OPERATOR_ID, limit: 200 }), context, signal, isMissionContextRecord),
      requestPageOutcome(query("/sources", { limit: 200 }), context, signal, isSourceRecord),
      requestPageOutcome(query("/coverage", common), context, signal, isCoverageRecord),
      requestPageOutcome(query("/observations", bounded), context, signal, isObservationRecord),
      requestPageOutcome(query("/objects", common), context, signal, isObjectRecord),
      requestPageOutcome(query("/relationships", common), context, signal, isRelationshipRecord),
      requestPageOutcome(query("/evidence", bounded), context, signal, isEvidenceRecord),
      requestPageOutcome(query("/reviews", common), context, signal, isReviewRecord),
      requestPageOutcome(query("/activity", bounded), context, signal, isActivityRecord),
      requestPageOutcome(query("/fusion-runs", common), context, signal, isFusionRunRecord),
      requestPageOutcome(query("/narrative-versions", common), context, signal, isNarrativeRecord),
    ])
    if (contexts.ok && contexts.schemaValid === true) {
      const visibleContexts = (pageItems(contexts) ?? []).filter((record) =>
        isOperationalRecord(record) &&
        record.missionId === context.missionId &&
        record.missionAreaId === context.missionAreaId &&
        (!context.contextId || record.id === context.contextId),
      )
      if (!visibleContexts.length) {
        return baseUnavailableSnapshot(
          context,
          "unavailable",
          readiness,
          context.contextId
            ? "The requested contextId is not a visible operational context for this mission and mission area; no records were presented."
            : "The requested mission and mission-area pair is not a visible operational context; missing scope is not treated as validly empty.",
        )
      }
      const canonicalContext = (context.contextId || visibleContexts.length === 1) ? visibleContexts[0] : null
      const canonicalLabels = [...new Set(visibleContexts
        .map((record) => stringValue(record.missionAreaLabel))
        .filter((value): value is string => Boolean(value)))]
      context = {
        ...context,
        contextId: canonicalContext ? stringValue(canonicalContext.id) : context.contextId,
        missionAreaLabel: canonicalContext
          ? stringValue(canonicalContext.missionAreaLabel) || context.missionAreaId
          : canonicalLabels.length === 1
            ? canonicalLabels[0]
            : context.missionAreaId,
      }
    }
    return buildOperationalSnapshot(
      context,
      { readiness, contexts, sources, coverage, observations, objects, relationships, evidence, reviews, activity, fusionRuns, narratives },
      new Date(nowMs).toISOString(),
    )
  },
}
