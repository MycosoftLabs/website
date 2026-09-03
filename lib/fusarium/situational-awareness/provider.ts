import {
  DOMAIN_LABELS,
  ENVIRONMENTAL_DOMAINS,
  SITUATIONAL_AWARENESS_SCHEMA,
  confidenceLabel,
  deriveCondition,
  isStale,
  type DomainState,
  type EnvironmentalDomain,
  type EnvironmentalObject,
  type EnvironmentalRelationship,
  type EvidenceRecord,
  type FreshnessState,
  type ObjectSeverity,
  type SituationalAwarenessProvider,
  type SituationalContext,
  type SituationalSnapshot,
  type SourceState,
  type SourceStatus,
  type TrendDirection,
} from "./contracts"
import { applySanitizedScenario } from "./scenario"

type UnknownRecord = Record<string, unknown>

interface RequestOutcome {
  endpoint: string
  ok: boolean
  status: number | null
  receivedAt: string
  payload: unknown
  error: string | null
}

interface RuntimeOperatorState extends UnknownRecord {
  classification?: unknown
  natureos?: unknown
  fusion?: unknown
  il?: unknown
  honest_gaps?: unknown
}

const DEVICES_ENDPOINT = "/api/Devices"
const OPERATOR_ENDPOINT = "/api/fusarium/operator/state"
const DEVICE_STALE_AFTER_SECONDS = 15 * 60
const EVENT_STALE_AFTER_SECONDS = 60 * 60

const asRecord = (value: unknown): UnknownRecord | null =>
  value && typeof value === "object" && !Array.isArray(value) ? (value as UnknownRecord) : null

const asArray = (value: unknown): unknown[] => (Array.isArray(value) ? value : [])

function text(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim()
    if (typeof value === "number" && Number.isFinite(value)) return String(value)
  }
  return null
}

function numberValue(...values: unknown[]): number | null {
  for (const value of values) {
    const parsed =
      typeof value === "number"
        ? value
        : typeof value === "string" && value.trim().length > 0
          ? Number(value.trim())
          : NaN
    if (Number.isFinite(parsed)) return parsed
  }
  return null
}

function normalizedConfidence(...values: unknown[]): number | null {
  const raw = numberValue(...values)
  if (raw === null || raw < 0 || raw > 1) return null
  return raw
}

function timestamp(...values: unknown[]): string | null {
  const candidate = text(...values)
  if (!candidate) return null
  return Number.isFinite(Date.parse(candidate)) ? new Date(candidate).toISOString() : null
}

function domainFromUnknown(value: unknown): EnvironmentalDomain | null {
  const normalized = String(value ?? "").toLowerCase()
  if (/air|atmos|weather|aerosol|spore|gas|spectral/.test(normalized)) return "atmosphere"
  if (/water|hydro|river|marine|ocean|aquatic|buoy/.test(normalized)) return "water"
  if (/soil|land|terrain|geolog|ground/.test(normalized)) return "land"
  if (/fung|bio|plant|animal|living|myco|species|ecolog/.test(normalized)) return "living"
  if (/infra|device|sensor|facility|building|road|culvert|network/.test(normalized)) return "infrastructure"
  return null
}

function severityFromUnknown(value: unknown): ObjectSeverity {
  const normalized = String(value ?? "").toLowerCase()
  if (/critical|urgent|severe|red/.test(normalized)) return "urgent"
  if (/high|material|orange/.test(normalized)) return "material"
  if (/watch|medium|yellow|guarded/.test(normalized)) return "watch"
  if (/normal|baseline|low|green|online|registered/.test(normalized)) return "baseline"
  return "unknown"
}

function trendFromUnknown(value: unknown): TrendDirection {
  const normalized = String(value ?? "").toLowerCase()
  if (/rising|increase|up|worsen/.test(normalized)) return "rising"
  if (/falling|decrease|down|improv/.test(normalized)) return "falling"
  if (/steady|stable|flat/.test(normalized)) return "steady"
  if (/mixed|variable/.test(normalized)) return "mixed"
  return "not_assessed"
}

