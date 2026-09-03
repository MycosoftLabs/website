/**
 * Truth boundary for the Fusarium-local Fungi Compute surface.
 *
 * A registry row or an open WebSocket proves only identity discovery or
 * transport reachability. LIVE / VERIFIED requires a provider-authored sample
 * envelope that survives validation here without client-side identity/time
 * substitution.
 */

export const FUNGI_LIVE_SAMPLE_SCHEMA = "fusarium.fci.samples.v1"
export const FUNGI_LIVE_FRESHNESS_MS = 15_000

const MAX_FUTURE_SKEW_MS = 5_000
const MAX_SAMPLE_COUNT = 8_192
const MAX_SAMPLE_RATE_HZ = 100_000
const MAX_ABS_MICROVOLTS = 1_000_000

function nonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0
}

function strictIsoTimestamp(value) {
  if (!nonEmptyString(value)) return null
  const match = value.match(
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d{1,9})?(Z|[+-]\d{2}:\d{2})$/,
  )
  if (!match) return null
  const [, yearText, monthText, dayText, hourText, minuteText, secondText] = match
  const year = Number(yearText)
  const month = Number(monthText)
  const day = Number(dayText)
  const hour = Number(hourText)
  const minute = Number(minuteText)
  const second = Number(secondText)
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate()
  if (
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > daysInMonth ||
    hour > 23 ||
    minute > 59 ||
    second > 59
  ) return null
  const parsed = Date.parse(value)
  return Number.isFinite(parsed) ? parsed : null
}

function canonicalMicrovoltUnit(value) {
  if (!nonEmptyString(value)) return null
  const normalized = value.trim().toLowerCase()
  return ["uv", "µv", "μv", "microvolt", "microvolts"].includes(normalized) ? "µV" : null
}

function unavailable(state, reasons) {
  return {
    state,
    mode: "unavailable",
    buffers: [],
    unit: null,
    observedAt: null,
    provenance: null,
    reasons,
  }
}

/** Resolve an explicit handoff only when one unique inventory row matches. */
export function resolveRequestedFungiDevice(requestedDeviceId, devices) {
  if (requestedDeviceId === null || requestedDeviceId === undefined || requestedDeviceId === "") {
    return { state: "unbound", deviceId: null }
  }
  if (typeof requestedDeviceId !== "string" || !Array.isArray(devices)) {
    return { state: "missing", deviceId: null }
  }
  const matches = devices.filter(
    (device) => device && typeof device === "object" && device.id === requestedDeviceId,
  )
  return matches.length === 1
    ? { state: "matched", deviceId: requestedDeviceId }
    : { state: "missing", deviceId: null }
}

/**
 * Validate provider-authored live sample buffers.
 *
 * Required per buffer:
 * - exact schema and selected device identity;
 * - ISO observedAt plus epoch-millisecond timestamps for every sample;
 * - explicit microvolt unit;
 * - sourceRef, sourceRecordId, and receivedAt provenance;
 * - finite, bounded samples and a positive bounded sample rate;
 * - current freshness at evaluation time.
 */
