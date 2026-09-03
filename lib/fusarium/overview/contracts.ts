export const OVERVIEW_SCHEMA_REF = "fusarium-overview-envelope/v1"

export type OverviewClassification = "UNCLASSIFIED"

export type OverviewDataMode = "live" | "replay" | "simulated" | "unavailable"

export type OverviewViewMode = "system" | "demo"

export type OverviewTimeWindow = "6h" | "24h" | "72h"

export type OverviewStatusState =
  | "not_implemented"
  | "artifact_only"
  | "simulated"
  | "configured"
  | "live"
  | "degraded"
  | "blocked"
  | "unreachable"
  | "unknown"

export type OverviewCondition =
  | "loading"
  | "empty"
  | "partial"
  | "stale"
  | "error"
  | "unauthorized"
  | "ready"
  | "replay"
  | "simulated"

export interface OverviewContext {
  missionAreaId: string
  missionAreaLabel: string
  timeWindow: OverviewTimeWindow
  dataMode: OverviewViewMode
  operatorRole: string
}

export interface OverviewConfidence {
  /** Null means the source did not make a scored inference. It is never rendered as zero. */
  score: number | null
  label: "high" | "moderate" | "low" | "not_assessed"
  basis: string
}

export interface OverviewFreshness {
  /** Time asserted by the source. Null means the source supplied no source timestamp. */
  observedAt: string | null
  /** Time this browser received or created the record. */
  receivedAt: string
  staleAfterSeconds: number | null
  state: "fresh" | "stale" | "unknown"
  basis: "source_timestamp" | "client_poll" | "scenario_clock" | "unavailable"
}

export interface OverviewStatus {
  state: OverviewStatusState
  condition: OverviewCondition
  source: string
  observedAt: string | null
  receivedAt: string
  staleAfterSeconds: number | null
  reference: string
  surface: string
  classification: OverviewClassification
  synthetic: boolean
  reason: string
  lastError?: string
}

export interface OverviewRecord<T> {
  recordId: string
  missionAreaId: string
  asOf: string
  effectiveInterval: {
    start: string
    end: string | null
  }
  dataMode: OverviewDataMode
  sourceIds: string[]
  provenanceRef: string
  confidence: OverviewConfidence
  classification: OverviewClassification
  demo: boolean
  freshness: OverviewFreshness
  status: OverviewStatus
  payload: T | null
}

export interface OverviewDetail {
  label: string
  value: string
}

export interface OverviewCardPayload {
  title: string
  summary: string
  kicker?: string
  location?: string
  trend?: string
  nextStep?: string
  owner?: string
  value?: string
  details?: OverviewDetail[]
}

export interface ConnectorPayload extends OverviewCardPayload {
  readiness: "UNCONFIGURED" | "DISABLED / UNVERIFIED" | "CONFIGURED / UNVERIFIED" | "CONNECTED" | "PLANNED"
  environment: string
  interfaceScope: string
  protocol: string
  authMode: string
  permissionProbe: string
  lastHandshake: string
  lastAcknowledgement: string
  ttlPolicy: string
}

export interface OverviewSnapshot {
  context: OverviewContext
  generatedAt: string
  operationalPosture: OverviewRecord<OverviewCardPayload>
  missionContinuity: OverviewRecord<OverviewCardPayload>
  environmentalPicture: OverviewRecord<OverviewCardPayload>
  environmentalStateMatrix: OverviewRecord<OverviewCardPayload>
  oeiBrief: OverviewRecord<OverviewCardPayload>
  priorityAnomalies: OverviewRecord<OverviewCardPayload>[]
  causalAssessment: OverviewRecord<OverviewCardPayload>[]
  recommendedObservations: OverviewRecord<OverviewCardPayload>[]
  governanceQueue: OverviewRecord<OverviewCardPayload>[]
  stabilityOutlook: OverviewRecord<OverviewCardPayload>[]
  deviceDomainHealth: OverviewRecord<OverviewCardPayload>[]
  modalityCoverage: OverviewRecord<OverviewCardPayload>[]
  provenanceHealth: OverviewRecord<OverviewCardPayload>[]
  missionRouting: OverviewRecord<OverviewCardPayload>[]
  productQueue: OverviewRecord<OverviewCardPayload>[]
  coreServices: OverviewRecord<OverviewCardPayload>[]
  connectorHealth: OverviewRecord<ConnectorPayload>[]
  activity: OverviewRecord<OverviewCardPayload>[]
  foundationBlockers: OverviewRecord<OverviewCardPayload>[]
}

export interface RecordOptions<T> {
  recordId: string
  missionAreaId: string
  now: string
  payload: T | null
  state: OverviewStatusState
  condition: OverviewCondition
  source: string
  surface: string
  reason: string
  dataMode?: OverviewDataMode
  sourceIds?: string[]
  provenanceRef?: string
  confidence?: Partial<OverviewConfidence>
  observedAt?: string | null
  staleAfterSeconds?: number | null
  demo?: boolean
  lastError?: string
}

export function createOverviewRecord<T>(options: RecordOptions<T>): OverviewRecord<T> {
  const dataMode = options.dataMode ?? "unavailable"
  const synthetic = dataMode === "simulated"
  const observedAt = options.observedAt === undefined ? options.now : options.observedAt
  const provenanceRef = options.provenanceRef ?? OVERVIEW_SCHEMA_REF
  const staleAfterSeconds = options.staleAfterSeconds ?? null

  return {
    recordId: options.recordId,
    missionAreaId: options.missionAreaId,
    asOf: observedAt ?? options.now,
    effectiveInterval: { start: observedAt ?? options.now, end: null },
    dataMode,
    sourceIds: options.sourceIds ?? [options.source],
    provenanceRef,
    confidence: {
      score: options.confidence?.score ?? null,
      label: options.confidence?.label ?? "not_assessed",
      basis: options.confidence?.basis ?? "No scored inference was supplied by this source.",
    },
    classification: "UNCLASSIFIED",
    demo: options.demo ?? synthetic,
    freshness: {
      observedAt,
      receivedAt: options.now,
      staleAfterSeconds,
      state: observedAt ? "fresh" : "unknown",
      basis: synthetic ? "scenario_clock" : observedAt ? "client_poll" : "unavailable",
    },
    status: {
      state: options.state,
      condition: options.condition,
      source: options.source,
      observedAt,
      receivedAt: options.now,
      staleAfterSeconds,
      reference: provenanceRef,
      surface: options.surface,
      classification: "UNCLASSIFIED",
      synthetic,
      reason: options.reason,
      ...(options.lastError ? { lastError: options.lastError } : {}),
    },
    payload: options.payload,
  }
}

export function withFreshness<T>(record: OverviewRecord<T>, nowMs: number): OverviewRecord<T> {
  const observedAt = record.freshness.observedAt
  const staleAfterSeconds = record.freshness.staleAfterSeconds
  if (!observedAt || staleAfterSeconds === null) return record

  const observedMs = Date.parse(observedAt)
  if (!Number.isFinite(observedMs)) return record
  const stale = nowMs - observedMs > staleAfterSeconds * 1000
  if (!stale || record.freshness.state === "stale") return record

  return {
    ...record,
    freshness: { ...record.freshness, state: "stale" },
    status: {
      ...record.status,
      condition: "stale",
      reason: `${record.status.reason} The last verified update is now stale.`,
    },
  }
}
