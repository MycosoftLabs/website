/**
 * Evidence-only contracts for the Fusarium Aerosol map workbench.
 *
 * This module is deliberately pure: it performs no network, credential,
 * persistence, clock, or device access. Callers supply the evaluation time and
 * may load only records that preserve classification, observation time, and
 * source provenance. A missing package is "unbound", never an empty atmosphere.
 */

export const AEROSOL_EVIDENCE_SCHEMA = "mycosoft.aerosol.evidence.v2" as const
export const AEROSOL_CLASSIFICATION = "UNCLASSIFIED" as const

export const AEROSOL_LAYER_IDS = [
  "sporebase",
  "sporebase-lab",
  "fungal-occurrence",
  "modeled-spore-dispersal",
  "particulate",
  "nasa-firms-fire",
  "smoke",
  "wind",
  "air-quality",
] as const

export type AerosolLayerId = (typeof AEROSOL_LAYER_IDS)[number]
export type AerosolLayerState = "unbound" | "loading" | "available" | "empty" | "stale" | "error"
export type AerosolEvidenceState = Exclude<AerosolLayerState, "unbound" | "loading">
export type AerosolEvidenceClass =
  | "device-telemetry"
  | "lab-identification"
  | "occurrence-observation"
  | "modeled-output"
  | "environmental-observation"

export const SPOREBASE_TAPE_DAYS = 30 as const
export const SPOREBASE_INTERVAL_MINUTES = 15 as const
export const SPOREBASE_INTERVALS_PER_TAPE = SPOREBASE_TAPE_DAYS * 24 * 60 / SPOREBASE_INTERVAL_MINUTES

export const SPOREBASE_LIVE_ENVIRONMENTAL_CHANNELS = [
  "voc",
  "particle_count",
  "pm1",
  "pm2_5",
  "pm10",
  "temperature",
  "humidity",
  "pressure",
  "gas_resistance",
  "iaq",
  "flow_rate",
  "battery",
] as const

export interface AerosolLayerDefinition {
  id: AerosolLayerId
  label: string
  shortLabel: string
  description: string
  color: string
  freshnessMs: number | null
  expectedProvider: string
  evidenceClass: AerosolEvidenceClass
  evidenceLabel: string
}

