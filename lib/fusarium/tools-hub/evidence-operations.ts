export const MAX_OPERATION_BYTES = 512 * 1024
export const MAX_OPERATION_RECORDS = 1_000

export type OperationKind = "custody" | "timeline" | "packet" | "diff"
export type OperationState = "verified" | "partial" | "empty" | "unavailable" | "error"

export interface OperationIssue {
  path: string
  state: Exclude<OperationState, "verified" | "empty" | "unavailable">
  message: string
}

export interface OperationResult {
  kind: OperationKind
  state: OperationState
  summary: string
  recordCount: number | null
  canonicalHash: string | null
  issues: OperationIssue[]
  output: unknown | null
}

type JsonObject = Record<string, unknown>

function isObject(value: unknown): value is JsonObject {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value)
}

function stable(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stable)
  if (isObject(value)) return Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, entry]) => [key, stable(entry)]))
  return value
}

export function canonicalizeOperation(value: unknown): string {
  return JSON.stringify(stable(value))
}

export async function canonicalSha256(value: unknown): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(canonicalizeOperation(value)))
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("")
}

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null
}

function iso(value: unknown): string | null {
  const candidate = text(value)
  if (!candidate) return null
  const time = Date.parse(candidate)
  return Number.isFinite(time) ? new Date(time).toISOString() : null
}

function unclassified(value: unknown, path: string, issues: OperationIssue[]): value is "UNCLASSIFIED" {
  if (value === "UNCLASSIFIED") return true
  issues.push({ path, state: "error", message: value == null ? "Classification is required." : "Only commercial UNCLASSIFIED evidence is accepted by this host." })
  return false
}

function requireText(value: unknown, path: string, issues: OperationIssue[]): string | null {
  const result = text(value)
  if (!result) issues.push({ path, state: "error", message: "A stable non-empty identifier is required." })
  return result
}

function requireIso(value: unknown, path: string, issues: OperationIssue[]): string | null {
  const result = iso(value)
  if (!result) issues.push({ path, state: "error", message: "A valid authoritative ISO timestamp is required." })
  return result
}

function validateProvenance(value: unknown, path: string, issues: OperationIssue[]): JsonObject | null {
  if (!isObject(value)) {
    issues.push({ path, state: "error", message: "Provenance must be an object." })
    return null
  }
  requireText(value.sourceId, `${path}.sourceId`, issues)
  requireText(value.sourceRef, `${path}.sourceRef`, issues)
  requireText(value.sourceRecordId, `${path}.sourceRecordId`, issues)
  requireIso(value.receivedAt, `${path}.receivedAt`, issues)
  return value
}

function baseError(kind: OperationKind, summary: string, issues: OperationIssue[]): OperationResult {
  return { kind, state: "error", summary, recordCount: null, canonicalHash: null, issues, output: null }
}

function stateFor(issues: OperationIssue[], count: number): OperationState {
  if (issues.some((issue) => issue.state === "error")) return "error"
  if (count === 0) return "empty"
  return issues.length ? "partial" : "verified"
}

