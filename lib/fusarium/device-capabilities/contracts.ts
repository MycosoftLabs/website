/**
 * Passive device/capability discovery contract.
 *
 * This manifest describes what a registry explicitly declares. It never opens a
 * transport, probes hardware, infers a sensor from a product name, or grants
 * command authority. See docs/native-applications/DEVICE_SENSOR_DISCOVERY.md.
 */
export const DEVICE_CAPABILITY_SCHEMA = "fusarium-device-capability-manifest/v1" as const
export const DEVICE_CAPABILITY_SNAPSHOT_SCHEMA = "fusarium-device-capability-snapshot/v1" as const
export const DEVICE_CAPABILITY_CLASSIFICATION = "UNCLASSIFIED" as const
export const DEVICE_MANIFEST_MAX_BYTES = 256 * 1024
export const DEVICE_MANIFEST_MAX_DEVICES = 200
export const DEVICE_MANIFEST_MAX_SENSORS = 128

export const SENSOR_MODALITIES = [
  "camera", "microphone", "bioelectric", "gas-voc", "particulate", "radiation",
  "radar", "lidar", "wifi", "thermal", "mechanical",
] as const
export type SensorModality = (typeof SENSOR_MODALITIES)[number]
export type EvidenceState = "declared" | "available" | "unavailable" | "unbound" | "error"

export interface DeviceProcessorRef {
  id: string
  family: "esp32" | "jetson" | "flight-controller" | "host" | "other"
  model: string | null
  role: string | null
}

export interface DeviceBoardRef {
  id: string
  family: "mycobrain" | "carrier" | "controller" | "other"
  model: string | null
  revision: string | null
  processors: readonly DeviceProcessorRef[]
}

export interface SensorInstance {
  id: string
  modality: SensorModality
  model: string | null
  boardRef: string | null
  processorRef: string | null
  transport: {
    kind: "i2c" | "analog" | "digital" | "usb" | "serial" | "network" | "csi" | "other" | "unknown"
    endpointRef: string | null
    adapterState: EvidenceState
  }
  calibration: {
    state: "current" | "expired" | "unknown" | "not-required"
    calibratedAt: string | null
    expiresAt: string | null
    method: string | null
  }
  provenance: {
    sourceRef: string
    sourceRecordId: string
    observedAt: string | null
    receivedAt: string | null
  }
}

export interface DeviceCapabilityManifest {
  schema: typeof DEVICE_CAPABILITY_SCHEMA
  classification: typeof DEVICE_CAPABILITY_CLASSIFICATION
  device: {
    id: string
    registryId: string | null
    name: string
    type: string | null
    status: string | null
    identityEvidence: string
  }
  boards: readonly DeviceBoardRef[]
  sensors: readonly SensorInstance[]
  mission: { id: string; label: string | null } | null
  location: { id: string; label: string | null } | null
  environment: { id: string; label: string | null } | null
  provenance: {
    sourceRef: string
    sourceRecordId: string
    receivedAt: string | null
    /** All registry sources collapsed into this physical-device manifest. */
    sourceRefs?: readonly string[]
  }
}

export interface DeviceCapabilitySnapshot {
  schema: typeof DEVICE_CAPABILITY_SNAPSHOT_SCHEMA
  state: "available" | "partial" | "empty" | "unavailable" | "error"
  checkedAt: string
  devices: readonly DeviceCapabilityManifest[]
  sources: readonly { sourceRef: string; state: "available" | "empty" | "unavailable" | "error"; recordCount: number; message: string }[]
  rejectedRecords: number
  message: string
}

export type ManifestParseResult =
  | { ok: true; manifest: DeviceCapabilityManifest }
  | { ok: false; issues: readonly string[] }

function record(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? value as Record<string, unknown> : null
}

function text(value: unknown, max = 240): string | null {
  if (typeof value !== "string") return null
  const clean = value.trim()
  return clean && clean.length <= max && !/[\u0000-\u001f\u007f]/.test(clean) ? clean : null
}

function iso(value: unknown): string | null {
  const clean = text(value, 64)
  return clean && Number.isFinite(Date.parse(clean)) ? new Date(clean).toISOString() : null
}

function identifier(value: unknown): string | null {
  const clean = text(value, 160)
  return clean && /^[A-Za-z0-9][A-Za-z0-9._:/-]*$/.test(clean) ? clean : null
}

function context(value: unknown): { id: string; label: string | null } | null {
  if (value === null || value === undefined) return null
  const row = record(value)
  if (!row) return null
  const id = identifier(row.id)
  return id ? { id, label: text(row.label ?? row.name) } : null
}