export const AEROSOL_LAYER_DEFINITIONS: readonly AerosolLayerDefinition[] = [
  {
    id: "sporebase",
    label: "SporeBase devices & environment",
    shortLabel: "SporeBase live",
    description: "Physical 30-day tape samplers and live VOC, particle, BME6xx environmental/gas, and device-health telemetry. Live telemetry never identifies a species or taxon.",
    color: "#5de6ff",
    freshnessMs: 30 * 60 * 1000,
    expectedProvider: "SporeBase / MAS passive read adapter",
    evidenceClass: "device-telemetry",
    evidenceLabel: "Device / live environment",
  },
  {
    id: "sporebase-lab",
    label: "SporeBase lab tape detections",
    shortLabel: "Lab tape IDs",
    description: "Delayed lab identifications backfilled to provenance-bearing 15-minute tape intervals after cassette removal and analysis.",
    color: "#ff9f43",
    freshnessMs: null,
    expectedProvider: "SporeBase laboratory results adapter",
    evidenceClass: "lab-identification",
    evidenceLabel: "Delayed lab identification",
  },
  {
    id: "fungal-occurrence",
    label: "Known fungal occurrence",
    shortLabel: "Fungal occurrence",
    description: "Georeferenced fungal or taxon occurrence records from the existing CREP/MINDEX, iNaturalist, or GBIF source chain. Occurrence does not establish airborne concentration.",
    color: "#62f6aa",
    freshnessMs: null,
    expectedProvider: "CREP / MINDEX / iNaturalist / GBIF occurrence adapter",
    evidenceClass: "occurrence-observation",
    evidenceLabel: "Observed occurrence",
  },
  {
    id: "modeled-spore-dispersal",
    label: "Modeled spore dispersal",
    shortLabel: "Modeled dispersal",
    description: "Explicit model output driven by qualified wind and meteorology. It is never presented as a direct spore detection.",
    color: "#c58cff",
    freshnessMs: 6 * 60 * 60 * 1000,
    expectedProvider: "Earth-2 / MAS qualified dispersal model",
    evidenceClass: "modeled-output",
    evidenceLabel: "Modeled output",
  },
  {
    id: "particulate",
    label: "Particulate matter",
    shortLabel: "Particles",
    description: "Measured PM and particle-count observations from bound, calibrated devices.",
    color: "#ffc46b",
    freshnessMs: 30 * 60 * 1000,
    expectedProvider: "BMV080 or qualified particulate adapter",
    evidenceClass: "environmental-observation",
    evidenceLabel: "Measured atmosphere",
  },
  {
    id: "nasa-firms-fire",
    label: "NASA FIRMS fire",
    shortLabel: "Fire",
    description: "Source-preserving thermal-anomaly records; no default intensity or confidence is inferred.",
    color: "#ff6b4a",
    freshnessMs: 12 * 60 * 60 * 1000,
    expectedProvider: "NASA FIRMS through a qualified read adapter",
    evidenceClass: "environmental-observation",
    evidenceLabel: "Observed fire",
  },
  {
    id: "smoke",
    label: "Smoke observations",
    shortLabel: "Smoke",
    description: "Observed smoke extents or points. Modeled plumes must identify the model and run time.",
    color: "#c9a7ff",
    freshnessMs: 6 * 60 * 60 * 1000,
    expectedProvider: "Qualified smoke observation or model adapter",
    evidenceClass: "environmental-observation",
    evidenceLabel: "Observed or qualified model",
  },
  {
    id: "wind",
    label: "Wind field",
    shortLabel: "Wind",
    description: "Observed or explicitly modeled wind vectors with run and valid times preserved.",
    color: "#66a8ff",
    freshnessMs: 60 * 60 * 1000,
    expectedProvider: "Qualified weather observation or forecast adapter",
    evidenceClass: "modeled-output",
    evidenceLabel: "Observed or modeled meteorology",
  },
  {
    id: "air-quality",
    label: "Air quality",
    shortLabel: "Air quality",
    description: "Station measurements for PM, ozone, gases, or AQI with original units retained.",
    color: "#f4e45c",
    freshnessMs: 2 * 60 * 60 * 1000,
    expectedProvider: "MINDEX / OpenAQ / AirNow qualified read adapter",
    evidenceClass: "environmental-observation",
    evidenceLabel: "Measured atmosphere",
  },
] as const

export const AEROSOL_LAYER_GROUPS = [
  { id: "sporebase-live", label: "SporeBase device / live environment", layerIds: ["sporebase"] },
  { id: "sporebase-lab", label: "Delayed laboratory identification", layerIds: ["sporebase-lab"] },
  { id: "occurrence", label: "Known occurrence", layerIds: ["fungal-occurrence"] },
  { id: "modeled-biology", label: "Modeled aerobiology", layerIds: ["modeled-spore-dispersal"] },
  { id: "atmosphere", label: "Atmosphere & hazards", layerIds: ["particulate", "nasa-firms-fire", "smoke", "wind", "air-quality"] },
] as const satisfies readonly { id: string; label: string; layerIds: readonly AerosolLayerId[] }[]

export interface AerosolMeasurement {
  value: number | string | boolean
  unit: string | null
  quality: "measured" | "reported" | "derived"
}

export interface AerosolRecordProvenance {
  provider: string
  sourceRef: string
  sourceRecordId: string
  receivedAt: string
  licenseRef: string | null
  transformRefs: readonly string[]
  synthetic: false
}

export interface AerosolEvidenceRecord {
  recordId: string
  layerId: AerosolLayerId
  classification: typeof AEROSOL_CLASSIFICATION
  title: string
  category: string | null
  evidenceClass: AerosolEvidenceClass
  observedAt: string
  interval: {
    startAt: string
    endAt: string
    index: number
    intervalMinutes: typeof SPOREBASE_INTERVAL_MINUTES
  } | null
  reportedAt: string | null
  coordinates: readonly [number, number]
  altitudeM: number | null
  measurements: Readonly<Record<string, AerosolMeasurement>>
  confidence: number | null
  provenance: AerosolRecordProvenance
}

