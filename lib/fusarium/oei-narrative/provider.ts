import {
  OEI_NARRATIVE_SCHEMA,
  type OeiClaim,
  type OeiCondition,
  type OeiContext,
  type OeiDimensionState,
  type OeiNarrativeSnapshot,
  type OeiSourceAssessment,
  type V1ActivityRecord,
  type V1ContextHandoff,
  type V1EnvironmentalObject,
  type V1EnvironmentalRelationship,
  type V1EvidenceRecord,
  type V1Mission,
  type V1MissionArea,
  type V1MissionContext,
  type V1Page,
  type V1ReviewItem,
  type V1SourceReadiness,
} from "./contracts"
import { buildSanitizedNarrativeScenario } from "./scenario"

type Fetcher = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>

export const OEI_READ_IDENTITY = Object.freeze({
  operatorId: "operator.oei-reader",
  role: "viewer",
  mode: "development_header_unverified",
})

interface RequestOutcome<T> {
  endpoint: string
  ok: boolean
  status: number | null
  receivedAt: string
  data: T | null
  schemaValid: boolean | null
  error: string | null
}

interface ReadinessPayload {
  status: "ready" | "degraded" | "not_ready"
  checkedAt: string
  identityMode: string
  developmentIdentity: boolean
  demoEnabled: boolean
  identity: {
    state: string
    configured: boolean
    verified: boolean
    detail: string
  }
}

interface HealthPayload {
  schemaRef: string
  status: "healthy"
  service: string
  version: string
  checkedAt: string
  classification: "UNCLASSIFIED"
}

interface ReplayPayload {
  items: V1ActivityRecord[]
  page: { nextCursor: string | null; hasMore: boolean; limit: number }
}

const API = "/api/fusarium/v1"
const UNBOUND = "runtime-unscoped"

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value && typeof value === "object" && !Array.isArray(value))

const isString = (value: unknown): value is string => typeof value === "string"
const isNullableString = (value: unknown): value is string | null => value === null || typeof value === "string"
const isStringArray = (value: unknown): value is string[] => Array.isArray(value) && value.every(isString)
const isNamespace = (value: unknown): value is "operational" | "demo" => value === "operational" || value === "demo"
const isDataMode = (value: unknown): value is V1MissionContext["dataMode"] =>
  ["live", "recorded", "replay", "simulated", "unavailable", "degraded"].includes(String(value))

function isUnclassified(value: Record<string, unknown>): boolean {
  return value.classification === "UNCLASSIFIED"
}

function isPage<T>(value: unknown, item: (candidate: unknown) => candidate is T): value is V1Page<T> {
  if (!isRecord(value) || !Array.isArray(value.items) || !value.items.every(item) || !isRecord(value.page)) return false
  return (
    isNullableString(value.page.nextCursor) &&
    typeof value.page.hasMore === "boolean" &&
    typeof value.page.limit === "number"
  )
}

function isMission(value: unknown): value is V1Mission {
  return isRecord(value) && isUnclassified(value) && isNamespace(value.namespace) && isString(value.id) && isString(value.name) && isString(value.status) && typeof value.revision === "number"
}

function isMissionArea(value: unknown): value is V1MissionArea {
  return isRecord(value) && isUnclassified(value) && isNamespace(value.namespace) && isString(value.id) && isString(value.name) && typeof value.revision === "number"
}

function isMissionContext(value: unknown): value is V1MissionContext {
  return (
    isRecord(value) &&
    isUnclassified(value) &&
    isNamespace(value.namespace) &&
    isString(value.id) &&
    isString(value.missionId) &&
    isString(value.missionAreaId) &&
    isRecord(value.timeRange) &&
    isString(value.timeRange.start) &&
    isString(value.timeRange.end) &&
    isDataMode(value.dataMode) &&
    isString(value.operatorId)
  )
}

function isConfidence(value: unknown): boolean {
  return isRecord(value) && (value.score === null || typeof value.score === "number") && isString(value.label) && isString(value.basis)
}

function isFreshness(value: unknown): boolean {
  return isRecord(value) && isNullableString(value.observedAt) && isString(value.receivedAt) && isString(value.state) && isString(value.basis)
}

function isEnvironmentalObject(value: unknown): value is V1EnvironmentalObject {
  return (
    isRecord(value) &&
    isUnclassified(value) &&
    isNamespace(value.namespace) &&
    isString(value.id) &&
    isString(value.missionId) &&
    isString(value.missionAreaId) &&
    isString(value.domain) &&
    isString(value.objectType) &&
    isString(value.name) &&
    isString(value.summary) &&
    Array.isArray(value.changes) &&
    isStringArray(value.relationshipIds) &&
    isStringArray(value.sourceIds) &&
    isStringArray(value.evidenceIds) &&
    isString(value.provenanceRef) &&
    isConfidence(value.confidence) &&
    isFreshness(value.freshness) &&
    isDataMode(value.dataMode) &&
    typeof value.synthetic === "boolean"
  )
}