async function inspectCustody(input: unknown): Promise<OperationResult> {
  const issues: OperationIssue[] = []
  if (!isObject(input)) return baseError("custody", "Custody input must be a JSON object.", [{ path: "$", state: "error", message: "Object required." }])
  if (input.schemaVersion !== "fusarium-chain-of-custody/v1") issues.push({ path: "schemaVersion", state: "error", message: "Expected fusarium-chain-of-custody/v1." })
  const evidenceId = requireText(input.evidenceId, "evidenceId", issues)
  unclassified(input.classification, "classification", issues)
  validateProvenance(input.provenance, "provenance", issues)
  if (!Array.isArray(input.events)) return baseError("custody", "Custody events are missing.", [...issues, { path: "events", state: "error", message: "Events must be an array." }])
  if (input.events.length > MAX_OPERATION_RECORDS) issues.push({ path: "events", state: "error", message: `At most ${MAX_OPERATION_RECORDS} custody events are accepted.` })

  const outputEvents: JsonObject[] = []
  const ids = new Set<string>()
  let previousHash: string | null = null
  let previousRecorded = -Infinity
  let previousRevision = 0
  for (const [index, raw] of input.events.slice(0, MAX_OPERATION_RECORDS).entries()) {
    const path = `events[${index}]`
    if (!isObject(raw)) { issues.push({ path, state: "error", message: "Custody event must be an object." }); continue }
    const eventId = requireText(raw.eventId, `${path}.eventId`, issues)
    if (eventId && ids.has(eventId)) issues.push({ path: `${path}.eventId`, state: "error", message: "Custody event identifiers must be unique." })
    if (eventId) ids.add(eventId)
    const occurredAt = requireIso(raw.occurredAt, `${path}.occurredAt`, issues)
    const recordedAt = requireIso(raw.recordedAt, `${path}.recordedAt`, issues)
    if (occurredAt && recordedAt && Date.parse(occurredAt) > Date.parse(recordedAt)) issues.push({ path, state: "error", message: "An event cannot be recorded before it occurred." })
    if (recordedAt && Date.parse(recordedAt) < previousRecorded) issues.push({ path, state: "error", message: "Custody events are not in append order by recordedAt." })
    if (recordedAt) previousRecorded = Date.parse(recordedAt)
    const revision = typeof raw.revision === "number" && Number.isInteger(raw.revision) ? raw.revision : null
    if (revision !== previousRevision + 1) issues.push({ path: `${path}.revision`, state: "error", message: `Expected append revision ${previousRevision + 1}.` })
    if (revision != null) previousRevision = revision
    requireText(raw.action, `${path}.action`, issues)
    requireText(raw.actorRef, `${path}.actorRef`, issues)
    unclassified(raw.classification, `${path}.classification`, issues)
    validateProvenance(raw.provenance, `${path}.provenance`, issues)
    const suppliedPrevious = raw.previousEventHash == null ? null : text(raw.previousEventHash)
    if (suppliedPrevious !== previousHash) issues.push({ path: `${path}.previousEventHash`, state: "error", message: index === 0 ? "The first event must have a null previousEventHash." : "The previous-event hash does not match the locally computed prior event hash." })
    const hashInput = { evidenceId, ...raw, occurredAt, recordedAt, declaredEventHash: undefined }
    const eventHash = await canonicalSha256(hashInput)
    const declared = raw.declaredEventHash == null ? null : text(raw.declaredEventHash)?.toLowerCase() ?? null
    if (declared && !/^[a-f0-9]{64}$/.test(declared)) issues.push({ path: `${path}.declaredEventHash`, state: "error", message: "Declared event hash must be 64 hexadecimal characters." })
    else if (declared && declared !== eventHash) issues.push({ path: `${path}.declaredEventHash`, state: "error", message: "Declared event hash does not match the canonical event hash." })
    outputEvents.push({ ...raw, occurredAt, recordedAt, computedEventHash: eventHash })
    previousHash = eventHash
  }
  const output = { schemaVersion: "fusarium-chain-of-custody-inspection/v1", evidenceId, classification: input.classification, sourceProvenance: input.provenance, events: outputEvents, chainHeadHash: previousHash }
  const state = stateFor(issues, input.events.length)
  return { kind: "custody", state, summary: state === "verified" ? "Append order, revisions, timestamps, provenance, classification, and hash links verified locally." : state === "empty" ? "The supplied ledger is valid but contains no custody events." : "Custody inspection found blocking issues.", recordCount: input.events.length, canonicalHash: state === "error" ? null : await canonicalSha256(output), issues, output: state === "error" ? null : output }
}