export interface AerosolLayerEvidence {
  layerId: AerosolLayerId
  state: AerosolEvidenceState
  provider: string
  sourceRef: string
  completedAt: string
  upstreamStatus: number | null
  reason: string | null
  recordIds: readonly string[]
  synthetic: false
}

export interface AerosolEvidenceDataset {
  schema: typeof AEROSOL_EVIDENCE_SCHEMA
  datasetId: string
  classification: typeof AEROSOL_CLASSIFICATION
  createdAt: string
  readOnly: true
  synthetic: false
  layers: readonly AerosolLayerEvidence[]
  records: readonly AerosolEvidenceRecord[]
}

export interface AerosolLayerRuntime {
  layerId: AerosolLayerId
  state: AerosolLayerState
  count: number
  provider: string | null
  sourceRef: string | null
  latestObservedAt: string | null
  reason: string
}

export type AerosolValidationResult =
  | { ok: true; value: AerosolEvidenceDataset }
  | { ok: false; issues: string[] }

interface GeoJsonFeatureCollection {
  type: "FeatureCollection"
  name?: unknown
  classification?: unknown
  features: unknown[]
}

const LAYER_ID_SET = new Set<string>(AEROSOL_LAYER_IDS)

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function nonEmpty(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0
}

function validIso(value: unknown): value is string {
  return typeof value === "string" && Number.isFinite(Date.parse(value))
}

function validLayerId(value: unknown): value is AerosolLayerId {
  return typeof value === "string" && LAYER_ID_SET.has(value)
}

function validSourceRef(value: unknown): value is string {
  if (!nonEmpty(value)) return false
  if (/^https?:\/\//i.test(value)) return false
  return value.startsWith("/api/") || value.startsWith("file:") || value.startsWith("urn:")
}

function validateMeasurement(name: string, raw: unknown, issues: string[]): AerosolMeasurement | null {
  if (!isObject(raw)) {
    issues.push(`${name} must be an object with value, unit, and quality.`)
    return null
  }
  const value = raw.value
  if (!["number", "string", "boolean"].includes(typeof value)) {
    issues.push(`${name}.value must be a number, string, or boolean.`)
    return null
  }
  if (typeof value === "number" && !Number.isFinite(value)) {
    issues.push(`${name}.value must be finite.`)
    return null
  }
  if (raw.unit !== null && typeof raw.unit !== "string") {
    issues.push(`${name}.unit must be a string or null.`)
    return null
  }
  if (!(["measured", "reported", "derived"] as unknown[]).includes(raw.quality)) {
    issues.push(`${name}.quality must be measured, reported, or derived.`)
    return null
  }
  return {
    value: value as number | string | boolean,
    unit: raw.unit as string | null,
    quality: raw.quality as AerosolMeasurement["quality"],
  }
}

function validateMeasurements(raw: unknown, prefix: string, issues: string[]) {
  if (!isObject(raw) || Object.keys(raw).length === 0) {
    issues.push(`${prefix}.measurements must contain at least one supplied measurement.`)
    return null
  }
  const measurements: Record<string, AerosolMeasurement> = {}
  for (const [name, value] of Object.entries(raw)) {
    if (!name.trim()) {
      issues.push(`${prefix}.measurements contains an empty metric name.`)
      continue
    }
    const measurement = validateMeasurement(`${prefix}.measurements.${name}`, value, issues)
    if (measurement) measurements[name] = measurement
  }
  return Object.keys(measurements).length > 0 ? measurements : null
}

function validateCoordinates(raw: unknown, prefix: string, issues: string[]): readonly [number, number] | null {
  if (!Array.isArray(raw) || raw.length < 2) {
    issues.push(`${prefix} must be a longitude/latitude coordinate pair.`)
    return null
  }
  const longitude = Number(raw[0])
  const latitude = Number(raw[1])
  if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
    issues.push(`${prefix} longitude must be between -180 and 180.`)
    return null
  }
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
    issues.push(`${prefix} latitude must be between -90 and 90.`)
    return null
  }
  return [longitude, latitude]
}

