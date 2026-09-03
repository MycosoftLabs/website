import {
  SINE_EVIDENCE_CONTRACT,
  SINE_EVIDENCE_QUERY_DEFAULTS,
  SINE_REQUEST_CONTRACT,
} from "@/lib/mindex/sine-contract"

export const SINE_SERVER_MAX_JSON_BYTES = 512 * 1024

export type SineBoundaryResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: string }

type JsonPrimitive = string | number | boolean | null
type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue }
type JsonRecord = { [key: string]: JsonValue }

export interface SineBodyRequest {
  readonly url: string
  readonly headers: { get(name: string): string | null }
  readonly body: ReadableStream<Uint8Array> | null
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const IDENTIFIER = /^[A-Za-z0-9][A-Za-z0-9._:-]*$/
const RESERVED_KEYS = new Set(["__proto__", "constructor", "prototype"])
const MAX_JSON_DEPTH = 10
const MAX_JSON_NODES = 8_192
const MAX_ARRAY_ITEMS = 512
const MAX_OBJECT_FIELDS = 256
const MAX_GENERIC_STRING = 16_384
const UNSAFE_CONTROL = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/

const ANALYSIS_FIELDS = [
  "blob_id",
  "file_id",
  "mode",
  "start_sec",
  "end_sec",
  "window_source",
  "windowed",
  "truncated_to_sec",
  "sine_request",
  "evidence_contract",
  "scope",
  "file_context",
] as const

const HUMAN_FIELDS = [
  "blob_id",
  "file_id",
  "analysis_run_id",
  "human_label",
  "human_category",
  "human_confidence",
  "human_notes",
  "disputes_model",
  "model_top_label",
  "model_confidence",
  "model_summary",
  "current_time_sec",
  "selected_region",
  "selected_region_measurements",
  "scope_context",
  "training_review",
  "event_context",
  "detector_event_key",
  "detector_event",
  "file_context",
] as const

const WAVE_FIELDS = [
  "blob_id",
  "file_id",
  "analysis_run_id",
  "selection",
  "zoom",
  "region_measurements",
  "scope",
  "markers",
  "file_context",
] as const

function pass<T>(value: T): SineBoundaryResult<T> {
  return { ok: true, value }
}

function fail<T>(error: string): SineBoundaryResult<T> {
  return { ok: false, error }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function exactKeys(
  value: Record<string, unknown>,
  allowed: readonly string[],
  required: readonly string[] = [],
): string | null {
  const allowedSet = new Set(allowed)
  const unexpected = Object.keys(value).find((key) => !allowedSet.has(key))
  if (unexpected) return `unexpected field: ${unexpected}`
  const missing = required.find((key) => !(key in value))
  return missing ? `${missing} is required` : null
}

function exactText(
  value: unknown,
  field: string,
  maxLength: number,
  pattern?: RegExp,
  allowLineBreaks = false,
): SineBoundaryResult<string> {
  if (typeof value !== "string" || value.length < 1 || value.length > maxLength) {
    return fail(`${field} must be a string between 1 and ${maxLength} characters`)
  }
  if (value !== value.trim()) return fail(`${field} must not contain leading or trailing whitespace`)
  if ((allowLineBreaks ? UNSAFE_CONTROL : /\p{Cc}/u).test(value)) {
    return fail(`${field} contains unsupported control characters`)
  }
  if (pattern && !pattern.test(value)) return fail(`${field} has an invalid format`)
  return pass(value)
}

function optionalText(
  value: unknown,
  field: string,
  maxLength: number,
  pattern?: RegExp,
  allowLineBreaks = false,
): SineBoundaryResult<string | null | undefined> {
  if (value === undefined || value === null) return pass(value)
  return exactText(value, field, maxLength, pattern, allowLineBreaks)
}

function finiteNumber(
  value: unknown,
  field: string,
  min: number,
  max: number,
): SineBoundaryResult<number> {
  if (typeof value !== "number" || !Number.isFinite(value) || value < min || value > max) {
    return fail(`${field} must be a finite number between ${min} and ${max}`)
  }
  return pass(value)
}

function optionalNumber(
  value: unknown,
  field: string,
  min: number,
  max: number,
): SineBoundaryResult<number | null | undefined> {
  if (value === undefined || value === null) return pass(value)
  return finiteNumber(value, field, min, max)
}

function cloneBoundedJson(
  value: unknown,
  path: string,
  depth = 0,
  budget = { nodes: 0 },
): SineBoundaryResult<JsonValue> {
  budget.nodes += 1
  if (budget.nodes > MAX_JSON_NODES) return fail(`${path} contains too many JSON values`)
  if (depth > MAX_JSON_DEPTH) return fail(`${path} exceeds the maximum nesting depth`)

  if (value === null || typeof value === "boolean") return pass(value)
  if (typeof value === "number") {
    return Number.isFinite(value) ? pass(value) : fail(`${path} must contain only finite numbers`)
  }
  if (typeof value === "string") {
    if (value.length > MAX_GENERIC_STRING) return fail(`${path} contains an oversized string`)
    if (UNSAFE_CONTROL.test(value)) return fail(`${path} contains unsupported control characters`)
    return pass(value)
  }
  if (Array.isArray(value)) {
    if (value.length > MAX_ARRAY_ITEMS) return fail(`${path} contains too many array entries`)
    const output: JsonValue[] = []
    for (let index = 0; index < value.length; index += 1) {
      const item = cloneBoundedJson(value[index], `${path}[${index}]`, depth + 1, budget)
      if (!item.ok) return item
      output.push(item.value)
    }
    return pass(output)
  }
  if (!isRecord(value)) return fail(`${path} must contain JSON-compatible values`)

  const entries = Object.entries(value)
  if (entries.length > MAX_OBJECT_FIELDS) return fail(`${path} contains too many fields`)
  const output: JsonRecord = {}
  for (const [key, raw] of entries) {
    if (RESERVED_KEYS.has(key) || key.length < 1 || key.length > 128 || /\p{Cc}/u.test(key)) {
      return fail(`${path} contains an invalid field name`)
    }
    const item = cloneBoundedJson(raw, `${path}.${key}`, depth + 1, budget)
    if (!item.ok) return item
    output[key] = item.value
  }
  return pass(output)
}

function boundedObject(value: unknown, path: string): SineBoundaryResult<JsonRecord> {
  if (!isRecord(value)) return fail(`${path} must be an object`)
  const cloned = cloneBoundedJson(value, path)
  return cloned.ok && isRecord(cloned.value)
    ? pass(cloned.value as JsonRecord)
    : cloned.ok
      ? fail(`${path} must be an object`)
      : cloned
}

function validateFileContext(
  value: unknown,
  fileId: string,
  blobId: string,
): SineBoundaryResult<JsonRecord> {
  const context = boundedObject(value, "file_context")
  if (!context.ok) return context
  const contextFileId = exactText(context.value.id, "file_context.id", 512)
  if (!contextFileId.ok) return contextFileId
  if (contextFileId.value !== fileId) return fail("file_context.id must match file_id")

  if (context.value.analysis_id !== undefined && context.value.analysis_id !== null) {
    const analysisId = validateSineBlobId(context.value.analysis_id, "file_context.analysis_id")
    if (!analysisId.ok) return analysisId
    if (analysisId.value !== blobId) return fail("file_context.analysis_id must match blob_id")
  }

  for (const key of ["source_id", "source_name", "device_id", "sensor_id"] as const) {
    const item = optionalText(context.value[key], `file_context.${key}`, 512)
    if (!item.ok) return item
  }
  for (const key of ["observed_at", "recorded_at", "timestamp"] as const) {
    const raw = context.value[key]
    if (raw === undefined || raw === null) continue
    if (typeof raw !== "string" || !Number.isFinite(Date.parse(raw))) {
      return fail(`file_context.${key} must be a valid timestamp`)
    }
  }
  if (context.value.duration_sec !== undefined && context.value.duration_sec !== null) {
    const duration = finiteNumber(context.value.duration_sec, "file_context.duration_sec", 0, 7 * 24 * 60 * 60)
    if (!duration.ok) return duration
  }
  if (context.value.sample_rate_hz !== undefined && context.value.sample_rate_hz !== null) {
    const rate = finiteNumber(context.value.sample_rate_hz, "file_context.sample_rate_hz", 0.001, 2_000_000)
    if (!rate.ok) return rate
  }
  return context
}

function validateRegion(
  value: JsonValue | undefined,
  field: string,
  duration: number | null,
): SineBoundaryResult<void> {
  if (value === undefined || value === null) return pass(undefined)
  if (!isRecord(value)) return fail(`${field} must be an object or null`)
  const start = finiteNumber(value.start_sec, `${field}.start_sec`, 0, 7 * 24 * 60 * 60)
  if (!start.ok) return start
  const end = finiteNumber(value.end_sec, `${field}.end_sec`, 0, 7 * 24 * 60 * 60)
  if (!end.ok) return end
  if (end.value <= start.value) return fail(`${field}.end_sec must be greater than start_sec`)
  if (duration !== null && end.value > duration) return fail(`${field}.end_sec exceeds file_context.duration_sec`)
  return pass(undefined)
}

function contextDuration(context: JsonRecord): number | null {
  const value = context.duration_sec
  return typeof value === "number" && Number.isFinite(value) ? value : null
}

export function requireSineSameOrigin(request: Pick<SineBodyRequest, "url" | "headers">) {
  const origin = request.headers.get("origin")
  if (!origin) return fail<true>("trusted same-origin request required")
  try {
    const parsedOrigin = new URL(origin)
    const requestOrigin = new URL(request.url).origin
    if (origin !== parsedOrigin.origin || parsedOrigin.origin !== requestOrigin) {
      return fail<true>("trusted same-origin request required")
    }
  } catch {
    return fail<true>("trusted same-origin request required")
  }
  return pass(true)
}

export async function readSineJson(
  request: SineBodyRequest,
  maxBytes = SINE_SERVER_MAX_JSON_BYTES,
): Promise<SineBoundaryResult<unknown>> {
  const contentType = request.headers.get("content-type")?.split(";", 1)[0]?.trim().toLowerCase()
  if (contentType !== "application/json") return fail("content-type must be application/json")
  const contentEncoding = request.headers.get("content-encoding")?.trim().toLowerCase()
  if (contentEncoding && contentEncoding !== "identity") return fail("compressed request bodies are not accepted")

  const contentLength = request.headers.get("content-length")
  if (contentLength !== null) {
    const declared = Number(contentLength)
    if (!Number.isSafeInteger(declared) || declared < 1 || declared > maxBytes) {
      return fail(`request body must contain between 1 and ${maxBytes} bytes`)
    }
  }

  if (!request.body) return fail("request body is required")
  const reader = request.body.getReader()
  const decoder = new TextDecoder("utf-8", { fatal: true })
  let size = 0
  let text = ""
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      size += value.byteLength
      if (size > maxBytes) {
        await reader.cancel().catch(() => undefined)
        return fail(`request body must not exceed ${maxBytes} bytes`)
      }
      text += decoder.decode(value, { stream: true })
    }
    text += decoder.decode()
  } catch {
    return fail("request body must contain valid UTF-8 JSON")
  } finally {
    reader.releaseLock()
  }
  if (size < 1 || !text.trim()) return fail("request body is required")
  try {
    return pass(JSON.parse(text) as unknown)
  } catch {
    return fail("request body must contain valid JSON")
  }
}

