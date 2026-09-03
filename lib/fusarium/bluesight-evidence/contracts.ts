export const BLUESIGHT_EVIDENCE_SCHEMA = "fusarium-bluesight-evidence/v1" as const
export const BLUESIGHT_EVIDENCE_MAX_BYTES = 2 * 1024 * 1024
export const BLUESIGHT_EVIDENCE_MAX_RECORDS = 2_000

export const BLUESIGHT_MODALITIES = ["camera", "radar", "lidar", "wifi"] as const
export type BlueSightModality = (typeof BLUESIGHT_MODALITIES)[number]

export interface BlueSightEvidenceScope {
  deviceId: string
  missionId: string | null
  locationId: string | null
  environmentId: string | null
}

export interface BlueSightMeasurement {
  name: string
  value: string | number | boolean
  unit: string
}

export interface BlueSightEvidenceRecord {
  recordId: string
  modality: BlueSightModality
  scope: BlueSightEvidenceScope
  observedAt: string
  receivedAt: string
  measurements: BlueSightMeasurement[]
  provenance: {
    sourceRef: string
    sourceRecordId: string
    sourceRevision: string
    collectionId: string
    deviceIdentityField: string
    observedAtField: string
  }
  confidence: { value: number | null; basis: string }
  uncertainty: { value: number | null; unit: string | null; basis: string }
  classification: "UNCLASSIFIED"
}

export interface BlueSightEvidenceDataset {
  schema: typeof BLUESIGHT_EVIDENCE_SCHEMA
  mode: "REPLAY"
  datasetId: string
  title: string
  records: BlueSightEvidenceRecord[]
}

export interface BlueSightFusionFrame {
  frameId: string
  scope: BlueSightEvidenceScope
  observedAt: string
  collectionId: string
  sourceRevision: string
  modalities: BlueSightModality[]
  recordIds: string[]
  state: "correlated-evidence"
  statement: string
}

export interface BlueSightEvidenceValidation {
  ok: boolean
  state: "unbound" | "available" | "verified-empty" | "error"
  dataset: BlueSightEvidenceDataset | null
  issues: string[]
  rejectedRecordCount: number
  duplicateRecordCount: number
  fusionFrames: BlueSightFusionFrame[]
  message: string
}

const ID = /^[A-Za-z0-9][A-Za-z0-9._:/@+-]{0,159}$/
const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?(?:Z|[+-]\d{2}:\d{2})$/

function object(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value)
}

function text(value: unknown, max = 300): value is string {
  return typeof value === "string" && value.trim().length > 0 && value.length <= max && !/[\u0000-\u001f\u007f]/.test(value)
}

function identifier(value: unknown): value is string {
  return typeof value === "string" && ID.test(value)
}

function timestamp(value: unknown): value is string {
  return typeof value === "string" && ISO.test(value) && Number.isFinite(Date.parse(value))
}

function optionalIdentifier(value: unknown): value is string | null {
  return value === null || identifier(value)
}

function parseScope(value: unknown, path: string, issues: string[]): BlueSightEvidenceScope | null {
  if (!object(value)) {
    issues.push(`${path} must be an object.`)
    return null
  }
  if (!identifier(value.deviceId)) issues.push(`${path}.deviceId must be a stable identifier.`)
  for (const key of ["missionId", "locationId", "environmentId"] as const) {
    if (!optionalIdentifier(value[key])) issues.push(`${path}.${key} must be null or a stable identifier.`)
  }
  return identifier(value.deviceId)
    && optionalIdentifier(value.missionId)
    && optionalIdentifier(value.locationId)
    && optionalIdentifier(value.environmentId)
    ? {
        deviceId: value.deviceId,
        missionId: value.missionId,
        locationId: value.locationId,
        environmentId: value.environmentId,
      }
    : null
}