const SPECIES_IDENTIFICATION_FIELD = /(?:^|[_\s-])(species|taxon|scientific[_\s-]?name|identification)(?:$|[_\s-])/i

function validateInterval(
  raw: unknown,
  prefix: string,
  required: boolean,
  issues: string[],
): AerosolEvidenceRecord["interval"] {
  if (raw == null) {
    if (required) issues.push(`${prefix} is required for a SporeBase lab identification.`)
    return null
  }
  if (!isObject(raw)) {
    issues.push(`${prefix} must contain startAt, endAt, index, and intervalMinutes.`)
    return null
  }
  const startAt = validIso(raw.startAt) ? new Date(raw.startAt).toISOString() : null
  const endAt = validIso(raw.endAt) ? new Date(raw.endAt).toISOString() : null
  const index = Number(raw.index)
  const intervalMinutes = Number(raw.intervalMinutes)
  if (!startAt) issues.push(`${prefix}.startAt must be an ISO timestamp.`)
  if (!endAt) issues.push(`${prefix}.endAt must be an ISO timestamp.`)
  if (!Number.isInteger(index) || index < 0 || index >= SPOREBASE_INTERVALS_PER_TAPE) {
    issues.push(`${prefix}.index must be a 0-${SPOREBASE_INTERVALS_PER_TAPE - 1} tape interval index.`)
  }
  if (intervalMinutes !== SPOREBASE_INTERVAL_MINUTES) {
    issues.push(`${prefix}.intervalMinutes must be ${SPOREBASE_INTERVAL_MINUTES}.`)
  }
  if (startAt && endAt && Date.parse(endAt) - Date.parse(startAt) !== SPOREBASE_INTERVAL_MINUTES * 60_000) {
    issues.push(`${prefix} must span exactly ${SPOREBASE_INTERVAL_MINUTES} minutes.`)
  }
  if (!startAt || !endAt || !Number.isInteger(index) || index < 0 || index >= SPOREBASE_INTERVALS_PER_TAPE || intervalMinutes !== SPOREBASE_INTERVAL_MINUTES) {
    return null
  }
  return { startAt, endAt, index, intervalMinutes: SPOREBASE_INTERVAL_MINUTES }
}

