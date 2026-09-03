/**
 * Pure contracts for carrying a read-only sensing scope between Fusarium tools.
 *
 * Query values are display/filter context only. They never authenticate a user,
 * authorize a device read, prove telemetry, or grant command authority.
 */

export const SENSING_SCOPE_SCHEMA = "fusarium-sensing-scope/v1" as const

export const SENSING_SCOPE_KINDS = [
  "unbound",
  "devices",
  "mission",
  "location",
  "environment",
] as const

export type SensingScopeKind = (typeof SENSING_SCOPE_KINDS)[number]

export interface SensingScope {
  schema: typeof SENSING_SCOPE_SCHEMA
  kind: SensingScopeKind
  deviceIds: readonly string[]
  contextId: string | null
  contextLabel: string | null
}

export const UNBOUND_SENSING_SCOPE: SensingScope = {
  schema: SENSING_SCOPE_SCHEMA,
  kind: "unbound",
  deviceIds: [],
  contextId: null,
  contextLabel: null,
}

export const SENSING_SCOPE_QUERY_KEYS = [
  "senseScope",
  "deviceId",
  "missionId",
  "missionLabel",
  "locationId",
  "locationLabel",
  "environmentId",
  "environmentLabel",
] as const

interface SearchParamsReader {
  get(name: string): string | null
  getAll(name: string): string[]
}

function cleanQueryValue(value: unknown, maximum = 160): string | null {
  if (typeof value !== "string") return null
  const clean = value.replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0, maximum)
  return clean || null
}

function unique(values: readonly string[]): string[] {
  return [...new Set(values)]
}

export function normalizeSensingScope(input: Partial<SensingScope>): SensingScope {
  const candidateKind = cleanQueryValue(input.kind, 24)
  const kind = SENSING_SCOPE_KINDS.includes(candidateKind as SensingScopeKind)
    ? candidateKind as SensingScopeKind
    : "unbound"
  const deviceIds = unique(
    (Array.isArray(input.deviceIds) ? input.deviceIds : [])
      .map((value) => cleanQueryValue(value))
      .filter((value): value is string => value !== null),
  ).slice(0, 50)
  const contextId = cleanQueryValue(input.contextId)
  const contextLabel = cleanQueryValue(input.contextLabel, 240)

  if (kind === "devices") {
    return { schema: SENSING_SCOPE_SCHEMA, kind, deviceIds, contextId: null, contextLabel: null }
  }
  if (kind === "mission" || kind === "location" || kind === "environment") {
    return { schema: SENSING_SCOPE_SCHEMA, kind, deviceIds: [], contextId, contextLabel }
  }
  return { ...UNBOUND_SENSING_SCOPE }
}

export function parseSensingScope(params: SearchParamsReader): SensingScope {
  const explicitKind = cleanQueryValue(params.get("senseScope"), 24)
  const deviceIds = params.getAll("deviceId")
  const inferredKind: SensingScopeKind = explicitKind && SENSING_SCOPE_KINDS.includes(explicitKind as SensingScopeKind)
    ? explicitKind as SensingScopeKind
    : deviceIds.length > 0
      ? "devices"
      : params.get("missionId")
        ? "mission"
        : params.get("locationId")
          ? "location"
          : params.get("environmentId")
            ? "environment"
            : "unbound"
  const key = inferredKind === "mission"
    ? "mission"
    : inferredKind === "location"
      ? "location"
      : inferredKind === "environment"
        ? "environment"
        : null

  return normalizeSensingScope({
    kind: inferredKind,
    deviceIds,
    contextId: key ? params.get(`${key}Id`) : null,
    contextLabel: key ? params.get(`${key}Label`) : null,
  })
}

export function sensingScopeIsBound(scope: SensingScope): boolean {
  if (scope.kind === "devices") return scope.deviceIds.length > 0
  if (scope.kind === "mission" || scope.kind === "location" || scope.kind === "environment") {
    return scope.contextId !== null
  }
  return false
}

