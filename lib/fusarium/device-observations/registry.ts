import {
  DEVICE_OBSERVATION_CLASSIFICATION,
  DEVICE_OBSERVATION_MODALITIES,
  DEVICE_OBSERVATION_SCHEMA,
  deviceObservationScopeEcho,
  deviceObservationScopeIsBound,
  isDeviceObservationTimestamp,
  isStableDeviceObservationIdentifier,
  type DeviceObservation,
  type DeviceObservationCandidate,
  type DeviceObservationContext,
  type DeviceObservationModality,
  type DeviceObservationScope,
  type DeviceObservationScopeEcho,
  type DeviceObservationState,
} from "./contracts"

export interface DeviceObservationSourceAuditEntry {
  sourceRef: string
  modalities: readonly DeviceObservationModality[]
  disposition: "rejected" | "excluded"
  reason: string
}

export interface DeviceObservationAdapterRequirement {
  modality: DeviceObservationModality
  label: string
  requiredEvidence: readonly string[]
}

export interface DeviceObservationAdapterDescriptor {
  adapterId: string
  modality: DeviceObservationModality
  sourceRef: string
  readOnly: true
  provenDeviceIdentity: true
  identityEvidence: string
  provenRecordProvenance: true
  provenanceEvidence: string
  freshnessMaximumAgeMs: number
  classification: typeof DEVICE_OBSERVATION_CLASSIFICATION
}

export interface DeviceObservationAdapterResult {
  state: "available" | "verified-empty" | "error"
  scope: DeviceObservationScopeEcho
  checkedAt: string
  classification: typeof DEVICE_OBSERVATION_CLASSIFICATION
  observations: readonly DeviceObservationCandidate[]
  message: string
}

export interface DeviceObservationAdapter {
  descriptor: DeviceObservationAdapterDescriptor
  read(scope: DeviceObservationScope): Promise<DeviceObservationAdapterResult>
}

export interface DeviceObservationAdapterReadiness {
  modality: DeviceObservationModality
  label: string
  state: "ready" | "unbound"
  registeredAdapterIds: readonly string[]
  requiredEvidence: readonly string[]
  reviewedSources: readonly DeviceObservationSourceAuditEntry[]
}

export interface DeviceObservationAdapterRun {
  adapterId: string
  modality: DeviceObservationModality
  state: Extract<DeviceObservationState, "verified-empty" | "available" | "stale" | "error">
  observationCount: number
  rejectedInvalidCount: number
  withheldOutOfScopeCount: number
  message: string
}

export interface DeviceObservationQueryResult {
  schema: typeof DEVICE_OBSERVATION_SCHEMA
  state: DeviceObservationState
  scope: DeviceObservationScope
  evaluatedAt: string
  observations: readonly DeviceObservation[]
  adapterRuns: readonly DeviceObservationAdapterRun[]
  adapterReadiness: readonly DeviceObservationAdapterReadiness[]
  registryIssues: readonly string[]
  duplicateObservationCount: number
  rejectedInvalidCount: number
  withheldOutOfScopeCount: number
  message: string
}

export interface QueryDeviceObservationsOptions {
  evaluatedAt: string
  adapters?: readonly DeviceObservationAdapter[]
}

