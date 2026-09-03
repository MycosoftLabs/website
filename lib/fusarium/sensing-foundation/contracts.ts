/**
 * Pure, source-only contracts for Fusarium aerosol and sensing reads.
 *
 * This module performs no network, credential, persistence, device, or clock
 * access. Callers must supply timestamps and source evidence explicitly.
 */

export const SENSING_READ_SCHEMA = "fusarium-sensing-read/v1" as const
export const SENSING_CLASSIFICATION = "UNCLASSIFIED" as const

export const SENSING_SOURCE_IDS = [
  "spores",
  "sporebase",
  "particulate",
  "nasa-firms-fire",
  "smoke",
  "air-quality",
  "gis",
  "fci",
  "mycobrain",
  "bluesight",
  "sine",
  "gandha",
] as const

export type SensingSourceId = (typeof SENSING_SOURCE_IDS)[number]
export type SensingReadState = "unbound" | "empty" | "available" | "degraded" | "stale"
export type SensingDataPresence = "unknown" | "empty" | "present"
export type SensingFreshnessState = "unavailable" | "unknown" | "fresh" | "stale"

export interface SensingConfidence {
  /** Null means no defensible confidence score was supplied. */
  value: number | null
  basis: string | null
  calibrationRef: string | null
  uncertainty: string
}

export interface SensingFreshness {
  state: SensingFreshnessState
  observedAt: string | null
  receivedAt: string | null
  evaluatedAt: string | null
  ageMs: number | null
  maxAgeMs: number | null
}

export interface SensingQueryWindow {
  start: string | null
  end: string | null
  bbox: readonly [number, number, number, number] | null
}

export interface SensingReadAttempt {
  attempted: boolean
  completed: boolean
  completedAt: string | null
  upstreamStatus: number | null
  window: SensingQueryWindow
}

export interface SensingCollectionProvenance {
  provider: string | null
  endpointRef: string | null
  sourceRecordIds: readonly string[]
  transformRefs: readonly string[]
  synthetic: false
}

export interface SensingRecordProvenance {
  provider: string
  endpointRef: string
  sourceRecordId: string
  observedAt: string
  receivedAt: string
  transformRefs: readonly string[]
  licenseRef: string | null
  synthetic: false
}

export interface SensingMeasurement {
  metric: string
  value: number | string | boolean | null
  unit: string | null
  present: boolean
  qualityFlag: "measured" | "reported" | "derived" | "missing"
  missingReason: string | null
}

export interface SensingLocation {
  latitude: number
  longitude: number
  altitudeM: number | null
  coordinateReferenceSystem: "EPSG:4326"
}

export interface SensingReadRecord {
  id: string
  sourceId: SensingSourceId
  classification: typeof SENSING_CLASSIFICATION
  observedAt: string
  location: SensingLocation | null
  measurements: readonly SensingMeasurement[]
  confidence: SensingConfidence
  provenance: SensingRecordProvenance
}

export interface SensingReadCollection {
  schema: typeof SENSING_READ_SCHEMA
  classification: typeof SENSING_CLASSIFICATION
  readOnly: true
  sourceId: SensingSourceId
  state: SensingReadState
  bound: boolean
  dataPresence: SensingDataPresence
  records: readonly SensingReadRecord[]
  count: number
  query: SensingReadAttempt
  freshness: SensingFreshness
  confidence: SensingConfidence
  provenance: SensingCollectionProvenance
  reason: string | null
}

const NO_WINDOW: SensingQueryWindow = { start: null, end: null, bbox: null }

function requireNonEmpty(label: string, value: string): string {
  if (!value.trim()) throw new Error(`${label} is required`)
  return value
}

function requireIsoTimestamp(label: string, value: string): string {
  if (!Number.isFinite(Date.parse(value))) throw new Error(`${label} must be an ISO-compatible timestamp`)
  return value
}

function requireReadEndpoint(endpointRef: string): string {
  if (!endpointRef.startsWith("/api/")) {
    throw new Error("endpointRef must be a same-origin /api/ path")
  }
  if (/^https?:\/\//i.test(endpointRef)) {
    throw new Error("endpointRef must not contain an external origin")
  }
  return endpointRef
}

export function unknownSensingConfidence(uncertainty = "No defensible confidence score was supplied."): SensingConfidence {
  return {
    value: null,
    basis: null,
    calibrationRef: null,
    uncertainty,
  }
}

export function sensingConfidence(
  value: number,
  basis: string,
  calibrationRef: string | null = null,
  uncertainty = "See the stated basis and calibration reference.",
): SensingConfidence {
  if (!Number.isFinite(value) || value < 0 || value > 1) {
    throw new Error("confidence must be finite and between 0 and 1")
  }
  return {
    value,
    basis: requireNonEmpty("confidence basis", basis),
    calibrationRef,
    uncertainty,
  }
}