export function describeSensingScope(scope: SensingScope): string {
  if (scope.kind === "devices") {
    if (scope.deviceIds.length === 0) return "Device scope selected; no inventory-backed device chosen"
    return `${scope.deviceIds.length} device${scope.deviceIds.length === 1 ? "" : "s"}`
  }
  if (scope.kind === "mission" || scope.kind === "location" || scope.kind === "environment") {
    const title = scope.kind[0].toUpperCase() + scope.kind.slice(1)
    if (!scope.contextId) return `${title} scope selected; identifier not supplied`
    return `${title}: ${scope.contextLabel ?? scope.contextId}`
  }
  return "Unbound sensing scope"
}

export function writeSensingScope(params: URLSearchParams, input: SensingScope): URLSearchParams {
  const next = new URLSearchParams(params)
  for (const key of SENSING_SCOPE_QUERY_KEYS) next.delete(key)
  const scope = normalizeSensingScope(input)
  if (scope.kind === "unbound") return next

  next.set("senseScope", scope.kind)
  if (scope.kind === "devices") {
    for (const deviceId of scope.deviceIds) next.append("deviceId", deviceId)
    return next
  }

  if (scope.contextId) next.set(`${scope.kind}Id`, scope.contextId)
  if (scope.contextLabel) next.set(`${scope.kind}Label`, scope.contextLabel)
  return next
}

export function sensingScopeHref(
  pathname: string,
  scope: SensingScope,
  currentParams: URLSearchParams = new URLSearchParams(),
): string {
  if (!pathname.startsWith("/") || pathname.startsWith("//") || /^https?:/i.test(pathname)) {
    throw new Error("sensing scope handoffs require a same-origin absolute path")
  }
  const query = writeSensingScope(currentParams, scope).toString()
  return query ? `${pathname}?${query}` : pathname
}

export function sensingScopeContainsDevice(scope: SensingScope, deviceId: string | null | undefined): boolean | null {
  if (scope.kind !== "devices") return null
  const cleanId = cleanQueryValue(deviceId)
  if (!cleanId) return false
  return scope.deviceIds.includes(cleanId)
}

export type SensingInventoryState = "loading" | "available" | "partial" | "empty" | "unavailable" | "error"
export type SensingRegistryKind = "device-registry" | "fci-registry"
export type SensingContextKind = Extract<SensingScopeKind, "mission" | "location" | "environment">

export interface SensingRegistryContext {
  id: string
  label: string
  identifierSource: "registry-id" | "registry-label"
}

export interface SensingDeviceInventoryRecord {
  id: string
  name: string
  type: string | null
  status: string | null
  locationLabel: string | null
  locationContexts: readonly SensingRegistryContext[]
  environmentContexts: readonly SensingRegistryContext[]
  declaredCapabilities: readonly string[]
  registryKinds: readonly SensingRegistryKind[]
  sourceEndpoints: readonly string[]
}

export interface SensingInventorySnapshot {
  state: SensingInventoryState
  devices: readonly SensingDeviceInventoryRecord[]
  message: string
  rejectedRecords: number
  checkedEndpoints: readonly string[]
}

export interface SensingContextSuggestion extends SensingRegistryContext {
  kind: Extract<SensingContextKind, "location" | "environment">
  deviceIds: readonly string[]
}

export type SensingSuggestionState = SensingInventoryState | "unbound"

export interface SensingContextSuggestionSnapshot {
  kind: SensingContextKind
  state: SensingSuggestionState
  suggestions: readonly SensingContextSuggestion[]
  message: string
}

/**
 * The website session contract and the Fusarium runtime operator identity are
 * separate today. Runtime contexts are owner-filtered, but no source contract
 * authoritatively maps the signed-in website user to that operator identity.
 */
export const UNBOUND_CURRENT_USER_MISSION_SUGGESTIONS: SensingContextSuggestionSnapshot = {
  kind: "mission",
  state: "unbound",
  suggestions: [],
  message: "Current-user mission suggestions are unbound because the website session is not authoritatively mapped to the Fusarium runtime operator identity.",
}