export function validateSineBlobId(value: unknown, field = "blob_id"): SineBoundaryResult<string> {
  return exactText(value, field, 36, UUID)
}

export function readSineBlobQuery(url: string, required: boolean): SineBoundaryResult<string | null> {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return fail("invalid request URL")
  }
  const keys = [...new Set(parsed.searchParams.keys())]
  const unexpected = keys.find((key) => key !== "id")
  if (unexpected) return fail(`unexpected query parameter: ${unexpected}`)
  if (parsed.searchParams.getAll("id").length > 1) return fail("id must be provided once")
  const raw = parsed.searchParams.get("id")
  if (raw === null) return required ? fail("Missing acoustic file id.") : pass(null)
  const id = validateSineBlobId(raw)
  return id.ok ? pass(id.value) : id
}

export function buildSineAnalysisQuery(url: string): SineBoundaryResult<string> {
  let source: URLSearchParams
  try {
    source = new URL(url).searchParams
  } catch {
    return fail("invalid request URL")
  }
  const allowed = new Set([
    ...Object.keys(SINE_EVIDENCE_QUERY_DEFAULTS),
    "detectors",
    "start_sec",
    "end_sec",
    "windowed",
    "window_source",
  ])
  for (const key of new Set(source.keys())) {
    if (!allowed.has(key)) return fail(`unexpected query parameter: ${key}`)
    if (source.getAll(key).length > 1) return fail(`${key} must be provided once`)
  }

  const output = new URLSearchParams()
  for (const [key, expected] of Object.entries(SINE_EVIDENCE_QUERY_DEFAULTS)) {
    const supplied = source.get(key)
    if (supplied !== null && supplied !== expected) {
      return fail(`${key} cannot override the server evidence contract`)
    }
    output.set(key, expected)
  }

  const detectors = source.get("detectors")
  if (detectors !== null) {
    if (detectors.length > 1_024) return fail("detectors is too long")
    const items = detectors.split(",")
    if (items.length < 1 || items.length > 32 || items.some((item) => !IDENTIFIER.test(item))) {
      return fail("detectors must be a comma-separated list of at most 32 exact detector identifiers")
    }
    output.set("detectors", detectors)
  }

  const startRaw = source.get("start_sec")
  const endRaw = source.get("end_sec")
  if ((startRaw === null) !== (endRaw === null)) return fail("start_sec and end_sec must be provided together")
  if (startRaw !== null && endRaw !== null) {
    const start = finiteNumber(Number(startRaw), "start_sec", 0, 7 * 24 * 60 * 60)
    if (!start.ok) return start
    const end = finiteNumber(Number(endRaw), "end_sec", 0, 7 * 24 * 60 * 60)
    if (!end.ok) return end
    if (end.value <= start.value) return fail("end_sec must be greater than start_sec")
    output.set("start_sec", startRaw)
    output.set("end_sec", endRaw)
  }

  const windowed = source.get("windowed")
  if (windowed !== null) {
    if (windowed !== "true" || startRaw === null) return fail("windowed must be true with a bounded time range")
    output.set("windowed", windowed)
  }
  const windowSource = source.get("window_source")
  if (windowSource !== null) {
    const parsed = exactText(windowSource, "window_source", 128, IDENTIFIER)
    if (!parsed.ok) return parsed
    if (startRaw === null) return fail("window_source requires a bounded time range")
    output.set("window_source", parsed.value)
  }
  return pass(output.toString())
}