export function validateFungiLiveEvidence({
  selectedDeviceId,
  selectionStartedAt,
  registeredDeviceIds = /** @type {string[]} */ ([]),
  transportConnected = false,
  buffers,
  evaluatedAt = new Date().toISOString(),
  freshnessMs = FUNGI_LIVE_FRESHNESS_MS,
}) {
  const invalid = []
  const stale = []
  const evaluatedMs = strictIsoTimestamp(evaluatedAt)
  const selectionStartedMs = strictIsoTimestamp(selectionStartedAt)

  if (!nonEmptyString(selectedDeviceId) || selectedDeviceId.startsWith("demo-")) {
    invalid.push("An exact non-demo device selection is required.")
  }
  const inventoryMatches = Array.isArray(registeredDeviceIds)
    ? registeredDeviceIds.filter((id) => id === selectedDeviceId).length
    : 0
  if (inventoryMatches !== 1) invalid.push("The selected device must match exactly one registry identity.")
  if (selectionStartedMs === null) invalid.push("The selected-device session start time is invalid.")
  if (transportConnected !== true) invalid.push("The device transport is not open.")
  if (!Array.isArray(buffers) || buffers.length === 0) invalid.push("No provider-authored sample buffers were received.")
  if (evaluatedMs === null) invalid.push("The evidence evaluation time is invalid.")
  if (!Number.isFinite(freshnessMs) || freshnessMs <= 0 || freshnessMs > 300_000) {
    invalid.push("The freshness threshold is invalid.")
  }
  if (invalid.length > 0) return unavailable("unavailable", invalid)

  const normalizedBuffers = []
  let latestObservedMs = Number.NEGATIVE_INFINITY
  let latestObservedAt = null
  let sharedProvenance = null

  buffers.forEach((candidate, index) => {
    const path = `buffers[${index}]`
    if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) {
      invalid.push(`${path} is not an object.`)
      return
    }

    const schemaVersion = candidate.schemaVersion
    const deviceId = candidate.deviceId
    const channel = candidate.channel
    const samples = candidate.samples
    const timestamps = candidate.timestamps
    const sampleRate = candidate.sampleRate
    const unit = canonicalMicrovoltUnit(candidate.unit)
    const observedMs = strictIsoTimestamp(candidate.observedAt)
    const provenance = candidate.provenance
    const sourceRef = provenance && typeof provenance === "object" ? provenance.sourceRef : null
    const sourceRecordId = provenance && typeof provenance === "object" ? provenance.sourceRecordId : null
    const receivedAt = provenance && typeof provenance === "object" ? provenance.receivedAt : null
    const receivedMs = strictIsoTimestamp(receivedAt)

    if (schemaVersion !== FUNGI_LIVE_SAMPLE_SCHEMA) invalid.push(`${path}.schemaVersion is not supported.`)
    if (deviceId !== selectedDeviceId) invalid.push(`${path}.deviceId does not match the selected device.`)
    if (!Number.isInteger(channel) || channel < 0 || channel > 255) invalid.push(`${path}.channel is invalid.`)
    if (!Number.isFinite(sampleRate) || sampleRate <= 0 || sampleRate > MAX_SAMPLE_RATE_HZ) {
      invalid.push(`${path}.sampleRate is invalid.`)
    }
    if (!unit) invalid.push(`${path}.unit must explicitly identify microvolts.`)
    if (observedMs === null) invalid.push(`${path}.observedAt must be an ISO timestamp with an offset.`)
    if (!nonEmptyString(sourceRef) || !nonEmptyString(sourceRecordId) || receivedMs === null) {
      invalid.push(`${path}.provenance requires sourceRef, sourceRecordId, and an ISO receivedAt.`)
    }

    if (!Array.isArray(samples) || samples.length === 0 || samples.length > MAX_SAMPLE_COUNT) {
      invalid.push(`${path}.samples must contain 1-${MAX_SAMPLE_COUNT} values.`)
    } else if (samples.some((value) => !Number.isFinite(value) || Math.abs(value) > MAX_ABS_MICROVOLTS)) {
      invalid.push(`${path}.samples contains a non-finite or out-of-range microvolt value.`)
    }

    if (!Array.isArray(timestamps) || !Array.isArray(samples) || timestamps.length !== samples.length) {
      invalid.push(`${path}.timestamps must match the sample count.`)
    } else {
      let previous = Number.NEGATIVE_INFINITY
      for (const timestamp of timestamps) {
        if (!Number.isFinite(timestamp) || timestamp < 0 || timestamp < previous) {
          invalid.push(`${path}.timestamps must be ordered epoch milliseconds.`)
          break
        }
        if (selectionStartedMs !== null && timestamp < selectionStartedMs) {
          invalid.push(`${path}.timestamps contain samples from before the current selected-device session.`)
          break
        }
        previous = timestamp
      }
      const finalTimestamp = timestamps.at(-1)
      if (
        observedMs !== null &&
        Number.isFinite(finalTimestamp) &&
        Math.abs(finalTimestamp - observedMs) > Math.max(1_000, 2_000 / sampleRate)
      ) {
        invalid.push(`${path}.observedAt does not match the latest provider sample timestamp.`)
      }
    }

    if (observedMs !== null && receivedMs !== null && receivedMs < observedMs) {
      invalid.push(`${path}.provenance.receivedAt precedes observedAt.`)
    }
    if (observedMs !== null && evaluatedMs !== null) {
      const age = evaluatedMs - observedMs
      if (age < -MAX_FUTURE_SKEW_MS) invalid.push(`${path}.observedAt is implausibly in the future.`)
      else if (age > freshnessMs) stale.push(`${path} exceeded the ${freshnessMs} ms freshness threshold.`)
    }
    if (observedMs !== null && selectionStartedMs !== null && observedMs < selectionStartedMs) {
      invalid.push(`${path}.observedAt predates the current selected-device session.`)
    }
    if (receivedMs !== null && evaluatedMs !== null && receivedMs > evaluatedMs + MAX_FUTURE_SKEW_MS) {
      invalid.push(`${path}.provenance.receivedAt is implausibly in the future.`)
    }

    if (
      schemaVersion === FUNGI_LIVE_SAMPLE_SCHEMA &&
      deviceId === selectedDeviceId &&
      Number.isInteger(channel) &&
      Array.isArray(samples) &&
      Array.isArray(timestamps) &&
      unit &&
      observedMs !== null &&
      nonEmptyString(sourceRef) &&
      nonEmptyString(sourceRecordId) &&
      receivedMs !== null
    ) {
      normalizedBuffers.push({
        deviceId,
        channel,
        samples: [...samples],
        timestamps: [...timestamps],
        sampleRate,
        unit,
        observedAt: candidate.observedAt,
        schemaVersion,
        provenance: { sourceRef: sourceRef.trim(), sourceRecordId: sourceRecordId.trim(), receivedAt },
      })
      if (observedMs > latestObservedMs) {
        latestObservedMs = observedMs
        latestObservedAt = candidate.observedAt
        sharedProvenance = { sourceRef: sourceRef.trim(), sourceRecordId: sourceRecordId.trim(), receivedAt }
      }
    }
  })

  if (invalid.length > 0) return unavailable("unavailable", invalid)
  if (stale.length > 0) return unavailable("stale", stale)

  return {
    state: "verified",
    mode: "live",
    buffers: normalizedBuffers,
    unit: "µV",
    observedAt: latestObservedAt,
    provenance: sharedProvenance,
    reasons: [],
  }
}