function isRelationship(value: unknown): value is V1EnvironmentalRelationship {
  return (
    isRecord(value) &&
    isUnclassified(value) &&
    isNamespace(value.namespace) &&
    isString(value.id) &&
    isString(value.missionId) &&
    isString(value.fromObjectId) &&
    isString(value.toObjectId) &&
    isString(value.relationshipType) &&
    isString(value.label) &&
    isStringArray(value.evidenceIds) &&
    isConfidence(value.confidence) &&
    isDataMode(value.dataMode) &&
    typeof value.synthetic === "boolean"
  )
}

function isEvidence(value: unknown): value is V1EvidenceRecord {
  return (
    isRecord(value) &&
    isUnclassified(value) &&
    isNamespace(value.namespace) &&
    isString(value.id) &&
    isString(value.missionId) &&
    isString(value.missionAreaId) &&
    isStringArray(value.objectIds) &&
    isString(value.sourceId) &&
    isString(value.title) &&
    isString(value.sourceRef) &&
    isRecord(value.lineage) &&
    isStringArray(value.lineage.sourceRecordIds) &&
    isStringArray(value.lineage.parentEvidenceIds) &&
    Array.isArray(value.lineage.transformations) &&
    isNullableString(value.observedAt) &&
    isString(value.receivedAt) &&
    isConfidence(value.confidence) &&
    isString(value.confidenceBasis) &&
    isString(value.integrityState) &&
    isString(value.verificationState) &&
    isDataMode(value.dataMode) &&
    typeof value.synthetic === "boolean"
  )
}

function isReview(value: unknown): value is V1ReviewItem {
  return (
    isRecord(value) &&
    isUnclassified(value) &&
    isNamespace(value.namespace) &&
    isString(value.id) &&
    isString(value.missionId) &&
    isString(value.kind) &&
    isString(value.state) &&
    isStringArray(value.objectIds) &&
    isStringArray(value.evidenceIds) &&
    isString(value.requestedBy) &&
    isNullableString(value.assignedTo) &&
    isDataMode(value.dataMode) &&
    typeof value.synthetic === "boolean" &&
    isString(value.updatedAt)
  )
}

function isActivity(value: unknown): value is V1ActivityRecord {
  return (
    isRecord(value) &&
    isUnclassified(value) &&
    isNamespace(value.namespace) &&
    isString(value.id) &&
    typeof value.sequence === "number" &&
    isString(value.missionId) &&
    isString(value.actorId) &&
    isString(value.occurredAt) &&
    isString(value.actionType) &&
    isStringArray(value.objectIds) &&
    isStringArray(value.evidenceIds) &&
    isDataMode(value.dataMode) &&
    value.appendOnly === true
  )
}

function isHandoff(value: unknown): value is V1ContextHandoff {
  return (
    isRecord(value) &&
    isUnclassified(value) &&
    isNamespace(value.namespace) &&
    isString(value.id) &&
    isString(value.contextId) &&
    isString(value.missionId) &&
    isString(value.missionAreaId) &&
    isString(value.sourceApplication) &&
    isString(value.targetApplication) &&
    isDataMode(value.dataMode) &&
    isString(value.createdAt)
  )
}

function isSourceReadiness(value: unknown): value is V1SourceReadiness {
  return (
    isRecord(value) &&
    isUnclassified(value) &&
    isNamespace(value.namespace) &&
    isString(value.id) &&
    isString(value.label) &&
    isString(value.sourceType) &&
    isNullableString(value.endpointRef) &&
    isString(value.state) &&
    typeof value.configured === "boolean" &&
    typeof value.verified === "boolean" &&
    typeof value.live === "boolean" &&
    isString(value.receivedAt) &&
    (value.recordCount === null || typeof value.recordCount === "number") &&
    isDataMode(value.dataMode) &&
    isString(value.reason) &&
    typeof value.synthetic === "boolean"
  )
}

function isHealth(value: unknown): value is HealthPayload {
  return (
    isRecord(value) &&
    value.classification === "UNCLASSIFIED" &&
    isString(value.schemaRef) &&
    value.status === "healthy" &&
    isString(value.service) &&
    isString(value.version) &&
    isString(value.checkedAt)
  )
}

function isReadiness(value: unknown): value is ReadinessPayload {
  return (
    isRecord(value) &&
    value.classification === "UNCLASSIFIED" &&
    ["ready", "degraded", "not_ready"].includes(String(value.status)) &&
    isString(value.checkedAt) &&
    isString(value.identityMode) &&
    typeof value.developmentIdentity === "boolean" &&
    typeof value.demoEnabled === "boolean" &&
    isRecord(value.identity) &&
    typeof value.identity.configured === "boolean" &&
    typeof value.identity.verified === "boolean" &&
    isString(value.identity.state) &&
    isString(value.identity.detail)
  )
}

function isDemo(value: unknown): value is Record<string, unknown> {
  return isRecord(value) && value.mode === "SIMULATED" && isRecord(value.snapshot) && Array.isArray(value.snapshot.objects) && Array.isArray(value.snapshot.evidence)
}

