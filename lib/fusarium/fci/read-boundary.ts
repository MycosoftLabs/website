/**
 * Fail-closed validation for operational FCI reads.
 *
 * Routes authenticate before calling this module. The boundary caps upstream
 * JSON while it is streaming and only accepts evidence whose device identity,
 * observation time, and source provenance are present in the source record.
 */

export const FCI_READ_TIMEOUT_MS = 10_000
export const FCI_MAX_UPSTREAM_JSON_BYTES = 1024 * 1024

type JsonRecord = Record<string, unknown>

export type FciBoundaryResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: string }

export type FciReadResult =
  | { ok: true; status: 200; payload: unknown }
  | { ok: false; status: 502 | 503; available: false; error: string }

export interface FciWsStatusEvidence {
  active_devices: string[]
  total_connections: number
  sdr_available: boolean
}

function pass<T>(value: T): FciBoundaryResult<T> {
  return { ok: true, value }
}

function fail<T>(error: string): FciBoundaryResult<T> {
  return { ok: false, error }
}

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function exactText(value: unknown, field: string, maxLength = 256): FciBoundaryResult<string> {
  if (typeof value !== "string" || value.length < 1 || value.length > maxLength) {
    return fail(`${field} must be a non-empty string no longer than ${maxLength} characters`)
  }
  if (value !== value.trim() || /[\u0000-\u001f\u007f]/.test(value)) {
    return fail(`${field} has an invalid format`)
  }
  return pass(value)
}

function exactIdentifier(value: unknown, field: string): FciBoundaryResult<string> {
  const text = exactText(value, field, 128)
  if (!text.ok) return text
  return /^[A-Za-z0-9][A-Za-z0-9._:-]*$/.test(text.value)
    ? text
    : fail(`${field} has an invalid format`)
}

function finiteNumber(value: unknown, field: string, min: number, max: number): FciBoundaryResult<number> {
  return typeof value === "number" && Number.isFinite(value) && value >= min && value <= max
    ? pass(value)
    : fail(`${field} must be a finite number between ${min} and ${max}`)
}

function integer(value: unknown, field: string, min: number, max: number): FciBoundaryResult<number> {
  const number = finiteNumber(value, field, min, max)
  if (!number.ok) return number
  return Number.isInteger(number.value) ? number : fail(`${field} must be an integer`)
}

function timestampWithTimezone(value: unknown, field: string): FciBoundaryResult<string> {
  const text = exactText(value, field, 64)
  if (!text.ok) return text
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?(?:Z|[+-]\d{2}:\d{2})$/.test(text.value)) {
    return fail(`${field} must be an ISO timestamp with an explicit timezone`)
  }
  return Number.isFinite(new Date(text.value).getTime())
    ? text
    : fail(`${field} must be a valid timestamp`)
}

function aliasedText(record: JsonRecord, aliases: readonly string[], field: string): FciBoundaryResult<string> {
  const supplied = aliases.filter((key) => record[key] !== undefined)
  if (supplied.length === 0) return fail(`${field} is required`)
  const values: string[] = []
  for (const key of supplied) {
    const value = exactText(record[key], key, 256)
    if (!value.ok) return value
    values.push(value.value)
  }
  if (new Set(values).size !== 1) return fail(`${field} aliases disagree`)
  return pass(values[0])
}

function aliasedDeviceId(record: JsonRecord, field = "device_id"): FciBoundaryResult<string> {
  const supplied = ["device_id", "deviceId", "source_device_id", "sourceDeviceId"]
    .filter((key) => record[key] !== undefined)
  if (supplied.length === 0) return fail(`${field} is required`)
  const values: string[] = []
  for (const key of supplied) {
    const value = exactIdentifier(record[key], key)
    if (!value.ok) return value
    values.push(value.value)
  }
  if (new Set(values).size !== 1) return fail(`${field} aliases disagree`)
  return pass(values[0])
}