export function reconcileSineAnalysisRequest(
  query: string,
  submission: Record<string, unknown>,
): SineBoundaryResult<true> {
  const params = new URLSearchParams(query)
  const queryStartRaw = params.get("start_sec")
  const queryEndRaw = params.get("end_sec")
  const bodyStart = submission.start_sec
  const bodyEnd = submission.end_sec
  const bodyHasWindow = typeof bodyStart === "number" && typeof bodyEnd === "number"
  const queryHasWindow = queryStartRaw !== null && queryEndRaw !== null

  if (queryHasWindow !== bodyHasWindow) {
    return fail("analysis query time range must match the submitted time range")
  }
  if (
    queryHasWindow &&
    (Number(queryStartRaw) !== bodyStart || Number(queryEndRaw) !== bodyEnd)
  ) {
    return fail("analysis query time range must match the submitted time range")
  }

  const queryWindowed = params.get("windowed") === "true"
  if (queryWindowed !== submission.windowed) {
    return fail("analysis query windowed state must match the submitted windowed state")
  }
  const queryWindowSource = params.get("window_source")
  const bodyWindowSource = typeof submission.window_source === "string" ? submission.window_source : null
  if (queryWindowSource !== bodyWindowSource) {
    return fail("analysis query window source must match the submitted window source")
  }
  return pass(true)
}