function parseMeasurements(value: unknown, path: string, issues: string[]): BlueSightMeasurement[] | null {
  if (!Array.isArray(value) || value.length === 0 || value.length > 100) {
    issues.push(`${path} must contain 1 to 100 unit-bearing measurements.`)
    return null
  }
  const parsed: BlueSightMeasurement[] = []
  const names = new Set<string>()
  value.forEach((entry, index) => {
    const itemPath = `${path}[${index}]`
    if (!object(entry) || !identifier(entry.name) || !text(entry.unit, 80)) {
      issues.push(`${itemPath} requires stable name and unit fields.`)
      return
    }
    if (names.has(entry.name)) {
      issues.push(`${itemPath}.name duplicates ${entry.name}.`)
      return
    }
    if (!["string", "number", "boolean"].includes(typeof entry.value)
      || (typeof entry.value === "number" && !Number.isFinite(entry.value))) {
      issues.push(`${itemPath}.value must be a finite scalar.`)
      return
    }
    names.add(entry.name)
    parsed.push({ name: entry.name, value: entry.value as string | number | boolean, unit: entry.unit })
  })
  return parsed.length === value.length ? parsed : null
}

function parseRecord(value: unknown, index: number, issues: string[]): BlueSightEvidenceRecord | null {
  const path = `records[${index}]`
  if (!object(value)) {
    issues.push(`${path} must be an object.`)
    return null
  }
  const local: string[] = []
  if (!identifier(value.recordId)) local.push(`${path}.recordId must be a stable identifier.`)
  if (!BLUESIGHT_MODALITIES.includes(value.modality as BlueSightModality)) local.push(`${path}.modality is unsupported.`)
  const scope = parseScope(value.scope, `${path}.scope`, local)
  if (!timestamp(value.observedAt)) local.push(`${path}.observedAt must be an ISO timestamp with an offset.`)
  if (!timestamp(value.receivedAt)) local.push(`${path}.receivedAt must be an ISO timestamp with an offset.`)
  if (timestamp(value.observedAt) && timestamp(value.receivedAt) && Date.parse(value.receivedAt) < Date.parse(value.observedAt)) {
    local.push(`${path}.receivedAt precedes observedAt.`)
  }
  const measurements = parseMeasurements(value.measurements, `${path}.measurements`, local)
  const provenance = value.provenance
  if (!object(provenance)) {
    local.push(`${path}.provenance must be an object.`)
  } else {
    for (const key of ["sourceRef", "sourceRecordId", "sourceRevision", "collectionId", "deviceIdentityField", "observedAtField"] as const) {
      if (!identifier(provenance[key])) local.push(`${path}.provenance.${key} must be a stable identifier.`)
    }
  }
  const confidence = value.confidence
  if (!object(confidence)
    || !(confidence.value === null || (typeof confidence.value === "number" && Number.isFinite(confidence.value) && confidence.value >= 0 && confidence.value <= 1))
    || !text(confidence.basis)) local.push(`${path}.confidence requires a null or 0..1 value and a basis.`)
  const uncertainty = value.uncertainty
  if (!object(uncertainty)
    || !(uncertainty.value === null || (typeof uncertainty.value === "number" && Number.isFinite(uncertainty.value) && uncertainty.value >= 0))
    || !(uncertainty.unit === null || text(uncertainty.unit, 80))
    || !text(uncertainty.basis)) local.push(`${path}.uncertainty is invalid.`)
  if (object(uncertainty) && uncertainty.value !== null && uncertainty.unit === null) local.push(`${path}.uncertainty.unit is required for a numeric value.`)
  if (value.classification !== "UNCLASSIFIED") local.push(`${path}.classification must be UNCLASSIFIED.`)
  issues.push(...local)
  if (local.length > 0 || !scope || !measurements || !object(provenance) || !object(confidence) || !object(uncertainty)) return null
  return {
    recordId: value.recordId as string,
    modality: value.modality as BlueSightModality,
    scope,
    observedAt: value.observedAt as string,
    receivedAt: value.receivedAt as string,
    measurements,
    provenance: provenance as BlueSightEvidenceRecord["provenance"],
    confidence: confidence as BlueSightEvidenceRecord["confidence"],
    uncertainty: uncertainty as BlueSightEvidenceRecord["uncertainty"],
    classification: "UNCLASSIFIED",
  }
}

function scopeKey(scope: BlueSightEvidenceScope): string {
  return [scope.deviceId, scope.missionId ?? "", scope.locationId ?? "", scope.environmentId ?? ""].join("|")
}

