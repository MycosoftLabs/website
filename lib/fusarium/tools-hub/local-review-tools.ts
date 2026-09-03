export const LOCAL_REVIEW_MAX_BYTES = 512 * 1024
export const LOCAL_REVIEW_MAX_RECORDS = 1_000

export type LocalReviewKind = "coverage" | "field-diff" | "sensor-health" | "network-posture" | "incident-timeline"
export type LocalReviewState = "valid" | "partial" | "empty" | "error"
export interface LocalReviewFinding { path: string; severity: "info" | "advisory" | "blocking"; message: string }
export interface LocalReviewResult { kind: LocalReviewKind; state: LocalReviewState; summary: string; recordCount: number; findings: LocalReviewFinding[]; output: unknown | null; canonicalHash: string | null }

type Row = Record<string, unknown>
const object = (value: unknown): value is Row => Boolean(value) && typeof value === "object" && !Array.isArray(value)
const text = (value: unknown) => typeof value === "string" && value.trim() ? value.trim() : null
const finite = (value: unknown) => typeof value === "number" && Number.isFinite(value) ? value : null
const compareText = (left: string, right: string) => left < right ? -1 : left > right ? 1 : 0

/** Parse JSON while rejecting duplicate object members before JSON.parse can
 * silently collapse them with last-value-wins semantics. */
