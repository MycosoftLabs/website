export const GANDHA_DATASET_SCHEMA = "mycosoft.gandha.dataset.v1" as const
export const GANDHA_FEATURE_CONTRACT = "mycosoft.gandha.features.v1" as const
export const GANDHA_LOCAL_MODEL_SCHEMA = "mycosoft.gandha.local-centroid-model.v1" as const
export const GANDHA_MAX_SAMPLES = 100_000

export interface GandhaSensorContract {
  family: string
  deviceId: string | null
  firmwareVersion: string | null
}

export interface GandhaSample {
  sampleId: string
  observedAt: string
  channels: Record<string, number>
  label: string | null
  temperatureC: number | null
  humidityPct: number | null
  pressureHpa: number | null
}

export interface GandhaDataset {
  schema: typeof GANDHA_DATASET_SCHEMA
  datasetId: string
  createdAt: string
  sensor: GandhaSensorContract
  channelUnits: Record<string, string>
  samples: GandhaSample[]
  provenance: {
    source: "file_import" | "local_capture"
    notes: string | null
  }
  sourceCompatibility?: GandhaSourceCompatibility
}

export interface GandhaSourceCompatibility {
  vendor: "Bosch Sensortec"
  format: "bosch-bmerawdata" | "bosch-bmespecimen"
  sourceFileName: string | null
  appVersion: string | null
  boardType: string | null
  boardId: string | null
  firmwareVersion: string | null
  heaterProfileIds: string[]
  dutyCycleProfileIds: string[]
  skippedErrorRows: number
  droppedIncompleteCycles: number
}

export interface GandhaDatasetSummary {
  datasetId: string
  sampleCount: number
  labeledCount: number
  unlabeledCount: number
  channelNames: string[]
  sensorFamily: string
  firstObservedAt: string | null
  lastObservedAt: string | null
}

export type GandhaTrainingJobState =
  | "unbound"
  | "draft"
  | "queued"
  | "running"
  | "succeeded"
  | "failed"
  | "cancelled"

export interface GandhaTrainingJob {
  jobId: string | null
  state: GandhaTrainingJobState
  providerRef: string | null
  datasetId: string | null
  createdAt: string | null
  updatedAt: string | null
  message: string
}

export interface GandhaModelProvenance {
  modelId: string
  version: string
  algorithm: string
  trainedAt: string
  datasetId: string
  featureContract: typeof GANDHA_FEATURE_CONTRACT
  artifactSha256: string
  registryVerified: true
}

export interface GandhaInferenceEvidence {
  state: "unbound" | "verified" | "error"
  prediction: string | null
  confidence: number | null
  inferredAt: string | null
  model: GandhaModelProvenance | null
  message: string
}

export interface GandhaLocalCentroidModel {
  schema: typeof GANDHA_LOCAL_MODEL_SCHEMA
  algorithm: "zscore-nearest-centroid"
  datasetId: string
  createdAt: string
  channels: string[]
  normalization: Record<string, { mean: number; standardDeviation: number }>
  classes: Array<{ label: string; sampleCount: number; centroid: number[] }>
  trainingSampleIds: string[]
  provenance: {
    localOnly: true
    providerRef: null
    registryVerified: false
    calibratedProbability: false
  }
}

export interface GandhaLocalPrediction {
  label: string
  distance: number
  relativeSeparation: number
  seenDuringTraining: boolean
  message: string
}

export type GandhaValidationResult<T> =
  | { ok: true; value: T; issues: [] }
  | { ok: false; value: null; issues: string[] }

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null
}

function finite(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null
}

function timestamp(value: unknown): string | null {
  const candidate = text(value)
  return candidate && !Number.isNaN(Date.parse(candidate)) ? candidate : null
}

function nullableFinite(record: Record<string, unknown>, key: string, issues: string[], path: string): number | null {
  const raw = record[key]
  if (raw === undefined || raw === null) return null
  const parsed = finite(raw)
  if (parsed === null) issues.push(`${path}.${key} must be a finite number or null.`)
  return parsed
}