function aliasedArray(
  record: JsonRecord,
  aliases: readonly string[],
  field: string,
  maxItems: number,
): FciBoundaryResult<unknown[]> {
  const supplied = aliases.filter((alias) => record[alias] !== undefined)
  if (supplied.length !== 1) return fail(`${field} must use exactly one supported field name`)
  const value = record[supplied[0]]
  return Array.isArray(value) && value.length <= maxItems
    ? pass(value)
    : fail(`${field} must be a bounded array`)
}

export function validateFciQueryKeys(
  searchParams: URLSearchParams,
  allowed: readonly string[],
): FciBoundaryResult<true> {
  const allowedSet = new Set(allowed)
  const counts = new Map<string, number>()
  for (const [key] of searchParams) {
    if (!allowedSet.has(key)) return fail(`unexpected query parameter: ${key}`)
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  const duplicate = [...counts].find(([, count]) => count > 1)?.[0]
  return duplicate ? fail(`query parameter must not be repeated: ${duplicate}`) : pass(true)
}

async function readUpstreamJson(response: Response): Promise<FciBoundaryResult<unknown>> {
  const contentType = response.headers.get("content-type")?.split(";", 1)[0]?.trim().toLowerCase()
  if (contentType !== "application/json" && !contentType?.endsWith("+json")) {
    await response.body?.cancel().catch(() => undefined)
    return fail("FCI upstream returned a non-JSON body.")
  }

  const contentLength = response.headers.get("content-length")
  if (contentLength !== null) {
    const declared = Number(contentLength)
    if (!Number.isSafeInteger(declared) || declared < 0 || declared > FCI_MAX_UPSTREAM_JSON_BYTES) {
      await response.body?.cancel().catch(() => undefined)
      return fail("FCI upstream response exceeded the evidence size limit.")
    }
  }
  if (!response.body) return fail("FCI upstream returned an empty body.")

  const reader = response.body.getReader()
  const decoder = new TextDecoder("utf-8", { fatal: true })
  const chunks: string[] = []
  let bytesRead = 0
  try {
    while (true) {
      const chunk = await reader.read()
      if (chunk.done) break
      bytesRead += chunk.value.byteLength
      if (bytesRead > FCI_MAX_UPSTREAM_JSON_BYTES) {
        await reader.cancel().catch(() => undefined)
        return fail("FCI upstream response exceeded the evidence size limit.")
      }
      chunks.push(decoder.decode(chunk.value, { stream: true }))
    }
    chunks.push(decoder.decode())
    return pass(JSON.parse(chunks.join("")) as unknown)
  } catch {
    return fail("FCI upstream returned invalid JSON.")
  } finally {
    reader.releaseLock()
  }
}

export async function fetchFciUpstreamJson(input: {
  url: string
  timeoutMs?: number
}): Promise<FciReadResult> {
  let response: Response
  try {
    response = await fetch(input.url, {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(input.timeoutMs ?? FCI_READ_TIMEOUT_MS),
    })
  } catch {
    return { ok: false, status: 502, available: false, error: "FCI upstream was unreachable." }
  }

  if (!response.ok) {
    await response.body?.cancel().catch(() => undefined)
    return {
      ok: false,
      status: response.status === 404 || response.status === 503 ? 503 : 502,
      available: false,
      error: "FCI upstream did not return authoritative evidence.",
    }
  }

  const payload = await readUpstreamJson(response)
  return payload.ok
    ? { ok: true, status: 200, payload: payload.value }
    : { ok: false, status: 502, available: false, error: payload.error }
}

export function validateFciDeviceEvidence(
  payload: unknown,
  requestedDeviceId: string,
  kind: "correlations" | "fingerprint" | "nlm",
): FciBoundaryResult<JsonRecord> {
  if (!isRecord(payload)) return fail("FCI upstream evidence must be an object")
  const record = kind === "nlm" && isRecord(payload.analysis) ? payload.analysis : payload
  const sourceDeviceId = aliasedDeviceId(record)
  if (!sourceDeviceId.ok || sourceDeviceId.value !== requestedDeviceId) {
    return fail("FCI upstream evidence did not prove the requested device identity")
  }

  if (kind === "correlations") {
    if (!Array.isArray(record.correlations) || record.correlations.length > 1_000) {
      return fail("correlations must be a bounded array")
    }
    const totalCount = integer(record.total_count, "total_count", 0, 1_000)
    if (!totalCount.ok || totalCount.value !== record.correlations.length) {
      return fail("total_count must equal the correlation record count")
    }
    if (record.correlations.length === 0) {
      const source = exactText(record.source, "source", 256)
      if (record.available !== true || !source.ok) {
        return fail("an empty correlation result requires explicit provider availability and provenance")
      }
    }
    for (let index = 0; index < record.correlations.length; index += 1) {
      const correlation = record.correlations[index]
      if (!isRecord(correlation)) return fail(`correlations[${index}] must be an object`)
      const source = exactText(correlation.source, `correlations[${index}].source`, 128)
      if (!source.ok) return source
      const timestamp = timestampWithTimezone(correlation.timestamp, `correlations[${index}].timestamp`)
      if (!timestamp.ok) return timestamp
      const strength = finiteNumber(correlation.correlation_strength, `correlations[${index}].correlation_strength`, 0, 1)
      if (!strength.ok) return strength
    }
  }

  if (kind === "fingerprint") {
    if (!isRecord(record.fingerprint)) return fail("fingerprint must be an object")
    const generatedAtText = aliasedText(record, ["generated_at", "generatedAt"], "generated_at")
    if (!generatedAtText.ok) return generatedAtText
    const generatedAt = timestampWithTimezone(generatedAtText.value, "generated_at")
    if (!generatedAt.ok) return generatedAt
    const source = exactText(record.fingerprint.source, "fingerprint.source", 256)
    if (!source.ok) return source
    const sampleCount = integer(record.fingerprint.sample_count, "fingerprint.sample_count", 1, 100_000_000)
    if (!sampleCount.ok) return sampleCount
  }

  if (kind === "nlm") {
    const observedAtText = aliasedText(record, ["timestamp", "observed_at", "observedAt"], "analysis timestamp")
    if (!observedAtText.ok) return observedAtText
    const observedAt = timestampWithTimezone(observedAtText.value, "analysis timestamp")
    if (!observedAt.ok) return observedAt
    if (!isRecord(record.provenance)) return fail("analysis provenance is required")
    const sourceRef = aliasedText(record.provenance, ["sourceRef", "source_ref"], "provenance.sourceRef")
    if (!sourceRef.ok) return sourceRef
    const sourceRecordId = aliasedText(
      record.provenance,
      ["sourceRecordId", "source_record_id"],
      "provenance.sourceRecordId",
    )
    if (!sourceRecordId.ok) return sourceRecordId
    const growthPhase = aliasedText(record, ["growthPhase", "growth_phase"], "growth phase")
    if (!growthPhase.ok) return growthPhase
    for (const [field, aliases] of [
      ["bioactivity predictions", ["bioactivityPredictions", "bioactivity_predictions"]],
      ["environmental correlations", ["environmentalCorrelations", "environmental_correlations"]],
      ["recommendations", ["recommendations"]],
    ] as const) {
      const evidence = aliasedArray(record, aliases, field, 10_000)
      if (!evidence.ok) return evidence
    }
  }

  return pass(record)
}

export function validateFciEventLedger(
  payload: unknown,
  requestedDeviceId?: string,
): FciBoundaryResult<JsonRecord> {
  if (!isRecord(payload) || !Array.isArray(payload.events) || payload.events.length > 1_000) {
    return fail("FCI event ledger must contain a bounded events array")
  }
  if (payload.events.length === 0) {
    const source = exactText(payload.source, "source", 256)
    if (payload.available !== true || !source.ok) {
      return fail("an empty event ledger requires explicit provider availability and provenance")
    }
  }
  const eventIds = new Set<string>()
  for (let index = 0; index < payload.events.length; index += 1) {
    const event = payload.events[index]
    if (!isRecord(event)) return fail(`events[${index}] must be an object`)
    const id = exactIdentifier(event.id, `events[${index}].id`)
    if (!id.ok) return id
    if (eventIds.has(id.value)) return fail(`events[${index}].id must be unique`)
    eventIds.add(id.value)
    const timestamp = timestampWithTimezone(event.timestamp, `events[${index}].timestamp`)
    if (!timestamp.ok) return timestamp
    const sourceValues: string[] = []
    for (const [sourceField, sourceValue] of [
      ["source", event.source],
      ["externalSource", event.externalSource],
      ["provenance.sourceRef", isRecord(event.provenance) ? event.provenance.sourceRef : undefined],
    ] as const) {
      if (sourceValue === undefined) continue
      const source = exactText(sourceValue, `events[${index}].${sourceField}`, 256)
      if (!source.ok) return source
      sourceValues.push(source.value)
    }
    if (sourceValues.length === 0) return fail(`events[${index}] must contain source provenance`)
    if (requestedDeviceId) {
      const sourceDeviceId = aliasedDeviceId(event, `events[${index}].device_id`)
      if (!sourceDeviceId.ok || sourceDeviceId.value !== requestedDeviceId) {
        return fail(`events[${index}] did not prove the requested device identity`)
      }
    }
  }
  return pass(payload)
}

export function validateFciGfstPatterns(payload: unknown): FciBoundaryResult<JsonRecord[]> {
  if (!Array.isArray(payload) || payload.length > 1_000) {
    return fail("GFST pattern catalog must be a bounded array")
  }
  const names = new Set<string>()
  for (let index = 0; index < payload.length; index += 1) {
    const pattern = payload[index]
    if (!isRecord(pattern)) return fail(`patterns[${index}] must be an object`)
    const name = exactIdentifier(pattern.pattern_name, `patterns[${index}].pattern_name`)
    if (!name.ok) return name
    if (names.has(name.value)) return fail(`patterns[${index}].pattern_name must be unique`)
    names.add(name.value)
    const category = exactIdentifier(pattern.category, `patterns[${index}].category`)
    if (!category.ok) return category
    const description = exactText(pattern.description, `patterns[${index}].description`, 2_000)
    if (!description.ok) return description
  }
  return pass(payload)
}

export function validateFciWsStatus(payload: unknown): FciBoundaryResult<FciWsStatusEvidence> {
  if (!isRecord(payload) || !Array.isArray(payload.active_devices) || payload.active_devices.length > 10_000) {
    return fail("FCI websocket status must contain a bounded active_devices array")
  }
  const devices: string[] = []
  const seen = new Set<string>()
  for (let index = 0; index < payload.active_devices.length; index += 1) {
    const device = exactIdentifier(payload.active_devices[index], `active_devices[${index}]`)
    if (!device.ok) return device
    if (seen.has(device.value)) return fail(`active_devices[${index}] must be unique`)
    seen.add(device.value)
    devices.push(device.value)
  }
  const totalConnections = integer(payload.total_connections, "total_connections", 0, 100_000)
  if (!totalConnections.ok) return totalConnections
  if (totalConnections.value < devices.length) {
    return fail("total_connections cannot be less than the active device count")
  }
  if (typeof payload.sdr_available !== "boolean") return fail("sdr_available must be a boolean")
  return pass({
    active_devices: devices,
    total_connections: totalConnections.value,
    sdr_available: payload.sdr_available,
  })
}

export function unavailableFciRead(error: string, status = 503) {
  return { error, available: false, status }
}