/** A connected demo device is never promoted to live evidence. */
export function resolveFungiEvidenceMode({ deviceId, liveEvidenceState, isDemoMode = false }) {
  if (isDemoMode || deviceId?.startsWith("demo-")) return "demo"
  if (deviceId && liveEvidenceState === "verified") return "live"
  if (deviceId && liveEvidenceState === "stale") return "stale"
  return "unavailable"
}

/** Require a fresh, provenance-bearing device-bound NLM record. */
export function isNlmAnalysisContractBound(payload, deviceId, evaluatedAt = new Date().toISOString()) {
  if (!payload || typeof payload !== "object" || !deviceId) return false
  const record = payload.analysis && typeof payload.analysis === "object" ? payload.analysis : payload
  if (record.error) return false

  const recordDeviceId = record.deviceId ?? record.device_id
  const growthPhase = record.growthPhase ?? record.growth_phase
  const predictions = record.bioactivityPredictions ?? record.bioactivity_predictions
  const correlations = record.environmentalCorrelations ?? record.environmental_correlations
  const observedMs = strictIsoTimestamp(record.timestamp)
  const evaluatedMs = strictIsoTimestamp(evaluatedAt)
  const provenance = record.provenance
  const sourceRef = provenance && typeof provenance === "object" ? provenance.sourceRef : null
  const sourceRecordId = provenance && typeof provenance === "object" ? provenance.sourceRecordId : null

  return (
    recordDeviceId === deviceId &&
    observedMs !== null &&
    evaluatedMs !== null &&
    evaluatedMs - observedMs >= -MAX_FUTURE_SKEW_MS &&
    evaluatedMs - observedMs <= FUNGI_LIVE_FRESHNESS_MS &&
    nonEmptyString(sourceRef) &&
    nonEmptyString(sourceRecordId) &&
    nonEmptyString(growthPhase) &&
    Array.isArray(predictions) &&
    Array.isArray(correlations) &&
    Array.isArray(record.recommendations)
  )
}

export function canClaimNlmLive({ mode, masReachable, analysisBound }) {
  return mode === "live" && masReachable === true && analysisBound === true
}
