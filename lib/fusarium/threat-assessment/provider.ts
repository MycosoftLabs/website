import {
  THREAT_ASSESSMENT_SCHEMA,
  confidenceFromUnknown,
  rankEnvironmentalAssessments,
  reviewDispositionForBackendState,
  type AssessmentHistoryEvent,
  type CausalRelationship,
  type ConfidenceValue,
  type EndpointTruth,
  type EnvironmentalAssessment,
  type EnvironmentalDomain,
  type FreshnessState,
  type ReviewStatus,
  type ThreatAssessmentContext,
  type ThreatAssessmentProvider,
  type ThreatAssessmentSnapshot,
  type ThreatCondition,
  type ThreatEvidence,
} from "./contracts"
import { buildSanitizedThreatScenario } from "./scenario"

type UnknownRecord = Record<string, unknown>
type Fetcher = (input: string | URL | Request, init?: RequestInit) => Promise<Response>

interface RequestOutcome {
  id: string
  label: string
  endpoint: string
  method: "GET" | "POST"
  protected: boolean
  reached: boolean
  ok: boolean
  status: number | null
  receivedAt: string
  payload: unknown
  error: string | null
}

interface PagePayload {
  items: UnknownRecord[]
  page: {
    nextCursor?: string | null
    hasMore: boolean
    limit: number
  }
}

interface CollectionBundle {
  contexts: RequestOutcome
  sources: RequestOutcome
  coverage: RequestOutcome
  objects: RequestOutcome
  relationships: RequestOutcome
  evidence: RequestOutcome
  reviews: RequestOutcome
  activity: RequestOutcome
}

const ROOT = "/api/fusarium/v1"
const PAGE_LIMIT = 500
const OPERATIONAL_DATA_MODES = new Set(["live", "degraded", "unavailable"])
const HISTORY_DATA_MODES = new Set(["live", "degraded", "unavailable", "recorded", "replay"])
const DOMAINS = new Set<EnvironmentalDomain>([
  "atmosphere",
  "water",
  "land",
  "living",
  "infrastructure",
  "process",
])
const STATUSES = new Set(["urgent", "material", "watch", "baseline", "unknown", "unavailable"])
const REVIEW_STATES = new Set(["pending", "in_review", "accepted", "rejected", "deferred"])

const asRecord = (value: unknown): UnknownRecord | null =>
  value && typeof value === "object" && !Array.isArray(value) ? (value as UnknownRecord) : null

const asRecords = (value: unknown): UnknownRecord[] =>
  Array.isArray(value) ? value.map(asRecord).filter((item): item is UnknownRecord => Boolean(item)) : []

const text = (...values: unknown[]): string | null => {
  for (const value of values) if (typeof value === "string" && value.trim()) return value.trim()
  return null
}

const strings = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    : []

const validTimestamp = (value: unknown): string | null => {
  if (typeof value !== "string" || !Number.isFinite(Date.parse(value))) return null
  return new Date(value).toISOString()
}

function safeError(payload: unknown, fallback: string | null): string | null {
  const record = asRecord(payload)
  const error = asRecord(record?.error)
  const detail = asRecord(record?.detail)
  return (
    text(error?.message, detail?.reason, detail?.error, record?.message, fallback) ??
    (fallback ? fallback : null)
  )
}

const DEVELOPMENT_VIEWER_IDENTITY = {
  operatorId: "threat-assessment.local-viewer",
  role: "viewer",
} as const

function headersFor(_context: ThreatAssessmentContext): HeadersInit {
  return {
    Accept: "application/json",
    // The v1 development identity is explicitly unverified. Keep this fixed at
    // least privilege so URL and display-state changes cannot alter request authority.
    "X-Operator-Id": DEVELOPMENT_VIEWER_IDENTITY.operatorId,
    "X-Operator-Role": DEVELOPMENT_VIEWER_IDENTITY.role,
  }
}

