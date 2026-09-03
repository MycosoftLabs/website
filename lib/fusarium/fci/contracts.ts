export type FciEvidenceState =
  | "loading"
  | "verified"
  | "empty"
  | "unavailable"
  | "error"
  | "unbound"

export type FciRegistryStatus = "online" | "offline" | "connecting" | "error" | "unknown"

export interface FciDeviceEvidence {
  id: string
  name: string
  deviceType: string | null
  probeType: string | null
  registryStatus: FciRegistryStatus
  channels: number | null
  sampleRateHz: number | null
  lastSeenAt: string | null
  firmwareVersion: string | null
}

export interface FciRegistryEvidence {
  state: Exclude<FciEvidenceState, "unbound">
  devices: FciDeviceEvidence[]
  source: string | null
  message: string
  rejectedRecords: number
}

export interface FciNlmEvidence {
  state: FciEvidenceState
  deviceId: string | null
  observedAt: string | null
  growthPhase: string | null
  predictionCount: number | null
  correlationCount: number | null
  recommendationCount: number | null
  modelId: string | null
  modelVersion: string | null
  message: string
}

const DEVICE_STATUSES = new Set<FciRegistryStatus>([
  "online",
  "offline",
  "connecting",
  "error",
  "unknown",
])

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function nonEmptyString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null
}

function finiteNonNegative(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : null
}

function validTimestamp(value: unknown): string | null {
  const text = nonEmptyString(value)
  if (!text) return null
  return Number.isNaN(Date.parse(text)) ? null : text
}

function first(record: Record<string, unknown>, ...keys: string[]): unknown {
  for (const key of keys) {
    if (record[key] !== undefined) return record[key]
  }
  return undefined
}

export function parseFciDevice(value: unknown): FciDeviceEvidence | null {
  if (!isRecord(value)) return null
  const id = nonEmptyString(first(value, "id", "device_id", "deviceId"))
  if (!id || id.startsWith("demo-")) return null

  const statusText = nonEmptyString(first(value, "status", "connection_status"))?.toLowerCase()
  const registryStatus = statusText && DEVICE_STATUSES.has(statusText as FciRegistryStatus)
    ? statusText as FciRegistryStatus
    : "unknown"

  return {
    id,
    name: nonEmptyString(first(value, "name", "device_name", "deviceName")) ?? id,
    deviceType: nonEmptyString(first(value, "type", "device_type", "deviceType")),
    probeType: nonEmptyString(first(value, "probe_type", "probeType")),
    registryStatus,
    channels: finiteNonNegative(first(value, "channels", "channel_count", "channelCount")),
    sampleRateHz: finiteNonNegative(first(value, "sample_rate", "sampleRate", "sample_rate_hz")),
    lastSeenAt: validTimestamp(first(value, "last_seen", "lastSeen", "last_seen_at")),
    firmwareVersion: nonEmptyString(first(value, "firmware_version", "firmwareVersion")),
  }
}