export function validateSineAnalysisSubmission(
  value: unknown,
  pathBlobId: string,
): SineBoundaryResult<Record<string, unknown>> {
  const blobId = validateSineBlobId(pathBlobId, "path blob id")
  if (!blobId.ok) return blobId
  if (!isRecord(value)) return fail("request body must be an object")
  const keyError = exactKeys(value, ANALYSIS_FIELDS, ["blob_id", "file_id", "mode", "windowed", "file_context"])
  if (keyError) return fail(keyError)
  const cloned = boundedObject(value, "request body")
  if (!cloned.ok) return cloned

  const bodyBlobId = validateSineBlobId(cloned.value.blob_id)
  if (!bodyBlobId.ok) return bodyBlobId
  if (bodyBlobId.value !== blobId.value) return fail("blob_id must match the route blob id")
  const fileId = exactText(cloned.value.file_id, "file_id", 512)
  if (!fileId.ok) return fileId
  const mode = String(cloned.value.mode)
  if (!["full_short_recording", "windowed", "selected_region"].includes(mode)) {
    return fail("mode must be full_short_recording, windowed, or selected_region")
  }
  if (typeof cloned.value.windowed !== "boolean") return fail("windowed must be a boolean")
  const start = optionalNumber(cloned.value.start_sec, "start_sec", 0, 7 * 24 * 60 * 60)
  if (!start.ok) return start
  const end = optionalNumber(cloned.value.end_sec, "end_sec", 0, 7 * 24 * 60 * 60)
  if (!end.ok) return end
  if ((start.value == null) !== (end.value == null)) return fail("start_sec and end_sec must be provided together")
  if (start.value != null && end.value != null && end.value <= start.value) {
    return fail("end_sec must be greater than start_sec")
  }
  if (cloned.value.windowed !== (start.value != null)) return fail("windowed must match the supplied time range")
  if (cloned.value.windowed !== (mode !== "full_short_recording")) {
    return fail("mode must match the submitted windowed state")
  }
  const windowSource = optionalText(cloned.value.window_source, "window_source", 128, IDENTIFIER)
  if (!windowSource.ok) return windowSource
  if (windowSource.value != null && start.value == null) return fail("window_source requires a bounded time range")
  const truncated = optionalNumber(cloned.value.truncated_to_sec, "truncated_to_sec", 0, 7 * 24 * 60 * 60)
  if (!truncated.ok) return truncated
  if (cloned.value.scope !== undefined && !isRecord(cloned.value.scope)) return fail("scope must be an object")
  if (cloned.value.evidence_contract !== undefined && !isRecord(cloned.value.evidence_contract)) {
    return fail("evidence_contract must be an object")
  }
  if (cloned.value.sine_request !== undefined && !isRecord(cloned.value.sine_request)) {
    return fail("sine_request must be an object")
  }
  const fileContext = validateFileContext(cloned.value.file_context, fileId.value, blobId.value)
  if (!fileContext.ok) return fileContext
  const duration = contextDuration(fileContext.value)
  if (duration !== null && end.value != null && end.value > duration) {
    return fail("end_sec exceeds file_context.duration_sec")
  }

  return pass({
    ...cloned.value,
    evidence_contract: SINE_EVIDENCE_CONTRACT,
    sine_request: SINE_REQUEST_CONTRACT,
  })
}

