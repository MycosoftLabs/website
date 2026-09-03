/**
 * Read-only, fleet-neutral observation contracts for Fusarium sensing tools.
 *
 * Scope values are filters only. They do not authenticate an operator, prove
 * registry membership, authorize a device read, or grant control authority.
 */

export const DEVICE_OBSERVATION_SCHEMA = "fusarium-device-observations/v1" as const
export const DEVICE_OBSERVATION_CLASSIFICATION = "UNCLASSIFIED" as const

export const DEVICE_OBSERVATION_MODALITIES = [
  "camera",
  "radar",
  "lidar",
  "wifi",
  "audio",
  "gas-odor",
  "bioelectric",
  "thermal",
  "mechanical",
] as const

export type DeviceObservationModality = (typeof DEVICE_OBSERVATION_MODALITIES)[number]

export const DEVICE_OBSERVATION_STATES = [
  "unbound",
  "verified-empty",
  "available",
  "stale",
  "error",
] as const

export type DeviceObservationState = (typeof DEVICE_OBSERVATION_STATES)[number]

export interface DeviceObservationContext {
  missionId: string | null
  locationId: string | null
  environmentId: string | null
}

export interface DeviceObservationScope {
  schema: typeof DEVICE_OBSERVATION_SCHEMA
  deviceIds: readonly string[]
  context: DeviceObservationContext
  modalities: readonly DeviceObservationModality[]
  classification: typeof DEVICE_OBSERVATION_CLASSIFICATION
}

export interface DeviceObservationScopeEcho {
  deviceIds: readonly string[]
  context: DeviceObservationContext
  modalities: readonly DeviceObservationModality[]
  classification: typeof DEVICE_OBSERVATION_CLASSIFICATION
}

export interface DeviceObservationIdentity {
  deviceId: string
  registryId: string | null
  hardwareSerial: string | null
  identityEvidence: string
}

export interface DeviceObservationProvenance {
  adapterId: string
  sourceRef: string
  sourceRecordId: string
  sourceRevision: string | null
  deviceIdentityField: string
  observedAtField: string
  receivedAtField: string
}

export type DeviceObservationScalar = string | number | boolean

export interface DeviceObservationMeasurement {
  name: string
  value: DeviceObservationScalar
  unit: string
}

export interface DeviceObservationConfidence {
  value: number | null
  basis: string
}

export interface DeviceObservationUncertainty {
  value: number | null
  unit: string | null
  basis: string
}

export interface DeviceObservationFreshness {
  state: "fresh" | "stale"
  evaluatedAt: string
  ageMs: number
  maximumAgeMs: number
}

/** Candidate emitted by a verified adapter before freshness is evaluated. */
export interface DeviceObservationCandidate {
  identity: DeviceObservationIdentity
  modality: DeviceObservationModality
  context: DeviceObservationContext
  observedAt: string
  receivedAt: string
  measurements: readonly DeviceObservationMeasurement[]
  provenance: DeviceObservationProvenance
  confidence: DeviceObservationConfidence
  uncertainty: DeviceObservationUncertainty
  classification: typeof DEVICE_OBSERVATION_CLASSIFICATION
}

/** Observation returned by the public read model. */
export interface DeviceObservation extends DeviceObservationCandidate {
  observationId: string
  units: Readonly<Record<string, string>>
  freshness: DeviceObservationFreshness
  state: Extract<DeviceObservationState, "available" | "stale">
}

export interface DeviceObservationScopeParseResult {
  ok: boolean
  scope: DeviceObservationScope | null
  issues: readonly string[]
}

interface SearchParamsReader {
  get(name: string): string | null
  getAll(name: string): string[]
}

const IDENTIFIER_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:/@+-]{0,159}$/
const CONTROL_CHARACTER_PATTERN = /[\u0000-\u001f\u007f]/
const ISO_TIMESTAMP_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?(?:Z|[+-]\d{2}:\d{2})$/

function unique<T>(values: readonly T[]): T[] {
  return [...new Set(values)]
}

export function isStableDeviceObservationIdentifier(value: unknown): value is string {
  return typeof value === "string"
    && value.length > 0
    && value.length <= 160
    && !CONTROL_CHARACTER_PATTERN.test(value)
    && IDENTIFIER_PATTERN.test(value)
}

export function isDeviceObservationTimestamp(value: unknown): value is string {
  return typeof value === "string"
    && ISO_TIMESTAMP_PATTERN.test(value)
    && Number.isFinite(Date.parse(value))
}

function parseIdentifierValues(
  values: readonly string[],
  key: string,
  maximumCount: number,
  issues: string[],
): string[] {
  if (values.length > maximumCount) {
    issues.push(`${key} accepts at most ${maximumCount} values.`)
  }

  const parsed: string[] = []
  for (const value of values.slice(0, maximumCount)) {
    if (!isStableDeviceObservationIdentifier(value)) {
      issues.push(`${key} must be a stable identifier using letters, numbers, dot, dash, underscore, colon, slash, at, or plus.`)
      continue
    }
    parsed.push(value)
  }
  return unique(parsed)
}

function parseOptionalContextId(params: SearchParamsReader, key: string, issues: string[]): string | null {
  const values = params.getAll(key)
  if (values.length > 1) issues.push(`${key} may be supplied only once.`)
  if (values.length === 0) return null
  const parsed = parseIdentifierValues(values.slice(0, 1), key, 1, issues)
  return parsed[0] ?? null
}

export function parseDeviceObservationScope(params: SearchParamsReader): DeviceObservationScopeParseResult {
  const issues: string[] = []
  const deviceIds = parseIdentifierValues(params.getAll("deviceId"), "deviceId", 50, issues)
  const requestedModalities = params.getAll("modality")
  const modalities: DeviceObservationModality[] = []

  for (const value of requestedModalities) {
    if (!DEVICE_OBSERVATION_MODALITIES.includes(value as DeviceObservationModality)) {
      issues.push(`Unsupported modality: ${value || "(empty)"}.`)
      continue
    }
    modalities.push(value as DeviceObservationModality)
  }

  const classificationValues = params.getAll("classification")
  if (classificationValues.length > 1) issues.push("classification may be supplied only once.")
  const requestedClassification = classificationValues[0] ?? DEVICE_OBSERVATION_CLASSIFICATION
  if (requestedClassification !== DEVICE_OBSERVATION_CLASSIFICATION) {
    issues.push("Only UNCLASSIFIED device observations are available on this host.")
  }

  const scope: DeviceObservationScope = {
    schema: DEVICE_OBSERVATION_SCHEMA,
    deviceIds,
    context: {
      missionId: parseOptionalContextId(params, "missionId", issues),
      locationId: parseOptionalContextId(params, "locationId", issues),
      environmentId: parseOptionalContextId(params, "environmentId", issues),
    },
    modalities: unique(modalities.length > 0 ? modalities : [...DEVICE_OBSERVATION_MODALITIES]),
    classification: DEVICE_OBSERVATION_CLASSIFICATION,
  }

  return {
    ok: issues.length === 0,
    scope: issues.length === 0 ? scope : null,
    issues,
  }
}

export function deviceObservationScopeIsBound(scope: DeviceObservationScope): boolean {
  return scope.deviceIds.length > 0
}

export function deviceObservationScopeEcho(scope: DeviceObservationScope): DeviceObservationScopeEcho {
  return {
    deviceIds: [...scope.deviceIds],
    context: { ...scope.context },
    modalities: [...scope.modalities],
    classification: scope.classification,
  }
}