function parseSample(value: unknown, index: number, units: Record<string, string>, issues: string[]): GandhaSample | null {
  const path = `samples[${index}]`
  if (!isRecord(value)) {
    issues.push(`${path} must be an object.`)
    return null
  }
  const sampleId = text(value.sampleId)
  const observedAt = timestamp(value.observedAt)
  if (!sampleId) issues.push(`${path}.sampleId is required.`)
  if (!observedAt) issues.push(`${path}.observedAt must be an ISO-compatible timestamp.`)
  if (!isRecord(value.channels)) {
    issues.push(`${path}.channels must be an object of finite numeric readings.`)
    return null
  }

  const channels: Record<string, number> = {}
  const channelEntries = Object.entries(value.channels)
  if (channelEntries.length === 0) issues.push(`${path}.channels must contain at least one reading.`)
  if (channelEntries.length > 64) issues.push(`${path}.channels exceeds the 64-channel contract limit.`)
  for (const [name, raw] of channelEntries) {
    if (!/^[A-Za-z][A-Za-z0-9_.-]{0,63}$/.test(name)) {
      issues.push(`${path}.channels contains an invalid channel name: ${name}.`)
      continue
    }
    const reading = finite(raw)
    if (reading === null) {
      issues.push(`${path}.channels.${name} must be finite.`)
      continue
    }
    if (!units[name]) issues.push(`channelUnits.${name} is required.`)
    channels[name] = reading
  }

  const labelRaw = value.label
  const label = labelRaw === null || labelRaw === undefined ? null : text(labelRaw)
  if (labelRaw !== null && labelRaw !== undefined && !label) issues.push(`${path}.label must be non-empty or null.`)
  const temperatureC = nullableFinite(value, "temperatureC", issues, path)
  const humidityPct = nullableFinite(value, "humidityPct", issues, path)
  const pressureHpa = nullableFinite(value, "pressureHpa", issues, path)
  if (humidityPct !== null && (humidityPct < 0 || humidityPct > 100)) {
    issues.push(`${path}.humidityPct must be between 0 and 100.`)
  }

  if (!sampleId || !observedAt || Object.keys(channels).length === 0) return null
  return { sampleId, observedAt, channels, label, temperatureC, humidityPct, pressureHpa }
}