export function parseLocalReviewJson(source: string): unknown {
  let index = 0
  const whitespace = () => { while (/\s/.test(source[index] ?? "")) index += 1 }
  const stringToken = () => {
    whitespace()
    if (source[index] !== '"') throw new SyntaxError("Expected JSON string")
    const start = index++
    while (index < source.length) {
      if (source[index] === "\\") { index += 2; continue }
      if (source[index++] === '"') return JSON.parse(source.slice(start, index)) as string
    }
    throw new SyntaxError("Unterminated JSON string")
  }
  const value = (): void => {
    whitespace()
    if (source[index] === "{") { objectValue(); return }
    if (source[index] === "[") { arrayValue(); return }
    if (source[index] === '"') { stringToken(); return }
    const start = index
    while (index < source.length && !/[\s,}\]]/.test(source[index])) index += 1
    if (start === index) throw new SyntaxError("Expected JSON value")
  }
  const objectValue = (): void => {
    index += 1; whitespace(); const keys = new Set<string>()
    if (source[index] === "}") { index += 1; return }
    while (index < source.length) {
      const key = stringToken()
      if (keys.has(key)) throw new SyntaxError(`Duplicate JSON member: ${key}`)
      keys.add(key); whitespace()
      if (source[index++] !== ":") throw new SyntaxError("Expected colon")
      value(); whitespace()
      if (source[index] === "}") { index += 1; return }
      if (source[index++] !== ",") throw new SyntaxError("Expected comma")
    }
    throw new SyntaxError("Unterminated JSON object")
  }
  const arrayValue = (): void => {
    index += 1; whitespace()
    if (source[index] === "]") { index += 1; return }
    while (index < source.length) {
      value(); whitespace()
      if (source[index] === "]") { index += 1; return }
      if (source[index++] !== ",") throw new SyntaxError("Expected comma")
    }
    throw new SyntaxError("Unterminated JSON array")
  }
  value(); whitespace()
  if (index !== source.length) throw new SyntaxError("Trailing JSON content")
  return JSON.parse(source) as unknown
}
const iso = (value: unknown) => {
  const candidate = text(value)
  const match = candidate?.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,3}))?(Z|[+-]\d{2}:\d{2})$/)
  if (!candidate || !match) return null
  const [, year, month, day, hour, minute, second, fraction = "0", zone] = match
  const parts = [year, month, day, hour, minute, second].map(Number)
  const [y, mo, d, h, mi, s] = parts
  const ms = Number(fraction.padEnd(3, "0"))
  const wallClock = new Date(Date.UTC(y, mo - 1, d, h, mi, s, ms))
  if (wallClock.getUTCFullYear() !== y || wallClock.getUTCMonth() !== mo - 1 || wallClock.getUTCDate() !== d || wallClock.getUTCHours() !== h || wallClock.getUTCMinutes() !== mi || wallClock.getUTCSeconds() !== s || wallClock.getUTCMilliseconds() !== ms) return null
  if (zone !== "Z") {
    const [zoneHour, zoneMinute] = zone.slice(1).split(":").map(Number)
    if (zoneHour > 23 || zoneMinute > 59) return null
  }
  const parsed = Date.parse(candidate)
  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : null
}
const stable = (value: unknown): unknown => Array.isArray(value) ? value.map(stable) : object(value) ? Object.fromEntries(Object.entries(value).sort(([a], [b]) => compareText(a, b)).map(([key, entry]) => [key, stable(entry)])) : value
const hash = async (value: unknown) => Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(JSON.stringify(stable(value))))), (byte) => byte.toString(16).padStart(2, "0")).join("")
const finding = (findings: LocalReviewFinding[], path: string, severity: LocalReviewFinding["severity"], message: string) => findings.push({ path, severity, message })
const boundedRecords = <T>(values: readonly T[], path: string, findings: LocalReviewFinding[]): readonly T[] => {
  if (values.length > LOCAL_REVIEW_MAX_RECORDS) finding(findings, path, "blocking", `At most ${LOCAL_REVIEW_MAX_RECORDS} records are accepted; no truncated review is produced.`)
  return values.slice(0, LOCAL_REVIEW_MAX_RECORDS)
}
const requiredText = (value: unknown, path: string, findings: LocalReviewFinding[]) => { const result = text(value); if (!result) finding(findings, path, "blocking", "A stable non-empty value is required."); return result }
const requiredTime = (value: unknown, path: string, findings: LocalReviewFinding[]) => { const result = iso(value); if (!result) finding(findings, path, "blocking", "An ISO timestamp with Z or an explicit UTC offset is required."); return result }
const validRoot = (input: unknown, schema: string, findings: LocalReviewFinding[]) => {
  if (!object(input)) { finding(findings, "$", "blocking", "A JSON object is required."); return null }
  if (input.schemaVersion !== schema) finding(findings, "schemaVersion", "blocking", `Expected ${schema}.`)
  if (input.classification !== "UNCLASSIFIED") finding(findings, "classification", "blocking", "Only commercial UNCLASSIFIED input is accepted.")
  if (!object(input.provenance)) { finding(findings, "provenance", "blocking", "Provenance is required."); return { ...input, provenance: null } }
  const sourceId = requiredText(input.provenance.sourceId, "provenance.sourceId", findings)
  const sourceRef = requiredText(input.provenance.sourceRef, "provenance.sourceRef", findings)
  const receivedAt = requiredTime(input.provenance.receivedAt, "provenance.receivedAt", findings)
  return { ...input, provenance: sourceId && sourceRef && receivedAt ? { sourceId, sourceRef, receivedAt } : null }
}
const finish = async (kind: LocalReviewKind, summary: string, count: number, findings: LocalReviewFinding[], output: unknown): Promise<LocalReviewResult> => {
  const blocking = findings.some((item) => item.severity === "blocking")
  const state: LocalReviewState = blocking ? "error" : count === 0 ? "empty" : findings.some((item) => item.severity === "advisory") ? "partial" : "valid"
  return { kind, state, summary: blocking ? "Local review found blocking schema or evidence issues." : count === 0 ? "The supplied structure is valid and explicitly empty; authenticity was not established." : summary, recordCount: count, findings, output: blocking ? null : output, canonicalHash: blocking ? null : await hash(output) }
}