function validateRecord(raw: unknown, index: number, issues: string[]): AerosolEvidenceRecord | null {
  const prefix = `records[${index}]`
  if (!isObject(raw)) {
    issues.push(`${prefix} must be an object.`)
    return null
  }
  const provenance = isObject(raw.provenance) ? raw.provenance : null
  const coordinates = validateCoordinates(raw.coordinates, `${prefix}.coordinates`, issues)
  const measurements = validateMeasurements(raw.measurements, prefix, issues)
  const layerId = validLayerId(raw.layerId) ? raw.layerId : null
  const definition = layerId ? AEROSOL_LAYER_DEFINITIONS.find((item) => item.id === layerId) ?? null : null
  const interval = validateInterval(raw.interval, `${prefix}.interval`, layerId === "sporebase-lab", issues)
  const reportedAt = raw.reportedAt == null
    ? null
    : validIso(raw.reportedAt)
      ? new Date(raw.reportedAt).toISOString()
      : null
  if (!nonEmpty(raw.recordId)) issues.push(`${prefix}.recordId is required.`)
  if (!validLayerId(raw.layerId)) issues.push(`${prefix}.layerId is not a supported Aerosol layer.`)
  if (raw.classification !== AEROSOL_CLASSIFICATION) issues.push(`${prefix}.classification must be UNCLASSIFIED.`)
  if (!nonEmpty(raw.title)) issues.push(`${prefix}.title is required.`)
  if (!validIso(raw.observedAt)) issues.push(`${prefix}.observedAt must be an ISO timestamp.`)
  if (raw.reportedAt != null && !reportedAt) issues.push(`${prefix}.reportedAt must be an ISO timestamp or null.`)
  if (raw.altitudeM !== null && (typeof raw.altitudeM !== "number" || !Number.isFinite(raw.altitudeM))) {
    issues.push(`${prefix}.altitudeM must be finite or null.`)
  }
  if (raw.confidence !== null && (typeof raw.confidence !== "number" || !Number.isFinite(raw.confidence) || raw.confidence < 0 || raw.confidence > 1)) {
    issues.push(`${prefix}.confidence must be null or between 0 and 1.`)
  }
  if (!provenance) {
    issues.push(`${prefix}.provenance is required.`)
  } else {
    if (!nonEmpty(provenance.provider)) issues.push(`${prefix}.provenance.provider is required.`)
    if (!validSourceRef(provenance.sourceRef)) issues.push(`${prefix}.provenance.sourceRef must be a same-origin API, file, or URN reference.`)
    if (!nonEmpty(provenance.sourceRecordId)) issues.push(`${prefix}.provenance.sourceRecordId is required.`)
    if (!validIso(provenance.receivedAt)) issues.push(`${prefix}.provenance.receivedAt must be an ISO timestamp.`)
    if (provenance.licenseRef !== null && typeof provenance.licenseRef !== "string") issues.push(`${prefix}.provenance.licenseRef must be a string or null.`)
    if (!Array.isArray(provenance.transformRefs) || provenance.transformRefs.some((item) => typeof item !== "string")) {
      issues.push(`${prefix}.provenance.transformRefs must be a string array.`)
    }
    if (provenance.synthetic !== false) issues.push(`${prefix}.provenance.synthetic must be false.`)
  }
  if (layerId === "sporebase") {
    const liveSemantics = [
      typeof raw.title === "string" ? raw.title : "",
      typeof raw.category === "string" ? raw.category : "",
      ...Object.keys(measurements ?? {}),
    ].join(" ")
    if (SPECIES_IDENTIFICATION_FIELD.test(liveSemantics)) {
      issues.push(`${prefix} cannot present a species or taxon identification as live SporeBase telemetry.`)
    }
  }
  if (layerId === "sporebase-lab") {
    const identificationKeys = Object.keys(measurements ?? {}).filter((name) => SPECIES_IDENTIFICATION_FIELD.test(name))
    if (identificationKeys.length === 0) {
      issues.push(`${prefix}.measurements must include a reported species/taxon identification for a lab tape detection.`)
    }
    if (!reportedAt) issues.push(`${prefix}.reportedAt is required for a delayed lab identification.`)
    if (interval && validIso(raw.observedAt)) {
      const observedMs = Date.parse(raw.observedAt)
      if (observedMs < Date.parse(interval.startAt) || observedMs > Date.parse(interval.endAt)) {
        issues.push(`${prefix}.observedAt must fall within the indexed tape interval.`)
      }
      if (reportedAt && Date.parse(reportedAt) < Date.parse(interval.endAt)) {
        issues.push(`${prefix}.reportedAt cannot precede the physical tape interval.`)
      }
    }
  }
  if (
    !coordinates ||
    !measurements ||
    !nonEmpty(raw.recordId) ||
    !validLayerId(raw.layerId) ||
    raw.classification !== AEROSOL_CLASSIFICATION ||
    !nonEmpty(raw.title) ||
    !validIso(raw.observedAt) ||
    !provenance ||
    !nonEmpty(provenance.provider) ||
    !validSourceRef(provenance.sourceRef) ||
    !nonEmpty(provenance.sourceRecordId) ||
    !validIso(provenance.receivedAt) ||
    provenance.synthetic !== false
  ) return null

  return {
    recordId: raw.recordId,
    layerId: raw.layerId,
    classification: AEROSOL_CLASSIFICATION,
    title: raw.title,
    category: typeof raw.category === "string" ? raw.category : null,
    evidenceClass: definition!.evidenceClass,
    observedAt: raw.observedAt,
    interval,
    reportedAt,
    coordinates,
    altitudeM: raw.altitudeM === null ? null : Number(raw.altitudeM),
    measurements,
    confidence: raw.confidence === null ? null : Number(raw.confidence),
    provenance: {
      provider: provenance.provider,
      sourceRef: provenance.sourceRef,
      sourceRecordId: provenance.sourceRecordId,
      receivedAt: provenance.receivedAt,
      licenseRef: typeof provenance.licenseRef === "string" ? provenance.licenseRef : null,
      transformRefs: Array.isArray(provenance.transformRefs) ? provenance.transformRefs as string[] : [],
      synthetic: false,
    },
  }
}