export function validateGandhaDataset(input: unknown): GandhaValidationResult<GandhaDataset> {
  const issues: string[] = []
  if (!isRecord(input)) return { ok: false, value: null, issues: ["Dataset root must be an object."] }
  if (input.schema !== GANDHA_DATASET_SCHEMA) issues.push(`schema must equal ${GANDHA_DATASET_SCHEMA}.`)
  const datasetId = text(input.datasetId)
  const createdAt = timestamp(input.createdAt)
  if (!datasetId) issues.push("datasetId is required.")
  if (!createdAt) issues.push("createdAt must be an ISO-compatible timestamp.")

  const sensorInput = isRecord(input.sensor) ? input.sensor : null
  const family = sensorInput ? text(sensorInput.family) : null
  if (!sensorInput) issues.push("sensor must be an object.")
  if (!family) issues.push("sensor.family is required.")
  const sensor: GandhaSensorContract = {
    family: family ?? "",
    deviceId: sensorInput ? text(sensorInput.deviceId) : null,
    firmwareVersion: sensorInput ? text(sensorInput.firmwareVersion) : null,
  }

  const channelUnitsInput = isRecord(input.channelUnits) ? input.channelUnits : null
  const channelUnits: Record<string, string> = {}
  if (!channelUnitsInput) {
    issues.push("channelUnits must be an object.")
  } else {
    for (const [channel, unit] of Object.entries(channelUnitsInput)) {
      const parsedUnit = text(unit)
      if (!parsedUnit) issues.push(`channelUnits.${channel} must be a non-empty string.`)
      else channelUnits[channel] = parsedUnit
    }
  }

  const rows = Array.isArray(input.samples) ? input.samples : null
  if (!rows) issues.push("samples must be an array.")
  else if (rows.length === 0) issues.push("samples must contain at least one record.")
  else if (rows.length > GANDHA_MAX_SAMPLES) issues.push(`samples exceeds the ${GANDHA_MAX_SAMPLES} record contract limit.`)
  const samples = (rows ?? []).map((row, index) => parseSample(row, index, channelUnits, issues)).filter((row): row is GandhaSample => row !== null)
  const ids = new Set<string>()
  for (const sample of samples) {
    if (ids.has(sample.sampleId)) issues.push(`Duplicate sampleId: ${sample.sampleId}.`)
    ids.add(sample.sampleId)
  }

  const provenanceInput = isRecord(input.provenance) ? input.provenance : null
  const source = provenanceInput?.source
  if (source !== "file_import" && source !== "local_capture") {
    issues.push("provenance.source must be file_import or local_capture.")
  }
  const provenance: GandhaDataset["provenance"] = {
    source: source === "local_capture" ? "local_capture" : "file_import",
    notes: provenanceInput ? text(provenanceInput.notes) : null,
  }

  let sourceCompatibility: GandhaSourceCompatibility | undefined
  if (input.sourceCompatibility !== undefined) {
    const compatibility = isRecord(input.sourceCompatibility) ? input.sourceCompatibility : null
    const format = compatibility?.format
    const heaterProfileIds = Array.isArray(compatibility?.heaterProfileIds) ? compatibility.heaterProfileIds.map(text).filter((value): value is string => value !== null) : null
    const dutyCycleProfileIds = Array.isArray(compatibility?.dutyCycleProfileIds) ? compatibility.dutyCycleProfileIds.map(text).filter((value): value is string => value !== null) : null
    const skippedErrorRows = compatibility ? finite(compatibility.skippedErrorRows) : null
    const droppedIncompleteCycles = compatibility ? finite(compatibility.droppedIncompleteCycles) : null
    if (!compatibility || compatibility.vendor !== "Bosch Sensortec" || (format !== "bosch-bmerawdata" && format !== "bosch-bmespecimen") || !heaterProfileIds || !dutyCycleProfileIds || skippedErrorRows === null || droppedIncompleteCycles === null) {
      issues.push("sourceCompatibility is not a valid Bosch compatibility record.")
    } else {
      sourceCompatibility = {
        vendor: "Bosch Sensortec",
        format,
        sourceFileName: text(compatibility.sourceFileName),
        appVersion: text(compatibility.appVersion),
        boardType: text(compatibility.boardType),
        boardId: text(compatibility.boardId),
        firmwareVersion: text(compatibility.firmwareVersion),
        heaterProfileIds,
        dutyCycleProfileIds,
        skippedErrorRows,
        droppedIncompleteCycles,
      }
    }
  }

  if (issues.length > 0 || !datasetId || !createdAt || !family) {
    return { ok: false, value: null, issues: [...new Set(issues)].slice(0, 50) }
  }
  return {
    ok: true,
    value: {
      schema: GANDHA_DATASET_SCHEMA,
      datasetId,
      createdAt,
      sensor,
      channelUnits,
      samples,
      provenance,
      ...(sourceCompatibility ? { sourceCompatibility } : {}),
    },
    issues: [],
  }
}

export function summarizeGandhaDataset(dataset: GandhaDataset): GandhaDatasetSummary {
  const channelNames = [...new Set(dataset.samples.flatMap((sample) => Object.keys(sample.channels)))].sort()
  const observed = dataset.samples.map((sample) => sample.observedAt).sort()
  const labeledCount = dataset.samples.filter((sample) => sample.label !== null).length
  return {
    datasetId: dataset.datasetId,
    sampleCount: dataset.samples.length,
    labeledCount,
    unlabeledCount: dataset.samples.length - labeledCount,
    channelNames,
    sensorFamily: dataset.sensor.family,
    firstObservedAt: observed[0] ?? null,
    lastObservedAt: observed.at(-1) ?? null,
  }
}

export function stageGandhaLabel(dataset: GandhaDataset, sampleId: string, label: string): GandhaValidationResult<GandhaDataset> {
  const cleanLabel = text(label)
  if (!cleanLabel) return { ok: false, value: null, issues: ["A non-empty label is required."] }
  const index = dataset.samples.findIndex((sample) => sample.sampleId === sampleId)
  if (index < 0) return { ok: false, value: null, issues: [`Unknown sampleId: ${sampleId}.`] }
  const samples = dataset.samples.map((sample, current) => current === index ? { ...sample, label: cleanLabel } : sample)
  return { ok: true, value: { ...dataset, samples }, issues: [] }
}

export function unboundTrainingJob(datasetId: string | null = null): GandhaTrainingJob {
  return {
    jobId: null,
    state: "unbound",
    providerRef: null,
    datasetId,
    createdAt: null,
    updatedAt: null,
    message: "No GANDHA training provider is bound. No job was created.",
  }
}