async function buildTimeline(input: unknown): Promise<OperationResult> {
  const issues: OperationIssue[] = []
  if (!isObject(input)) return baseError("timeline", "Timeline input must be a JSON object.", [{ path: "$", state: "error", message: "Object required." }])
  if (input.schemaVersion !== "fusarium-evidence-timeline-source/v1") issues.push({ path: "schemaVersion", state: "error", message: "Expected fusarium-evidence-timeline-source/v1." })
  unclassified(input.classification, "classification", issues)
  const timelineId = requireText(input.timelineId, "timelineId", issues)
  if (!Array.isArray(input.records)) return baseError("timeline", "Timeline records are missing.", [...issues, { path: "records", state: "error", message: "Records must be an array." }])
  if (input.records.length > MAX_OPERATION_RECORDS) issues.push({ path: "records", state: "error", message: `At most ${MAX_OPERATION_RECORDS} records are accepted.` })
  const ids = new Set<string>()
  const records: JsonObject[] = []
  for (const [index, raw] of input.records.slice(0, MAX_OPERATION_RECORDS).entries()) {
    const path = `records[${index}]`
    if (!isObject(raw)) { issues.push({ path, state: "error", message: "Timeline record must be an object." }); continue }
    const recordId = requireText(raw.recordId, `${path}.recordId`, issues)
    if (recordId && ids.has(recordId)) issues.push({ path: `${path}.recordId`, state: "error", message: "Timeline record identifiers must be unique." })
    if (recordId) ids.add(recordId)
    const observedAt = requireIso(raw.observedAt, `${path}.observedAt`, issues)
    const recordedAt = requireIso(raw.recordedAt, `${path}.recordedAt`, issues)
    if (observedAt && recordedAt && Date.parse(observedAt) > Date.parse(recordedAt)) issues.push({ path, state: "error", message: "recordedAt cannot precede observedAt." })
    requireText(raw.eventType, `${path}.eventType`, issues)
    requireText(raw.summary, `${path}.summary`, issues)
    unclassified(raw.classification, `${path}.classification`, issues)
    validateProvenance(raw.provenance, `${path}.provenance`, issues)
    records.push({ ...raw, observedAt, recordedAt })
  }
  records.sort((a, b) => String(a.observedAt).localeCompare(String(b.observedAt)) || String(a.recordedAt).localeCompare(String(b.recordedAt)) || String(a.recordId).localeCompare(String(b.recordId)))
  const entries = await Promise.all(records.map(async (record, sequence) => ({ sequence: sequence + 1, ...record, canonicalRecordHash: await canonicalSha256(record) })))
  const output = { schemaVersion: "fusarium-evidence-timeline/v1", timelineId, classification: input.classification, entries }
  const state = stateFor(issues, input.records.length)
  return { kind: "timeline", state, summary: state === "verified" ? "Evidence records were deterministically ordered without inferring missing events." : state === "empty" ? "The supplied source is valid and contains no timeline records." : "Timeline construction found blocking issues.", recordCount: input.records.length, canonicalHash: state === "error" ? null : await canonicalSha256(output), issues, output: state === "error" ? null : output }
}