function validateLayerEvidence(raw: unknown, index: number, issues: string[]): AerosolLayerEvidence | null {
  const prefix = `layers[${index}]`
  if (!isObject(raw)) {
    issues.push(`${prefix} must be an object.`)
    return null
  }
  if (!validLayerId(raw.layerId)) issues.push(`${prefix}.layerId is not supported.`)
  if (!(["available", "empty", "stale", "error"] as unknown[]).includes(raw.state)) issues.push(`${prefix}.state is invalid.`)
  if (!nonEmpty(raw.provider)) issues.push(`${prefix}.provider is required.`)
  if (!validSourceRef(raw.sourceRef)) issues.push(`${prefix}.sourceRef must be a same-origin API, file, or URN reference.`)
  if (!validIso(raw.completedAt)) issues.push(`${prefix}.completedAt must be an ISO timestamp.`)
  if (raw.upstreamStatus !== null && (!Number.isInteger(raw.upstreamStatus) || Number(raw.upstreamStatus) < 100 || Number(raw.upstreamStatus) > 599)) {
    issues.push(`${prefix}.upstreamStatus must be null or a valid HTTP status.`)
  }
  if (!Array.isArray(raw.recordIds) || raw.recordIds.some((item) => !nonEmpty(item))) issues.push(`${prefix}.recordIds must be a string array.`)
  if (raw.synthetic !== false) issues.push(`${prefix}.synthetic must be false.`)
  const state = raw.state as AerosolEvidenceState
  const recordIds = Array.isArray(raw.recordIds) ? raw.recordIds.filter(nonEmpty) : []
  if ((state === "available" || state === "stale") && recordIds.length === 0) issues.push(`${prefix}.${state} requires recordIds.`)
  if ((state === "empty" || state === "error") && recordIds.length > 0) issues.push(`${prefix}.${state} cannot claim records.`)
  if (state === "empty" && (typeof raw.upstreamStatus !== "number" || raw.upstreamStatus < 200 || raw.upstreamStatus >= 300)) {
    issues.push(`${prefix}.empty requires a successful 2xx upstreamStatus.`)
  }
  if ((state === "empty" || state === "error") && !nonEmpty(raw.reason)) issues.push(`${prefix}.${state} requires a reason.`)
  if (
    !validLayerId(raw.layerId) ||
    !(["available", "empty", "stale", "error"] as unknown[]).includes(raw.state) ||
    !nonEmpty(raw.provider) ||
    !validSourceRef(raw.sourceRef) ||
    !validIso(raw.completedAt) ||
    raw.synthetic !== false
  ) return null
  return {
    layerId: raw.layerId,
    state,
    provider: raw.provider,
    sourceRef: raw.sourceRef,
    completedAt: raw.completedAt,
    upstreamStatus: typeof raw.upstreamStatus === "number" ? raw.upstreamStatus : null,
    reason: typeof raw.reason === "string" ? raw.reason : null,
    recordIds,
    synthetic: false,
  }
}