export const DEVICE_OBSERVATION_ADAPTER_REQUIREMENTS: readonly DeviceObservationAdapterRequirement[] = [
  {
    modality: "camera",
    label: "Camera",
    requiredEvidence: [
      "A fleet-neutral passive GET contract keyed by exact device identity and feed or sensor identity.",
      "Source record identity, observed and received timestamps, media or detection units, provenance, and confidence or explicit uncertainty.",
    ],
  },
  {
    modality: "radar",
    label: "Radar",
    requiredEvidence: [
      "A device-bound passive radar record contract with source record identity.",
      "Observed and received timestamps, range and velocity units, reference frame, provenance, and confidence or explicit uncertainty.",
    ],
  },
  {
    modality: "lidar",
    label: "LiDAR",
    requiredEvidence: [
      "A device-bound passive LiDAR frame or derived-record contract with source frame identity.",
      "Observed and received timestamps, coordinate frame and distance units, provenance, and confidence or explicit uncertainty.",
    ],
  },
  {
    modality: "wifi",
    label: "Wi-Fi sensing",
    requiredEvidence: [
      "Device-level passive CSI or RSSI observations rather than zone-only inference or configuration state.",
      "Source event identity, observed and received timestamps, radio units, provenance, and confidence or explicit uncertainty.",
    ],
  },
  {
    modality: "audio",
    label: "Audio / SINE",
    requiredEvidence: [
      "A SINE capture or analysis record authoritatively correlated to a device identity.",
      "Capture and receive timestamps, sample or feature units, blob or analysis provenance, and confidence or explicit uncertainty.",
    ],
  },
  {
    modality: "gas-odor",
    label: "Gas / odor / GANDHA",
    requiredEvidence: [
      "A passive GANDHA or BME-family reading bound to an exact source device and sensor slot.",
      "Cycle or sample identity, per-channel units, observed and received timestamps, calibration provenance, and confidence or explicit uncertainty.",
    ],
  },
  {
    modality: "bioelectric",
    label: "Bioelectric / FCI",
    requiredEvidence: [
      "An authoritative FCI signal or feature stream keyed to exact device and electrode identity.",
      "Sample identity, sampling and signal units, observed and received timestamps, provenance, and confidence or explicit uncertainty.",
    ],
  },
  {
    modality: "thermal",
    label: "Thermal",
    requiredEvidence: [
      "A passive thermal frame bound to an exact device and sensor identity.",
      "Frame identity, calibrated temperature units, observed and received timestamps, emissivity or calibration provenance, and uncertainty.",
    ],
  },
  {
    modality: "mechanical",
    label: "Mechanical",
    requiredEvidence: [
      "A motion-free passive joint, pose, contact, or force read from the chosen canonical arm service.",
      "Physical serial plus registry identity, reference frames and units, observed and received timestamps, and device-read provenance.",
    ],
  },
] as const

/**
 * Source-only audit. None of these routes satisfies the common envelope today,
 * so none is activated below. Psathyrella routes remain deliberately isolated.
 */
export const DEVICE_OBSERVATION_SOURCE_AUDIT: readonly DeviceObservationSourceAuditEntry[] = [
  {
    sourceRef: "/api/devices/[deviceId]/telemetry",
    modalities: ["gas-odor", "thermal", "mechanical"],
    disposition: "rejected",
    reason: "The path echoes a requested device ID, but the spread upstream payload does not prove per-record identity, provenance, units, classification, or observation and receive times.",
  },
  {
    sourceRef: "/api/devices/network/[deviceId]/telemetry",
    modalities: ["gas-odor", "thermal"],
    disposition: "rejected",
    reason: "Mixed operator, MAS, and registry fallbacks are not normalized into provenance-bearing records and do not preserve authoritative per-record timestamps and units.",
  },
  {
    sourceRef: "/api/mindex/telemetry",
    modalities: ["gas-odor", "thermal", "bioelectric"],
    disposition: "rejected",
    reason: "The generic proxy returns an unvalidated upstream shape, has no modality envelope, and shares a mutation surface.",
  },
  {
    sourceRef: "/api/fci/telemetry",
    modalities: ["bioelectric"],
    disposition: "rejected",
    reason: "The requested device ID is not reconciled with an authoritative identity field in each returned reading, and provenance, receive time, units, classification, and uncertainty are not enforced.",
  },
  {
    sourceRef: "/api/mindex/sine/library/blobs",
    modalities: ["audio"],
    disposition: "rejected",
    reason: "The transparent library proxy does not establish shared device correlation or enforce capture time, receive time, units, classification, and record provenance.",
  },
  {
    sourceRef: "/api/mindex/wifisense",
    modalities: ["wifi"],
    disposition: "rejected",
    reason: "Zone events are not exact device observations, transformation defaults are inserted, and the route also exposes configuration actions.",
  },
  {
    sourceRef: "/api/natureos/devices/[id]/telemetry",
    modalities: ["gas-odor", "thermal"],
    disposition: "rejected",
    reason: "Fallbacks can manufacture a current timestamp and normalize mixed sources without authoritative receive time, per-record provenance, units, or uncertainty.",
  },
  {
    sourceRef: "/api/earth-simulator/devices",
    modalities: ["gas-odor", "thermal", "mechanical"],
    disposition: "rejected",
    reason: "The route mixes catalog and live sources, contains source-specific Psathyrella normalization, and can invoke a sensor snapshot action; it is not a passive generic observation contract.",
  },
  {
    sourceRef: "/api/psathyrella/*",
    modalities: ["camera", "radar", "lidar", "wifi"],
    disposition: "excluded",
    reason: "Psathyrella-specific endpoints are intentionally isolated and cannot be promoted to fleet-wide adapters.",
  },
] as const