function locationFromRecord(record: UnknownRecord): {
  label: string | null
  position: EnvironmentalObject["position"]
} {
  const location = record.location ?? record.Location ?? record.position ?? record.geometry
  const locationRecord = asRecord(location)
  const latitude = numberValue(
    locationRecord?.latitude,
    locationRecord?.lat,
    record.latitude,
    record.lat,
  )
  const longitude = numberValue(
    locationRecord?.longitude,
    locationRecord?.lng,
    locationRecord?.lon,
    record.longitude,
    record.lng,
    record.lon,
  )
  const label =
    text(locationRecord?.name, locationRecord?.label, record.locationName) ??
    (typeof location === "string" ? location : null)
  if (
    latitude === null ||
    longitude === null ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  ) {
    return { label, position: null }
  }
  return {
    label: label ?? `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
    position: {
      x: Math.max(2, Math.min(98, ((longitude + 180) / 360) * 100)),
      y: Math.max(2, Math.min(98, ((90 - latitude) / 180) * 100)),
      latitude,
      longitude,
    },
  }
}

function freshnessFor(observedAt: string | null, staleAfterSeconds: number, nowMs: number): FreshnessState {
  if (!observedAt) return "unknown"
  return isStale(observedAt, staleAfterSeconds, nowMs) ? "stale" : "fresh"
}

async function requestJson(endpoint: string, signal?: AbortSignal): Promise<RequestOutcome> {
  try {
    const response = await fetch(endpoint, { cache: "no-store", signal })
    let payload: unknown = null
    try {
      payload = await response.json()
    } catch {
      payload = null
    }
    return {
      endpoint,
      ok: response.ok,
      status: response.status,
      receivedAt: new Date().toISOString(),
      payload,
      error: response.ok ? null : `HTTP ${response.status}`,
    }
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error
    return {
      endpoint,
      ok: false,
      status: null,
      receivedAt: new Date().toISOString(),
      payload: null,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

function sourceState(
  outcome: RequestOutcome,
  recordCount: number,
  schemaValid: boolean | null,
  classificationAccepted: boolean | null,
): SourceState {
  if (outcome.status === 401 || outcome.status === 403) return "unauthorized"
  if (outcome.status === null) return "unreachable"
  if (!outcome.ok || schemaValid === false || classificationAccepted === false) return "degraded"
  return recordCount > 0 ? "live" : "empty"
}

function sourceStatus(
  id: string,
  label: string,
  outcome: RequestOutcome,
  recordCount: number,
  schemaValid: boolean | null,
  classificationAccepted: boolean | null,
  observedAt: string | null,
): SourceStatus {
  const state = sourceState(outcome, recordCount, schemaValid, classificationAccepted)
  const successfulResponse = outcome.ok && schemaValid !== false && classificationAccepted !== false
  return {
    id,
    label,
    endpoint: outcome.endpoint,
    state,
    httpStatus: outcome.status,
    receivedAt: successfulResponse ? outcome.receivedAt : null,
    observedAt,
    recordCount: successfulResponse ? recordCount : null,
    schemaValid,
    classificationAccepted,
    responseAccepted: successfulResponse,
    synthetic: false,
    note:
      state === "empty"
        ? "Response accepted; it supplied no records. No zero environmental measurement is asserted."
        : state === "unauthorized"
          ? "Transport responded, but the runtime rejected this browser session."
          : classificationAccepted === false
            ? "Transport and top-level shape were available, but UNCLASSIFIED policy validation failed; records were withheld."
          : schemaValid === false
            ? "Transport responded, but the top-level response shape did not match the bound adapter contract."
            : state === "degraded"
              ? `Transport responded without a successful data response${outcome.error ? `: ${outcome.error}` : "."}`
          : state === "unreachable"
            ? `No transport response received${outcome.error ? `: ${outcome.error}` : "."}`
            : "Response accepted for this browser poll; this is not authentication or accreditation.",
  }
}

function latestObservedAt(
  items: readonly { evidence: EvidenceRecord }[],
  sourceId: string,
): string | null {
  const timestamps = items
    .filter((item) => item.evidence.sourceId === sourceId)
    .map((item) => item.evidence.observedAt)
    .filter((value): value is string => Boolean(value))
    .sort((left, right) => Date.parse(right) - Date.parse(left))
  return timestamps[0] ?? null
}

function deviceId(record: UnknownRecord, index: number): string {
  return text(record.deviceId, record.DeviceId, record.device_id, record.id) ?? `unidentified-device-${index + 1}`
}

function normalizeDevice(
  value: unknown,
  index: number,
  receivedAt: string,
  nowMs: number,
  source: { id: string; label: string; refBase: string },
): { object: EnvironmentalObject; evidence: EvidenceRecord } | null {
  const record = asRecord(value)
  if (!record || text(record.classification) !== "UNCLASSIFIED") return null
  const id = deviceId(record, index)
  const deviceType = text(record.deviceType, record.DeviceType, record.device_type, record.type) ?? "device"
  const name = text(record.name, record.Name) ?? id
  const status = text(record.status, record.Status) ?? "status not supplied"
  const observedAt = timestamp(record.lastSeen, record.last_seen, record.timestamp, record.observedAt)
  const location = locationFromRecord(record)
  const confidence = normalizedConfidence(record.confidence)
  const evidenceId = `device-registry:${id}`
  const freshness = freshnessFor(observedAt, DEVICE_STALE_AFTER_SECONDS, nowMs)
  return {
    object: {
      id: `device:${id}`,
      kind: "sensor",
      name,
      domain: domainFromUnknown(deviceType) ?? "infrastructure",
      summary: `Registered ${deviceType} source. The registry supplied status “${status}”; no measurement is inferred from registration.`,
      locationLabel: location.label,
      position: location.position,
      observedAt,
      receivedAt,
      freshness,
      staleAfterSeconds: DEVICE_STALE_AFTER_SECONDS,
      freshnessBasis: "Registry last-seen time; stale after 15 minutes.",
      confidence,
      confidenceLabel: confidenceLabel(confidence),
      severity: "unknown",
      trend: "not_assessed",
      statusLabel: status.toUpperCase(),
      sourceIds: [source.id],
      evidenceIds: [evidenceId],
      relationshipIds: [],
      missionConsequence: null,
      history: [],
      current: null,
      forecast: [],
      classification: "UNCLASSIFIED",
      synthetic: false,
    },
    evidence: {
      id: evidenceId,
      title: `${name} registry record`,
      sourceId: source.id,
      sourceLabel: source.label,
      sourceRef: `${source.refBase}#${id}`,
      summary: "Device identity, type, registration state, optional location, and runtime last-seen metadata only.",
      observedAt,
      receivedAt,
      confidence,
      confidenceLabel: confidenceLabel(confidence),
      freshness,
      staleAfterSeconds: DEVICE_STALE_AFTER_SECONDS,
      freshnessBasis: "Registry last-seen time; stale after 15 minutes.",
      lineage: [source.refBase, "Situational Awareness runtime adapter"],
      classification: "UNCLASSIFIED",
      synthetic: false,
    },
  }
}