async function coverageReview(input: unknown): Promise<LocalReviewResult> {
  const findings: LocalReviewFinding[] = [], root = validRoot(input, "fusarium-environmental-coverage-source/v1", findings)
  const areas = root && Array.isArray(root.areas) ? root.areas : null
  if (!areas) finding(findings, "areas", "blocking", "areas must be an array.")
  let acceptedObservationCount = 0
  const areaIds = new Set<string>(), observationIds = new Set<string>()
  const outputAreas = boundedRecords(areas ?? [], "areas", findings).map((raw, index) => {
    const path = `areas[${index}]`
    if (!object(raw)) { finding(findings, path, "blocking", "Area must be an object."); return null }
    const areaId = requiredText(raw.areaId, `${path}.areaId`, findings), label = requiredText(raw.label, `${path}.label`, findings)
    if (areaId && areaIds.has(areaId)) finding(findings, `${path}.areaId`, "blocking", "Area identifiers must be unique.")
    if (areaId) areaIds.add(areaId)
    const requiredDomains = Array.isArray(raw.requiredDomains) ? [...new Set(raw.requiredDomains.map(text).filter((value): value is string => Boolean(value)))].sort(compareText) : []
    if (!requiredDomains.length) finding(findings, `${path}.requiredDomains`, "blocking", "At least one explicitly required domain is needed.")
    const observations = Array.isArray(raw.observations) ? raw.observations : []
    const remainingObservationCapacity = Math.max(0, LOCAL_REVIEW_MAX_RECORDS - acceptedObservationCount)
    if (observations.length > remainingObservationCapacity) {
      finding(findings, `${path}.observations`, "blocking", `At most ${LOCAL_REVIEW_MAX_RECORDS} nested observation records are accepted across all areas; no truncated review is produced.`)
    }
    const boundedObservations = observations.slice(0, remainingObservationCapacity)
    acceptedObservationCount += boundedObservations.length
    const present = new Set<string>(), times: number[] = []
    boundedObservations.forEach((entry, observationIndex) => {
      if (!object(entry)) { finding(findings, `${path}.observations[${observationIndex}]`, "blocking", "Observation must be an object."); return }
      const observationId = requiredText(entry.observationId, `${path}.observations[${observationIndex}].observationId`, findings)
      if (observationId && observationIds.has(observationId)) finding(findings, `${path}.observations[${observationIndex}].observationId`, "blocking", "Observation identifiers must be unique across all areas.")
      if (observationId) observationIds.add(observationId)
      const domain = requiredText(entry.domain, `${path}.observations[${observationIndex}].domain`, findings)
      const observedAt = requiredTime(entry.observedAt, `${path}.observations[${observationIndex}].observedAt`, findings)
      requiredText(entry.sourceId, `${path}.observations[${observationIndex}].sourceId`, findings)
      if (domain) present.add(domain)
      if (observedAt) times.push(Date.parse(observedAt))
    })
    const missingDomains = requiredDomains.filter((domain) => !present.has(domain))
    if (missingDomains.length) finding(findings, path, "advisory", `Coverage gap: ${missingDomains.join(", ")}.`)
    return { areaId, label, requiredDomains, observedDomains: [...present].sort(compareText), missingDomains, observationCount: boundedObservations.length, lastObservedAt: times.length ? new Date(Math.max(...times)).toISOString() : null }
  }).filter(Boolean)
  return finish("coverage", "Coverage was compared only against explicitly required domains; no access or priority score was inferred.", outputAreas.length, findings, { schemaVersion: "fusarium-environmental-coverage-review/v1", areas: outputAreas, provenance: root?.provenance ?? null })
}