function recordValue(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null
}

function first(record: Record<string, unknown>, ...keys: string[]): unknown {
  for (const key of keys) if (record[key] !== undefined) return record[key]
  return undefined
}

function strings(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return unique(value.map((item) => cleanQueryValue(item)).filter((item): item is string => item !== null))
}

function contextFromRecord(
  row: Record<string, unknown>,
  kind: "location" | "environment",
): SensingRegistryContext | null {
  const metadata = recordValue(row.metadata)
  const directValue = first(row, kind)
  const metadataValue = metadata ? first(metadata, kind) : undefined
  const nested = recordValue(directValue)
  const metadataNested = recordValue(metadataValue)
  const exactString = cleanQueryValue(directValue, 240) ?? cleanQueryValue(metadataValue, 240)
  const id = cleanQueryValue(first(row, `${kind}_id`, `${kind}Id`))
    ?? (nested ? cleanQueryValue(first(nested, "id", `${kind}_id`, `${kind}Id`)) : null)
    ?? (metadata ? cleanQueryValue(first(metadata, `${kind}_id`, `${kind}Id`)) : null)
    ?? (metadataNested ? cleanQueryValue(first(metadataNested, "id", `${kind}_id`, `${kind}Id`)) : null)
  const label = cleanQueryValue(first(row, `${kind}_label`, `${kind}Label`), 240)
    ?? (nested ? cleanQueryValue(first(nested, "name", "label"), 240) : null)
    ?? (metadata ? cleanQueryValue(first(metadata, `${kind}_label`, `${kind}Label`), 240) : null)
    ?? (metadataNested ? cleanQueryValue(first(metadataNested, "name", "label"), 240) : null)
    ?? exactString
  const exactIdentifier = id ?? label
  if (!exactIdentifier) return null
  return {
    id: exactIdentifier,
    label: label ?? exactIdentifier,
    identifierSource: id ? "registry-id" : "registry-label",
  }
}

function mergeRegistryContexts(
  left: readonly SensingRegistryContext[],
  right: readonly SensingRegistryContext[],
): SensingRegistryContext[] {
  const byId = new Map<string, SensingRegistryContext>()
  for (const context of [...left, ...right]) {
    const current = byId.get(context.id)
    if (!current || (current.identifierSource === "registry-label" && context.identifierSource === "registry-id")) {
      byId.set(context.id, context)
    }
  }
  return [...byId.values()].sort((a, b) => a.label.localeCompare(b.label))
}

function parseInventoryDevice(
  value: unknown,
  kind: SensingRegistryKind,
  endpoint: string,
): SensingDeviceInventoryRecord | null {
  const row = recordValue(value)
  if (!row) return null
  const id = cleanQueryValue(first(row, "id", "device_id", "deviceId"))
  if (!id || id.toLowerCase().startsWith("demo-")) return null
  const metadata = recordValue(row.metadata)
  const directCapabilities = strings(first(row, "capabilities", "sensors", "modalities"))
  const metadataCapabilities = metadata ? strings(first(metadata, "capabilities", "sensors", "modalities")) : []
  const probeType = cleanQueryValue(first(row, "probe_type", "probeType"))
  const locationContext = contextFromRecord(row, "location")
  const environmentContext = contextFromRecord(row, "environment")

  return {
    id,
    name: cleanQueryValue(first(row, "name", "device_name", "deviceName"), 240) ?? id,
    type: cleanQueryValue(first(row, "type", "device_type", "deviceType")),
    status: cleanQueryValue(first(row, "status", "connection_status", "connectionStatus")),
    locationLabel: locationContext?.label ?? null,
    locationContexts: locationContext ? [locationContext] : [],
    environmentContexts: environmentContext ? [environmentContext] : [],
    declaredCapabilities: unique([...directCapabilities, ...metadataCapabilities, ...(probeType ? [probeType] : [])]),
    registryKinds: [kind],
    sourceEndpoints: [endpoint],
  }
}