export function parseFciRegistry(payload: unknown, httpStatus = 200): FciRegistryEvidence {
  if (httpStatus === 404 || httpStatus === 503) {
    return {
      state: "unavailable",
      devices: [],
      source: null,
      message: `Device registry unavailable (HTTP ${httpStatus}).`,
      rejectedRecords: 0,
    }
  }
  if (httpStatus < 200 || httpStatus >= 300) {
    return {
      state: "error",
      devices: [],
      source: null,
      message: `Device registry request failed (HTTP ${httpStatus}).`,
      rejectedRecords: 0,
    }
  }

  const envelope = isRecord(payload) ? payload : null
  const source = envelope ? nonEmptyString(envelope.source) : null
  const explicitUnavailable = envelope?.available === false
  const message = envelope ? nonEmptyString(envelope.message) : null
  const rows = Array.isArray(payload)
    ? payload
    : envelope && Array.isArray(envelope.devices)
      ? envelope.devices
      : null

  if (explicitUnavailable) {
    return {
      state: "unavailable",
      devices: [],
      source,
      message: message ?? "Device registry provider reported unavailable.",
      rejectedRecords: 0,
    }
  }
  if (!rows) {
    return {
      state: "error",
      devices: [],
      source,
      message: "Device registry response did not match the expected devices contract.",
      rejectedRecords: 0,
    }
  }

  const parsed = rows.map(parseFciDevice)
  const devices = parsed.filter((device): device is FciDeviceEvidence => device !== null)
  const rejectedRecords = rows.length - devices.length

  if (rows.length > 0 && devices.length === 0) {
    return {
      state: "error",
      devices: [],
      source,
      message: "Registry responded, but no device record passed the Fusarium evidence contract.",
      rejectedRecords,
    }
  }

  return {
    state: devices.length > 0 ? "verified" : "empty",
    devices,
    source,
    message: devices.length > 0
      ? `${devices.length} registry-backed device record${devices.length === 1 ? "" : "s"} received.`
      : "The available registry returned an authoritative empty device list.",
    rejectedRecords,
  }
}

export function unboundNlmEvidence(deviceId: string | null = null): FciNlmEvidence {
  return {
    state: "unbound",
    deviceId,
    observedAt: null,
    growthPhase: null,
    predictionCount: null,
    correlationCount: null,
    recommendationCount: null,
    modelId: null,
    modelVersion: null,
    message: deviceId
      ? "NLM evidence has not been requested for this registry-backed device."
      : "Select a registry-backed device before requesting NLM evidence.",
  }
}

export function parseFciNlm(payload: unknown, httpStatus: number, deviceId: string): FciNlmEvidence {
  if (httpStatus === 404 || httpStatus === 503) {
    return {
      ...unboundNlmEvidence(deviceId),
      state: "unavailable",
      message: httpStatus === 404
        ? "No NLM analysis is available for this device."
        : "The NLM provider is unavailable.",
    }
  }
  if (httpStatus < 200 || httpStatus >= 300 || !isRecord(payload)) {
    return {
      ...unboundNlmEvidence(deviceId),
      state: "error",
      message: `NLM evidence request failed${httpStatus ? ` (HTTP ${httpStatus})` : ""}.`,
    }
  }

  const predictions = first(payload, "bioactivity_predictions", "bioactivityPredictions")
  const correlations = first(payload, "environmental_correlations", "environmentalCorrelations")
  const recommendations = payload.recommendations
  const growthPhase = nonEmptyString(first(payload, "growth_phase", "growthPhase"))
  const observedAt = validTimestamp(first(payload, "timestamp", "observed_at", "observedAt"))
  const modelId = nonEmptyString(first(payload, "model_id", "modelId"))
  const modelVersion = nonEmptyString(first(payload, "model_version", "modelVersion"))
  const counts = {
    predictionCount: Array.isArray(predictions) ? predictions.length : null,
    correlationCount: Array.isArray(correlations) ? correlations.length : null,
    recommendationCount: Array.isArray(recommendations) ? recommendations.length : null,
  }
  const hasEvidence = growthPhase !== null || Object.values(counts).some((count) => count !== null && count > 0)

  if (!hasEvidence) {
    return {
      ...unboundNlmEvidence(deviceId),
      state: "empty",
      ...counts,
      observedAt,
      modelId,
      modelVersion,
      message: "The NLM endpoint responded, but supplied no analysis records.",
    }
  }

  return {
    state: "verified",
    deviceId,
    observedAt,
    growthPhase,
    ...counts,
    modelId,
    modelVersion,
    message: modelId && modelVersion
      ? "NLM evidence received with model identity and version."
      : "NLM evidence received; model identity or version was not supplied.",
  }
}

export function fungiComputeHandoff(deviceId: string | null): string {
  if (!deviceId) return "/fusarium/fungi-compute"
  const params = new URLSearchParams({ deviceId, source: "fusarium-fci" })
  return `/fusarium/fungi-compute?${params.toString()}`
}