/** No existing source passed identity and provenance review. */
export const REGISTERED_DEVICE_OBSERVATION_ADAPTERS: readonly DeviceObservationAdapter[] = Object.freeze([])

function nonEmptyEvidence(value: unknown, maximum = 400): value is string {
  return typeof value === "string"
    && value.trim().length > 0
    && value.length <= maximum
    && !/[\u0000-\u001f\u007f]/.test(value)
}

function arraysEqual(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index])
}

function contextsEqual(left: DeviceObservationContext, right: DeviceObservationContext): boolean {
  return left.missionId === right.missionId
    && left.locationId === right.locationId
    && left.environmentId === right.environmentId
}

function scopeEchoMatches(left: DeviceObservationScopeEcho, right: DeviceObservationScopeEcho): boolean {
  return arraysEqual(left.deviceIds, right.deviceIds)
    && contextsEqual(left.context, right.context)
    && arraysEqual(left.modalities, right.modalities)
    && left.classification === right.classification
}

function descriptorIssues(descriptor: DeviceObservationAdapterDescriptor): string[] {
  const issues: string[] = []
  if (!isStableDeviceObservationIdentifier(descriptor.adapterId)) issues.push("adapterId is not a stable identifier")
  if (!DEVICE_OBSERVATION_MODALITIES.includes(descriptor.modality)) issues.push("modality is unsupported")
  if (!descriptor.sourceRef.startsWith("/api/") || /^\/api\/psathyrella(?:\/|$)/.test(descriptor.sourceRef)) {
    issues.push("sourceRef must be a non-Psathyrella same-origin /api/ path")
  }
  if (descriptor.readOnly !== true) issues.push("adapter is not declared read-only")
  if (descriptor.provenDeviceIdentity !== true || !nonEmptyEvidence(descriptor.identityEvidence)) {
    issues.push("device identity evidence is missing")
  }
  if (descriptor.provenRecordProvenance !== true || !nonEmptyEvidence(descriptor.provenanceEvidence)) {
    issues.push("record provenance evidence is missing")
  }
  if (!Number.isSafeInteger(descriptor.freshnessMaximumAgeMs) || descriptor.freshnessMaximumAgeMs <= 0) {
    issues.push("freshnessMaximumAgeMs must be a positive integer")
  }
  if (descriptor.classification !== DEVICE_OBSERVATION_CLASSIFICATION) {
    issues.push("adapter classification is outside the host boundary")
  }
  return issues
}

function qualifiedAdapters(adapters: readonly DeviceObservationAdapter[]): {
  adapters: readonly DeviceObservationAdapter[]
  issues: readonly string[]
} {
  const counts = new Map<string, number>()
  for (const adapter of adapters) {
    counts.set(adapter.descriptor.adapterId, (counts.get(adapter.descriptor.adapterId) ?? 0) + 1)
  }

  const qualified: DeviceObservationAdapter[] = []
  const issues: string[] = []
  for (const adapter of adapters) {
    const id = adapter.descriptor.adapterId
    if ((counts.get(id) ?? 0) > 1) {
      if (!issues.some((issue) => issue.startsWith(`${id}:`))) issues.push(`${id}: duplicate adapter identifier`)
      continue
    }
    const found = descriptorIssues(adapter.descriptor)
    if (found.length > 0) {
      issues.push(`${id || "(unnamed adapter)"}: ${found.join("; ")}`)
      continue
    }
    qualified.push(adapter)
  }
  return { adapters: qualified, issues }
}