function normalizeEvent(
  value: unknown,
  index: number,
  receivedAt: string,
  nowMs: number,
): { object: EnvironmentalObject; evidence: EvidenceRecord } | null {
  const record = asRecord(value)
  if (!record || text(record.classification) !== "UNCLASSIFIED") return null
  const payload = asRecord(record.payload ?? record.Payload) ?? {}
  const id = text(record.eventId, record.EventId, record.id) ?? `unidentified-event-${index + 1}`
  const eventType = text(record.eventType, record.EventType, record.type) ?? "observation"
  const domainRaw = record.kingdomDomain ?? record.KingdomDomain ?? payload.domain
  const domain = domainFromUnknown(domainRaw)
  if (!domain) return null
  const observedAt = timestamp(record.timestamp, record.Timestamp, record.observedAt)
  const confidence = normalizedConfidence(record.confidence, payload.confidence)
  const location = locationFromRecord({ ...record, ...payload })
  const summary =
    text(payload.summary, payload.description, record.summary, record.description) ??
    `Runtime event “${eventType}” supplied no narrative summary.`
  const evidenceId = `runtime-event:${id}`
  const sourceDevice = text(record.sourceDevice, record.SourceDevice) ?? "source not supplied"
  const currentValue = numberValue(payload.value, payload.reading, payload.measurement)
  const freshness = freshnessFor(observedAt, EVENT_STALE_AFTER_SECONDS, nowMs)
  return {
    object: {
      id: `event:${id}`,
      kind: "change",
      name: text(record.title, payload.title) ?? eventType,
      domain,
      summary,
      locationLabel: location.label,
      position: location.position,
      observedAt,
      receivedAt,
      freshness,
      staleAfterSeconds: EVENT_STALE_AFTER_SECONDS,
      freshnessBasis: "Event observation time; stale after 60 minutes.",
      confidence,
      confidenceLabel: confidenceLabel(confidence),
      severity: severityFromUnknown(payload.severity ?? record.severity),
      trend: trendFromUnknown(payload.trend ?? record.trend),
      statusLabel: eventType.toUpperCase(),
      sourceIds:
        sourceDevice === "source not supplied"
          ? ["runtime-operator"]
          : ["runtime-operator", `device:${sourceDevice}`],
      evidenceIds: [evidenceId],
      relationshipIds: [],
      missionConsequence: text(payload.missionConsequence, payload.mission_consequence),
      history: [],
      current:
        currentValue === null
          ? null
          : {
              label: "Reported",
              value: currentValue,
              unit: text(payload.unit) ?? undefined,
              state: "observed",
            },
      forecast: [],
      classification: "UNCLASSIFIED",
      synthetic: false,
    },
    evidence: {
      id: evidenceId,
      title: `Runtime event ${id}`,
      sourceId: "runtime-operator",
      sourceLabel: "Fusarium operator state",
      sourceRef: `${OPERATOR_ENDPOINT}#natureos.events.${id}`,
      summary: `Science-plane event from ${sourceDevice}. Payload fields are preserved only when explicitly supplied.`,
      observedAt,
      receivedAt,
      confidence,
      confidenceLabel: confidenceLabel(confidence),
      freshness,
      staleAfterSeconds: EVENT_STALE_AFTER_SECONDS,
      freshnessBasis: "Event observation time; stale after 60 minutes.",
      lineage: ["Fusarium runtime science-event store", OPERATOR_ENDPOINT, "Situational Awareness runtime adapter"],
      classification: "UNCLASSIFIED",
      synthetic: false,
    },
  }
}