function isReplay(value: unknown): value is ReplayPayload {
  return isRecord(value) && Array.isArray(value.items) && value.items.every(isActivity) && isRecord(value.page) && typeof value.page.hasMore === "boolean"
}

function controlledInit(init?: RequestInit): RequestInit {
  const headers = new Headers(init?.headers)
  headers.set("Accept", "application/json")
  // Deliberately fixed at the least-privileged read role. URL state is display
  // context only and can never become authorization metadata.
  headers.set("X-Operator-Id", OEI_READ_IDENTITY.operatorId)
  headers.set("X-Operator-Role", OEI_READ_IDENTITY.role)
  return { ...init, cache: "no-store", headers }
}

async function requestJson<T>(
  fetcher: Fetcher,
  endpoint: string,
  validate: (value: unknown) => value is T,
  signal?: AbortSignal,
  init?: RequestInit,
): Promise<RequestOutcome<T>> {
  const receivedAt = new Date().toISOString()
  try {
    const response = await fetcher(endpoint, controlledInit({ ...init, signal }))
    let payload: unknown = null
    try {
      payload = await response.json()
    } catch {
      payload = null
    }
    if (!response.ok) {
      return {
        endpoint,
        ok: false,
        status: response.status,
        receivedAt,
        data: null,
        schemaValid: null,
        error: `HTTP ${response.status}`,
      }
    }
    const schemaValid = validate(payload)
    return {
      endpoint,
      ok: schemaValid,
      status: response.status,
      receivedAt,
      data: schemaValid ? (payload as T) : null,
      schemaValid,
      error: schemaValid ? null : "Response did not match the OEI-required v1 shape.",
    }
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error
    return {
      endpoint,
      ok: false,
      status: null,
      receivedAt,
      data: null,
      schemaValid: null,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

function cursorEndpoint(endpoint: string, cursor: string): string {
  const url = new URL(endpoint, "http://oei.local")
  url.searchParams.set("cursor", cursor)
  return `${url.pathname}${url.search}`
}

async function requestAllPages<T>(
  fetcher: Fetcher,
  endpoint: string,
  validateItem: (value: unknown) => value is T,
  signal?: AbortSignal,
): Promise<RequestOutcome<V1Page<T>>> {
  const items: T[] = []
  let next = endpoint
  let firstStatus: number | null = null
  let receivedAt = new Date().toISOString()
  const seen = new Set<string>()

  for (let pageIndex = 0; pageIndex < 100; pageIndex += 1) {
    const outcome = await requestJson(fetcher, next, (value): value is V1Page<T> => isPage(value, validateItem), signal)
    if (!outcome.ok || !outcome.data) return { ...outcome, endpoint }
    if (firstStatus === null) firstStatus = outcome.status
    receivedAt = outcome.receivedAt
    items.push(...outcome.data.items)
    if (!outcome.data.page.hasMore) {
      return {
        endpoint,
        ok: true,
        status: firstStatus,
        receivedAt,
        data: { items, page: { nextCursor: null, hasMore: false, limit: outcome.data.page.limit } },
        schemaValid: true,
        error: null,
      }
    }
    const cursor = outcome.data.page.nextCursor
    if (!cursor || seen.has(cursor)) {
      return {
        endpoint,
        ok: false,
        status: firstStatus,
        receivedAt,
        data: null,
        schemaValid: false,
        error: "Pagination declared more data without a new cursor.",
      }
    }
    seen.add(cursor)
    next = cursorEndpoint(endpoint, cursor)
  }
  return {
    endpoint,
    ok: false,
    status: firstStatus,
    receivedAt,
    data: null,
    schemaValid: false,
    error: "Pagination exceeded the 100-page safety bound.",
  }
}

function transport(outcome: RequestOutcome<unknown>): OeiSourceAssessment["transport"] {
  if (outcome.status === 401 || outcome.status === 403) return "unauthorized"
  if (outcome.status === null) return "unreachable"
  return "reachable"
}

function latest(values: Array<string | null | undefined>): string | null {
  return values
    .filter((value): value is string => Boolean(value && Number.isFinite(Date.parse(value))))
    .sort((left, right) => Date.parse(right) - Date.parse(left))[0] ?? null
}

function endpointAssessment<T>(
  id: string,
  label: string,
  outcome: RequestOutcome<T>,
  identityMode: string,
  options: {
    recordCount?: number | null
    observedAt?: string | null
    provenance?: OeiDimensionState
    coverage?: OeiDimensionState
    freshness?: OeiDimensionState
    synthetic?: boolean
    note?: string
  } = {},
): OeiSourceAssessment {
  const count = options.recordCount === undefined ? (outcome.ok ? 1 : null) : options.recordCount
  const transportState = transport(outcome)
  const schema: OeiDimensionState =
    outcome.schemaValid === true ? "valid" : outcome.schemaValid === false ? "unavailable" : "unknown"
  const dataPresence: OeiDimensionState = !outcome.ok
    ? "unavailable"
    : count === null
      ? "unknown"
      : count === 0
        ? "empty"
        : "present"
  return {
    id,
    label,
    endpoint: outcome.endpoint,
    transport: transportState,
    httpStatus: outcome.status,
    identityMode,
    identityVerified: false,
    schema,
    freshness: options.freshness ?? (options.observedAt ? "verified" : outcome.ok ? "unknown" : "unavailable"),
    provenance: options.provenance ?? (outcome.ok ? "partial" : "unavailable"),
    coverage: options.coverage ?? (dataPresence === "present" ? "partial" : dataPresence),
    dataPresence,
    receivedAt: outcome.ok ? outcome.receivedAt : null,
    observedAt: options.observedAt ?? null,
    recordCount: outcome.ok ? count : null,
    synthetic: options.synthetic ?? false,
    note:
      options.note ??
      (outcome.ok
        ? "Endpoint response passed the OEI-required v1 shape check. Identity remains an unverified development header."
        : `${transportState === "reachable" ? "Endpoint reached" : "Endpoint not reached"}; ${outcome.error ?? "data unavailable"}.`),
  }
}

function readinessAssessment(record: V1SourceReadiness, identityMode: string): OeiSourceAssessment {
  const sourceTransport =
    record.state === "unauthorized"
      ? "unauthorized"
      : record.state === "unreachable"
        ? "unreachable"
        : record.verified && (record.live || record.state === "verified")
          ? "reachable"
          : "unknown"
  return {
    id: `source-record:${record.id}`,
    label: record.label,
    endpoint: record.endpointRef ?? "endpoint unavailable",
    transport: sourceTransport,
    httpStatus: null,
    identityMode,
    identityVerified: false,
    schema: "unknown",
    freshness: record.state === "stale" ? "stale" : record.observedAt ? "verified" : "unknown",
    provenance: record.verified ? "verified" : "unverified",
    coverage: record.recordCount === null ? "unknown" : record.recordCount === 0 ? "empty" : "partial",
    dataPresence: record.recordCount === null ? "unknown" : record.recordCount === 0 ? "empty" : "present",
    receivedAt: record.receivedAt,
    observedAt: record.observedAt,
    recordCount: record.recordCount,
    synthetic: record.synthetic,
    note: `${record.reason} This is a v1 readiness record, not a browser-originated probe of the source endpoint.`,
  }
}

function timeRange(window: OeiContext["timeWindow"], nowMs: number): { start: string; end: string } {
  const hours = window === "6h" ? 6 : window === "72h" ? 72 : 24
  return {
    start: new Date(nowMs - hours * 60 * 60 * 1000).toISOString(),
    end: new Date(nowMs).toISOString(),
  }
}

function sourceClaims(objects: readonly V1EnvironmentalObject[]): OeiClaim[] {
  return objects
    .filter((object) => object.summary.trim())
    .map((object) => ({
      id: `claim.source.${object.id}`,
      text: object.summary,
      objectIds: [object.id],
      evidenceIds: [...object.evidenceIds],
      confidence: { ...object.confidence },
      uncertainty:
        object.confidence.score === null
          ? "The source did not assess confidence."
          : "No separate uncertainty statement was supplied; retain the source confidence basis and caveats.",
      caveats: [
        ...(object.freshness.state === "stale" ? ["Supporting object is stale."] : []),
        ...(object.status === "unknown" || object.status === "unavailable"
          ? [`Supporting object state is ${object.status}.`]
          : []),
      ],
      competingExplanations: [],
      changedSincePrevious: false,
      authoringBasis: "source_summary" as const,
    }))
}

function baseSnapshot(
  context: OeiContext,
  now: string,
  condition: OeiCondition,
  identityMode: string,
  sources: OeiSourceAssessment[],
  values: Partial<OeiNarrativeSnapshot> = {},
): OeiNarrativeSnapshot {
  return {
    schema: OEI_NARRATIVE_SCHEMA,
    context,
    condition,
    generatedAt: now,
    identityMode,
    identityVerified: false,
    persistence: "unavailable",
    persistenceNote: "No v1 narrative, claim, version, release, or publication repository is available. Edits can be saved only as a mutable browser-local draft.",
    mission: null,
    missionArea: null,
    missionContext: null,
    availableMissions: [],
    availableMissionAreas: [],
    availableContexts: [],
    sourceRecords: [],
    objects: [],
    relationships: [],
    evidence: [],
    reviews: [],
    activity: [],
    handoffs: [],
    claims: [],
    versions: [],
    publicationHistory: [],
    sources,
    gaps: [
      "Narrative-specific durable persistence is not implemented in /api/fusarium/v1.",
      "Immutable publication history and external delivery are unavailable.",
      "Generated wording is disabled; only source-supplied summaries or operator-entered local text can become claims.",
      "Forecast is not a v1 data mode and remains an explicitly unavailable provider seam.",
    ],
    note: "No narrative state is inferred while provider truth is unavailable.",
    ...values,
  }
}

function endpointUnavailable(outcomes: readonly RequestOutcome<unknown>[]): OeiCondition {
  if (outcomes.some((outcome) => outcome.status === 401 || outcome.status === 403)) return "unauthorized"
  if (outcomes.every((outcome) => outcome.status === null)) return "unavailable"
  return "degraded"
}

export interface OeiNarrativeProvider {
  load(context: OeiContext, signal?: AbortSignal): Promise<OeiNarrativeSnapshot>
}

export function createOeiNarrativeProvider(
  fetcher: Fetcher = fetch,
  clock: () => number = Date.now,
): OeiNarrativeProvider {
  return {
    async load(incoming, signal) {
      const nowMs = clock()
      const generatedAt = new Date(nowMs).toISOString()
      const [health, readiness] = await Promise.all([
        requestJson(fetcher, `${API}/health`, isHealth, signal),
        requestJson(fetcher, `${API}/readiness`, isReadiness, signal),
      ])
      const identityMode = readiness.data?.identityMode ?? "identity_status_unavailable"
      const foundationSources = [
        endpointAssessment("v1-health", "Fusarium intelligence v1 health", health, identityMode, {
          observedAt: health.data?.checkedAt ?? null,
          provenance: health.ok ? "partial" : "unavailable",
          coverage: "not_applicable",
        }),
        endpointAssessment("v1-readiness", "Fusarium intelligence v1 readiness", readiness, identityMode, {
          observedAt: readiness.data?.checkedAt ?? null,
          provenance: readiness.ok ? "partial" : "unavailable",
          coverage: "not_applicable",
          note: readiness.ok
            ? `Runtime readiness is ${readiness.data?.status ?? "unknown"}; identity mode ${identityMode}, verified=false.`
            : `Readiness contract unavailable: ${readiness.error ?? "unknown error"}.`,
        }),
      ]

      if (incoming.mode === "simulated") {
        const demo = await requestJson(fetcher, `${API}/demo`, isDemo, signal)
        const demoSnapshot = demo.data && isRecord(demo.data.snapshot) ? demo.data.snapshot : null
        const demoCount = demoSnapshot
          ? ["objects", "relationships", "evidence", "observations", "coverage"]
              .map((key) => (Array.isArray(demoSnapshot[key]) ? (demoSnapshot[key] as unknown[]).length : 0))
              .reduce((sum, count) => sum + count, 0)
          : null
        const demoSource = endpointAssessment("v1-demo", "Fusarium v1 sanitized demo contract", demo, identityMode, {
          recordCount: demoCount,
          synthetic: true,
          provenance: demo.ok ? "verified" : "unavailable",
          coverage: demo.ok ? "partial" : "unavailable",
          freshness: "not_applicable",
          note: demo.ok
            ? "The v1 deterministic demo contract resolved. OEI adds only a separate, visibly synthetic narrative fixture."
            : "The v1 demo endpoint did not resolve; the local deterministic OEI fixture remains visibly separate from operational state.",
        })
        return buildSanitizedNarrativeScenario(incoming, [...foundationSources, demoSource])
      }

      if (!health.ok || !readiness.ok || readiness.data?.status !== "ready") {
        return baseSnapshot(
          incoming,
          generatedAt,
          endpointUnavailable([health, readiness]),
          identityMode,
          foundationSources,
          {
            note: readiness.ok && readiness.data?.status !== "ready"
              ? `Fusarium intelligence readiness is ${readiness.data?.status ?? "unknown"}. Operational, replay, and forecast collections remain unavailable until readiness is ready; the sanitized scenario is opt-in only.`
              : "The running process does not expose a verified Fusarium intelligence v1 contract. Operational, replay, and forecast content remain unavailable; the sanitized scenario is opt-in only.",
          },
        )
      }

      const [missionsOutcome, areasOutcome, sourcesOutcome] = await Promise.all([
        requestAllPages(fetcher, `${API}/missions?limit=100`, isMission, signal),
        requestAllPages(fetcher, `${API}/mission-areas?limit=100`, isMissionArea, signal),
        requestAllPages(fetcher, `${API}/sources?limit=100`, isSourceReadiness, signal),
      ])
      const rawAvailableMissions = missionsOutcome.data?.items ?? []
      const rawAvailableMissionAreas = areasOutcome.data?.items ?? []
      const rawSourceRecords = sourcesOutcome.data?.items ?? []
      const availableMissions = rawAvailableMissions.filter((mission) => mission.namespace === "operational")
      const availableMissionAreas = rawAvailableMissionAreas.filter((area) => area.namespace === "operational")
      const sourceRecords = rawSourceRecords.filter(
        (source) => source.namespace === "operational" && !source.synthetic && source.dataMode !== "simulated",
      )
      const catalogSources = [
        endpointAssessment("v1-missions", "Mission catalog", missionsOutcome, identityMode, {
          recordCount: availableMissions.length,
          observedAt: latest(availableMissions.map((mission) => mission.updatedAt)),
          provenance: missionsOutcome.ok ? "verified" : "unavailable",
        }),
        endpointAssessment("v1-mission-areas", "Mission-area catalog", areasOutcome, identityMode, {
          recordCount: availableMissionAreas.length,
          observedAt: latest(availableMissionAreas.map((area) => area.updatedAt)),
          provenance: areasOutcome.ok ? "verified" : "unavailable",
        }),
        endpointAssessment("v1-sources", "Source readiness registry", sourcesOutcome, identityMode, {
          recordCount: sourceRecords.length,
          observedAt: latest(sourceRecords.map((source) => source.observedAt ?? source.receivedAt)),
          provenance: sourcesOutcome.ok ? "verified" : "unavailable",
        }),
        ...sourceRecords.map((source) => readinessAssessment(source, identityMode)),
      ]
      const sources = [...foundationSources, ...catalogSources]

      const explicitMissionId = incoming.missionId !== UNBOUND ? incoming.missionId : null
      const explicitContextId = incoming.contextId
      let missionContextOutcome: RequestOutcome<V1MissionContext> | null = null
      if (explicitContextId) {
        missionContextOutcome = await requestJson(fetcher, `${API}/contexts/${encodeURIComponent(explicitContextId)}`, isMissionContext, signal)
        sources.push(endpointAssessment("v1-selected-context", "Selected mission context", missionContextOutcome, identityMode, {
          recordCount: missionContextOutcome.ok ? 1 : null,
          observedAt: missionContextOutcome.data?.updatedAt ?? null,
          provenance: missionContextOutcome.ok ? "verified" : "unavailable",
        }))
      }
      const rawSelectedContextCandidate = missionContextOutcome?.data ?? null
      const contextModeRejected = Boolean(
        rawSelectedContextCandidate &&
        (rawSelectedContextCandidate.namespace !== "operational" || rawSelectedContextCandidate.dataMode === "simulated"),
      )
      const selectedContextCandidate = contextModeRejected ? null : rawSelectedContextCandidate
      const contextMissionMismatch = Boolean(
        selectedContextCandidate && explicitMissionId && selectedContextCandidate.missionId !== explicitMissionId,
      )
      const selectedContext = contextMissionMismatch ? null : selectedContextCandidate
      const selectedMissionId = explicitMissionId ?? selectedContext?.missionId ?? null
      const mission = selectedMissionId
        ? availableMissions.find((item) => item.id === selectedMissionId) ?? null
        : null

      let availableContexts: V1MissionContext[] = []
      if (selectedMissionId) {
        const contextsOutcome = await requestAllPages(
          fetcher,
          `${API}/contexts?missionId=${encodeURIComponent(selectedMissionId)}&limit=100`,
          isMissionContext,
          signal,
        )
        availableContexts = (contextsOutcome.data?.items ?? []).filter(
          (context) =>
            context.namespace === "operational" &&
            context.dataMode !== "simulated" &&
            context.missionId === selectedMissionId,
        )
        sources.push(endpointAssessment("v1-contexts", "Mission contexts", contextsOutcome, identityMode, {
          recordCount: availableContexts.length,
          observedAt: latest(availableContexts.map((context) => context.updatedAt)),
          provenance: contextsOutcome.ok ? "verified" : "unavailable",
          note: contextsOutcome.ok
            ? "Only contexts owned by the fixed least-privileged OEI development reader are returned. URL role and operator values are never authorization headers."
            : `Context list unavailable: ${contextsOutcome.error ?? "unknown error"}.`,
        }))
      }

      const selectedAreaId = selectedContext?.missionAreaId ?? (incoming.missionAreaId !== UNBOUND ? incoming.missionAreaId : null)
      const missionArea = selectedAreaId
        ? availableMissionAreas.find((item) => item.id === selectedAreaId) ?? null
        : null
      const resolvedContext: OeiContext = {
        ...incoming,
        missionId: selectedMissionId ?? incoming.missionId,
        missionLabel: mission?.name ?? incoming.missionLabel,
        contextId: selectedContext?.id ?? incoming.contextId,
        missionAreaId: selectedAreaId ?? incoming.missionAreaId,
        missionAreaLabel: missionArea?.name ?? selectedContext?.missionAreaLabel ?? incoming.missionAreaLabel,
      }
      const scopeValues: Partial<OeiNarrativeSnapshot> = {
        context: resolvedContext,
        mission,
        missionArea,
        missionContext: selectedContext,
        availableMissions,
        availableMissionAreas,
        availableContexts,
        sourceRecords,
      }

      if (contextModeRejected) {
        return baseSnapshot(resolvedContext, generatedAt, "degraded", identityMode, sources, {
          ...scopeValues,
          gaps: [
            "The selected context is demo or simulated and was withheld from the operational OEI bind.",
            "Narrative persistence and publication remain unavailable.",
          ],
          note: "A non-operational selected context was rejected. Use SIMULATED mode explicitly for sanitized scenario content.",
        })
      }

      if (contextMissionMismatch) {
        return baseSnapshot(resolvedContext, generatedAt, "degraded", identityMode, sources, {
          ...scopeValues,
          gaps: [
            "The selected context belongs to a different mission than the URL mission. No mission-scoped records were loaded.",
            "Narrative persistence and publication remain unavailable.",
          ],
          note: "Mission/context mismatch blocked the narrative bind.",
        })
      }

      if (!selectedMissionId || !mission) {
        const missionCatalogFailed = !missionsOutcome.ok
        const trulyEmptyCatalog = missionsOutcome.ok && availableMissions.length === 0 && !explicitMissionId
        return baseSnapshot(
          resolvedContext,
          generatedAt,
          missionCatalogFailed
            ? endpointUnavailable([missionsOutcome])
            : trulyEmptyCatalog
              ? "empty"
              : "unavailable",
          identityMode,
          sources,
          {
            ...scopeValues,
            note:
              missionCatalogFailed
                ? "The operational mission catalog is unavailable. Its record count is unknown, not empty."
                : trulyEmptyCatalog
                  ? "The v1 contract is reachable and the operational mission catalog is empty. No environmental all-clear is implied."
                  : explicitMissionId
                    ? "The explicit mission did not resolve in the operational catalog. Demo or unknown missions are not rebound into LIVE mode."
                    : "Select an explicit mission before OEI loads mission-scoped objects, evidence, reviews, or activity. No context is guessed from the catalog.",
          },
        )
      }

      if (incoming.mode === "forecast") {
        return baseSnapshot(resolvedContext, generatedAt, "forecast", identityMode, sources, {
          ...scopeValues,
          note: "FORECAST mode is isolated. The v1 contract has no forecast data mode or narrative forecast provider, so current operational records are not mixed into this workspace.",
          gaps: [
            "No forecast provider, model identity, forecast horizon contract, or forecast evidence bundle is bound.",
            "Current/live records are intentionally withheld from the forecast canvas.",
            "Narrative persistence and external publication are unavailable.",
          ],
        })
      }

      const bounds = selectedContext?.timeRange ?? timeRange(incoming.timeWindow, nowMs)
      if (incoming.mode === "replay") {
        const replay = await requestJson(
          fetcher,
          `${API}/replay`,
          isReplay,
          signal,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              missionId: selectedMissionId,
              timeRange: bounds,
              namespace: "operational",
              limit: 100,
            }),
          },
        )
        const replayItems = (replay.data?.items ?? []).filter(
          (item) =>
            item.namespace === "operational" &&
            item.dataMode !== "simulated" &&
            item.missionId === selectedMissionId,
        )
        sources.push(endpointAssessment("v1-replay", "Append-only mission replay", replay, identityMode, {
          recordCount: replayItems.length,
          observedAt: latest(replayItems.map((item) => item.occurredAt)),
          provenance: replay.ok ? "verified" : "unavailable",
          coverage: replay.ok ? (replayItems.length ? "partial" : "empty") : "unavailable",
          freshness: "not_applicable",
        }))
        return baseSnapshot(
          resolvedContext,
          generatedAt,
          replay.ok ? "replay" : endpointUnavailable([replay]),
          identityMode,
          sources,
          {
            ...scopeValues,
            activity: replayItems,
            note: replay.ok
              ? replayItems.length
                ? "REPLAY mode shows only append-only activity inside the selected time range. Current object state is not presented as historical state."
                : "REPLAY mode resolved with no activity records in the selected window. This is an empty replay, not a measured environmental zero."
              : "The time-bounded replay contract is unavailable. Current operational state is not substituted.",
          },
        )
      }

      const missionQuery = encodeURIComponent(selectedMissionId)
      const [objectsOutcome, relationshipsOutcome, evidenceOutcome, reviewsOutcome, activityOutcome, handoffsOutcome] = await Promise.all([
        requestAllPages(fetcher, `${API}/objects?missionId=${missionQuery}&limit=100`, isEnvironmentalObject, signal),
        requestAllPages(fetcher, `${API}/relationships?missionId=${missionQuery}&limit=100`, isRelationship, signal),
        requestAllPages(
          fetcher,
          `${API}/evidence?missionId=${missionQuery}&start=${encodeURIComponent(bounds.start)}&end=${encodeURIComponent(bounds.end)}&limit=100`,
          isEvidence,
          signal,
        ),
        requestAllPages(fetcher, `${API}/reviews?missionId=${missionQuery}&limit=100`, isReview, signal),
        requestAllPages(
          fetcher,
          `${API}/activity?missionId=${missionQuery}&start=${encodeURIComponent(bounds.start)}&end=${encodeURIComponent(bounds.end)}&limit=100`,
          isActivity,
          signal,
        ),
        requestAllPages(fetcher, `${API}/handoffs?missionId=${missionQuery}&limit=100`, isHandoff, signal),
      ])

      const rawObjects = objectsOutcome.data?.items ?? []
      const rawRelationships = relationshipsOutcome.data?.items ?? []
      const rawEvidence = evidenceOutcome.data?.items ?? []
      const rawReviews = reviewsOutcome.data?.items ?? []
      const rawActivity = activityOutcome.data?.items ?? []
      const rawHandoffs = handoffsOutcome.data?.items ?? []
      // Fail closed if a provider ever mixes a demo namespace or synthetic record
      // into this operational branch, even if the HTTP contract allowed it.
      const objects = rawObjects.filter((item) => item.namespace === "operational" && !item.synthetic && item.dataMode !== "simulated")
      const relationships = rawRelationships.filter((item) => item.namespace === "operational" && !item.synthetic && item.dataMode !== "simulated")
      const evidence = rawEvidence.filter((item) => item.namespace === "operational" && !item.synthetic && item.dataMode !== "simulated")
      const reviews = rawReviews.filter((item) => item.namespace === "operational" && !item.synthetic && item.dataMode !== "simulated")
      const activity = rawActivity.filter((item) => item.namespace === "operational" && item.dataMode !== "simulated")
      const handoffs = rawHandoffs.filter((item) => item.namespace === "operational" && item.dataMode !== "simulated")
      const collectionOutcomes: Array<RequestOutcome<unknown>> = [
        objectsOutcome,
        relationshipsOutcome,
        evidenceOutcome,
        reviewsOutcome,
        activityOutcome,
        handoffsOutcome,
      ]
      sources.push(
        endpointAssessment("v1-objects", "Environmental objects and nested changes", objectsOutcome, identityMode, {
          recordCount: objects.length,
          observedAt: latest(objects.map((item) => item.freshness.observedAt)),
          provenance: objects.length && objects.every((item) => item.provenanceRef) ? "verified" : objectsOutcome.ok ? "empty" : "unavailable",
        }),
        endpointAssessment("v1-relationships", "Environmental relationships", relationshipsOutcome, identityMode, {
          recordCount: relationships.length,
          provenance: relationships.length && relationships.every((item) => item.evidenceIds.length > 0) ? "verified" : relationshipsOutcome.ok ? "partial" : "unavailable",
        }),
        endpointAssessment("v1-evidence", "Evidence and provenance", evidenceOutcome, identityMode, {
          recordCount: evidence.length,
          observedAt: latest(evidence.map((item) => item.observedAt ?? item.receivedAt)),
          provenance: evidence.length && evidence.every((item) => item.sourceRef && item.lineage) ? "verified" : evidenceOutcome.ok ? "empty" : "unavailable",
        }),
        endpointAssessment("v1-reviews", "Human review queue", reviewsOutcome, identityMode, {
          recordCount: reviews.length,
          observedAt: latest(reviews.map((item) => item.updatedAt)),
          provenance: reviewsOutcome.ok ? "verified" : "unavailable",
        }),
        endpointAssessment("v1-activity", "Append-only activity", activityOutcome, identityMode, {
          recordCount: activity.length,
          observedAt: latest(activity.map((item) => item.occurredAt)),
          provenance: activityOutcome.ok ? "verified" : "unavailable",
        }),
        endpointAssessment("v1-handoffs", "Context handoffs", handoffsOutcome, identityMode, {
          recordCount: handoffs.length,
          observedAt: latest(handoffs.map((item) => item.createdAt)),
          provenance: handoffsOutcome.ok ? "verified" : "unavailable",
        }),
      )

      const failed = collectionOutcomes.filter((outcome) => !outcome.ok)
      const allRecordsEmpty = objects.length + relationships.length + evidence.length + reviews.length + activity.length + handoffs.length === 0
      const anyStale = objects.some((item) => item.freshness.state === "stale")
      const condition: OeiCondition =
        failed.length === collectionOutcomes.length
          ? endpointUnavailable(failed)
          : failed.length > 0
            ? "partial"
            : anyStale
              ? "stale"
              : allRecordsEmpty
                ? "empty"
                : "ready"
      const claims = sourceClaims(objects)
      const filteredCount =
        rawObjects.length - objects.length +
        rawRelationships.length - relationships.length +
        rawEvidence.length - evidence.length +
        rawReviews.length - reviews.length +
        rawActivity.length - activity.length +
        rawHandoffs.length - handoffs.length
      const gaps = [
        "Narrative-specific durable persistence is not implemented in /api/fusarium/v1.",
        "Immutable publication history and external delivery are unavailable.",
        "Competing explanations are operator-authored because the current object/evidence contracts do not carry them.",
        "Changed since last brief is available only after a browser-local version baseline exists.",
        ...(filteredCount > 0 ? [`${filteredCount} simulated or non-operational record(s) were withheld from LIVE mode.`] : []),
      ]
      return baseSnapshot(resolvedContext, generatedAt, condition, identityMode, sources, {
        ...scopeValues,
        objects,
        relationships,
        evidence,
        reviews,
        activity,
        handoffs,
        claims,
        gaps,
        note:
          condition === "empty"
            ? "The selected mission returned no object, relationship, evidence, review, activity, or handoff records in this bind. Empty is not an environmental all-clear."
            : "Claim seeds copy source-supplied object summaries exactly. No prose, evidence, confidence, or competing explanation is generated by the provider.",
      })
    },
  }
}

export const oeiNarrativeProvider = createOeiNarrativeProvider()