export function parseSensingInventoryPayload(
  payload: unknown,
  httpStatus: number,
  kind: SensingRegistryKind,
  endpoint: string,
): SensingInventorySnapshot {
  if (!endpoint.startsWith("/api/")) throw new Error("inventory endpoint must be a same-origin /api/ path")
  const envelope = recordValue(payload)
  if (httpStatus < 200 || httpStatus >= 300) {
    return {
      state: httpStatus === 404 || httpStatus === 503 ? "unavailable" : "error",
      devices: [],
      message: `Inventory request failed (HTTP ${httpStatus}).`,
      rejectedRecords: 0,
      checkedEndpoints: [endpoint],
    }
  }

  const rows = Array.isArray(payload)
    ? payload
    : envelope && Array.isArray(envelope.devices)
      ? envelope.devices
      : null
  if (!rows) {
    return {
      state: "error",
      devices: [],
      message: "Inventory response did not contain a devices array.",
      rejectedRecords: 0,
      checkedEndpoints: [endpoint],
    }
  }

  const parsed = rows.map((row) => parseInventoryDevice(row, kind, endpoint))
  const devices = parsed.filter((device): device is SensingDeviceInventoryRecord => device !== null)
  const rejectedRecords = rows.length - devices.length
  const unavailable = envelope?.available === false || Boolean(cleanQueryValue(envelope?.warning) || cleanQueryValue(envelope?.error))
  if (rows.length > 0 && devices.length === 0) {
    return {
      state: "error",
      devices: [],
      message: "Inventory responded, but no non-demo record passed the sensing device contract.",
      rejectedRecords,
      checkedEndpoints: [endpoint],
    }
  }
  if (devices.length > 0) {
    return {
      state: unavailable ? "partial" : "available",
      devices,
      message: `${devices.length} inventory-backed device record${devices.length === 1 ? "" : "s"} received.`,
      rejectedRecords,
      checkedEndpoints: [endpoint],
    }
  }
  return {
    state: unavailable ? "unavailable" : "empty",
    devices: [],
    message: unavailable
      ? "The registry contract is unavailable; no device absence is inferred."
      : "The available registry returned an authoritative empty device list.",
    rejectedRecords,
    checkedEndpoints: [endpoint],
  }
}

export function combineSensingInventories(
  snapshots: readonly SensingInventorySnapshot[],
): SensingInventorySnapshot {
  const byId = new Map<string, SensingDeviceInventoryRecord>()
  let rejectedRecords = 0
  for (const snapshot of snapshots) {
    rejectedRecords += snapshot.rejectedRecords
    for (const device of snapshot.devices) {
      const current = byId.get(device.id)
      if (!current) {
        byId.set(device.id, device)
        continue
      }
      byId.set(device.id, {
        ...current,
        name: current.name === current.id && device.name !== device.id ? device.name : current.name,
        type: current.type ?? device.type,
        status: current.status ?? device.status,
        locationLabel: current.locationLabel ?? device.locationLabel,
        locationContexts: mergeRegistryContexts(current.locationContexts, device.locationContexts),
        environmentContexts: mergeRegistryContexts(current.environmentContexts, device.environmentContexts),
        declaredCapabilities: unique([...current.declaredCapabilities, ...device.declaredCapabilities]),
        registryKinds: unique([...current.registryKinds, ...device.registryKinds]) as SensingRegistryKind[],
        sourceEndpoints: unique([...current.sourceEndpoints, ...device.sourceEndpoints]),
      })
    }
  }
  const devices = [...byId.values()].sort((left, right) => left.name.localeCompare(right.name))
  const states = snapshots.map((snapshot) => snapshot.state)
  const hasUnavailable = states.some((state) => state === "unavailable" || state === "error")
  const hasPartial = states.includes("partial")
  const state: SensingInventoryState = devices.length > 0
    ? hasUnavailable || hasPartial ? "partial" : "available"
    : states.length === 0 || states.includes("loading")
      ? "loading"
      : hasUnavailable
        ? "unavailable"
        : states.every((item) => item === "empty")
          ? "empty"
          : "error"

  return {
    state,
    devices,
    message: devices.length > 0
      ? `${devices.length} unique inventory-backed device${devices.length === 1 ? "" : "s"} available${state === "partial" ? "; at least one registry remains unavailable" : ""}.`
      : state === "empty"
        ? "Every available registry returned an authoritative empty device list."
        : state === "loading"
          ? "Checking passive device registries."
          : "No selectable device record is available because one or more registries are unbound or invalid.",
    rejectedRecords,
    checkedEndpoints: unique(snapshots.flatMap((snapshot) => snapshot.checkedEndpoints)),
  }
}