async function fieldDiffReview(input: unknown): Promise<LocalReviewResult> {
  const findings: LocalReviewFinding[] = [], root = validRoot(input, "fusarium-field-change-source/v1", findings)
  const parsePlane = (raw: unknown, path: string) => {
    if (!object(raw)) { finding(findings, path, "blocking", "Field plane is required."); return null }
    const mode = raw.mode
    if (!["OBSERVED", "FORECAST", "REPLAY"].includes(String(mode))) finding(findings, `${path}.mode`, "blocking", "mode must be OBSERVED, FORECAST, or REPLAY.")
    const validAt = requiredTime(raw.validAt, `${path}.validAt`, findings)
    if (mode === "FORECAST") { requiredText(raw.modelId, `${path}.modelId`, findings); requiredTime(raw.issuedAt, `${path}.issuedAt`, findings) }
    const fields = Array.isArray(raw.fields) ? raw.fields : []
    if (!Array.isArray(raw.fields)) finding(findings, `${path}.fields`, "blocking", "fields must be an array.")
    const map = new Map<string, { fieldId: string; unit: string; value: number }>()
    boundedRecords(fields, `${path}.fields`, findings).forEach((entry, index) => {
      if (!object(entry)) { finding(findings, `${path}.fields[${index}]`, "blocking", "Field must be an object."); return }
      const fieldId = requiredText(entry.fieldId, `${path}.fields[${index}].fieldId`, findings), unit = requiredText(entry.unit, `${path}.fields[${index}].unit`, findings), value = finite(entry.value)
      if (value === null) finding(findings, `${path}.fields[${index}].value`, "blocking", "A finite numeric value is required.")
      if (fieldId && map.has(fieldId)) finding(findings, `${path}.fields[${index}].fieldId`, "blocking", "Field identifiers must be unique within a plane.")
      if (fieldId && unit && value !== null && !map.has(fieldId)) map.set(fieldId, { fieldId, unit, value })
    })
    return { mode: String(mode), validAt, modelId: text(raw.modelId), issuedAt: iso(raw.issuedAt), map }
  }
  const left = parsePlane(root?.left, "left"), right = parsePlane(root?.right, "right")
  const changes: Row[] = []
  if (left && right) {
    for (const fieldId of [...new Set([...left.map.keys(), ...right.map.keys()])].sort(compareText)) {
      const before = left.map.get(fieldId), after = right.map.get(fieldId)
      if (!before || !after) { finding(findings, `fields.${fieldId}`, "advisory", before ? "Field is absent from the right plane." : "Field is absent from the left plane."); changes.push({ fieldId, state: before ? "missing-right" : "missing-left", before: before ?? null, after: after ?? null, delta: null }); continue }
      if (before.unit !== after.unit) { finding(findings, `fields.${fieldId}.unit`, "blocking", "Units differ; numeric delta is withheld."); changes.push({ fieldId, state: "unit-mismatch", before, after, delta: null }); continue }
      changes.push({ fieldId, state: "comparable", unit: before.unit, before: before.value, after: after.value, delta: after.value - before.value })
    }
    if (left.mode !== right.mode) finding(findings, "left/right.mode", "advisory", "Modes differ; the result preserves both modes and does not describe the delta as an observed change.")
  }
  return finish("field-diff", "Comparable supplied fields were differenced while mode, model, issue time, valid time, and units remained explicit.", changes.length, findings, { schemaVersion: "fusarium-field-change-review/v1", left: left ? { ...left, map: undefined } : null, right: right ? { ...right, map: undefined } : null, changes, provenance: root?.provenance ?? null })
}

async function sensorHealthReview(input: unknown): Promise<LocalReviewResult> {
  const findings: LocalReviewFinding[] = [], root = validRoot(input, "fusarium-sensor-health-source/v1", findings), asOf = requiredTime(root?.asOf, "asOf", findings)
  const devices = root && Array.isArray(root.devices) ? root.devices : null
  if (!devices) finding(findings, "devices", "blocking", "devices must be an array.")
  const deviceIds = new Set<string>()
  const output = boundedRecords(devices ?? [], "devices", findings).map((raw, index) => {
    const path = `devices[${index}]`
    if (!object(raw)) { finding(findings, path, "blocking", "Device health record must be an object."); return null }
    const deviceId = requiredText(raw.deviceId, `${path}.deviceId`, findings), observedAt = requiredTime(raw.observedAt, `${path}.observedAt`, findings)
    if (deviceId && deviceIds.has(deviceId)) finding(findings, `${path}.deviceId`, "blocking", "Device identifiers must be unique.")
    if (deviceId) deviceIds.add(deviceId)
    const threshold = finite(raw.freshnessThresholdSec), drift = raw.clockDriftMs == null ? null : finite(raw.clockDriftMs), maxDrift = finite(raw.maxClockDriftMs)
    if (threshold === null || threshold <= 0) finding(findings, `${path}.freshnessThresholdSec`, "blocking", "A positive freshness threshold is required.")
    if (maxDrift === null || maxDrift < 0) finding(findings, `${path}.maxClockDriftMs`, "blocking", "A non-negative clock-drift limit is required.")
    if (!["verified", "due", "unknown"].includes(String(raw.calibrationState))) finding(findings, `${path}.calibrationState`, "blocking", "calibrationState must be verified, due, or unknown.")
    const ageSec = asOf && observedAt ? (Date.parse(asOf) - Date.parse(observedAt)) / 1000 : null
    const states: string[] = []
    if (ageSec !== null && ageSec < 0) states.push("observation-in-future")
    else if (ageSec !== null && threshold !== null && ageSec > threshold) states.push("stale")
    if (raw.calibrationState !== "verified") states.push(`calibration-${String(raw.calibrationState)}`)
    if (drift === null) states.push("clock-drift-unknown"); else if (maxDrift !== null && Math.abs(drift) > maxDrift) states.push("clock-drift-exceeded")
    if (raw.sourceAuthorized !== true) states.push(raw.sourceAuthorized === false ? "source-unauthorized" : "source-authorization-unknown")
    if (!object(raw.power) || !["external", "battery", "unknown"].includes(String(raw.power.state))) states.push("power-unknown")
    if (states.length) finding(findings, path, "advisory", states.join(", "))
    return { deviceId, observedAt, ageSec, freshnessThresholdSec: threshold, calibrationState: raw.calibrationState, clockDriftMs: drift, maxClockDriftMs: maxDrift, sourceAuthorized: raw.sourceAuthorized ?? null, power: object(raw.power) ? raw.power : { state: "unknown" }, triage: states.length ? states : ["no-declared-issue"] }
  }).filter(Boolean)
  return finish("sensor-health", "Sensor health was triaged from supplied freshness, calibration, clock, power, and authorization evidence without changing any device.", output.length, findings, { schemaVersion: "fusarium-sensor-health-review/v1", asOf, devices: output, provenance: root?.provenance ?? null })
}