export function validateSineHumanIdentification(
  value: unknown,
  queryBlobId: string | null,
): SineBoundaryResult<Record<string, unknown>> {
  if (!isRecord(value)) return fail("request body must be an object")
  const keyError = exactKeys(
    value,
    HUMAN_FIELDS,
    ["blob_id", "file_id", "human_label", "human_category", "human_confidence", "disputes_model", "current_time_sec", "file_context"],
  )
  if (keyError) return fail(keyError)
  const cloned = boundedObject(value, "request body")
  if (!cloned.ok) return cloned

  const blobId = validateSineBlobId(cloned.value.blob_id)
  if (!blobId.ok) return blobId
  if (queryBlobId !== null && queryBlobId !== blobId.value) return fail("query id must match blob_id")
  const fileId = exactText(cloned.value.file_id, "file_id", 512)
  if (!fileId.ok) return fileId
  const label = exactText(cloned.value.human_label, "human_label", 256)
  if (!label.ok) return label
  const category = exactText(cloned.value.human_category, "human_category", 128, IDENTIFIER)
  if (!category.ok) return category
  const confidence = finiteNumber(cloned.value.human_confidence, "human_confidence", 0, 1)
  if (!confidence.ok) return confidence
  if (typeof cloned.value.disputes_model !== "boolean") return fail("disputes_model must be a boolean")
  const notes = optionalText(cloned.value.human_notes, "human_notes", 4_000, undefined, true)
  if (!notes.ok) return notes
  const modelLabel = optionalText(cloned.value.model_top_label, "model_top_label", 256)
  if (!modelLabel.ok) return modelLabel
  const modelConfidence = optionalNumber(cloned.value.model_confidence, "model_confidence", 0, 1)
  if (!modelConfidence.ok) return modelConfidence
  if (cloned.value.model_summary !== undefined && cloned.value.model_summary !== null && !isRecord(cloned.value.model_summary)) {
    return fail("model_summary must be an object or null")
  }
  const currentTime = finiteNumber(cloned.value.current_time_sec, "current_time_sec", 0, 7 * 24 * 60 * 60)
  if (!currentTime.ok) return currentTime
  const runId = optionalText(cloned.value.analysis_run_id, "analysis_run_id", 36, UUID)
  if (!runId.ok) return runId
  const eventKey = optionalText(cloned.value.detector_event_key, "detector_event_key", 512)
  if (!eventKey.ok) return eventKey
  for (const key of ["selected_region", "selected_region_measurements", "scope_context", "training_review", "event_context", "detector_event"] as const) {
    const item = cloned.value[key]
    if (item !== undefined && item !== null && !isRecord(item)) return fail(`${key} must be an object or null`)
  }
  const fileContext = validateFileContext(cloned.value.file_context, fileId.value, blobId.value)
  if (!fileContext.ok) return fileContext
  const region = validateRegion(cloned.value.selected_region, "selected_region", contextDuration(fileContext.value))
  if (!region.ok) return region
  return pass(cloned.value)
}