export function deviceObservationAdapterReadiness(
  adapters: readonly DeviceObservationAdapter[] = REGISTERED_DEVICE_OBSERVATION_ADAPTERS,
): readonly DeviceObservationAdapterReadiness[] {
  const qualified = qualifiedAdapters(adapters).adapters
  return DEVICE_OBSERVATION_ADAPTER_REQUIREMENTS.map((requirement) => {
    const registeredAdapterIds = qualified
      .filter((adapter) => adapter.descriptor.modality === requirement.modality)
      .map((adapter) => adapter.descriptor.adapterId)
      .sort()
    return {
      ...requirement,
      state: registeredAdapterIds.length > 0 ? "ready" as const : "unbound" as const,
      registeredAdapterIds,
      reviewedSources: DEVICE_OBSERVATION_SOURCE_AUDIT.filter((entry) => entry.modalities.includes(requirement.modality)),
    }
  })
}

function candidateContextIsValid(context: DeviceObservationContext | null | undefined): boolean {
  if (!context || typeof context !== "object") return false
  return ([context.missionId, context.locationId, context.environmentId] as const)
    .every((value) => value === null || isStableDeviceObservationIdentifier(value))
}

function candidateMatchesScope(candidate: DeviceObservationCandidate, scope: DeviceObservationScope): boolean {
  if (!scope.deviceIds.includes(candidate.identity.deviceId)) return false
  if (scope.context.missionId !== null && candidate.context.missionId !== scope.context.missionId) return false
  if (scope.context.locationId !== null && candidate.context.locationId !== scope.context.locationId) return false
  if (scope.context.environmentId !== null && candidate.context.environmentId !== scope.context.environmentId) return false
  return true
}