export function parseDeviceCapabilityManifest(value: unknown): ManifestParseResult {
  const root = record(value)
  const issues: string[] = []
  if (!root) return { ok: false, issues: ["manifest must be an object"] }
  if (root.schema !== DEVICE_CAPABILITY_SCHEMA) issues.push(`schema must be ${DEVICE_CAPABILITY_SCHEMA}`)
  if (root.classification !== DEVICE_CAPABILITY_CLASSIFICATION) issues.push("classification must be UNCLASSIFIED")
  const device = record(root.device)
  const deviceId = identifier(device?.id)
  const name = text(device?.name)
  const identityEvidence = text(device?.identityEvidence, 400)
  if (!deviceId) issues.push("device.id is invalid")
  if (!name) issues.push("device.name is required")
  if (!identityEvidence) issues.push("device.identityEvidence is required")

  const boardsInput = Array.isArray(root.boards) ? root.boards : []
  const sensorsInput = Array.isArray(root.sensors) ? root.sensors : []
  if (!Array.isArray(root.boards)) issues.push("boards must be an array")
  if (!Array.isArray(root.sensors)) issues.push("sensors must be an array")
  if (sensorsInput.length > DEVICE_MANIFEST_MAX_SENSORS) issues.push("sensor count exceeds the bounded limit")
  const boardIds = new Set<string>()
  const processorIds = new Set<string>()
  const boards: DeviceBoardRef[] = []
  for (const [index, item] of boardsInput.entries()) {
    const row = record(item)
    const id = identifier(row?.id)
    const family = text(row?.family) as DeviceBoardRef["family"] | null
    if (!id || boardIds.has(id)) { issues.push(`boards[${index}].id is invalid or duplicate`); continue }
    if (!family || !["mycobrain", "carrier", "controller", "other"].includes(family)) { issues.push(`boards[${index}].family is invalid`); continue }
    boardIds.add(id)
    const processors: DeviceProcessorRef[] = []
    const inputProcessors = Array.isArray(row?.processors) ? row.processors : []
    for (const [processorIndex, processorItem] of inputProcessors.entries()) {
      const processor = record(processorItem)
      const processorId = identifier(processor?.id)
      const processorFamily = text(processor?.family) as DeviceProcessorRef["family"] | null
      if (!processorId || processorIds.has(processorId)) { issues.push(`boards[${index}].processors[${processorIndex}].id is invalid or duplicate`); continue }
      if (!processorFamily || !["esp32", "jetson", "flight-controller", "host", "other"].includes(processorFamily)) { issues.push(`boards[${index}].processors[${processorIndex}].family is invalid`); continue }
      processorIds.add(processorId)
      processors.push({ id: processorId, family: processorFamily, model: text(processor?.model), role: text(processor?.role) })
    }
    boards.push({ id, family, model: text(row?.model), revision: text(row?.revision), processors })
  }

  const sensorIds = new Set<string>()
  const sensors: SensorInstance[] = []
  for (const [index, item] of sensorsInput.entries()) {
    const row = record(item)
    const id = identifier(row?.id)
    const modality = text(row?.modality) as SensorModality | null
    const transport = record(row?.transport)
    const calibration = record(row?.calibration)
    const provenance = record(row?.provenance)
    const transportKind = text(transport?.kind) as SensorInstance["transport"]["kind"] | null
    const adapterState = text(transport?.adapterState) as EvidenceState | null
    const calibrationState = text(calibration?.state) as SensorInstance["calibration"]["state"] | null
    const sourceRef = text(provenance?.sourceRef, 400)
    const sourceRecordId = identifier(provenance?.sourceRecordId)
    if (!id || sensorIds.has(id)) issues.push(`sensors[${index}].id is invalid or duplicate`)
    if (!modality || !SENSOR_MODALITIES.includes(modality)) issues.push(`sensors[${index}].modality is invalid`)
    if (!transportKind || !["i2c", "analog", "digital", "usb", "serial", "network", "csi", "other", "unknown"].includes(transportKind)) issues.push(`sensors[${index}].transport.kind is invalid`)
    if (!adapterState || !["declared", "available", "unavailable", "unbound", "error"].includes(adapterState)) issues.push(`sensors[${index}].transport.adapterState is invalid`)
    if (!calibrationState || !["current", "expired", "unknown", "not-required"].includes(calibrationState)) issues.push(`sensors[${index}].calibration.state is invalid`)
    if (!sourceRef || !sourceRecordId) issues.push(`sensors[${index}].provenance is incomplete`)
    const boardRef = identifier(row?.boardRef)
    const processorRef = identifier(row?.processorRef)
    if (boardRef && !boardIds.has(boardRef)) issues.push(`sensors[${index}].boardRef is unknown`)
    if (processorRef && !processorIds.has(processorRef)) issues.push(`sensors[${index}].processorRef is unknown`)
    if (!id || !modality || !transportKind || !adapterState || !calibrationState || !sourceRef || !sourceRecordId) continue
    sensorIds.add(id)
    sensors.push({
      id, modality, model: text(row?.model), boardRef, processorRef,
      transport: { kind: transportKind, endpointRef: text(transport?.endpointRef, 400), adapterState },
      calibration: { state: calibrationState, calibratedAt: iso(calibration?.calibratedAt), expiresAt: iso(calibration?.expiresAt), method: text(calibration?.method, 400) },
      provenance: { sourceRef, sourceRecordId, observedAt: iso(provenance?.observedAt), receivedAt: iso(provenance?.receivedAt) },
    })
  }

  const provenance = record(root.provenance)
  const sourceRef = text(provenance?.sourceRef, 400)
  const sourceRecordId = identifier(provenance?.sourceRecordId)
  if (!sourceRef || !sourceRecordId) issues.push("manifest provenance is incomplete")
  if (issues.length || !deviceId || !name || !identityEvidence || !sourceRef || !sourceRecordId) return { ok: false, issues }
  const sourceRefs = Array.isArray(provenance?.sourceRefs)
    ? [...new Set(provenance.sourceRefs.map((value) => text(value, 400)).filter((value): value is string => Boolean(value)))]
    : []
  return { ok: true, manifest: {
    schema: DEVICE_CAPABILITY_SCHEMA,
    classification: DEVICE_CAPABILITY_CLASSIFICATION,
    device: { id: deviceId, registryId: identifier(device?.registryId), name, type: text(device?.type), status: text(device?.status), identityEvidence },
    boards, sensors,
    mission: context(root.mission), location: context(root.location), environment: context(root.environment),
    provenance: { sourceRef, sourceRecordId, receivedAt: iso(provenance?.receivedAt), ...(sourceRefs.length ? { sourceRefs } : {}) },
  } }
}