export function measuredNumber(metric: string, value: number, unit: string | null): SensingMeasurement {
  if (!Number.isFinite(value)) throw new Error("measured value must be finite")
  return {
    metric: requireNonEmpty("metric", metric),
    value,
    unit,
    present: true,
    qualityFlag: "measured",
    missingReason: null,
  }
}

export function reportedValue(
  metric: string,
  value: string | boolean,
  unit: string | null = null,
): SensingMeasurement {
  return {
    metric: requireNonEmpty("metric", metric),
    value,
    unit,
    present: true,
    qualityFlag: "reported",
    missingReason: null,
  }
}

export function missingMeasurement(
  metric: string,
  unit: string | null,
  reason: string,
): SensingMeasurement {
  return {
    metric: requireNonEmpty("metric", metric),
    value: null,
    unit,
    present: false,
    qualityFlag: "missing",
    missingReason: requireNonEmpty("missing reason", reason),
  }
}

export function measurementIsMeasuredZero(measurement: SensingMeasurement): boolean {
  return measurement.present && measurement.qualityFlag === "measured" && measurement.value === 0
}

export function evaluateSensingFreshness(
  observedAt: string | null,
  receivedAt: string | null,
  evaluatedAt: string,
  maxAgeMs: number,
): SensingFreshness {
  const evaluatedMs = Date.parse(evaluatedAt)
  const observedMs = observedAt == null ? Number.NaN : Date.parse(observedAt)
  const receivedMs = receivedAt == null ? Number.NaN : Date.parse(receivedAt)
  if (!Number.isFinite(evaluatedMs) || !Number.isFinite(maxAgeMs) || maxAgeMs < 0) {
    throw new Error("freshness evaluation requires a valid evaluatedAt and non-negative maxAgeMs")
  }
  if (!Number.isFinite(observedMs)) {
    return {
      state: "unknown",
      observedAt,
      receivedAt,
      evaluatedAt,
      ageMs: null,
      maxAgeMs,
    }
  }
  const ageMs = evaluatedMs - observedMs
  if (ageMs < 0 || (Number.isFinite(receivedMs) && receivedMs < observedMs)) {
    return {
      state: "unknown",
      observedAt,
      receivedAt,
      evaluatedAt,
      ageMs,
      maxAgeMs,
    }
  }
  return {
    state: ageMs <= maxAgeMs ? "fresh" : "stale",
    observedAt,
    receivedAt,
    evaluatedAt,
    ageMs,
    maxAgeMs,
  }
}

export function unboundSensingRead(sourceId: SensingSourceId, reason: string): SensingReadCollection {
  return {
    schema: SENSING_READ_SCHEMA,
    classification: SENSING_CLASSIFICATION,
    readOnly: true,
    sourceId,
    state: "unbound",
    bound: false,
    dataPresence: "unknown",
    records: [],
    count: 0,
    query: {
      attempted: false,
      completed: false,
      completedAt: null,
      upstreamStatus: null,
      window: NO_WINDOW,
    },
    freshness: {
      state: "unavailable",
      observedAt: null,
      receivedAt: null,
      evaluatedAt: null,
      ageMs: null,
      maxAgeMs: null,
    },
    confidence: unknownSensingConfidence("The source is unbound; confidence is unavailable."),
    provenance: {
      provider: null,
      endpointRef: null,
      sourceRecordIds: [],
      transformRefs: [],
      synthetic: false,
    },
    reason: requireNonEmpty("unbound reason", reason),
  }
}

export interface EmptySensingReadInput {
  sourceId: SensingSourceId
  provider: string
  endpointRef: string
  completedAt: string
  upstreamStatus: number
  window?: SensingQueryWindow
  transformRefs?: readonly string[]
  reason: string
}

export function emptySensingRead(input: EmptySensingReadInput): SensingReadCollection {
  if (!Number.isInteger(input.upstreamStatus) || input.upstreamStatus < 200 || input.upstreamStatus >= 300) {
    throw new Error("empty is valid only after a successful 2xx read")
  }
  const completedAt = requireIsoTimestamp("completedAt", input.completedAt)
  return {
    schema: SENSING_READ_SCHEMA,
    classification: SENSING_CLASSIFICATION,
    readOnly: true,
    sourceId: input.sourceId,
    state: "empty",
    bound: true,
    dataPresence: "empty",
    records: [],
    count: 0,
    query: {
      attempted: true,
      completed: true,
      completedAt,
      upstreamStatus: input.upstreamStatus,
      window: input.window ?? NO_WINDOW,
    },
    freshness: {
      state: "unknown",
      observedAt: null,
      receivedAt: completedAt,
      evaluatedAt: completedAt,
      ageMs: null,
      maxAgeMs: null,
    },
    confidence: unknownSensingConfidence("The successful query returned no observations to score."),
    provenance: {
      provider: requireNonEmpty("provider", input.provider),
      endpointRef: requireReadEndpoint(input.endpointRef),
      sourceRecordIds: [],
      transformRefs: input.transformRefs ?? [],
      synthetic: false,
    },
    reason: requireNonEmpty("empty reason", input.reason),
  }
}