async function requestJson(
  fetcher: Fetcher,
  context: ThreatAssessmentContext,
  definition: Omit<RequestOutcome, "reached" | "ok" | "status" | "receivedAt" | "payload" | "error">,
  signal?: AbortSignal,
  body?: unknown,
): Promise<RequestOutcome> {
  const receivedAt = new Date().toISOString()
  try {
    const response = await fetcher(definition.endpoint, {
      cache: "no-store",
      signal,
      method: definition.method,
      headers: definition.protected
        ? {
            ...headersFor(context),
            ...(body === undefined ? {} : { "Content-Type": "application/json" }),
          }
        : { Accept: "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
    let payload: unknown = null
    try {
      payload = await response.json()
    } catch {
      payload = null
    }
    return {
      ...definition,
      reached: true,
      ok: response.ok,
      status: response.status,
      receivedAt,
      payload,
      error: response.ok ? null : safeError(payload, `HTTP ${response.status}`),
    }
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error
    return {
      ...definition,
      reached: false,
      ok: false,
      status: null,
      receivedAt,
      payload: null,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

function rootValid(payload: unknown): boolean {
  const record = asRecord(payload)
  return (
    record?.schemaRef === "fusarium-intelligence/v1" &&
    record.classification === "UNCLASSIFIED" &&
    record.service === "fusarium-intelligence" &&
    typeof record.identityMode === "string" &&
    typeof record.identityVerified === "boolean"
  )
}

function readinessValid(payload: unknown): boolean {
  const record = asRecord(payload)
  return (
    record?.schemaRef === "fusarium-intelligence/v1" &&
    record.classification === "UNCLASSIFIED" &&
    ["ready", "degraded", "not_ready"].includes(String(record.status)) &&
    asRecord(record.identity) !== null
  )
}

function pagePayload(payload: unknown): PagePayload | null {
  const record = asRecord(payload)
  const page = asRecord(record?.page)
  if (!record || !Array.isArray(record.items) || !page) return null
  if (typeof page.hasMore !== "boolean" || typeof page.limit !== "number") return null
  const items = asRecords(record.items)
  if (items.length !== record.items.length) return null
  return {
    items,
    page: {
      nextCursor: typeof page.nextCursor === "string" ? page.nextCursor : null,
      hasMore: page.hasMore,
      limit: page.limit,
    },
  }
}

function classifiedOperational(record: UnknownRecord): boolean {
  return (
    record.classification === "UNCLASSIFIED" &&
    record.namespace === "operational" &&
    record.synthetic === false &&
    typeof record.dataMode === "string" &&
    OPERATIONAL_DATA_MODES.has(record.dataMode)
  )
}

function classifiedHistory(record: UnknownRecord): boolean {
  return (
    record.classification === "UNCLASSIFIED" &&
    record.namespace === "operational" &&
    record.synthetic === false &&
    typeof record.dataMode === "string" &&
    HISTORY_DATA_MODES.has(record.dataMode)
  )
}

function objectValid(record: UnknownRecord): boolean {
  return (
    typeof record.id === "string" &&
    typeof record.name === "string" &&
    DOMAINS.has(record.domain as EnvironmentalDomain) &&
    STATUSES.has(String(record.status)) &&
    Array.isArray(record.relationshipIds) &&
    Array.isArray(record.changes) &&
    Array.isArray(record.sourceIds) &&
    Array.isArray(record.evidenceIds) &&
    asRecord(record.confidence) !== null &&
    asRecord(record.freshness) !== null &&
    typeof record.provenanceRef === "string"
  )
}

function relationshipValid(record: UnknownRecord): boolean {
  return (
    typeof record.id === "string" &&
    typeof record.fromObjectId === "string" &&
    typeof record.toObjectId === "string" &&
    typeof record.relationshipType === "string" &&
    typeof record.label === "string" &&
    asRecord(record.confidence) !== null &&
    Array.isArray(record.evidenceIds)
  )
}

function evidenceValid(record: UnknownRecord): boolean {
  return (
    typeof record.id === "string" &&
    typeof record.title === "string" &&
    typeof record.sourceId === "string" &&
    typeof record.sourceRef === "string" &&
    Array.isArray(record.objectIds) &&
    asRecord(record.lineage) !== null &&
    asRecord(record.confidence) !== null
  )
}

function reviewValid(record: UnknownRecord): boolean {
  return (
    typeof record.id === "string" &&
    REVIEW_STATES.has(String(record.state)) &&
    Array.isArray(record.objectIds) &&
    Array.isArray(record.evidenceIds) &&
    typeof record.updatedAt === "string"
  )
}

function sourceValid(record: UnknownRecord): boolean {
  return (
    typeof record.id === "string" &&
    typeof record.label === "string" &&
    typeof record.state === "string" &&
    typeof record.configured === "boolean" &&
    typeof record.verified === "boolean" &&
    typeof record.live === "boolean" &&
    typeof record.reason === "string"
  )
}

function activityValid(record: UnknownRecord): boolean {
  return (
    typeof record.id === "string" &&
    typeof record.missionId === "string" &&
    typeof record.actionType === "string" &&
    typeof record.occurredAt === "string" &&
    Array.isArray(record.objectIds) &&
    Array.isArray(record.evidenceIds)
  )
}

function contextValid(record: UnknownRecord): boolean {
  return (
    typeof record.id === "string" &&
    typeof record.missionId === "string" &&
    typeof record.missionAreaId === "string" &&
    typeof record.dataMode === "string" &&
    typeof record.operatorRole === "string"
  )
}

function coverageValid(record: UnknownRecord): boolean {
  return (
    typeof record.id === "string" &&
    typeof record.sourceId === "string" &&
    DOMAINS.has(record.domain as EnvironmentalDomain) &&
    typeof record.state === "string" &&
    asRecord(record.freshness) !== null
  )
}

function itemValidator(id: string): (record: UnknownRecord) => boolean {
  if (id === "contexts") return contextValid
  if (id === "sources") return sourceValid
  if (id === "coverage") return coverageValid
  if (id === "objects") return objectValid
  if (id === "relationships") return relationshipValid
  if (id === "evidence") return evidenceValid
  if (id === "reviews") return reviewValid
  return activityValid
}

function schemaValidFor(outcome: RequestOutcome): boolean | null {
  if (!outcome.ok) return null
  if (outcome.id === "contract") return rootValid(outcome.payload)
  if (outcome.id === "readiness") return readinessValid(outcome.payload)
  if (outcome.id === "replay") {
    const record = asRecord(outcome.payload)
    const page = pagePayload({ items: record?.items, page: record?.page })
    return (
      record?.schemaRef === "fusarium-intelligence/v1" &&
      page !== null &&
      page.items.every(activityValid)
    )
  }
  const page = pagePayload(outcome.payload)
  return page !== null && page.items.every(itemValidator(outcome.id))
}

function pageItems(outcome: RequestOutcome): UnknownRecord[] {
  if (schemaValidFor(outcome) !== true) return []
  if (outcome.id === "replay") {
    const record = asRecord(outcome.payload)
    return asRecords(record?.items)
  }
  return pagePayload(outcome.payload)?.items ?? []
}

function sourceFreshness(records: readonly UnknownRecord[]): FreshnessState {
  if (records.length === 0) return "unknown"
  const states = records
    .map((record) => text(asRecord(record.freshness)?.state, record.state))
    .filter(Boolean) as string[]
  if (states.some((state) => state === "fresh" || state === "live")) return "fresh"
  if (states.length > 0 && states.every((state) => state === "stale")) return "stale"
  return "unknown"
}

function provenanceFor(id: string, records: readonly UnknownRecord[]): EndpointTruth["provenance"] {
  if (["contract", "readiness", "contexts", "sources", "coverage", "reviews", "activity", "replay"].includes(id)) {
    return "not_applicable"
  }
  if (records.length === 0) return "unknown"
  const present = records.filter((record) => {
    if (id === "objects") return Boolean(text(record.provenanceRef))
    if (id === "evidence") return Boolean(text(record.sourceRef)) && asRecord(record.lineage) !== null
    if (id === "relationships") return strings(record.evidenceIds).length > 0
    return false
  }).length
  if (present === records.length) return "complete"
  if (present > 0) return "partial"
  return "missing"
}

function truthFromOutcome(
  outcome: RequestOutcome,
  identityVerified: boolean | null,
): EndpointTruth {
  const valid = schemaValidFor(outcome)
  const records = valid === true ? pageItems(outcome) : []
  const page = outcome.id === "replay"
    ? pagePayload({ items: asRecord(outcome.payload)?.items, page: asRecord(outcome.payload)?.page })
    : pagePayload(outcome.payload)
  const collection = !["contract", "readiness"].includes(outcome.id)
  const hasMore = page?.page.hasMore === true
  const empty = collection && valid === true && records.length === 0 && !hasMore
  const identity: EndpointTruth["identity"] = !outcome.protected
    ? "not_required"
    : outcome.status === 401 || outcome.status === 403
      ? "rejected"
      : outcome.ok && identityVerified === false
        ? "development_header_unverified"
        : "unknown"
  return {
    id: outcome.id,
    label: outcome.label,
    endpoint: outcome.endpoint,
    method: outcome.method,
    reachability: outcome.reached ? "reached" : "unreachable",
    identity,
    schema: valid === true ? "valid" : valid === false ? "invalid" : "unknown",
    freshness: sourceFreshness(records),
    provenance: provenanceFor(outcome.id, records),
    coverage:
      !collection
        ? "unknown"
        : valid !== true
          ? "unknown"
          : hasMore
            ? "partial"
            : empty
              ? "collected_empty"
              : "complete",
    dataPresence: !collection
      ? "not_applicable"
      : valid !== true || (hasMore && records.length === 0)
        ? "unknown"
        : empty
          ? "empty"
          : "present",
    httpStatus: outcome.status,
    recordCount: collection && valid === true ? records.length : null,
    receivedAt: outcome.reached ? outcome.receivedAt : null,
    note:
      outcome.error ??
       (valid === false
         ? "Transport succeeded, but the minimum v1 response shape did not validate."
         : hasMore
           ? `The first ${records.length} records are visible; additional pages exist and coverage is partial.`
           : empty
             ? "The scoped collection was verified and empty. This is not a measured environmental zero."
            : outcome.protected && identityVerified === false
              ? "The development header was accepted, but identity is not verified."
              : "Response verified for this poll."),
    synthetic: false,
  }
}

function unattemptedTruth(
  id: string,
  label: string,
  endpoint: string,
  note: string,
  schema: EndpointTruth["schema"] = "unknown",
): EndpointTruth {
  return {
    id,
    label,
    endpoint,
    method: "GET",
    reachability: "not_attempted",
    identity: "unknown",
    schema,
    freshness: "unknown",
    provenance: "unknown",
    coverage: schema === "not_supported" ? "not_supported" : "unknown",
    dataPresence: "unknown",
    httpStatus: null,
    recordCount: null,
    receivedAt: null,
    note,
    synthetic: false,
  }
}

function timeRange(context: ThreatAssessmentContext, nowMs: number) {
  const hours = context.timeWindow === "6h" ? 6 : context.timeWindow === "72h" ? 72 : 24
  return {
    start: new Date(nowMs - hours * 60 * 60 * 1000).toISOString(),
    end: new Date(nowMs).toISOString(),
  }
}

function query(path: string, values: Record<string, string | number | null>): string {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(values)) if (value !== null) params.set(key, String(value))
  return `${ROOT}/${path}?${params.toString()}`
}

function freshnessFromRecord(record: UnknownRecord): FreshnessState {
  const value = text(asRecord(record.freshness)?.state)
  return value === "fresh" || value === "stale" || value === "simulated" ? value : "unknown"
}

function sourceLabels(records: readonly UnknownRecord[]): Map<string, string> {
  return new Map(records.map((record) => [String(record.id), text(record.label) ?? String(record.id)]))
}

function evidenceConflictMarker(record: UnknownRecord): string | null {
  const metadata = asRecord(record.metadata)
  if (!metadata) return null
  const note = text(metadata.conflictNote, metadata.conflict)
  if (note) return note
  const conflicts = strings(metadata.conflictsWith)
  return conflicts.length > 0 ? `Explicit metadata references ${conflicts.length} conflicting evidence record(s).` : null
}

function normalizeEvidence(
  records: readonly UnknownRecord[],
  sources: readonly UnknownRecord[],
): ThreatEvidence[] {
  const labels = sourceLabels(sources)
  return records.filter(classifiedOperational).map((record) => {
    const sourceId = String(record.sourceId)
    const source = sources.find((item) => item.id === sourceId)
    const sourceState = text(source?.state)
    const freshness: FreshnessState = sourceState === "live" ? "fresh" : sourceState === "stale" ? "stale" : "unknown"
    const lineage = asRecord(record.lineage)
    const transformations = asRecords(lineage?.transformations).map((item) =>
      [text(item.name), text(item.version)].filter(Boolean).join(" · "),
    )
    return {
      id: String(record.id),
      title: text(record.title) ?? String(record.id),
      summary: text(record.summary) ?? "No evidence summary was supplied.",
      sourceId,
      sourceLabel: labels.get(sourceId) ?? sourceId,
      sourceRef: text(record.sourceRef) ?? "source reference unavailable",
      objectIds: strings(record.objectIds),
      observedAt: validTimestamp(record.observedAt),
      receivedAt: validTimestamp(record.receivedAt),
      freshness,
      confidence: confidenceFromUnknown(record.confidence),
      integrityState: ["unknown", "unverified", "verified", "failed"].includes(String(record.integrityState))
        ? (record.integrityState as ThreatEvidence["integrityState"])
        : "unknown",
      verificationState: ["unavailable", "pending", "verified", "failed"].includes(String(record.verificationState))
        ? (record.verificationState as ThreatEvidence["verificationState"])
        : "unavailable",
      lineage: [
        ...strings(lineage?.sourceRecordIds),
        ...strings(lineage?.parentEvidenceIds),
        ...transformations,
      ],
      conflictNote: evidenceConflictMarker(record),
      dataMode: text(record.dataMode) ?? "unknown",
      synthetic: false,
    }
  })
}

function explicitlyCausal(type: string): boolean {
  return /(^|_)(cause|causes|caused_by|contribute|contributes_to|drives|results_in)($|_)/i.test(type)
}

function explanationKind(type: string): "causal" | "competing" | "context" {
  if (explicitlyCausal(type)) return "causal"
  if (/alternative|competing|conflict|explains/i.test(type)) return "competing"
  return "context"
}

function normalizeRelationships(records: readonly UnknownRecord[]): CausalRelationship[] {
  return records.filter(classifiedOperational).map((record) => {
    const relationshipType = text(record.relationshipType) ?? "relationship_not_named"
    return {
      id: String(record.id),
      fromObjectId: String(record.fromObjectId),
      toObjectId: String(record.toObjectId),
      relationshipType,
      label: text(record.label) ?? relationshipType,
      confidence: confidenceFromUnknown(record.confidence),
      evidenceIds: strings(record.evidenceIds),
      explicitlyCausal: explicitlyCausal(relationshipType),
      dataMode: text(record.dataMode) ?? "unknown",
      synthetic: false,
    }
  })
}

function latestReviewForObject(objectId: string, reviews: readonly UnknownRecord[]): UnknownRecord | null {
  return (
    reviews
      .filter(classifiedOperational)
      .filter((review) => strings(review.objectIds).includes(objectId))
      .sort((left, right) => Date.parse(String(right.updatedAt)) - Date.parse(String(left.updatedAt)))[0] ?? null
  )
}

function reviewStatus(record: UnknownRecord | null): ReviewStatus {
  const backendState = record && REVIEW_STATES.has(String(record.state))
    ? (record.state as ReviewStatus["backendState"])
    : null
  return {
    disposition: reviewDispositionForBackendState(backendState),
    backendState,
    updatedAt: validTimestamp(record?.updatedAt),
    judgment: text(record?.judgment),
    mappingNote:
      backendState === null
        ? "No linked v1 review exists; Draft is a frontend workspace state."
        : backendState === "rejected" || backendState === "deferred"
          ? `Backend state ${backendState} has no lossless package-stage equivalent; it remains visible here.`
          : "Frontend package stage projected from the linked v1 review; backend state remains authoritative.",
  }
}

function changeTimes(record: UnknownRecord): string[] {
  return asRecords(record.changes)
    .map((change) => validTimestamp(change.observedAt))
    .filter((value): value is string => Boolean(value))
}

function changedSinceReview(
  object: UnknownRecord,
  review: ReviewStatus,
): { value: boolean | null; note: string } {
  if (!review.updatedAt) return { value: null, note: "No linked review timestamp exists for comparison." }
  const later = changeTimes(object).filter((value) => Date.parse(value) > Date.parse(review.updatedAt as string))
  if (later.length > 0) {
    return {
      value: true,
      note: `${later.length} typed change timestamp${later.length === 1 ? " is" : "s are"} later than the linked review.`,
    }
  }
  return {
    value: null,
    note: "No later typed change was supplied. The v1 contract does not carry a reviewed object revision, so unchanged cannot be proven.",
  }
}

function normalizeAssessments(
  objectRecords: readonly UnknownRecord[],
  relationshipRecords: readonly CausalRelationship[],
  evidenceRecords: readonly ThreatEvidence[],
  reviewRecords: readonly UnknownRecord[],
): EnvironmentalAssessment[] {
  const objectById = new Map(objectRecords.map((record) => [String(record.id), record]))
  const evidenceById = new Map(evidenceRecords.map((record) => [record.id, record]))
  const assessments = objectRecords.filter(classifiedOperational).map((object) => {
    const objectId = String(object.id)
    const linkedRelationships = relationshipRecords.filter(
      (relationship) => relationship.fromObjectId === objectId || relationship.toObjectId === objectId,
    )
    const neighborIds = linkedRelationships.map((relationship) =>
      relationship.fromObjectId === objectId ? relationship.toObjectId : relationship.fromObjectId,
    )
    const affectedSystems = new Set<EnvironmentalDomain>([object.domain as EnvironmentalDomain])
    for (const neighborId of neighborIds) {
      const domain = objectById.get(neighborId)?.domain
      if (DOMAINS.has(domain as EnvironmentalDomain)) affectedSystems.add(domain as EnvironmentalDomain)
    }
    const evidenceIds = strings(object.evidenceIds)
    const resolved = evidenceIds.filter((id) => evidenceById.has(id)).length
    const completeness = evidenceIds.length === 0
      ? {
          state: "unknown" as const,
          declared: null,
          resolved: null,
          note: "The object declares no evidence links; this is not a measured completeness of zero.",
        }
      : {
          state: "unknown" as const,
          declared: evidenceIds.length,
          resolved,
          note: `${resolved} of ${evidenceIds.length} declared links resolve in the loaded mission page. v1 supplies no evidence-sufficiency denominator, so completeness remains unknown.`,
        }
    const explicitConflicts = evidenceIds
      .map((id) => evidenceById.get(id)?.conflictNote)
      .filter(Boolean) as string[]
    const review = reviewStatus(latestReviewForObject(objectId, reviewRecords))
    const changed = changedSinceReview(object, review)
    const severity = STATUSES.has(String(object.status))
      ? (object.status as EnvironmentalAssessment["severity"])
      : "unknown"
    const rankBasis = [`Explicit object status: ${severity}`]
    if (explicitConflicts.length > 0) rankBasis.push("Explicit evidence conflict metadata")
    if (changed.value === true) rankBasis.push("Typed change after linked review")
    if (text(object.missionConsequence)) rankBasis.push("Mission consequence supplied")
    const confidence: ConfidenceValue = confidenceFromUnknown(object.confidence)
    return {
      id: `assessment:${objectId}`,
      objectId,
      name: text(object.name) ?? objectId,
      domain: object.domain as EnvironmentalDomain,
      summary: text(object.summary) ?? "No object summary was supplied.",
      severity,
      urgency: "not_assessed" as const,
      confidence,
      uncertainty:
        confidence.score === null
          ? "Uncertainty was not assessed; the v1 object has no explicit uncertainty field."
          : `No explicit uncertainty field is present. Confidence basis: ${confidence.basis}`,
      forecastHorizon: null,
      affectedObjectIds: [objectId, ...neighborIds.filter((id, index, all) => all.indexOf(id) === index)],
      affectedSystems: [...affectedSystems],
      missionConsequence: text(object.missionConsequence),
      evidenceIds,
      evidenceCompleteness: completeness,
      freshness: freshnessFromRecord(object),
      observedAt:
        validTimestamp(asRecord(object.temporalBounds)?.end) ??
        validTimestamp(asRecord(object.freshness)?.observedAt),
      sourceIds: strings(object.sourceIds),
      relationshipIds: linkedRelationships.map((relationship) => relationship.id),
      explanations: linkedRelationships.map((relationship) => ({
        id: `explanation:${relationship.id}`,
        label: relationship.label,
        kind: explanationKind(relationship.relationshipType),
        confidence: relationship.confidence,
        evidenceIds: relationship.evidenceIds,
        note: relationship.explicitlyCausal
          ? "The supplied relationship type explicitly uses causal language; evidence still requires human review."
          : "Relationship asserted by the source contract; causality is not inferred.",
      })),
      review,
      changedSinceReview: changed.value,
      changedSinceReviewNote: changed.note,
      evidenceConflict: explicitConflicts.length > 0 ? ("detected" as const) : ("unknown" as const),
      evidenceConflictNote:
        explicitConflicts.length > 0
          ? explicitConflicts.join(" ")
          : "The v1 evidence contract has no first-class conflict field. Failed validation is not relabelled as conflict.",
      dataMode: text(object.dataMode) ?? "unknown",
      synthetic: false,
      rankBasis,
      contractGaps: [
        "Urgency is not present in the v1 object contract.",
        "Forecast horizon is not present in the v1 object contract.",
        "Uncertainty is not a first-class v1 field.",
        "Evidence-link resolution is not an evidence-sufficiency denominator.",
      ],
    }
  })
  return rankEnvironmentalAssessments(assessments)
}

function normalizeHistory(records: readonly UnknownRecord[]): AssessmentHistoryEvent[] {
  return records
    .filter(classifiedHistory)
    .map((record) => ({
      id: String(record.id),
      occurredAt: validTimestamp(record.occurredAt),
      label: text(record.actionType)?.replaceAll("_", " ").toUpperCase() ?? "ACTIVITY",
      detail:
        text(record.judgment) ??
        "Append-only mission activity record; no additional assessment narrative was supplied.",
      objectIds: strings(record.objectIds),
      evidenceIds: strings(record.evidenceIds),
      mode: text(record.dataMode) ?? "unknown",
      synthetic: false,
    }))
    .sort((left, right) => Date.parse(right.occurredAt ?? "") - Date.parse(left.occurredAt ?? ""))
}

function placeholderDataTruth(reason: string): EndpointTruth[] {
  return [
    ["contexts", "Mission contexts", `${ROOT}/contexts`],
    ["sources", "Source readiness", `${ROOT}/sources`],
    ["coverage", "Environmental coverage", `${ROOT}/coverage`],
    ["objects", "Environmental objects + changes", `${ROOT}/objects`],
    ["relationships", "Environmental relationships", `${ROOT}/relationships`],
    ["evidence", "Evidence ledger", `${ROOT}/evidence`],
    ["reviews", "Human reviews", `${ROOT}/reviews`],
    ["activity", "Mission activity", `${ROOT}/activity`],
  ].map(([id, label, endpoint]) => unattemptedTruth(id, label, endpoint, reason))
}

function conditionForLive(
  sourceTruth: readonly EndpointTruth[],
  assessments: readonly EnvironmentalAssessment[],
  readinessStatus: string | null,
): ThreatCondition {
  const data = sourceTruth.filter((item) => !["contract", "readiness"].includes(item.id))
  if (data.length > 0 && data.every((item) => item.identity === "rejected")) return "unauthorized"
  const usable = data.filter((item) => item.reachability === "reached" && item.schema === "valid")
  if (usable.length === 0) return "unavailable"
  if (
    readinessStatus !== "ready" ||
    data.some(
      (item) =>
        item.reachability !== "reached" ||
        item.schema !== "valid" ||
        item.coverage === "partial",
    )
  ) return "partial"
  if (assessments.length === 0) return "empty"
  if (assessments.every((assessment) => assessment.freshness === "stale")) return "stale"
  return "ready"
}

async function loadCollections(
  fetcher: Fetcher,
  context: ThreatAssessmentContext,
  nowMs: number,
  signal?: AbortSignal,
): Promise<CollectionBundle> {
  const range = timeRange(context, nowMs)
  const shared = { missionId: context.missionId, limit: PAGE_LIMIT }
  const definitions = [
    { id: "contexts", label: "Mission contexts", endpoint: query("contexts", shared) },
    { id: "sources", label: "Source readiness", endpoint: query("sources", { limit: PAGE_LIMIT }) },
    { id: "coverage", label: "Environmental coverage", endpoint: query("coverage", shared) },
    { id: "objects", label: "Environmental objects + changes", endpoint: query("objects", shared) },
    { id: "relationships", label: "Environmental relationships", endpoint: query("relationships", shared) },
    { id: "evidence", label: "Evidence ledger", endpoint: query("evidence", { ...shared, start: range.start, end: range.end }) },
    { id: "reviews", label: "Human reviews", endpoint: query("reviews", shared) },
    {
      id: "activity",
      label: "Mission activity",
      endpoint: query("activity", { ...shared, start: range.start, end: range.end }),
    },
  ] as const
  const outcomes = await Promise.all(
    definitions.map((definition) =>
      requestJson(
        fetcher,
        context,
        { ...definition, method: "GET", protected: true },
        signal,
      ),
    ),
  )
  return Object.fromEntries(outcomes.map((outcome) => [outcome.id, outcome])) as unknown as CollectionBundle
}

function withScopedItems(
  outcome: RequestOutcome,
  keep: (record: UnknownRecord) => boolean,
): RequestOutcome {
  const payload = asRecord(outcome.payload)
  const page = pagePayload(outcome.payload)
  if (!payload || !page || schemaValidFor(outcome) !== true) return outcome
  return {
    ...outcome,
    payload: {
      ...payload,
      items: page.items.filter(keep),
    },
  }
}

function scopeBundleToMissionArea(
  bundle: CollectionBundle,
  context: ThreatAssessmentContext,
): CollectionBundle {
  if (context.missionAreaId === "runtime-unscoped") return bundle

  const inArea = (record: UnknownRecord) => record.missionAreaId === context.missionAreaId
  const contexts = withScopedItems(bundle.contexts, inArea)
  const coverage = withScopedItems(bundle.coverage, inArea)
  const objects = withScopedItems(bundle.objects, inArea)
  const evidence = withScopedItems(bundle.evidence, inArea)
  const objectIds = new Set(pageItems(objects).map((record) => String(record.id)))
  const evidenceIds = new Set(pageItems(evidence).map((record) => String(record.id)))
  const contextIds = new Set(pageItems(contexts).map((record) => String(record.id)))
  const linkedToArea = (record: UnknownRecord) =>
    strings(record.objectIds).some((id) => objectIds.has(id)) ||
    strings(record.evidenceIds).some((id) => evidenceIds.has(id))
  const relationships = withScopedItems(
    bundle.relationships,
    (record) =>
      objectIds.has(String(record.fromObjectId)) ||
      objectIds.has(String(record.toObjectId)) ||
      strings(record.evidenceIds).some((id) => evidenceIds.has(id)),
  )
  const reviews = withScopedItems(bundle.reviews, linkedToArea)
  const activity = withScopedItems(
    bundle.activity,
    (record) =>
      linkedToArea(record) ||
      (typeof record.missionContextId === "string" && contextIds.has(record.missionContextId)),
  )

  return {
    ...bundle,
    contexts,
    coverage,
    objects,
    relationships,
    evidence,
    reviews,
    activity,
  }
}

function identityFromRoot(root: RequestOutcome): { mode: string | null; verified: boolean | null } {
  const payload = asRecord(root.payload)
  if (!root.ok || !rootValid(root.payload)) return { mode: null, verified: null }
  return {
    mode: text(payload?.identityMode),
    verified: typeof payload?.identityVerified === "boolean" ? payload.identityVerified : null,
  }
}

function loadingNote(condition: ThreatCondition): string {
  if (condition === "empty") return "The mission-scoped collections were verified and empty. Empty does not mean environmentally clear."
  if (condition === "partial") return "Some required collections failed or did not validate. The queue is incomplete."
  if (condition === "stale") return "Assessment candidates exist, but every candidate is stale."
  if (condition === "unauthorized") return "The development identity metadata was rejected; environmental state remains unavailable."
  if (condition === "unavailable") return "The v1 contract is not currently usable. No operational values were inferred or substituted."
  return "Object-derived environmental assessment candidates are visible with their contract gaps."
}

export function createThreatAssessmentProvider(
  fetcher: Fetcher = fetch,
  clock: () => number = Date.now,
): ThreatAssessmentProvider {
  return {
    async load(context, signal) {
      if (context.mode === "simulated") return buildSanitizedThreatScenario(context)

      const nowMs = clock()
      const generatedAt = new Date(nowMs).toISOString()
      const [contractOutcome, readinessOutcome] = await Promise.all([
        requestJson(
          fetcher,
          context,
          { id: "contract", label: "v1 contract", endpoint: ROOT, method: "GET", protected: false },
          signal,
        ),
        requestJson(
          fetcher,
          context,
          { id: "readiness", label: "Platform readiness", endpoint: `${ROOT}/readiness`, method: "GET", protected: false },
          signal,
        ),
      ])
      const identity = identityFromRoot(contractOutcome)
      const readinessStatus = text(asRecord(readinessOutcome.payload)?.status)
      const platformTruth = [
        truthFromOutcome(contractOutcome, identity.verified),
        truthFromOutcome(readinessOutcome, identity.verified),
      ]

      if (context.mode === "forecast") {
        return {
          schema: THREAT_ASSESSMENT_SCHEMA,
          context,
          generatedAt,
          condition: "forecast",
          classification: "UNCLASSIFIED",
          identityMode: identity.mode,
          identityVerified: identity.verified,
          assessments: [],
          evidence: [],
          relationships: [],
          history: [],
          sourceTruth: [
            ...platformTruth,
            unattemptedTruth(
              "forecast",
              "Environmental forecast assessments",
              `${ROOT}/forecast`,
              "No forecast or forecast-assessment route exists in v1. Current operational objects are not shown as forecasts.",
              "not_supported",
            ),
          ],
          gaps: [
            "Forecast is a distinct workspace mode, but v1 has no forecast data mode or forecast-assessment resource.",
            "No current or replay record is reused as a forecast.",
          ],
          note: "FORECAST · contract gap; no forecast values are available.",
        }
      }

      const rootUsable = contractOutcome.ok && rootValid(contractOutcome.payload)
      const readinessUsable =
        readinessOutcome.ok &&
        readinessValid(readinessOutcome.payload) &&
        readinessStatus !== "not_ready"
      if (!rootUsable || !readinessUsable) {
        const rootReason = contractOutcome.error ? `: ${contractOutcome.error}` : "."
        const readinessReason = readinessOutcome.error
          ? `: ${readinessOutcome.error}`
          : readinessStatus
            ? `: status ${readinessStatus}.`
            : "."
        const reason = rootUsable
          ? `Data collections were not attempted because platform readiness was not usable${readinessReason}`
          : `Data collections were not attempted because the v1 root did not validate${rootReason}`
        return {
          schema: THREAT_ASSESSMENT_SCHEMA,
          context,
          generatedAt,
          condition: "unavailable",
          classification: "UNCLASSIFIED",
          identityMode: identity.mode,
          identityVerified: identity.verified,
          assessments: [],
          evidence: [],
          relationships: [],
          history: [],
          sourceTruth: [...platformTruth, ...placeholderDataTruth(reason)],
          gaps: [
            rootUsable
              ? "The v1 root validated, but readiness was invalid, unreachable, or not ready."
              : "The v1 contract exists in source but the running development service did not expose a valid root response.",
            "No operational collection was queried after the failed root/readiness handshake.",
            "Use the visibly isolated sanitized scenario only when workflow testing is intended.",
          ],
          note: loadingNote("unavailable"),
        }
      }

      if (context.mode === "replay") {
        const range = timeRange(context, nowMs)
        const replay = await requestJson(
          fetcher,
          context,
          { id: "replay", label: "Bounded mission replay", endpoint: `${ROOT}/replay`, method: "POST", protected: true },
          signal,
          {
            missionId: context.missionId,
            namespace: "operational",
            timeRange: range,
            limit: PAGE_LIMIT,
          },
        )
        const history = normalizeHistory(pageItems(replay))
        const truth = truthFromOutcome(replay, identity.verified)
        const condition: ThreatCondition =
          replay.status === 401 || replay.status === 403
            ? "unauthorized"
            : replay.ok && schemaValidFor(replay) === true
              ? "replay"
              : "unavailable"
        return {
          schema: THREAT_ASSESSMENT_SCHEMA,
          context,
          generatedAt,
          condition,
          classification: "UNCLASSIFIED",
          identityMode: identity.mode,
          identityVerified: identity.verified,
          assessments: [],
          evidence: [],
          relationships: [],
          history,
          sourceTruth: [...platformTruth, truth],
          gaps: [
            "Replay contains append-only activity, not historical object/evidence snapshots.",
            "A replay queue cannot be reconstructed unless an activity record carries a typed historical assessment payload.",
          ],
          note:
            condition === "replay"
              ? "REPLAY · bounded append-only history. No live collection is mixed into this view."
              : "REPLAY unavailable. No live collection was substituted.",
        }
      }

      const bundle = scopeBundleToMissionArea(
        await loadCollections(fetcher, context, nowMs, signal),
        context,
      )
      const collectionOutcomes = Object.values(bundle)
      const collectionTruth = collectionOutcomes.map((outcome) => truthFromOutcome(outcome, identity.verified))
      const sourceRecords = pageItems(bundle.sources).filter(sourceValid).filter(classifiedOperational)
      const objectRecords = pageItems(bundle.objects).filter(objectValid)
      const relationshipRecords = normalizeRelationships(pageItems(bundle.relationships).filter(relationshipValid))
      const evidenceRecords = normalizeEvidence(pageItems(bundle.evidence).filter(evidenceValid), sourceRecords)
      const reviewRecords = pageItems(bundle.reviews)
        .filter(reviewValid)
        .filter((record) => record.kind === "environmental_judgment")
      const assessments = normalizeAssessments(objectRecords, relationshipRecords, evidenceRecords, reviewRecords)
      const history = normalizeHistory(pageItems(bundle.activity).filter(activityValid))
      const sourceTruth = [...platformTruth, ...collectionTruth]
      const condition = conditionForLive(sourceTruth, assessments, readinessStatus)
      const excludedModes = pageItems(bundle.objects).filter((record) => !classifiedOperational(record)).length
      const gaps = [
        "v1 has no first-class environmental hazard assessment resource; queue rows are transparent projections of environmental objects.",
        "Urgency, forecast horizon, explicit uncertainty, competing explanations, and an evidence-sufficiency denominator are not first-class v1 fields.",
        "The four package stages are a frontend workflow projection; linked v1 review state remains visible and authoritative.",
        "Environmental Response Coordination is a context-preserving read-only browser handoff because v1 has no application enum or persisted handoff destination for it.",
      ]
      if (excludedModes > 0) {
        gaps.unshift(`${excludedModes} non-operational or simulated object record(s) were excluded from the LIVE queue.`)
      }
      if (context.missionId === "runtime-unscoped") {
        gaps.unshift("No mission ID was supplied. The runtime-unscoped query is explicit and may legitimately return no records.")
      }
      return {
        schema: THREAT_ASSESSMENT_SCHEMA,
        context,
        generatedAt,
        condition,
        classification: "UNCLASSIFIED",
        identityMode: identity.mode,
        identityVerified: identity.verified,
        assessments,
        evidence: evidenceRecords,
        relationships: relationshipRecords,
        history,
        sourceTruth,
        gaps,
        note: loadingNote(condition),
      }
    },
  }
}

export const runtimeThreatAssessmentProvider = createThreatAssessmentProvider()
