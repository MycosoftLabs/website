import {
  DEVICE_CAPABILITY_CLASSIFICATION,
  DEVICE_CAPABILITY_SCHEMA,
  DEVICE_CAPABILITY_SNAPSHOT_SCHEMA,
  SENSOR_MODALITIES,
  parseDeviceCapabilityManifest,
  type DeviceCapabilityManifest,
  type DeviceCapabilitySnapshot,
  type SensorInstance,
  type SensorModality,
} from "./contracts"

export const PASSIVE_DEVICE_REGISTRY_SOURCES = [
  "/api/devices/network?include_offline=true",
  "/api/mycobrain/devices",
  "/api/mindex/registry/devices?limit=200",
  "/api/fci/devices",
] as const

const ALIASES: Record<SensorModality, readonly string[]> = {
  camera: ["camera", "vision", "imaging", "rgb", "video"],
  microphone: ["microphone", "mic", "audio", "acoustic", "hydrophone", "vibration"],
  bioelectric: ["bioelectric", "fci", "electrode", "electrical potential"],
  "gas-voc": ["gas", "gas resistance", "voc", "iaq", "odor", "chemical", "nox", "co2", "bme690", "bme688"],
  particulate: ["particulate", "particle", "pm1", "pm2.5", "pm10", "bmv080"],
  radiation: ["radiation", "gamma", "geiger"],
  radar: ["radar"],
  lidar: ["lidar", "point cloud"],
  wifi: ["wifi sense", "wifi sensing", "csi", "rf sensing"],
  thermal: ["thermal", "radiometric", "infrared", "ir camera"],
  mechanical: ["touch", "tactile", "force", "pressure", "proprioception", "joint", "collision", "mechanical"],
}

function object(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? value as Record<string, unknown> : null
}
function clean(value: unknown, max = 240): string | null {
  if (typeof value !== "string") return null
  const result = value.trim()
  return result && result.length <= max && !/[\u0000-\u001f\u007f]/.test(result) ? result : null
}
function id(value: unknown): string | null {
  const result = clean(value, 160)
  return result && /^[A-Za-z0-9][A-Za-z0-9._:/-]*$/.test(result) ? result : null
}
function first(row: Record<string, unknown>, ...keys: string[]): unknown {
  for (const key of keys) if (row[key] !== undefined) return row[key]
}
function token(value: string) { return value.toLowerCase().replace(/[_-]+/g, " ").replace(/[^a-z0-9.]+/g, " ").trim() }
function strings(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return [...new Set(value.map((item) => clean(item)).filter((item): item is string => Boolean(item)))]
}
function modality(capability: string): SensorModality | null {
  const candidate = token(capability)
  return SENSOR_MODALITIES.find((item) => ALIASES[item].some((alias) => candidate === token(alias) || candidate.includes(token(alias)))) ?? null
}
function registryContext(row: Record<string, unknown>, kind: "mission" | "location" | "environment") {
  const direct = object(row[kind])
  const metadata = object(row.metadata)
  const metadataDirect = object(metadata?.[kind])
  let contextId = id(first(row, `${kind}_id`, `${kind}Id`)) ?? id(direct?.id) ?? id(first(metadata ?? {}, `${kind}_id`, `${kind}Id`)) ?? id(metadataDirect?.id)
  const label = clean(first(row, `${kind}_label`, `${kind}Label`)) ?? clean(direct?.label ?? direct?.name) ?? clean(first(metadata ?? {}, `${kind}_label`, `${kind}Label`)) ?? clean(metadataDirect?.label ?? metadataDirect?.name)
  if (!contextId && kind === "location" && direct) {
    const latitude = Number(first(direct, "lat", "latitude"))
    const longitude = Number(first(direct, "lon", "lng", "longitude"))
    if (Number.isFinite(latitude) && Number.isFinite(longitude) && Math.abs(latitude) <= 90 && Math.abs(longitude) <= 180) {
      contextId = `geo:${latitude.toFixed(6)},${longitude.toFixed(6)}`
    }
  }
  return contextId ? { id: contextId, label } : null
}