function normalizeTrack(
  value: unknown,
  index: number,
  receivedAt: string,
  nowMs: number,
): { object: EnvironmentalObject; evidence: EvidenceRecord } | null {
  const record = asRecord(value)
  if (!record || text(record.classification) !== "UNCLASSIFIED") return null
  const id = text(record.trackId, record.track_id, record.entityId, record.id) ?? `unidentified-track-${index + 1}`
  const observedAt = timestamp(record.observedAt, record.timestamp, record.updatedAt, record.lastSeen)
  const confidence = normalizedConfidence(record.confidence)
  const location = locationFromRecord(record)
  const evidenceId = `runtime-track:${id}`
  const freshness = freshnessFor(observedAt, EVENT_STALE_AFTER_SECONDS, nowMs)
  const domain = domainFromUnknown(record.domain ?? record.entityType ?? record.type)
  if (!domain) return null
  return {
    object: {
      id: `track:${id}`,
      kind: "track",
      name: text(record.name, record.label, record.entityType) ?? `Entity track ${id}`,
      domain,
      summary: text(record.summary, record.description) ?? "Runtime entity track; no narrative summary supplied.",
      locationLabel: location.label,
      position: location.position,
      observedAt,
      receivedAt,
      freshness,
      staleAfterSeconds: EVENT_STALE_AFTER_SECONDS,
      freshnessBasis: "Track observation time; stale after 60 minutes.",
      confidence,
      confidenceLabel: confidenceLabel(confidence),
      severity: severityFromUnknown(record.severity ?? record.status),
      trend: trendFromUnknown(record.trend),
      statusLabel: (text(record.status) ?? "TRACK").toUpperCase(),
      sourceIds: ["runtime-operator"],
      evidenceIds: [evidenceId],
      relationshipIds: [],
      missionConsequence: text(record.missionConsequence, record.mission_consequence),
      history: [],
      current: null,
      forecast: [],
      classification: "UNCLASSIFIED",
      synthetic: false,
    },
    evidence: {
      id: evidenceId,
      title: `Entity track ${id}`,
      sourceId: "runtime-operator",
      sourceLabel: "Fusarium IL track store",
      sourceRef: `${OPERATOR_ENDPOINT}#il.tracks.${id}`,
      summary: "Local IL entity-track record. MINDEX binding is not assumed from its presence.",
      observedAt,
      receivedAt,
      confidence,
      confidenceLabel: confidenceLabel(confidence),
      freshness,
      staleAfterSeconds: EVENT_STALE_AFTER_SECONDS,
      freshnessBasis: "Track observation time; stale after 60 minutes.",
      lineage: ["Fusarium local IL store", OPERATOR_ENDPOINT, "Situational Awareness runtime adapter"],
      classification: "UNCLASSIFIED",
      synthetic: false,
    },
  }
}