export function manifestsForModality(manifests: readonly DeviceCapabilityManifest[], deviceIds: readonly string[], modality: SensorModality) {
  const selected = new Set(deviceIds)
  return manifests.filter((manifest) => selected.has(manifest.device.id)).map((manifest) => ({
    device: manifest.device,
    sensors: manifest.sensors.filter((sensor) => sensor.modality === modality),
  }))
}

export function parseDeviceCapabilitySnapshot(value: unknown): DeviceCapabilitySnapshot | null {
  const root = record(value)
  if (!root || root.schema !== DEVICE_CAPABILITY_SNAPSHOT_SCHEMA || !Array.isArray(root.devices) || !Array.isArray(root.sources)) return null
  const devices: DeviceCapabilityManifest[] = []
  for (const item of root.devices) {
    const parsed = parseDeviceCapabilityManifest(item)
    if (!parsed.ok) return null
    devices.push(parsed.manifest)
  }
  const state = text(root.state) as DeviceCapabilitySnapshot["state"] | null
  const checkedAt = iso(root.checkedAt)
  if (!state || !["available", "partial", "empty", "unavailable", "error"].includes(state) || !checkedAt) return null
  const sources = root.sources.map((item) => {
    const source = record(item)
    const sourceRef = text(source?.sourceRef, 400)
    const sourceState = text(source?.state) as DeviceCapabilitySnapshot["sources"][number]["state"] | null
    const recordCount = Number(source?.recordCount)
    const message = text(source?.message, 400)
    return sourceRef && sourceState && ["available", "empty", "unavailable", "error"].includes(sourceState) && Number.isSafeInteger(recordCount) && recordCount >= 0 && message
      ? { sourceRef, state: sourceState, recordCount, message }
      : null
  })
  if (sources.some((source) => source === null)) return null
  return {
    schema: DEVICE_CAPABILITY_SNAPSHOT_SCHEMA,
    state,
    checkedAt,
    devices,
    sources: sources as DeviceCapabilitySnapshot["sources"],
    rejectedRecords: Number.isSafeInteger(Number(root.rejectedRecords)) ? Number(root.rejectedRecords) : 0,
    message: text(root.message, 400) ?? "Device capability snapshot received.",
  }
}