export function trainingReadiness(dataset: GandhaDataset | null, providerBound: boolean): { canSubmit: boolean; reasons: string[] } {
  const reasons: string[] = []
  if (!dataset) reasons.push("Import a valid dataset.")
  if (dataset && dataset.samples.some((sample) => sample.label === null)) reasons.push("Label every sample before training.")
  if (!providerBound) reasons.push("Bind an approved training provider.")
  return { canSubmit: reasons.length === 0, reasons }
}

export function localModelReadiness(dataset: GandhaDataset | null): { canTrain: boolean; reasons: string[] } {
  const reasons: string[] = []
  if (!dataset) return { canTrain: false, reasons: ["Import a valid dataset."] }
  const labeled = dataset.samples.filter((sample) => sample.label !== null)
  const counts = new Map<string, number>()
  for (const sample of labeled) counts.set(sample.label!, (counts.get(sample.label!) ?? 0) + 1)
  if (labeled.length < 4) reasons.push("Label at least four samples.")
  if (counts.size < 2) reasons.push("Use at least two distinct labels.")
  if ([...counts.values()].some((count) => count < 2)) reasons.push("Supply at least two labeled samples per class.")
  const channels = Object.keys(labeled[0]?.channels ?? {}).sort()
  if (labeled.some((sample) => Object.keys(sample.channels).sort().join("\0") !== channels.join("\0"))) {
    reasons.push("Every labeled sample must use the same channel set.")
  }
  return { canTrain: reasons.length === 0, reasons }
}

export function trainLocalCentroidModel(dataset: GandhaDataset, createdAt: string): GandhaValidationResult<GandhaLocalCentroidModel> {
  const readiness = localModelReadiness(dataset)
  const parsedCreatedAt = timestamp(createdAt)
  if (!readiness.canTrain || !parsedCreatedAt) {
    return { ok: false, value: null, issues: [...readiness.reasons, ...(!parsedCreatedAt ? ["createdAt must be an ISO-compatible timestamp."] : [])] }
  }
  const samples = dataset.samples.filter((sample): sample is GandhaSample & { label: string } => sample.label !== null)
  const channels = Object.keys(samples[0].channels).sort()
  const normalization: GandhaLocalCentroidModel["normalization"] = {}
  for (const channel of channels) {
    const values = samples.map((sample) => sample.channels[channel])
    const mean = values.reduce((sum, value) => sum + value, 0) / values.length
    const variance = values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length
    normalization[channel] = { mean, standardDeviation: Math.sqrt(variance) || 1 }
  }
  const byLabel = new Map<string, typeof samples>()
  for (const sample of samples) byLabel.set(sample.label, [...(byLabel.get(sample.label) ?? []), sample])
  const classes = [...byLabel.entries()].sort(([left], [right]) => left.localeCompare(right)).map(([label, rows]) => ({
    label,
    sampleCount: rows.length,
    centroid: channels.map((channel) => rows.reduce((sum, sample) => sum + (sample.channels[channel] - normalization[channel].mean) / normalization[channel].standardDeviation, 0) / rows.length),
  }))
  return {
    ok: true,
    value: {
      schema: GANDHA_LOCAL_MODEL_SCHEMA,
      algorithm: "zscore-nearest-centroid",
      datasetId: dataset.datasetId,
      createdAt: parsedCreatedAt,
      channels,
      normalization,
      classes,
      trainingSampleIds: samples.map((sample) => sample.sampleId),
      provenance: { localOnly: true, providerRef: null, registryVerified: false, calibratedProbability: false },
    },
    issues: [],
  }
}

export function predictWithLocalCentroid(model: GandhaLocalCentroidModel, sample: GandhaSample): GandhaValidationResult<GandhaLocalPrediction> {
  const missing = model.channels.filter((channel) => finite(sample.channels[channel]) === null)
  if (missing.length) return { ok: false, value: null, issues: [`Sample is missing finite model channels: ${missing.join(", ")}.`] }
  const vector = model.channels.map((channel) => (sample.channels[channel] - model.normalization[channel].mean) / model.normalization[channel].standardDeviation)
  const ranked = model.classes.map((entry) => ({ label: entry.label, distance: Math.hypot(...entry.centroid.map((value, index) => vector[index] - value)) })).sort((left, right) => left.distance - right.distance || left.label.localeCompare(right.label))
  if (ranked.length < 2) return { ok: false, value: null, issues: ["The local model requires at least two classes."] }
  const best = ranked[0]
  const second = ranked[1]
  const relativeSeparation = Math.max(0, Math.min(1, (second.distance - best.distance) / Math.max(second.distance, Number.EPSILON)))
  const seenDuringTraining = model.trainingSampleIds.includes(sample.sampleId)
  return {
    ok: true,
    value: {
      label: best.label,
      distance: best.distance,
      relativeSeparation,
      seenDuringTraining,
      message: seenDuringTraining
        ? "Exploratory self-comparison only: this sample was included in local training."
        : "Local nearest-centroid comparison. Relative separation is not a calibrated probability or verified operational inference.",
    },
    issues: [],
  }
}