function candidateIssues(
  candidate: DeviceObservationCandidate,
  descriptor: DeviceObservationAdapterDescriptor,
  evaluatedAt: string,
): string[] {
  const issues: string[] = []
  if (!isStableDeviceObservationIdentifier(candidate.identity?.deviceId)) issues.push("deviceId is invalid")
  if (candidate.identity?.registryId !== null && !isStableDeviceObservationIdentifier(candidate.identity?.registryId)) {
    issues.push("registryId is invalid")
  }
  if (candidate.identity?.hardwareSerial !== null && !nonEmptyEvidence(candidate.identity?.hardwareSerial, 160)) {
    issues.push("hardwareSerial is invalid")
  }
  if (!nonEmptyEvidence(candidate.identity?.identityEvidence)) issues.push("identityEvidence is missing")
  if (candidate.modality !== descriptor.modality) issues.push("modality does not match adapter")
  if (!candidateContextIsValid(candidate.context)) issues.push("context contains an invalid identifier")
  if (!isDeviceObservationTimestamp(candidate.observedAt)) issues.push("observedAt is invalid")
  if (!isDeviceObservationTimestamp(candidate.receivedAt)) issues.push("receivedAt is invalid")
  if (isDeviceObservationTimestamp(candidate.observedAt) && isDeviceObservationTimestamp(candidate.receivedAt)) {
    if (Date.parse(candidate.receivedAt) < Date.parse(candidate.observedAt)) issues.push("receivedAt precedes observedAt")
  }
  if (!isDeviceObservationTimestamp(evaluatedAt)) issues.push("evaluatedAt is invalid")
  if (!Array.isArray(candidate.measurements) || candidate.measurements.length === 0) {
    issues.push("at least one unit-bearing measurement is required")
  } else {
    const measurementNames = new Set<string>()
    for (const measurement of candidate.measurements) {
      if (!nonEmptyEvidence(measurement?.name, 160)) issues.push("measurement name is invalid")
      else if (measurementNames.has(measurement.name)) issues.push("measurement names must be unique")
      else measurementNames.add(measurement.name)
      if (!nonEmptyEvidence(measurement?.unit, 80)) issues.push("measurement unit is required")
      if (!["string", "number", "boolean"].includes(typeof measurement?.value)) issues.push("measurement value is not scalar")
      if (typeof measurement?.value === "number" && !Number.isFinite(measurement.value)) issues.push("measurement value is not finite")
    }
  }
  const confidence = candidate.confidence
  if (!confidence || (confidence.value !== null && (!Number.isFinite(confidence.value) || confidence.value < 0 || confidence.value > 1))) {
    issues.push("confidence must be null or between zero and one")
  }
  if (!confidence || !nonEmptyEvidence(confidence.basis)) issues.push("confidence basis is required")
  const uncertainty = candidate.uncertainty
  if (!uncertainty || (uncertainty.value !== null && (!Number.isFinite(uncertainty.value) || uncertainty.value < 0))) {
    issues.push("uncertainty must be null or non-negative")
  }
  if (!uncertainty || !nonEmptyEvidence(uncertainty.basis)) issues.push("uncertainty basis is required")
  if (uncertainty?.value !== null && !nonEmptyEvidence(uncertainty?.unit, 80)) issues.push("numeric uncertainty requires a unit")
  if (candidate.classification !== DEVICE_OBSERVATION_CLASSIFICATION) issues.push("classification is not UNCLASSIFIED")
  const provenance = candidate.provenance
  if (!provenance || provenance.adapterId !== descriptor.adapterId) issues.push("provenance adapterId does not match")
  if (!provenance || provenance.sourceRef !== descriptor.sourceRef) issues.push("provenance sourceRef does not match")
  if (!provenance || !isStableDeviceObservationIdentifier(provenance.sourceRecordId)) issues.push("sourceRecordId is invalid")
  if (!provenance || !nonEmptyEvidence(provenance.deviceIdentityField)) issues.push("deviceIdentityField is required")
  if (!provenance || !nonEmptyEvidence(provenance.observedAtField)) issues.push("observedAtField is required")
  if (!provenance || !nonEmptyEvidence(provenance.receivedAtField)) issues.push("receivedAtField is required")
  if (provenance?.sourceRevision !== null && !nonEmptyEvidence(provenance?.sourceRevision, 160)) issues.push("sourceRevision is invalid")
  return issues
}

function normalizeCandidate(
  candidate: DeviceObservationCandidate,
  descriptor: DeviceObservationAdapterDescriptor,
  evaluatedAt: string,
): DeviceObservation | null {
  if (candidateIssues(candidate, descriptor, evaluatedAt).length > 0) return null
  const ageMs = Math.max(0, Date.parse(evaluatedAt) - Date.parse(candidate.observedAt))
  const stale = ageMs > descriptor.freshnessMaximumAgeMs
  return {
    ...candidate,
    identity: { ...candidate.identity },
    context: { ...candidate.context },
    measurements: candidate.measurements.map((measurement) => ({ ...measurement })),
    provenance: { ...candidate.provenance },
    confidence: { ...candidate.confidence },
    uncertainty: { ...candidate.uncertainty },
    observationId: `${descriptor.adapterId}:${candidate.provenance.sourceRecordId}`,
    units: Object.fromEntries(candidate.measurements.map((measurement) => [measurement.name, measurement.unit])),
    freshness: {
      state: stale ? "stale" : "fresh",
      evaluatedAt,
      ageMs,
      maximumAgeMs: descriptor.freshnessMaximumAgeMs,
    },
    state: stale ? "stale" : "available",
  }
}

function candidateDedupeKey(observation: DeviceObservation): string {
  return [
    observation.identity.deviceId,
    observation.modality,
    observation.provenance.sourceRef,
    observation.provenance.sourceRecordId,
  ].join("|")
}