async function networkPostureReview(input: unknown): Promise<LocalReviewResult> {
  const findings: LocalReviewFinding[] = [], root = validRoot(input, "fusarium-network-posture-source/v1", findings), asOf = requiredTime(root?.asOf, "asOf", findings)
  requiredText(root?.inventoryScope, "inventoryScope", findings)
  const assets = root && Array.isArray(root.assets) ? root.assets : null
  if (!assets) finding(findings, "assets", "blocking", "assets must be an approved inventory array.")
  const assetIds = new Set<string>()
  let nestedRecordCount = 0
  const output = boundedRecords(assets ?? [], "assets", findings).map((raw, index) => {
    const path = `assets[${index}]`
    if (!object(raw)) { finding(findings, path, "blocking", "Asset must be an object."); return null }
    const assetId = requiredText(raw.assetId, `${path}.assetId`, findings)
    if (assetId && assetIds.has(assetId)) finding(findings, `${path}.assetId`, "blocking", "Asset identifiers must be unique.")
    if (assetId) assetIds.add(assetId)
    if (raw.approved !== true) finding(findings, `${path}.approved`, "blocking", "Every asset must be explicitly inside the approved inventory scope.")
    const services = Array.isArray(raw.services) ? raw.services : [], certificates = Array.isArray(raw.certificates) ? raw.certificates : []
    const remainingNestedCapacity = Math.max(0, LOCAL_REVIEW_MAX_RECORDS - nestedRecordCount)
    const nestedInputCount = services.length + certificates.length
    if (nestedInputCount > remainingNestedCapacity) finding(findings, path, "blocking", `At most ${LOCAL_REVIEW_MAX_RECORDS} nested service and certificate records are accepted across all assets.`)
    const acceptedServices = services.slice(0, remainingNestedCapacity)
    const acceptedCertificates = certificates.slice(0, Math.max(0, remainingNestedCapacity - acceptedServices.length))
    nestedRecordCount += acceptedServices.length + acceptedCertificates.length
    const normalizedServices: Row[] = [], normalizedCertificates: Row[] = []
    const assetFindings: string[] = []
    acceptedServices.forEach((service, serviceIndex) => {
      if (!object(service)) { finding(findings, `${path}.services[${serviceIndex}]`, "blocking", "Service must be an object."); return }
      const port = finite(service.port)
      if (port === null || !Number.isInteger(port) || port < 1 || port > 65535) finding(findings, `${path}.services[${serviceIndex}].port`, "blocking", "A valid declared port is required.")
      const protocol = requiredText(service.protocol, `${path}.services[${serviceIndex}].protocol`, findings), purpose = requiredText(service.purpose, `${path}.services[${serviceIndex}].purpose`, findings)
      if (!["loopback", "lan", "public", "unknown"].includes(String(service.exposure))) finding(findings, `${path}.services[${serviceIndex}].exposure`, "blocking", "Exposure must be loopback, lan, public, or unknown.")
      if (service.exposure === "public") assetFindings.push(`declared-public-service:${port}`)
      if (service.exposure === "unknown") assetFindings.push(`unknown-exposure:${port}`)
      normalizedServices.push({ port, protocol, purpose, exposure: service.exposure })
    })
    acceptedCertificates.forEach((certificate, certificateIndex) => {
      if (!object(certificate)) { finding(findings, `${path}.certificates[${certificateIndex}]`, "blocking", "Certificate metadata must be an object."); return }
      const subject = requiredText(certificate.subject, `${path}.certificates[${certificateIndex}].subject`, findings)
      const expiresAt = requiredTime(certificate.expiresAt, `${path}.certificates[${certificateIndex}].expiresAt`, findings)
      if (asOf && expiresAt && Date.parse(expiresAt) <= Date.parse(asOf)) assetFindings.push(`expired-certificate:${certificate.subject}`)
      normalizedCertificates.push({ subject, expiresAt })
    })
    if (assetFindings.length) finding(findings, path, "advisory", assetFindings.join(", "))
    return { assetId, approved: raw.approved, services: normalizedServices, certificates: normalizedCertificates, declaredPosture: assetFindings.length ? assetFindings : ["no-declared-issue"] }
  }).filter(Boolean)
  return finish("network-posture", "Approved inventory metadata was reviewed without scanning, credentials, exploitation, or remediation.", output.length, findings, { schemaVersion: "fusarium-network-posture-review/v1", asOf, inventoryScope: root?.inventoryScope ?? null, assets: output, provenance: root?.provenance ?? null })
}