async function buildPacket(input: unknown): Promise<OperationResult> {
  const issues: OperationIssue[] = []
  if (!isObject(input)) return baseError("packet", "Field packet input must be a JSON object.", [{ path: "$", state: "error", message: "Object required." }])
  if (input.schemaVersion !== "fusarium-field-packet-source/v1") issues.push({ path: "schemaVersion", state: "error", message: "Expected fusarium-field-packet-source/v1." })
  const packetId = requireText(input.packetId, "packetId", issues)
  const assembledAt = requireIso(input.assembledAt, "assembledAt", issues)
  const assembledByRef = requireText(input.assembledByRef, "assembledByRef", issues)
  unclassified(input.classification, "classification", issues)
  const missionArea = isObject(input.missionArea) ? input.missionArea : null
  if (!missionArea) issues.push({ path: "missionArea", state: "error", message: "Mission area object is required." })
  else { requireText(missionArea.id, "missionArea.id", issues); requireText(missionArea.label, "missionArea.label", issues) }
  const window = isObject(input.timeWindow) ? input.timeWindow : null
  const start = window ? requireIso(window.start, "timeWindow.start", issues) : null
  const end = window ? requireIso(window.end, "timeWindow.end", issues) : null
  if (!window) issues.push({ path: "timeWindow", state: "error", message: "A bounded time window is required." })
  if (start && end && Date.parse(start) > Date.parse(end)) issues.push({ path: "timeWindow", state: "error", message: "Time-window start must not follow end." })
  validateProvenance(input.provenance, "provenance", issues)
  if (!Array.isArray(input.records)) return baseError("packet", "Field packet records are missing.", [...issues, { path: "records", state: "error", message: "Records must be an array." }])
  if (input.records.length > MAX_OPERATION_RECORDS) issues.push({ path: "records", state: "error", message: `At most ${MAX_OPERATION_RECORDS} records are accepted.` })
  const ids = new Set<string>()
  const records: JsonObject[] = []
  for (const [index, raw] of input.records.slice(0, MAX_OPERATION_RECORDS).entries()) {
    const path = `records[${index}]`
    if (!isObject(raw)) { issues.push({ path, state: "error", message: "Packet record must be an object." }); continue }
    const recordId = requireText(raw.recordId, `${path}.recordId`, issues)
    if (recordId && ids.has(recordId)) issues.push({ path: `${path}.recordId`, state: "error", message: "Packet record identifiers must be unique." })
    if (recordId) ids.add(recordId)
    const observedAt = requireIso(raw.observedAt, `${path}.observedAt`, issues)
    if (observedAt && start && end && (Date.parse(observedAt) < Date.parse(start) || Date.parse(observedAt) > Date.parse(end))) issues.push({ path: `${path}.observedAt`, state: "error", message: "Record falls outside the declared field-packet time window." })
    unclassified(raw.classification, `${path}.classification`, issues)
    validateProvenance(raw.provenance, `${path}.provenance`, issues)
    records.push({ ...raw, observedAt })
  }
  records.sort((a, b) => String(a.observedAt).localeCompare(String(b.observedAt)) || String(a.recordId).localeCompare(String(b.recordId)))
  const recordManifest = await Promise.all(records.map(async (record) => ({ recordId: record.recordId, observedAt: record.observedAt, canonicalRecordHash: await canonicalSha256(record), record })))
  const manifest = { schemaVersion: "fusarium-field-packet/v1", packetId, classification: input.classification, assembledAt, assembledByRef, missionArea, timeWindow: { start, end }, provenance: input.provenance, recordManifest }
  const state = stateFor(issues, input.records.length)
  const packetHash = state === "error" ? null : await canonicalSha256(manifest)
  const output = state === "error" ? null : { ...manifest, canonicalPacketHash: packetHash }
  return { kind: "packet", state, summary: state === "verified" ? "A deterministic local field-packet manifest is ready for browser-only export." : state === "empty" ? "The field packet is valid but explicitly empty." : "Field-packet construction found blocking issues.", recordCount: input.records.length, canonicalHash: packetHash, issues, output }
}