function resultEnvelopeIssues(result: DeviceObservationAdapterResult, scope: DeviceObservationScope): string[] {
  const issues: string[] = []
  if (!result || !["available", "verified-empty", "error"].includes(result.state)) issues.push("adapter result state is invalid")
  if (!result || !scopeEchoMatches(result.scope, deviceObservationScopeEcho(scope))) issues.push("adapter did not echo the exact query scope")
  if (!result || !isDeviceObservationTimestamp(result.checkedAt)) issues.push("adapter checkedAt is invalid")
  if (!result || result.classification !== DEVICE_OBSERVATION_CLASSIFICATION) issues.push("adapter result classification is invalid")
  if (!result || !Array.isArray(result.observations)) issues.push("adapter observations are invalid")
  if (!result || !nonEmptyEvidence(result.message)) issues.push("adapter result message is required")
  if (result?.state === "verified-empty" && result.observations.length !== 0) issues.push("verified-empty returned observations")
  if (result?.state === "available" && result.observations.length === 0) issues.push("available returned no observations")
  if (result?.state === "error" && result.observations.length !== 0) issues.push("error returned observations")
  return issues
}

async function runAdapter(
  adapter: DeviceObservationAdapter,
  scope: DeviceObservationScope,
  evaluatedAt: string,
): Promise<{ run: DeviceObservationAdapterRun; observations: readonly DeviceObservation[] }> {
  const descriptor = adapter.descriptor
  try {
    const result = await adapter.read(scope)
    const envelopeIssues = resultEnvelopeIssues(result, scope)
    if (envelopeIssues.length > 0) {
      return {
        run: {
          adapterId: descriptor.adapterId,
          modality: descriptor.modality,
          state: "error",
          observationCount: 0,
          rejectedInvalidCount: Array.isArray(result?.observations) ? result.observations.length : 0,
          withheldOutOfScopeCount: 0,
          message: `Adapter result withheld: ${envelopeIssues.join("; ")}.`,
        },
        observations: [],
      }
    }

    if (result.state === "verified-empty") {
      return {
        run: {
          adapterId: descriptor.adapterId,
          modality: descriptor.modality,
          state: "verified-empty",
          observationCount: 0,
          rejectedInvalidCount: 0,
          withheldOutOfScopeCount: 0,
          message: result.message,
        },
        observations: [],
      }
    }
    if (result.state === "error") {
      return {
        run: {
          adapterId: descriptor.adapterId,
          modality: descriptor.modality,
          state: "error",
          observationCount: 0,
          rejectedInvalidCount: 0,
          withheldOutOfScopeCount: 0,
          message: result.message,
        },
        observations: [],
      }
    }

    const observations: DeviceObservation[] = []
    let rejectedInvalidCount = 0
    let withheldOutOfScopeCount = 0
    for (const candidate of result.observations) {
      const normalized = normalizeCandidate(candidate, descriptor, evaluatedAt)
      if (!normalized) {
        rejectedInvalidCount += 1
        continue
      }
      if (!candidateMatchesScope(normalized, scope)) {
        withheldOutOfScopeCount += 1
        continue
      }
      observations.push(normalized)
    }

    const state: DeviceObservationAdapterRun["state"] = observations.length === 0
      ? "error"
      : observations.some((observation) => observation.state === "available")
        ? "available"
        : "stale"
    return {
      run: {
        adapterId: descriptor.adapterId,
        modality: descriptor.modality,
        state,
        observationCount: observations.length,
        rejectedInvalidCount,
        withheldOutOfScopeCount,
        message: observations.length > 0
          ? result.message
          : "Adapter claimed availability, but every record failed validation or exact scope isolation.",
      },
      observations,
    }
  } catch {
    return {
      run: {
        adapterId: descriptor.adapterId,
        modality: descriptor.modality,
        state: "error",
        observationCount: 0,
        rejectedInvalidCount: 0,
        withheldOutOfScopeCount: 0,
        message: "Adapter read failed; no device absence is inferred.",
      },
      observations: [],
    }
  }
}