function validateDataset(raw: Record<string, unknown>): AerosolValidationResult {
  const issues: string[] = []
  if (raw.schema !== AEROSOL_EVIDENCE_SCHEMA) issues.push(`schema must be ${AEROSOL_EVIDENCE_SCHEMA}.`)
  if (!nonEmpty(raw.datasetId)) issues.push("datasetId is required.")
  if (raw.classification !== AEROSOL_CLASSIFICATION) issues.push("classification must be UNCLASSIFIED.")
  if (!validIso(raw.createdAt)) issues.push("createdAt must be an ISO timestamp.")
  if (raw.readOnly !== true) issues.push("readOnly must be true.")
  if (raw.synthetic !== false) issues.push("synthetic must be false.")
  if (!Array.isArray(raw.layers)) issues.push("layers must be an array.")
  if (!Array.isArray(raw.records)) issues.push("records must be an array.")
  const records = Array.isArray(raw.records)
    ? raw.records.map((item, index) => validateRecord(item, index, issues)).filter((item): item is AerosolEvidenceRecord => item !== null)
    : []
  const layers = Array.isArray(raw.layers)
    ? raw.layers.map((item, index) => validateLayerEvidence(item, index, issues)).filter((item): item is AerosolLayerEvidence => item !== null)
    : []
  const recordIds = new Set<string>()
  for (const record of records) {
    if (recordIds.has(record.recordId)) issues.push(`duplicate recordId: ${record.recordId}.`)
    recordIds.add(record.recordId)
  }
  const layerIds = new Set<AerosolLayerId>()
  for (const layer of layers) {
    if (layerIds.has(layer.layerId)) issues.push(`duplicate layer evidence: ${layer.layerId}.`)
    layerIds.add(layer.layerId)
    for (const recordId of layer.recordIds) {
      const record = records.find((item) => item.recordId === recordId)
      if (!record) issues.push(`${layer.layerId} references missing record ${recordId}.`)
      else if (record.layerId !== layer.layerId) issues.push(`${recordId} does not belong to ${layer.layerId}.`)
    }
  }
  for (const record of records) {
    const owner = layers.find((layer) => layer.layerId === record.layerId)
    if (!owner || !owner.recordIds.includes(record.recordId)) issues.push(`${record.recordId} is not covered by its layer evidence.`)
  }
  if (issues.length > 0 || !nonEmpty(raw.datasetId) || !validIso(raw.createdAt)) return { ok: false, issues }
  return {
    ok: true,
    value: {
      schema: AEROSOL_EVIDENCE_SCHEMA,
      datasetId: raw.datasetId,
      classification: AEROSOL_CLASSIFICATION,
      createdAt: raw.createdAt,
      readOnly: true,
      synthetic: false,
      layers,
      records,
    },
  }
}

function fromFeatureCollection(raw: GeoJsonFeatureCollection, evaluatedAt: string): AerosolValidationResult {
  const issues: string[] = []
  if (raw.classification !== AEROSOL_CLASSIFICATION) issues.push("GeoJSON classification must be UNCLASSIFIED.")
  if (!validIso(evaluatedAt)) issues.push("evaluatedAt must be an ISO timestamp.")
  const records: AerosolEvidenceRecord[] = []
  raw.features.forEach((featureRaw, index) => {
    const prefix = `features[${index}]`
    if (!isObject(featureRaw) || featureRaw.type !== "Feature") {
      issues.push(`${prefix} must be a GeoJSON Feature.`)
      return
    }
    const geometry = isObject(featureRaw.geometry) ? featureRaw.geometry : null
    const properties = isObject(featureRaw.properties) ? featureRaw.properties : null
    if (!geometry || geometry.type !== "Point") {
      issues.push(`${prefix}.geometry must be a Point.`)
      return
    }
    if (!properties) {
      issues.push(`${prefix}.properties is required.`)
      return
    }
    const record = validateRecord({
      ...properties,
      recordId: properties.recordId ?? featureRaw.id,
      classification: properties.classification ?? raw.classification,
      coordinates: geometry.coordinates,
      altitudeM: properties.altitudeM ?? null,
      category: properties.category ?? null,
      confidence: properties.confidence ?? null,
    }, index, issues)
    if (record) records.push(record)
  })
  if (raw.features.length === 0) issues.push("A zero-feature import is not evidence of atmospheric absence. Use a completed empty layer assertion instead.")
  if (issues.length > 0) return { ok: false, issues }
  const layers: AerosolLayerEvidence[] = []
  for (const layerId of AEROSOL_LAYER_IDS) {
    const layerRecords = records.filter((record) => record.layerId === layerId)
    if (layerRecords.length === 0) continue
    const latest = layerRecords.reduce((current, record) => Date.parse(record.observedAt) > Date.parse(current.observedAt) ? record : current)
    const definition = AEROSOL_LAYER_DEFINITIONS.find((item) => item.id === layerId)!
    const stale = definition.freshnessMs != null &&
      Date.parse(evaluatedAt) - Date.parse(latest.observedAt) > definition.freshnessMs
    layers.push({
      layerId,
      state: stale ? "stale" : "available",
      provider: layerRecords[0].provenance.provider,
      sourceRef: layerRecords[0].provenance.sourceRef,
      completedAt: evaluatedAt,
      upstreamStatus: null,
      reason: stale ? "Imported observations exceed the layer freshness window." : null,
      recordIds: layerRecords.map((record) => record.recordId),
      synthetic: false,
    })
  }
  return {
    ok: true,
    value: {
      schema: AEROSOL_EVIDENCE_SCHEMA,
      datasetId: nonEmpty(raw.name) ? raw.name : "operator-geojson-import",
      classification: AEROSOL_CLASSIFICATION,
      createdAt: evaluatedAt,
      readOnly: true,
      synthetic: false,
      layers,
      records,
    },
  }
}