export function validateModelProvenance(input: unknown): GandhaValidationResult<GandhaModelProvenance> {
  if (!isRecord(input)) return { ok: false, value: null, issues: ["Model provenance must be an object."] }
  const issues: string[] = []
  const modelId = text(input.modelId)
  const version = text(input.version)
  const algorithm = text(input.algorithm)
  const trainedAt = timestamp(input.trainedAt)
  const datasetId = text(input.datasetId)
  const artifactSha256 = text(input.artifactSha256)
  if (!modelId) issues.push("modelId is required.")
  if (!version) issues.push("version is required.")
  if (!algorithm) issues.push("algorithm is required.")
  if (!trainedAt) issues.push("trainedAt must be an ISO-compatible timestamp.")
  if (!datasetId) issues.push("datasetId is required.")
  if (input.featureContract !== GANDHA_FEATURE_CONTRACT) issues.push(`featureContract must equal ${GANDHA_FEATURE_CONTRACT}.`)
  if (!artifactSha256 || !/^[a-f0-9]{64}$/i.test(artifactSha256)) issues.push("artifactSha256 must be a 64-character SHA-256 digest.")
  if (input.registryVerified !== true) issues.push("registryVerified must be true.")
  if (issues.length > 0 || !modelId || !version || !algorithm || !trainedAt || !datasetId || !artifactSha256) {
    return { ok: false, value: null, issues }
  }
  return {
    ok: true,
    value: {
      modelId,
      version,
      algorithm,
      trainedAt,
      datasetId,
      featureContract: GANDHA_FEATURE_CONTRACT,
      artifactSha256: artifactSha256.toLowerCase(),
      registryVerified: true,
    },
    issues: [],
  }
}

export type GandhaChannelPresence = "measured" | "missing"
export type GandhaOperationalState = "unbound" | "training" | "exported_config" | "device_deployment" | "live_inference"

export function gandhaChannelPresence(channels: Record<string, unknown> | null | undefined, name: string): {
  state: GandhaChannelPresence
  value: number | null
} {
  const raw = channels ? channels[name] : undefined
  const value = finite(raw)
  if (value === null) return { state: "missing", value: null }
  return { state: "measured", value }
}

export function classifyGandhaOperationalState(input: {
  training?: boolean
  exportedConfig?: boolean
  deviceDeployed?: boolean
  liveInference?: boolean
  verifiedModel?: boolean
}): GandhaOperationalState {
  if (input.liveInference && input.verifiedModel && input.deviceDeployed) return "live_inference"
  if (input.deviceDeployed) return "device_deployment"
  if (input.exportedConfig) return "exported_config"
  if (input.training) return "training"
  return "unbound"
}

export function parseInferenceEvidence(input: unknown): GandhaInferenceEvidence {
  if (!isRecord(input)) {
    return { state: "unbound", prediction: null, confidence: null, inferredAt: null, model: null, message: "No inference evidence supplied." }
  }
  const prediction = text(input.prediction)
  const confidence = finite(input.confidence)
  const inferredAt = timestamp(input.inferredAt)
  const model = validateModelProvenance(input.model)
  if (!prediction || confidence === null || confidence < 0 || confidence > 1 || !inferredAt || !model.ok) {
    return {
      state: "error",
      prediction: null,
      confidence: null,
      inferredAt: null,
      model: null,
      message: "Inference was withheld because prediction, confidence, timestamp, or verified model provenance was invalid.",
    }
  }
  return {
    state: "verified",
    prediction,
    confidence,
    inferredAt,
    model: model.value,
    message: "Inference evidence passed the GANDHA provenance contract.",
  }
}