async function incidentTimelineReview(input: unknown): Promise<LocalReviewResult> {
  const findings: LocalReviewFinding[] = [], root = validRoot(input, "fusarium-incident-timeline-source/v1", findings)
  const incidentId = requiredText(root?.incidentId, "incidentId", findings), events = root && Array.isArray(root.events) ? root.events : null
  if (!events) finding(findings, "events", "blocking", "events must be an array.")
  const ids = new Set<string>()
  const output = boundedRecords(events ?? [], "events", findings).map((raw, index) => {
    const path = `events[${index}]`
    if (!object(raw)) { finding(findings, path, "blocking", "Event must be an object."); return null }
    const eventId = requiredText(raw.eventId, `${path}.eventId`, findings), observedAt = requiredTime(raw.observedAt, `${path}.observedAt`, findings), recordedAt = requiredTime(raw.recordedAt, `${path}.recordedAt`, findings)
    if (eventId && ids.has(eventId)) finding(findings, `${path}.eventId`, "blocking", "Event identifiers must be unique.")
    if (eventId) ids.add(eventId)
    if (observedAt && recordedAt && Date.parse(recordedAt) < Date.parse(observedAt)) finding(findings, path, "blocking", "recordedAt cannot precede observedAt.")
    requiredText(raw.eventType, `${path}.eventType`, findings); requiredText(raw.summary, `${path}.summary`, findings); requiredText(raw.sourceId, `${path}.sourceId`, findings)
    if (!["info", "advisory", "significant", "critical"].includes(String(raw.severity))) finding(findings, `${path}.severity`, "blocking", "severity must be info, advisory, significant, or critical.")
    return { ...raw, eventId, observedAt, recordedAt, reportingDelayMs: observedAt && recordedAt ? Date.parse(recordedAt) - Date.parse(observedAt) : null }
  }).filter(Boolean).sort((a, b) => compareText(String(a?.observedAt), String(b?.observedAt)) || compareText(String(a?.recordedAt), String(b?.recordedAt)) || compareText(String(a?.eventId), String(b?.eventId)))
  return finish("incident-timeline", "Supplied events were deterministically ordered for human review without inferring missing events, intent, or attribution.", output.length, findings, { schemaVersion: "fusarium-incident-timeline/v1", incidentId, events: output.map((event, index) => ({ ...event, sequence: index + 1 })), provenance: root?.provenance ?? null })
}

export async function runLocalReview(kind: LocalReviewKind, input: unknown): Promise<LocalReviewResult> {
  if (kind === "coverage") return coverageReview(input)
  if (kind === "field-diff") return fieldDiffReview(input)
  if (kind === "sensor-health") return sensorHealthReview(input)
  if (kind === "network-posture") return networkPostureReview(input)
  return incidentTimelineReview(input)
}