function deviceIdentityKeys(manifest: DeviceCapabilityManifest): string[] {
  // Only contract identifiers participate. Names, types, network addresses and
  // display labels are deliberately excluded because they are not identity.
  return [...new Set([manifest.device.id, manifest.device.registryId].filter((value): value is string => Boolean(value)))]
}

function statusRank(value: string | null): number {
  const normalized = value?.trim().toLowerCase()
  if (!normalized) return 0
  if (["online", "connected", "live", "active", "available", "ready"].includes(normalized)) return 3
  if (["offline", "disconnected", "unavailable", "error"].includes(normalized)) return 2
  return 1
}

function mergeManifestPair(current: DeviceCapabilityManifest, incoming: DeviceCapabilityManifest): DeviceCapabilityManifest {
  const sensorKeys = new Set(current.sensors.map((sensor) => `${sensor.modality}:${sensor.model ?? ""}:${sensor.id}`))
  const boardIds = new Set(current.boards.map((board) => board.id))
  const preferredStatus = statusRank(incoming.device.status) > statusRank(current.device.status)
    ? incoming.device.status
    : current.device.status
  const sourceRefs = [...new Set([
    ...(current.provenance.sourceRefs ?? [current.provenance.sourceRef]),
    ...(incoming.provenance.sourceRefs ?? [incoming.provenance.sourceRef]),
  ])]
  return {
    ...current,
    device: {
      ...current.device,
      registryId: current.device.registryId ?? incoming.device.registryId,
      name: current.device.name === current.device.id && incoming.device.name !== incoming.device.id ? incoming.device.name : current.device.name,
      type: current.device.type ?? incoming.device.type,
      status: preferredStatus,
      identityEvidence: current.device.identityEvidence,
    },
    boards: [...current.boards, ...incoming.boards.filter((board) => !boardIds.has(board.id))],
    sensors: [...current.sensors, ...incoming.sensors.filter((sensor) => !sensorKeys.has(`${sensor.modality}:${sensor.model ?? ""}:${sensor.id}`))],
    mission: current.mission ?? incoming.mission,
    location: current.location ?? incoming.location,
    environment: current.environment ?? incoming.environment,
    provenance: { ...current.provenance, sourceRefs },
  }
}

/**
 * Collapse registry records only when their explicit device id or registry id
 * proves an alias relationship. This intentionally never matches on name,
 * type, IP address, location, or capabilities.
 */
export function deduplicateDeviceCapabilityManifests(manifests: readonly DeviceCapabilityManifest[]): DeviceCapabilityManifest[] {
  const groups: DeviceCapabilityManifest[] = []
  for (const manifest of manifests) {
    const keys = new Set(deviceIdentityKeys(manifest))
    const matchingIndexes = groups
      .map((candidate, index) => deviceIdentityKeys(candidate).some((key) => keys.has(key)) ? index : -1)
      .filter((index) => index >= 0)
    if (!matchingIndexes.length) {
      groups.push(manifest)
      continue
    }
    const firstIndex = matchingIndexes[0]
    let merged = mergeManifestPair(groups[firstIndex], manifest)
    for (const index of matchingIndexes.slice(1).reverse()) {
      merged = mergeManifestPair(merged, groups[index])
      groups.splice(index, 1)
    }
    groups[firstIndex] = merged
  }
  return groups.sort((left, right) => left.device.name.localeCompare(right.device.name))
}

/** Service placeholders describe an adapter endpoint, not a selectable physical sensor device. */
export function selectableSensingDeviceManifests(manifests: readonly DeviceCapabilityManifest[]): DeviceCapabilityManifest[] {
  return manifests.filter((manifest) => !(
    manifest.device.id.startsWith("mycobrain-service-")
    && manifest.sensors.length === 0
  ))
}