export async function queryDeviceObservations(
  scope: DeviceObservationScope,
  options: QueryDeviceObservationsOptions,
): Promise<DeviceObservationQueryResult> {
  if (!isDeviceObservationTimestamp(options.evaluatedAt)) {
    throw new Error("queryDeviceObservations requires an ISO evaluatedAt timestamp")
  }

  const registry = qualifiedAdapters(options.adapters ?? REGISTERED_DEVICE_OBSERVATION_ADAPTERS)
  const readiness = deviceObservationAdapterReadiness(registry.adapters)
  const base = {
    schema: DEVICE_OBSERVATION_SCHEMA,
    scope,
    evaluatedAt: options.evaluatedAt,
    adapterReadiness: readiness,
    registryIssues: registry.issues,
  }

  if (!deviceObservationScopeIsBound(scope)) {
    return {
      ...base,
      state: "unbound",
      observations: [],
      adapterRuns: [],
      duplicateObservationCount: 0,
      rejectedInvalidCount: 0,
      withheldOutOfScopeCount: 0,
      message: "No deviceId was supplied. Mission, location, and environment context do not acquire devices.",
    }
  }

  const selectedAdapters = registry.adapters.filter((adapter) => scope.modalities.includes(adapter.descriptor.modality))
  if (selectedAdapters.length === 0) {
    return {
      ...base,
      state: "unbound",
      observations: [],
      adapterRuns: [],
      duplicateObservationCount: 0,
      rejectedInvalidCount: 0,
      withheldOutOfScopeCount: 0,
      message: "No provenance-qualified adapter is registered for the requested modalities. No observation or device absence is inferred.",
    }
  }

  const executions = await Promise.all(selectedAdapters.map((adapter) => runAdapter(adapter, scope, options.evaluatedAt)))
  const deduped = new Map<string, DeviceObservation>()
  let duplicateObservationCount = 0
  for (const execution of executions) {
    for (const observation of execution.observations) {
      const key = candidateDedupeKey(observation)
      if (deduped.has(key)) {
        duplicateObservationCount += 1
        continue
      }
      deduped.set(key, observation)
    }
  }
  const observations = [...deduped.values()].sort((left, right) => {
    const byTime = Date.parse(right.observedAt) - Date.parse(left.observedAt)
    return byTime || left.observationId.localeCompare(right.observationId)
  })
  const adapterRuns = executions.map((execution) => execution.run)
  const rejectedInvalidCount = adapterRuns.reduce((sum, run) => sum + run.rejectedInvalidCount, 0)
  const withheldOutOfScopeCount = adapterRuns.reduce((sum, run) => sum + run.withheldOutOfScopeCount, 0)
  const boundModalities = new Set(selectedAdapters.map((adapter) => adapter.descriptor.modality))
  const missingModalities = scope.modalities.filter((modality) => !boundModalities.has(modality))

  let state: DeviceObservationState
  let message: string
  if (observations.length > 0) {
    state = observations.some((observation) => observation.state === "available") ? "available" : "stale"
    message = missingModalities.length > 0
      ? `Observations were returned for bound modalities; ${missingModalities.join(", ")} remain unbound.`
      : state === "stale"
        ? "Only stale observations passed the contract for the requested scope."
        : "Provenance-bearing observations passed validation for the requested scope."
  } else if (adapterRuns.some((run) => run.state === "error")) {
    state = "error"
    message = "A registered adapter failed or returned invalid data. No device absence is inferred."
  } else if (missingModalities.length > 0) {
    state = "unbound"
    message = `The requested scope is only partially bound; missing adapters: ${missingModalities.join(", ")}.`
  } else if (adapterRuns.length > 0 && adapterRuns.every((run) => run.state === "verified-empty")) {
    state = "verified-empty"
    message = "Every requested modality completed an authoritative empty query for the exact scope."
  } else {
    state = "unbound"
    message = "No adapter established an authoritative result for the requested scope."
  }

  return {
    ...base,
    state,
    observations,
    adapterRuns,
    duplicateObservationCount,
    rejectedInvalidCount,
    withheldOutOfScopeCount,
    message,
  }
}