function normalizeFusion(
  value: unknown,
  receivedAt: string,
  nowMs: number,
): { object: EnvironmentalObject; evidence: EvidenceRecord } | null {
  const record = asRecord(value)
  if (!record || text(record.classification) !== "UNCLASSIFIED") return null
  const id = text(record.run_id, record.runId, record.id) ?? "latest"
  const observedAt = timestamp(record.timestamp, record.created_at, record.createdAt)
  const score = numberValue(record.threat_score, record.threatScore)
  const confidence = normalizedConfidence(record.confidence)
  const evidenceId = `runtime-fusion:${id}`
  const freshness = freshnessFor(observedAt, EVENT_STALE_AFTER_SECONDS, nowMs)
  return {
    object: {
      id: `fusion:${id}`,
      kind: "process",
      name: `Fusion assessment ${id}`,
      domain: "process",
      summary: "A runtime fusion assessment exists. Its score is shown as a score, never relabelled as confidence.",
      locationLabel: null,
      position: null,
      observedAt,
      receivedAt,
      freshness,
      staleAfterSeconds: EVENT_STALE_AFTER_SECONDS,
      freshnessBasis: "Fusion record time; stale after 60 minutes.",
      confidence,
      confidenceLabel: confidenceLabel(confidence),
      severity: "unknown",
      trend: "not_assessed",
      statusLabel: "FUSION RECORD",
      sourceIds: ["runtime-operator"],
      evidenceIds: [evidenceId],
      relationshipIds: [],
      missionConsequence: null,
      history: [],
      current: score === null ? null : { label: "Threat score", value: score, state: "observed" },
      forecast: [],
      classification: "UNCLASSIFIED",
      synthetic: false,
    },
    evidence: {
      id: evidenceId,
      title: `Fusion run ${id}`,
      sourceId: "runtime-operator",
      sourceLabel: "Fusarium fusion store",
      sourceRef: `${OPERATOR_ENDPOINT}#fusion.${id}`,
      summary: "Latest stored fusion payload; no ranked threat, causal claim, or mission effect is inferred beyond supplied fields.",
      observedAt,
      receivedAt,
      confidence,
      confidenceLabel: confidenceLabel(confidence),
      freshness,
      staleAfterSeconds: EVENT_STALE_AFTER_SECONDS,
      freshnessBasis: "Fusion record time; stale after 60 minutes.",
      lineage: ["Fusarium fusion store", OPERATOR_ENDPOINT, "Situational Awareness runtime adapter"],
      classification: "UNCLASSIFIED",
      synthetic: false,
    },
  }
}

function normalizeRelationships(
  values: unknown[],
  objects: readonly EnvironmentalObject[],
  evidence: readonly EvidenceRecord[],
): EnvironmentalRelationship[] {
  const objectIds = new Set(objects.map((object) => object.id))
  const availableEvidenceIds = new Set(evidence.map((item) => item.id))
  const rawIdToObjectId = new Map<string, string>()
  for (const object of objects) {
    rawIdToObjectId.set(object.id.replace(/^[^:]+:/, ""), object.id)
    rawIdToObjectId.set(object.id, object.id)
  }
  const relationships: EnvironmentalRelationship[] = []
  values.forEach((value, index) => {
    const record = asRecord(value)
    if (!record || text(record.classification) !== "UNCLASSIFIED") return
    const evidenceIds = asArray(record.evidenceIds ?? record.evidence_ids)
      .map((evidenceId) => text(evidenceId))
      .filter((evidenceId): evidenceId is string => Boolean(evidenceId) && availableEvidenceIds.has(evidenceId as string))
    if (evidenceIds.length === 0) return
    const entities = asArray(record.entities).map((entity) => text(entity)).filter(Boolean) as string[]
    const fromRaw = text(record.fromId, record.from_id, record.sourceId, record.source_id, entities[0])
    const toRaw = text(record.toId, record.to_id, record.targetId, record.target_id, entities[1])
    const fromId = fromRaw ? rawIdToObjectId.get(fromRaw) ?? fromRaw : null
    const toId = toRaw ? rawIdToObjectId.get(toRaw) ?? toRaw : null
    if (!fromId || !toId || !objectIds.has(fromId) || !objectIds.has(toId)) return
    const confidence = normalizedConfidence(record.confidence)
    relationships.push({
      id: text(record.correlationId, record.id) ?? `runtime-correlation-${index + 1}`,
      fromId,
      toId,
      type: text(record.type, record.relationship) ?? "correlates_with",
      label: text(record.label, record.summary) ?? "runtime correlation",
      confidence,
      evidenceIds,
      synthetic: false,
    })
  })
  return relationships
}