export function deriveSensingContextSuggestions(
  inventory: SensingInventorySnapshot,
  kind: "location" | "environment",
): SensingContextSuggestionSnapshot {
  const byId = new Map<string, SensingContextSuggestion>()
  for (const device of inventory.devices) {
    const contexts = kind === "location" ? device.locationContexts : device.environmentContexts
    for (const context of contexts) {
      const current = byId.get(context.id)
      byId.set(context.id, {
        ...context,
        kind,
        deviceIds: unique([...(current?.deviceIds ?? []), device.id]),
      })
    }
  }
  const suggestions = [...byId.values()].sort((a, b) => a.label.localeCompare(b.label))
  const state: SensingSuggestionState = suggestions.length > 0
    ? inventory.state === "available" ? "available" : "partial"
    : inventory.state
  return {
    kind,
    state,
    suggestions,
    message: suggestions.length > 0
      ? `${suggestions.length} exact ${kind} value${suggestions.length === 1 ? "" : "s"} reported by ${inventory.devices.length} registered device${inventory.devices.length === 1 ? "" : "s"}.`
      : inventory.state === "available" || inventory.state === "empty"
        ? `The available device inventory reports no ${kind} identifier or label.`
        : inventory.state === "loading"
          ? `Checking registered devices for ${kind} fields.`
          : `No ${kind} suggestion is available while device inventory is ${inventory.state}.`,
  }
}

export function devicesForSensingScope(
  scope: SensingScope,
  devices: readonly SensingDeviceInventoryRecord[],
): SensingDeviceInventoryRecord[] {
  if (scope.kind === "devices") return devices.filter((device) => scope.deviceIds.includes(device.id))
  if ((scope.kind === "location" || scope.kind === "environment") && scope.contextId) {
    return devices.filter((device) => {
      const contexts = scope.kind === "location" ? device.locationContexts : device.environmentContexts
      return contexts.some((context) => context.id === scope.contextId)
    })
  }
  return []
}

export type SensingModalityId =
  | "camera"
  | "radar"
  | "lidar"
  | "wifi"
  | "acoustic"
  | "chemical"
  | "particulate"
  | "radiation"
  | "bioelectric"
  | "thermal"
  | "mechanical"

export interface SensingModalityDefinition {
  id: SensingModalityId
  label: string
  tool: string
  href: string
  capabilityAliases: readonly string[]
  adapterState: "unbound"
  adapterMessage: string
}