function validateRecord(record: SensingReadRecord, sourceId: SensingSourceId): void {
  if (record.sourceId !== sourceId) throw new Error("record sourceId does not match collection sourceId")
  if (record.classification !== SENSING_CLASSIFICATION) throw new Error("only UNCLASSIFIED records are accepted")
  requireNonEmpty("record id", record.id)
  requireIsoTimestamp("record observedAt", record.observedAt)
  requireNonEmpty("provenance provider", record.provenance.provider)
  requireReadEndpoint(record.provenance.endpointRef)
  requireNonEmpty("provenance sourceRecordId", record.provenance.sourceRecordId)
  requireIsoTimestamp("provenance observedAt", record.provenance.observedAt)
  requireIsoTimestamp("provenance receivedAt", record.provenance.receivedAt)
  if (record.provenance.synthetic !== false) throw new Error("synthetic records are not accepted by this evidence contract")
  if (record.confidence.value != null && (!Number.isFinite(record.confidence.value) || record.confidence.value < 0 || record.confidence.value > 1)) {
    throw new Error("record confidence must be null or between 0 and 1")
  }
  if (record.measurements.length === 0) throw new Error("available records require at least one measurement")
  for (const measurement of record.measurements) {
    if (measurement.present && measurement.value == null) throw new Error("present measurements require a value")
    if (!measurement.present && measurement.value != null) throw new Error("missing measurements must use null")
  }
}

export interface AvailableSensingReadInput {
  sourceId: SensingSourceId
  records: readonly SensingReadRecord[]
  completedAt: string
  evaluatedAt: string
  maxAgeMs: number
  upstreamStatus?: number
  window?: SensingQueryWindow
  transformRefs?: readonly string[]
}

export function availableSensingRead(input: AvailableSensingReadInput): SensingReadCollection {
  if (input.records.length === 0) throw new Error("available requires at least one record")
  const completedAt = requireIsoTimestamp("completedAt", input.completedAt)
  requireIsoTimestamp("evaluatedAt", input.evaluatedAt)
  for (const record of input.records) validateRecord(record, input.sourceId)

  const freshnesses = input.records.map((record) =>
    evaluateSensingFreshness(
      record.provenance.observedAt,
      record.provenance.receivedAt,
      input.evaluatedAt,
      input.maxAgeMs,
    ),
  )
  const overallFreshness: SensingFreshnessState = freshnesses.some((item) => item.state === "stale")
    ? "stale"
    : freshnesses.some((item) => item.state === "unknown")
      ? "unknown"
      : "fresh"
  const latest = input.records
    .slice()
    .sort((left, right) => Date.parse(right.provenance.observedAt) - Date.parse(left.provenance.observedAt))[0]
  const providers = [...new Set(input.records.map((record) => record.provenance.provider))]
  const endpoints = [...new Set(input.records.map((record) => record.provenance.endpointRef))]
  const upstreamStatus = input.upstreamStatus ?? 200
  if (!Number.isInteger(upstreamStatus) || upstreamStatus < 200 || upstreamStatus >= 300) {
    throw new Error("available is valid only after a successful 2xx read")
  }

  return {
    schema: SENSING_READ_SCHEMA,
    classification: SENSING_CLASSIFICATION,
    readOnly: true,
    sourceId: input.sourceId,
    state: overallFreshness === "fresh" ? "available" : overallFreshness === "stale" ? "stale" : "degraded",
    bound: true,
    dataPresence: "present",
    records: input.records,
    count: input.records.length,
    query: {
      attempted: true,
      completed: true,
      completedAt,
      upstreamStatus,
      window: input.window ?? NO_WINDOW,
    },
    freshness: {
      ...freshnesses.find((item) => item.observedAt === latest.provenance.observedAt)!,
      state: overallFreshness,
    },
    confidence: unknownSensingConfidence("Confidence remains record-specific; no aggregate score was invented."),
    provenance: {
      provider: providers.length === 1 ? providers[0] : "multiple",
      endpointRef: endpoints.length === 1 ? endpoints[0] : "multiple",
      sourceRecordIds: input.records.map((record) => record.provenance.sourceRecordId),
      transformRefs: input.transformRefs ?? [],
      synthetic: false,
    },
    reason: overallFreshness === "fresh" ? null : `Records are ${overallFreshness}; inspect record freshness before use.`,
  }
}