export function validateSineWaveAnnotation(
  value: unknown,
  queryBlobId: string | null,
): SineBoundaryResult<Record<string, unknown>> {
  if (!isRecord(value)) return fail("request body must be an object")
  const keyError = exactKeys(value, WAVE_FIELDS, ["blob_id", "file_id", "markers", "file_context"])
  if (keyError) return fail(keyError)
  const cloned = boundedObject(value, "request body")
  if (!cloned.ok) return cloned

  const blobId = validateSineBlobId(cloned.value.blob_id)
  if (!blobId.ok) return blobId
  if (queryBlobId !== null && queryBlobId !== blobId.value) return fail("query id must match blob_id")
  const fileId = exactText(cloned.value.file_id, "file_id", 512)
  if (!fileId.ok) return fileId
  const runId = optionalText(cloned.value.analysis_run_id, "analysis_run_id", 36, UUID)
  if (!runId.ok) return runId
  for (const key of ["selection", "zoom", "region_measurements", "scope"] as const) {
    const item = cloned.value[key]
    if (item !== undefined && item !== null && !isRecord(item)) return fail(`${key} must be an object or null`)
  }
  if (!Array.isArray(cloned.value.markers) || cloned.value.markers.length > 256) {
    return fail("markers must be an array with at most 256 entries")
  }
  const fileContext = validateFileContext(cloned.value.file_context, fileId.value, blobId.value)
  if (!fileContext.ok) return fileContext
  const duration = contextDuration(fileContext.value)
  const selection = validateRegion(cloned.value.selection, "selection", duration)
  if (!selection.ok) return selection
  const zoom = validateRegion(cloned.value.zoom, "zoom", duration)
  if (!zoom.ok) return zoom

  for (let index = 0; index < cloned.value.markers.length; index += 1) {
    const marker = cloned.value.markers[index]
    if (!isRecord(marker)) return fail(`markers[${index}] must be an object`)
    const markerKeys = exactKeys(marker, ["id", "time_sec", "label"], ["id", "time_sec", "label"])
    if (markerKeys) return fail(`markers[${index}] ${markerKeys}`)
    const id = exactText(marker.id, `markers[${index}].id`, 256)
    if (!id.ok) return id
    const time = finiteNumber(marker.time_sec, `markers[${index}].time_sec`, 0, 7 * 24 * 60 * 60)
    if (!time.ok) return time
    if (duration !== null && time.value > duration) return fail(`markers[${index}].time_sec exceeds file_context.duration_sec`)
    const label = exactText(marker.label, `markers[${index}].label`, 512)
    if (!label.ok) return label
  }
  const hasSelection = cloned.value.selection !== undefined && cloned.value.selection !== null
  const hasScope = cloned.value.scope !== undefined && cloned.value.scope !== null
  if (!hasSelection && cloned.value.markers.length === 0 && !hasScope) {
    return fail("selection, markers, or scope is required")
  }
  return pass(cloned.value)
}