/** Convert only explicit registry fields; product names never imply capability. */
export function manifestFromRegistryRecord(value: unknown, sourceRef: string, index: number): DeviceCapabilityManifest | null {
  const row = object(value)
  if (!row) return null
  if (row.schema === DEVICE_CAPABILITY_SCHEMA) {
    const parsed = parseDeviceCapabilityManifest(row)
    return parsed.ok ? parsed.manifest : null
  }
  const deviceId = id(first(row, "id", "device_id", "deviceId"))
  if (!deviceId || deviceId.toLowerCase().startsWith("demo-")) return null
  const metadata = object(row.metadata)
  const sensorData = object(row.sensor_data)
  const capabilities = [...new Set([
    ...strings(first(row, "capabilities", "sensors", "modalities")),
    ...strings(first(metadata ?? {}, "capabilities", "sensors", "modalities")),
    ...(clean(first(row, "probe_type", "probeType")) ? [clean(first(row, "probe_type", "probeType"))!] : []),
    ...Object.keys(sensorData ?? {}),
  ])]
  const sensors: SensorInstance[] = []
  const counts = new Map<SensorModality, number>()
  for (const capability of capabilities) {
    const sensorModality = modality(capability)
    if (!sensorModality) continue
    const count = (counts.get(sensorModality) ?? 0) + 1
    counts.set(sensorModality, count)
    sensors.push({
      id: `${deviceId}/${sensorModality}-${count}`,
      modality: sensorModality,
      model: capability,
      boardRef: null,
      processorRef: null,
      transport: { kind: "unknown", endpointRef: null, adapterState: "declared" },
      calibration: { state: "unknown", calibratedAt: null, expiresAt: null, method: null },
      provenance: { sourceRef, sourceRecordId: `${deviceId}:${index}:${sensorModality}:${count}`, observedAt: null, receivedAt: null },
    })
  }
  return {
    schema: DEVICE_CAPABILITY_SCHEMA,
    classification: DEVICE_CAPABILITY_CLASSIFICATION,
    device: {
      id: deviceId,
      registryId: id(first(row, "registry_id", "registryId")) ?? deviceId,
      name: clean(first(row, "name", "device_name", "deviceName")) ?? deviceId,
      type: clean(first(row, "type", "device_type", "deviceType")),
      status: clean(first(row, "status", "connection_status", "connectionStatus")),
      identityEvidence: `Explicit device identifier from ${sourceRef}.`,
    },
    boards: [], sensors,
    mission: registryContext(row, "mission"),
    location: registryContext(row, "location"),
    environment: registryContext(row, "environment"),
    provenance: { sourceRef, sourceRecordId: `${deviceId}:${index}`, receivedAt: null },
  }
}

export function snapshotFromSourceResults(results: readonly {
  sourceRef: string
  state: "available" | "empty" | "unavailable" | "error"
  rows: readonly unknown[]
  message: string
}[], checkedAt: string): DeviceCapabilitySnapshot {
  const manifests: DeviceCapabilityManifest[] = []
  let rejectedRecords = 0
  for (const result of results) for (const [index, row] of result.rows.entries()) {
    const manifest = manifestFromRegistryRecord(row, result.sourceRef, index)
    if (!manifest) { rejectedRecords += 1; continue }
    manifests.push(manifest)
  }
  const devices = deduplicateDeviceCapabilityManifests(manifests)
  const hasFailure = results.some((result) => result.state === "unavailable" || result.state === "error")
  const state: DeviceCapabilitySnapshot["state"] = devices.length
    ? hasFailure ? "partial" : "available"
    : results.every((result) => result.state === "empty") ? "empty" : hasFailure ? "unavailable" : "error"
  return {
    schema: DEVICE_CAPABILITY_SNAPSHOT_SCHEMA, state, checkedAt, devices,
    sources: results.map(({ sourceRef, state, rows, message }) => ({ sourceRef, state, recordCount: rows.length, message })),
    rejectedRecords,
    message: devices.length
      ? `${devices.length} explicit device manifest${devices.length === 1 ? "" : "s"} aggregated; sensor capability remains declaration-only until a passive adapter supplies samples.`
      : state === "empty" ? "Every available registry returned an authoritative empty device list." : "No device manifest is available; no device absence is inferred.",
  }
}