export function validateAerosolEvidence(raw: unknown, evaluatedAt: string): AerosolValidationResult {
  if (!isObject(raw)) return { ok: false, issues: ["Evidence input must be a JSON object."] }
  if (raw.type === "FeatureCollection" && Array.isArray(raw.features)) {
    return fromFeatureCollection(raw as unknown as GeoJsonFeatureCollection, evaluatedAt)
  }
  return validateDataset(raw)
}

export function aerosolLayerRuntimes(dataset: AerosolEvidenceDataset | null): readonly AerosolLayerRuntime[] {
  return AEROSOL_LAYER_DEFINITIONS.map((definition) => {
    const evidence = dataset?.layers.find((item) => item.layerId === definition.id)
    if (!evidence) {
      return {
        layerId: definition.id,
        state: "unbound",
        count: 0,
        provider: null,
        sourceRef: null,
        latestObservedAt: null,
        reason: `${definition.expectedProvider} is not bound to this browser session.`,
      }
    }
    const records = dataset!.records.filter((record) => evidence.recordIds.includes(record.recordId))
    const latestObservedAt = records.length > 0
      ? records.reduce((latest, record) => Date.parse(record.observedAt) > Date.parse(latest) ? record.observedAt : latest, records[0].observedAt)
      : null
    return {
      layerId: definition.id,
      state: evidence.state,
      count: records.length,
      provider: evidence.provider,
      sourceRef: evidence.sourceRef,
      latestObservedAt,
      reason: evidence.reason ?? (evidence.state === "available" ? "Verified records are available." : `Layer state: ${evidence.state}.`),
    }
  })
}

export interface AerosolRecordFilter {
  enabledLayers: readonly AerosolLayerId[]
  earliestObservedAt: string | null
  query: string
}

export function filterAerosolRecords(
  records: readonly AerosolEvidenceRecord[],
  filter: AerosolRecordFilter,
): readonly AerosolEvidenceRecord[] {
  const enabled = new Set(filter.enabledLayers)
  const earliestMs = filter.earliestObservedAt == null ? null : Date.parse(filter.earliestObservedAt)
  const query = filter.query.trim().toLowerCase()
  return records.filter((record) => {
    if (!enabled.has(record.layerId)) return false
    if (earliestMs != null && Date.parse(record.observedAt) < earliestMs) return false
    if (!query) return true
    const haystack = [
      record.title,
      record.category ?? "",
      record.provenance.provider,
      record.provenance.sourceRecordId,
      ...Object.keys(record.measurements),
    ].join(" ").toLowerCase()
    return haystack.includes(query)
  })
}

export interface AerosolMapFeatureCollection {
  type: "FeatureCollection"
  features: Array<{
    type: "Feature"
    id: string
    geometry: { type: "Point"; coordinates: [number, number] }
    properties: {
      recordId: string
      layerId: AerosolLayerId
      title: string
      observedAt: string
      color: string
    }
  }>
}

export function aerosolRecordsToGeoJson(records: readonly AerosolEvidenceRecord[]): AerosolMapFeatureCollection {
  return {
    type: "FeatureCollection",
    features: records.map((record) => ({
      type: "Feature",
      id: record.recordId,
      geometry: { type: "Point", coordinates: [record.coordinates[0], record.coordinates[1]] },
      properties: {
        recordId: record.recordId,
        layerId: record.layerId,
        title: record.title,
        observedAt: record.observedAt,
        color: AEROSOL_LAYER_DEFINITIONS.find((item) => item.id === record.layerId)!.color,
      },
    })),
  }
}