export const SENSING_MODALITIES: readonly SensingModalityDefinition[] = [
  { id: "camera", label: "Cameras / visible", tool: "BlueSight", href: "/fusarium/bluesight", capabilityAliases: ["camera", "vision", "imaging", "rgb", "video"], adapterState: "unbound", adapterMessage: "No selected-device camera adapter is bound to the Fusarium sensing scope." },
  { id: "radar", label: "Radar", tool: "BlueSight", href: "/fusarium/bluesight", capabilityAliases: ["radar"], adapterState: "unbound", adapterMessage: "No selected-device radar observation adapter is bound." },
  { id: "lidar", label: "LiDAR", tool: "BlueSight", href: "/fusarium/bluesight", capabilityAliases: ["lidar", "point cloud", "point_cloud"], adapterState: "unbound", adapterMessage: "No selected-device LiDAR frame adapter is bound." },
  { id: "wifi", label: "Wi-Fi sensing", tool: "BlueSight", href: "/fusarium/bluesight", capabilityAliases: ["wifi sense", "wifi_sense", "wifisense", "rf sensing", "csi"], adapterState: "unbound", adapterMessage: "No selected-device passive Wi-Fi sensing adapter is bound." },
  { id: "acoustic", label: "Audio / SINE", tool: "SINE", href: "/fusarium/sine", capabilityAliases: ["audio", "microphone", "mic", "hydrophone", "acoustic", "vibration", "seismic"], adapterState: "unbound", adapterMessage: "SINE evidence tools exist, but no selected-device live acoustic stream is bound." },
  { id: "chemical", label: "Gas / odor", tool: "GANDHA", href: "/fusarium/gandha", capabilityAliases: ["gas", "gas resistance", "gas_resistance", "voc", "iaq", "odor", "smell", "chemical", "nox", "co2"], adapterState: "unbound", adapterMessage: "GANDHA file evidence is available; no passive selected-device chemical stream is bound." },
  { id: "particulate", label: "Particulate", tool: "GANDHA", href: "/fusarium/gandha", capabilityAliases: ["particulate", "particle", "pm1", "pm2.5", "pm10", "bmv080"], adapterState: "unbound", adapterMessage: "Particulate capability may be declared; no selected-device count or size-distribution stream is bound." },
  { id: "radiation", label: "Radiation", tool: "Thermal Field Laboratory", href: "/fusarium/thermal", capabilityAliases: ["radiation", "gamma", "geiger"], adapterState: "unbound", adapterMessage: "Radiation capability may be declared; no selected-device dose or count stream is bound." },
  { id: "bioelectric", label: "Bioelectric / FCI", tool: "FCI", href: "/fusarium/fci", capabilityAliases: ["bioelectric", "fci", "electrode", "electrical potential"], adapterState: "unbound", adapterMessage: "FCI registry records may be selected, but signal-stream handshake evidence remains unbound." },
  { id: "thermal", label: "Thermal", tool: "Thermal Field Laboratory", href: "/fusarium/thermal", capabilityAliases: ["thermal", "radiometric", "infrared", "ir camera", "temperature image"], adapterState: "unbound", adapterMessage: "Thermal file evidence is available; no selected-device radiometric stream is bound." },
  { id: "mechanical", label: "Mechanical / touch", tool: "Tactus — Mechanical", href: "/fusarium/mechanical", capabilityAliases: ["touch", "tactile", "force", "pressure", "proprioception", "joint", "collision", "mechanical"], adapterState: "unbound", adapterMessage: "Mechanical capture evidence is available; no selected-device live robot adapter is bound." },
] as const

function capabilityToken(value: string): string {
  return value.toLowerCase().replace(/[_-]+/g, " ").replace(/[^a-z0-9]+/g, " ").trim()
}

export function deviceSupportsModality(
  device: SensingDeviceInventoryRecord,
  modality: SensingModalityDefinition,
): boolean {
  if (modality.id === "bioelectric" && device.registryKinds.includes("fci-registry")) return true
  const capabilities = device.declaredCapabilities.map(capabilityToken)
  return modality.capabilityAliases.some((alias) => {
    const wanted = capabilityToken(alias)
    return capabilities.some((capability) => capability === wanted || capability.includes(wanted))
  })
}

export function unmappedDeviceCapabilities(device: SensingDeviceInventoryRecord): string[] {
  return device.declaredCapabilities.filter((capability) =>
    !SENSING_MODALITIES.some((modality) => deviceSupportsModality(
      { ...device, declaredCapabilities: [capability], registryKinds: [] },
      modality,
    )),
  )
}