function domainStates(objects: readonly EnvironmentalObject[]): DomainState[] {
  return ENVIRONMENTAL_DOMAINS.map((id) => {
    const observed = objects.filter((object) => object.domain === id)
    const trends = new Set(observed.map((object) => object.trend).filter((trend) => trend !== "not_assessed"))
    return {
      id,
      label: DOMAIN_LABELS[id],
      observedObjectCount: observed.length,
      coverage: observed.length > 0 ? "observed" : "gap",
      trend: trends.size === 1 ? [...trends][0] : trends.size > 1 ? "mixed" : "not_assessed",
      samples: [],
      note:
        observed.length > 0
          ? `${observed.length} runtime record${observed.length === 1 ? "" : "s"}; no domain baseline contract is available.`
          : "No domain-specific record was supplied. This is a coverage gap, not a measured zero.",
    }
  })
}

function uniqueById<T extends { id: string }>(items: readonly T[]): T[] {
  const seen = new Set<string>()
  return items.filter((item) => {
    if (seen.has(item.id)) return false
    seen.add(item.id)
    return true
  })
}

export function buildRuntimeSnapshot(
  context: SituationalContext,
  devicesOutcome: RequestOutcome,
  operatorOutcome: RequestOutcome,
  nowMs = Date.now(),
): SituationalSnapshot {
  const generatedAt = new Date(nowMs).toISOString()
  const devicesSchemaValid = devicesOutcome.ok ? Array.isArray(devicesOutcome.payload) : null
  const operatorSchemaValid = operatorOutcome.ok ? asRecord(operatorOutcome.payload) !== null : null
  const operator = (operatorSchemaValid ? asRecord(operatorOutcome.payload) : null) as RuntimeOperatorState | null
  const rawNatureos = asRecord(operator?.natureos) ?? {}
  const rawIl = asRecord(operator?.il) ?? {}
  const rawDeviceRows = devicesSchemaValid ? asArray(devicesOutcome.payload) : []
  const rawNestedDeviceRows = asArray(rawNatureos.devices)
  const rawEventRows = asArray(rawNatureos.events)
  const rawTrackRows = asArray(rawIl.tracks)
  const rawCorrelationRows = asArray(rawIl.correlations)
  const rawOperatorLeafRows = [
    ...rawNestedDeviceRows,
    ...rawEventRows,
    ...rawTrackRows,
    ...rawCorrelationRows,
    ...(operator?.fusion ? [operator.fusion] : []),
  ]
  // The direct registry has no response envelope; every rendered leaf is checked below.
  const devicesClassificationAccepted = devicesSchemaValid === true ? true : null
  const operatorClassificationAccepted = operatorSchemaValid === true
    ? text(operator?.classification) === "UNCLASSIFIED"
    : null
  const deviceRows = devicesSchemaValid ? rawDeviceRows : []
  const nestedDeviceRows = operatorClassificationAccepted ? rawNestedDeviceRows : []
  const eventRows = operatorClassificationAccepted ? rawEventRows : []
  const trackRows = operatorClassificationAccepted ? rawTrackRows : []
  const correlationRows = operatorClassificationAccepted ? rawCorrelationRows : []

  const directDevices = deviceRows
    .map((value, index) =>
      normalizeDevice(value, index, devicesOutcome.receivedAt, nowMs, {
        id: "runtime-devices",
        label: "Fusarium device registry",
        refBase: DEVICES_ENDPOINT,
      }),
    )
    .filter(Boolean) as Array<{ object: EnvironmentalObject; evidence: EvidenceRecord }>
  const nestedDevices = nestedDeviceRows
    .map((value, index) =>
      normalizeDevice(value, index, operatorOutcome.receivedAt, nowMs, {
        id: "runtime-operator",
        label: "Fusarium operator state",
        refBase: `${OPERATOR_ENDPOINT}#natureos.devices`,
      }),
    )
    .filter(Boolean) as Array<{ object: EnvironmentalObject; evidence: EvidenceRecord }>
  const events = eventRows
    .map((value, index) => normalizeEvent(value, index, operatorOutcome.receivedAt, nowMs))
    .filter(Boolean) as Array<{ object: EnvironmentalObject; evidence: EvidenceRecord }>
  const tracks = trackRows
    .map((value, index) => normalizeTrack(value, index, operatorOutcome.receivedAt, nowMs))
    .filter(Boolean) as Array<{ object: EnvironmentalObject; evidence: EvidenceRecord }>
  const fusion = operatorClassificationAccepted
    ? normalizeFusion(operator?.fusion, operatorOutcome.receivedAt, nowMs)
    : null
  const normalized = [...directDevices, ...nestedDevices, ...events, ...tracks, ...(fusion ? [fusion] : [])]
  const objects = uniqueById(normalized.map((item) => item.object))
  const evidence = uniqueById(normalized.map((item) => item.evidence))
  const relationships = normalizeRelationships(correlationRows, objects, evidence)
  const sources = [
    sourceStatus(
      "runtime-devices",
      "Fusarium device registry",
      devicesOutcome,
      directDevices.length,
      devicesSchemaValid,
      devicesClassificationAccepted,
      latestObservedAt(normalized, "runtime-devices"),
    ),
    sourceStatus(
      "runtime-operator",
      "Fusarium operator state",
      operatorOutcome,
      nestedDevices.length + events.length + tracks.length + relationships.length + (fusion ? 1 : 0),
      operatorSchemaValid,
      operatorClassificationAccepted,
      latestObservedAt(normalized, "runtime-operator"),
    ),
  ]
  const declaredGaps = operatorClassificationAccepted
    ? asArray(operator?.honest_gaps).map((gap) => text(gap)).filter(Boolean) as string[]
    : []
  const inspectedRows = [...rawDeviceRows, ...rawOperatorLeafRows]
  const restrictedRecordCount = [
    ...inspectedRows,
  ].filter((value) => {
    const record = asRecord(value)
    const classification = record ? text(record.classification) : null
    return classification !== null && classification !== "UNCLASSIFIED"
  }).length
  const unmarkedRecordCount = inspectedRows.filter((value) => {
    const record = asRecord(value)
    return !record || text(record.classification) === null
  }).length
  const gaps = [
    ...declaredGaps,
    "Mission-area geometry and watch-area records are not present in this surface's currently bound Devices/operator responses.",
    "Durable /api/fusarium/v1 services exist in authoritative code; this legacy adapter has not bound a live v1 response or protected operator identity, so no durable v1 state is claimed.",
    "Environmental baselines, evidence objects, lineage graphs, history, and forecast are not present in the currently bound responses.",
    "Global OEI feeds are not queried without a real mission-area boundary; several legacy connectors have synthetic fallbacks.",
  ]
  if (restrictedRecordCount > 0) {
    gaps.unshift(`${restrictedRecordCount} non-UNCLASSIFIED runtime record(s) were withheld from this surface.`)
  }
  if (unmarkedRecordCount > 0) {
    gaps.unshift(`${unmarkedRecordCount} runtime record(s) without an explicit UNCLASSIFIED marking were withheld.`)
  }
  const classification = text(operator?.classification)
  if (operatorSchemaValid && classification !== "UNCLASSIFIED") {
    gaps.unshift("The operator response envelope was missing an accepted UNCLASSIFIED marking; its records were withheld.")
  }
  if (rawCorrelationRows.length > relationships.length && operatorClassificationAccepted) {
    gaps.unshift(`${rawCorrelationRows.length - relationships.length} correlation record(s) without usable evidence references were withheld.`)
  }

  const base: SituationalSnapshot = {
    schema: SITUATIONAL_AWARENESS_SCHEMA,
    context,
    generatedAt,
    condition: deriveCondition(sources, objects),
    classification: "UNCLASSIFIED",
    sources,
    objects,
    evidence,
    relationships,
    domains: domainStates(objects),
    watchAreas: [],
    watchConditions: [],
    gaps,
    note:
      objects.length > 0
        ? "Runtime records normalized without adding missing confidence, evidence, baseline, or forecast values."
        : "Bound responses were accepted with no environmental records. Empty does not mean environmentally clear.",
  }
  return context.dataMode === "demo" ? applySanitizedScenario(base, context, nowMs) : base
}

export const runtimeSituationalAwarenessProvider: SituationalAwarenessProvider = {
  async load(context, signal) {
    const [devices, operator] = await Promise.all([
      requestJson(DEVICES_ENDPOINT, signal),
      requestJson(OPERATOR_ENDPOINT, signal),
    ])
    return buildRuntimeSnapshot(context, devices, operator)
  },
}