async function buildDiff(input: unknown): Promise<OperationResult> {
  const issues: OperationIssue[] = []
  if (!isObject(input)) return baseError("diff", "Diff input must be a JSON object.", [{ path: "$", state: "error", message: "Object required." }])
  if (input.schemaVersion !== "fusarium-evidence-diff-source/v1") issues.push({ path: "schemaVersion", state: "error", message: "Expected fusarium-evidence-diff-source/v1." })
  unclassified(input.classification, "classification", issues)
  const left = isObject(input.left) ? input.left : null
  const right = isObject(input.right) ? input.right : null
  if (!left || !right) return baseError("diff", "Both evidence revisions are required.", [...issues, { path: "left/right", state: "error", message: "Two revision objects are required." }])
  const leftId = requireText(left.evidenceId, "left.evidenceId", issues)
  const rightId = requireText(right.evidenceId, "right.evidenceId", issues)
  if (leftId && rightId && leftId !== rightId) issues.push({ path: "left/right.evidenceId", state: "error", message: "Evidence diff requires revisions of the same stable evidence identifier." })
  unclassified(left.classification, "left.classification", issues)
  unclassified(right.classification, "right.classification", issues)
  validateProvenance(left.provenance, "left.provenance", issues)
  validateProvenance(right.provenance, "right.provenance", issues)
  requireIso(left.recordedAt, "left.recordedAt", issues)
  requireIso(right.recordedAt, "right.recordedAt", issues)
  const leftRevision = typeof left.revision === "number" && Number.isInteger(left.revision) ? left.revision : null
  const rightRevision = typeof right.revision === "number" && Number.isInteger(right.revision) ? right.revision : null
  if (leftRevision == null) issues.push({ path: "left.revision", state: "error", message: "Integer revision required." })
  if (rightRevision == null) issues.push({ path: "right.revision", state: "error", message: "Integer revision required." })
  if (leftRevision != null && rightRevision != null && rightRevision <= leftRevision) issues.push({ path: "right.revision", state: "error", message: "Right revision must follow left revision." })
  if (!Array.isArray(left.records) || !Array.isArray(right.records)) return baseError("diff", "Both revisions must contain record arrays.", [...issues, { path: "left/right.records", state: "error", message: "Record arrays are required." }])
  if (left.records.length > MAX_OPERATION_RECORDS || right.records.length > MAX_OPERATION_RECORDS) issues.push({ path: "left/right.records", state: "error", message: `Each revision is limited to ${MAX_OPERATION_RECORDS} records.` })
  const map = (records: unknown[], side: string) => {
    const result = new Map<string, JsonObject>()
    records.slice(0, MAX_OPERATION_RECORDS).forEach((raw, index) => {
      if (!isObject(raw)) { issues.push({ path: `${side}.records[${index}]`, state: "error", message: "Record must be an object." }); return }
      const id = requireText(raw.recordId, `${side}.records[${index}].recordId`, issues)
      if (!id) return
      if (result.has(id)) issues.push({ path: `${side}.records[${index}].recordId`, state: "error", message: "Record identifiers must be unique within a revision." })
      result.set(id, raw)
    })
    return result
  }
  const leftMap = map(left.records, "left")
  const rightMap = map(right.records, "right")
  const ids = [...new Set([...leftMap.keys(), ...rightMap.keys()])].sort()
  const changes = await Promise.all(ids.map(async (recordId) => {
    const before = leftMap.get(recordId) ?? null
    const after = rightMap.get(recordId) ?? null
    const beforeHash = before ? await canonicalSha256(before) : null
    const afterHash = after ? await canonicalSha256(after) : null
    return { recordId, change: !before ? "added" : !after ? "removed" : beforeHash === afterHash ? "unchanged" : "changed", beforeHash, afterHash, before, after }
  }))
  const counts = { added: changes.filter((entry) => entry.change === "added").length, removed: changes.filter((entry) => entry.change === "removed").length, changed: changes.filter((entry) => entry.change === "changed").length, unchanged: changes.filter((entry) => entry.change === "unchanged").length }
  const output = { schemaVersion: "fusarium-evidence-diff/v1", evidenceId: leftId, classification: input.classification, leftRevision, rightRevision, leftHash: await canonicalSha256(left), rightHash: await canonicalSha256(right), counts, changes }
  const count = Math.max(left.records.length, right.records.length)
  const state = stateFor(issues, count)
  return { kind: "diff", state, summary: state === "verified" ? "Two supplied revisions were compared by stable record identifier and canonical content." : state === "empty" ? "Both supplied revisions are valid and empty." : "Evidence diff found blocking issues.", recordCount: count, canonicalHash: state === "error" ? null : await canonicalSha256(output), issues, output: state === "error" ? null : output }
}

export async function runEvidenceOperation(kind: OperationKind, input: unknown): Promise<OperationResult> {
  if (kind === "custody") return inspectCustody(input)
  if (kind === "timeline") return buildTimeline(input)
  if (kind === "packet") return buildPacket(input)
  return buildDiff(input)
}