/** Correlation is evidentiary only. It never emits a track, target, identity, or detection. */
export function buildBlueSightFusionFrames(records: readonly BlueSightEvidenceRecord[]): BlueSightFusionFrame[] {
  const groups = new Map<string, BlueSightEvidenceRecord[]>()
  for (const record of records) {
    const key = [scopeKey(record.scope), record.observedAt, record.provenance.collectionId, record.provenance.sourceRevision].join("|")
    groups.set(key, [...(groups.get(key) ?? []), record])
  }
  return [...groups.values()].flatMap((group) => {
    const modalities = [...new Set(group.map((record) => record.modality))].sort() as BlueSightModality[]
    if (modalities.length < 2) return []
    const first = group[0]
    return [{
      frameId: `fusion:${first.provenance.collectionId}:${first.observedAt}`,
      scope: { ...first.scope },
      observedAt: first.observedAt,
      collectionId: first.provenance.collectionId,
      sourceRevision: first.provenance.sourceRevision,
      modalities,
      recordIds: group.map((record) => record.recordId).sort(),
      state: "correlated-evidence" as const,
      statement: "Records share exact scope, observation time, collection provenance, and source revision. This is correlation, not an inferred track or detection.",
    }]
  }).sort((a, b) => Date.parse(a.observedAt) - Date.parse(b.observedAt))
}

export function isolateBlueSightSelection(
  dataset: BlueSightEvidenceDataset,
  selected: { deviceId: string; sourceRevision?: string | null },
): BlueSightEvidenceDataset {
  const records = dataset.records.filter((record) => {
    if (record.scope.deviceId !== selected.deviceId) return false
    if (selected.sourceRevision && record.provenance.sourceRevision !== selected.sourceRevision) return false
    return true
  })
  return { ...dataset, records }
}

export function validateBlueSightEvidence(input: unknown): BlueSightEvidenceValidation {
  const issues: string[] = []
  if (!object(input)) return { ok: false, state: "error", dataset: null, issues: ["The import root must be an object."], rejectedRecordCount: 0, duplicateRecordCount: 0, fusionFrames: [], message: "Import rejected." }
  if (input.schema !== BLUESIGHT_EVIDENCE_SCHEMA) issues.push(`schema must equal ${BLUESIGHT_EVIDENCE_SCHEMA}.`)
  if (input.mode !== "REPLAY") issues.push("mode must be REPLAY; imported evidence is never silently treated as LIVE.")
  if (!identifier(input.datasetId)) issues.push("datasetId must be a stable identifier.")
  if (!text(input.title, 200)) issues.push("title is required and must be at most 200 characters.")
  if (!Array.isArray(input.records)) issues.push("records must be an array.")
  else if (input.records.length > BLUESIGHT_EVIDENCE_MAX_RECORDS) issues.push(`records exceeds the ${BLUESIGHT_EVIDENCE_MAX_RECORDS} record limit.`)
  const parsed: BlueSightEvidenceRecord[] = []
  if (Array.isArray(input.records) && input.records.length <= BLUESIGHT_EVIDENCE_MAX_RECORDS) {
    input.records.forEach((record, index) => {
      const value = parseRecord(record, index, issues)
      if (value) parsed.push(value)
    })
  }
  const deduped = new Map<string, BlueSightEvidenceRecord>()
  for (const record of parsed) {
    const key = `${record.scope.deviceId}|${record.modality}|${record.provenance.sourceRef}|${record.provenance.sourceRecordId}`
    if (!deduped.has(key)) deduped.set(key, record)
  }
  const duplicateRecordCount = parsed.length - deduped.size
  const records = [...deduped.values()].sort((a, b) => Date.parse(a.observedAt) - Date.parse(b.observedAt))
  const rejectedRecordCount = Array.isArray(input.records) ? input.records.length - parsed.length : 0
  if (issues.length > 0) return { ok: false, state: "error", dataset: null, issues, rejectedRecordCount, duplicateRecordCount, fusionFrames: [], message: "The entire import was rejected; no partial evidence was admitted." }
  const dataset: BlueSightEvidenceDataset = { schema: BLUESIGHT_EVIDENCE_SCHEMA, mode: "REPLAY", datasetId: input.datasetId as string, title: input.title as string, records }
  return {
    ok: true,
    state: records.length === 0 ? "verified-empty" : "available",
    dataset,
    issues: [],
    rejectedRecordCount,
    duplicateRecordCount,
    fusionFrames: buildBlueSightFusionFrames(records),
    message: records.length === 0 ? "The valid replay dataset contains no records." : "Replay evidence passed strict local validation.",
  }
}
