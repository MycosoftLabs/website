/**
 * NLM ↔ device network bridge (server-side).
 *
 * Root cause this fixes: NLM ingest/live fan-out probed dead paths and never
 * joined MAS Device Registry + MycoBrain MDP telemetry into sensor records
 * with device_id + sensor_id. Training had no binding fields.
 *
 * Rules: real registry/telemetry only. Offline sensors → empty sample (null), never mocks.
 */

import { resolveMasServerBaseUrl } from "@/lib/mas-server-url"
import {
  FIELD_MYCOBRAIN_DEPLOYMENTS,
  deploymentByHost,
  deploymentByRegistryId,
} from "@/lib/devices/field-deployments"
import { normalizeIngestBindings } from "@/lib/nlm/device-ingest-bindings"

export { normalizeIngestBindings } from "@/lib/nlm/device-ingest-bindings"

export interface NlmSensorChannel {
  sensor_id: string
  modality?: string
  status: "online" | "offline" | "stale" | "declared"
  last_sample_age_sec: number | null
  sample: number | Record<string, unknown> | null
  source: string
}

export interface NlmLiveDevice {
  device_id: string
  display_name: string
  role?: string
  status: string
  host?: string
  port?: number
  mdp_device_id?: string | null
  network_href: string
  device_page_href?: string | null
  sensor_channels: string[]
  sensors: NlmSensorChannel[]
  last_sample_age_sec: number | null
  frame_id?: string | null
  source: string
  ingestion_source?: string
}

/** Declared MDP / role sensor catalogs — identity only, not fabricated values. */
const ROLE_SENSOR_CATALOG: Record<string, string[]> = {
  psathyrella: [
    "bme688_ambient",
    "bme688_environment",
    "hydrophone_low",
    "hydrophone_high",
    "transducer",
  ],
  mushroom1: ["bme688", "imu", "gas", "spectral", "bioelectric"],
  hyphae1: ["bme688", "imu", "gas", "spectral"],
  sporebase: ["bme688", "particulate", "optical"],
  mycodrone: ["imu", "baro", "gps", "spectral"],
  gateway: [],
  standalone: ["bme688", "gas"],
  alarm: ["pir", "acoustic"],
}

const SCALAR_SKIP = new Set([
  "device_id",
  "deviceId",
  "id",
  "timestamp",
  "ts",
  "status",
  "host",
  "port",
  "name",
  "role",
  "mdp_path_id",
  "mdp_device_id",
  "source",
  "location",
  "firmware_version",
  "board_type",
])

function stripSlash(url: string): string {
  return url.replace(/\/$/, "")
}

function masBases(): string[] {
  return [
    process.env.MAS_API_URL,
    process.env.NEXT_PUBLIC_MAS_API_URL,
    resolveMasServerBaseUrl(),
    "http://192.168.0.188:8001",
  ]
    .filter(Boolean)
    .map((b) => stripSlash(String(b)))
}

function mycobrainBases(): string[] {
  return [
    process.env.MYCOBRAIN_SERVICE_URL,
    process.env.MYCOBRAIN_API_URL,
    "http://127.0.0.1:8003",
  ]
    .filter(Boolean)
    .map((b) => stripSlash(String(b)))
}

function modalityFor(sensorId: string): string {
  const s = sensorId.toLowerCase()
  if (s.includes("hydro") || s.includes("acoustic") || s.includes("mic")) return "acoustic"
  if (s.includes("spectral") || s.includes("optical")) return "spectral"
  if (s.includes("bme") || s.includes("temp") || s.includes("thermal") || s.includes("baro"))
    return "thermal"
  if (s.includes("gas") || s.includes("chemical") || s.includes("voc")) return "chemical"
  if (s.includes("bio") || s.includes("volt") || s.includes("electrode")) return "bioelectric"
  if (s.includes("imu") || s.includes("accel") || s.includes("gyro")) return "motion"
  return "environmental"
}

function ageFromTs(lastTs: unknown): number | null {
  if (!lastTs) return null
  const ms = new Date(String(lastTs)).getTime()
  if (!Number.isFinite(ms)) return null
  return Math.max(0, Math.round((Date.now() - ms) / 1000))
}

function asRowList(payload: unknown): any[] {
  if (Array.isArray(payload)) return payload
  const p = payload as any
  if (Array.isArray(p?.devices)) return p.devices
  if (Array.isArray(p?.items)) return p.items
  if (Array.isArray(p?.data)) return p.data
  return []
}

function channelsFromDeclared(row: any, role?: string): string[] {
  const channels: string[] = []
  const sensors = row.sensors || row.sensor_channels || row.channels || row.modalities
  if (Array.isArray(sensors)) {
    for (const s of sensors) {
      if (typeof s === "string") channels.push(s)
      else if (s?.id || s?.name || s?.type || s?.sensor_id)
        channels.push(String(s.id || s.sensor_id || s.name || s.type))
    }
  }
  const roleKey = (role || row.device_role || row.role || "").toLowerCase()
  for (const c of ROLE_SENSOR_CATALOG[roleKey] || []) {
    if (!channels.includes(c)) channels.push(c)
  }
  return channels
}

function extractSensorsFromTelemetry(
  telemetry: unknown,
  source: string,
  age: number | null
): NlmSensorChannel[] {
  if (!telemetry || typeof telemetry !== "object") return []
  const out: NlmSensorChannel[] = []
  const walk = (obj: Record<string, unknown>, prefix = "") => {
    for (const [key, value] of Object.entries(obj)) {
      if (SCALAR_SKIP.has(key)) continue
      const sensorId = prefix ? `${prefix}.${key}` : key
      if (value == null) {
        out.push({
          sensor_id: sensorId,
          modality: modalityFor(sensorId),
          status: "offline",
          last_sample_age_sec: age,
          sample: null,
          source,
        })
        continue
      }
      if (typeof value === "number" && Number.isFinite(value)) {
        out.push({
          sensor_id: sensorId,
          modality: modalityFor(sensorId),
          status: age != null && age > 120 ? "stale" : "online",
          last_sample_age_sec: age,
          sample: value,
          source,
        })
        continue
      }
      if (Array.isArray(value) && value.every((v) => typeof v === "number")) {
        out.push({
          sensor_id: sensorId,
          modality: modalityFor(sensorId),
          status: age != null && age > 120 ? "stale" : "online",
          last_sample_age_sec: age,
          sample: { values: value, count: value.length },
          source,
        })
        continue
      }
      if (typeof value === "object" && !Array.isArray(value)) {
        const nested = value as Record<string, unknown>
        const numericEntries = Object.entries(nested).filter(
          ([, v]) => typeof v === "number" && Number.isFinite(v)
        )
        if (numericEntries.length > 0 && numericEntries.length <= 12) {
          out.push({
            sensor_id: sensorId,
            modality: modalityFor(sensorId),
            status: age != null && age > 120 ? "stale" : "online",
            last_sample_age_sec: age,
            sample: Object.fromEntries(numericEntries),
            source,
          })
        } else {
          walk(nested, sensorId)
        }
      }
    }
  }
  walk(telemetry as Record<string, unknown>)
  return out
}

async function fetchJson(url: string, timeoutMs = 2500): Promise<unknown | null> {
  try {
    const res = await fetch(url, {
      cache: "no-store",
      signal: AbortSignal.timeout(timeoutMs),
      headers: { Accept: "application/json" },
    })
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

async function fetchMasRegistry(): Promise<{ devices: any[]; source: string } | null> {
  for (const base of masBases()) {
    const json = await fetchJson(`${base}/api/devices?include_offline=true`, 4000)
    if (!json) continue
    const devices = asRowList(json)
    if (devices.length >= 0) {
      return { devices, source: `${base}/api/devices` }
    }
  }
  return null
}

async function fetchMycoBrainLocal(): Promise<{ devices: any[]; source: string } | null> {
  for (const base of mycobrainBases()) {
    const json = await fetchJson(`${base}/devices`, 2500)
    if (!json) continue
    const devices = asRowList(json)
    return { devices, source: `${base}/devices` }
  }
  return null
}

async function fetchDeviceTelemetry(
  deviceId: string,
  host?: string,
  port?: number
): Promise<{ telemetry: unknown; source: string } | null> {
  // Prefer MAS registry telemetry proxy (resolves MDP path id for gateways)
  for (const base of masBases()) {
    const json = (await fetchJson(
      `${base}/api/devices/${encodeURIComponent(deviceId)}/telemetry`,
      3500
    )) as any
    if (json && (json.telemetry || json.sensors || json.readings || json.data)) {
      return {
        telemetry: json.telemetry || json.sensors || json.readings || json.data || json,
        source: `${base}/api/devices/${deviceId}/telemetry`,
      }
    }
  }

  if (host && port) {
    const agentBase = `http://${host}:${port}`
    for (const path of [
      `/devices/${encodeURIComponent(deviceId)}/telemetry`,
      "/telemetry/latest",
      "/api/sensor",
    ]) {
      const json = await fetchJson(`${agentBase}${path}`, 2000)
      if (json) {
        const t =
          (json as any).telemetry ||
          (json as any).sensors ||
          (json as any).readings ||
          json
        return { telemetry: t, source: `${agentBase}${path}` }
      }
    }
  }

  return null
}

function mergeSensorLists(
  declared: string[],
  live: NlmSensorChannel[]
): NlmSensorChannel[] {
  const byId = new Map<string, NlmSensorChannel>()
  for (const s of live) byId.set(s.sensor_id, s)
  for (const id of declared) {
    if (!byId.has(id)) {
      byId.set(id, {
        sensor_id: id,
        modality: modalityFor(id),
        status: "declared",
        last_sample_age_sec: null,
        sample: null,
        source: "role-catalog",
      })
    }
  }
  return Array.from(byId.values())
}

function toNlmDevice(row: any, source: string): NlmLiveDevice | null {
  const id =
    row.device_id ||
    row.deviceId ||
    row.id ||
    row.node_id ||
    row.identity?.device_id
  if (!id) return null

  const role = row.device_role || row.role || undefined
  const field =
    deploymentByRegistryId(String(id)) ||
    (row.host ? deploymentByHost(String(row.host)) : undefined)

  const displayName = String(
    field?.name ||
      row.device_display_name ||
      row.display_name ||
      row.displayName ||
      row.device_name ||
      row.name ||
      id
  )

  // Heartbeat gateways often report role=gateway; recover mapped role from field or name
  let effectiveRole = field?.role || role
  if (
    (!effectiveRole || effectiveRole === "gateway" || effectiveRole === "standalone") &&
    /psathyrella/i.test(displayName)
  ) {
    effectiveRole = "psathyrella"
  }

  const declared = channelsFromDeclared(row, effectiveRole)
  const age = ageFromTs(row.last_seen || row.lastSeen || row.last_heartbeat || row.updated_at)
  const extra = row.extra || {}
  const mdp =
    extra.mdp_device_id ||
    field?.mdp_device_id ||
    row.mdp_device_id ||
    null

  return {
    device_id: String(id),
    display_name: displayName,
    role: field?.role || effectiveRole,
    status: String(row.status || row.state || "unknown"),
    host: row.host || field?.host_ip,
    port: row.port || field?.agent_port || 8003,
    mdp_device_id: mdp ? String(mdp) : null,
    network_href: `/natureos/devices/network?device=${encodeURIComponent(String(id))}`,
    device_page_href: field?.page_href || null,
    sensor_channels: declared,
    sensors: declared.map((sensor_id) => ({
      sensor_id,
      modality: modalityFor(sensor_id),
      status: "declared" as const,
      last_sample_age_sec: age,
      sample: null,
      source: "role-catalog",
    })),
    last_sample_age_sec: age,
    frame_id: row.frame_id || row.frame_root || row.nmf_id || null,
    source,
    ingestion_source: row.ingestion_source,
  }
}

/**
 * Build live NLM ingest payload from MAS registry + MycoBrain + optional telemetry.
 * Field deployments are merged so mapped MDP devices appear even if heartbeat is gateway-only.
 */
export async function buildNlmDeviceIngestPayload(options?: {
  enrichTelemetry?: boolean
  maxTelemetryFetches?: number
}): Promise<{
  devices: NlmLiveDevice[]
  sensors: Array<{
    device_id: string
    sensor_id: string
    modality?: string
    status: string
    sample: NlmSensorChannel["sample"]
    network_href: string
    last_sample_age_sec: number | null
  }>
  source: "live" | "empty"
  count: number
  note: string
  tried: string[]
}> {
  const enrichTelemetry = options?.enrichTelemetry !== false
  const maxTelemetryFetches = options?.maxTelemetryFetches ?? 6
  const tried: string[] = []
  const byId = new Map<string, NlmLiveDevice>()

  const mas = await fetchMasRegistry()
  if (mas) {
    tried.push(mas.source)
    for (const row of mas.devices) {
      const d = toNlmDevice(row, mas.source)
      if (d) byId.set(d.device_id, d)
    }
  } else {
    tried.push(...masBases().map((b) => `${b}/api/devices`))
  }

  const local = await fetchMycoBrainLocal()
  if (local) {
    tried.push(local.source)
    for (const row of local.devices) {
      const d = toNlmDevice(row, local.source)
      if (!d) continue
      const existing = byId.get(d.device_id)
      if (!existing) byId.set(d.device_id, d)
      else {
        existing.sensor_channels = Array.from(
          new Set([...existing.sensor_channels, ...d.sensor_channels])
        )
      }
    }
  }

  // Ensure field-mapped deployments are visible for NLM ↔ network map linking
  for (const field of FIELD_MYCOBRAIN_DEPLOYMENTS) {
    if (byId.has(field.registry_id)) {
      const d = byId.get(field.registry_id)!
      d.device_page_href = field.page_href
      d.mdp_device_id = d.mdp_device_id || field.mdp_device_id
      d.network_href = `/natureos/devices/network?device=${encodeURIComponent(field.registry_id)}`
      const roleChannels = ROLE_SENSOR_CATALOG[field.role] || []
      d.sensor_channels = Array.from(new Set([...d.sensor_channels, ...roleChannels]))
      continue
    }
    const roleChannels = ROLE_SENSOR_CATALOG[field.role] || []
    byId.set(field.registry_id, {
      device_id: field.registry_id,
      display_name: field.name,
      role: field.role,
      status: "offline",
      host: field.host_ip,
      port: field.agent_port,
      mdp_device_id: field.mdp_device_id,
      network_href: `/natureos/devices/network?device=${encodeURIComponent(field.registry_id)}`,
      device_page_href: field.page_href,
      sensor_channels: roleChannels,
      sensors: roleChannels.map((sensor_id) => ({
        sensor_id,
        modality: modalityFor(sensor_id),
        status: "declared",
        last_sample_age_sec: null,
        sample: null,
        source: "field-map",
      })),
      last_sample_age_sec: null,
      source: "field-map",
      ingestion_source: "mdp-map",
    })
  }

  const devices = Array.from(byId.values())

  if (enrichTelemetry && devices.length > 0) {
    const candidates = devices
      .filter((d) => d.status === "online" || d.host)
      .slice(0, maxTelemetryFetches)

    await Promise.all(
      candidates.map(async (d) => {
        tried.push(`telemetry:${d.device_id}`)
        const tel = await fetchDeviceTelemetry(d.device_id, d.host, d.port)
        if (!tel) return
        const live = extractSensorsFromTelemetry(
          tel.telemetry,
          tel.source,
          d.last_sample_age_sec
        )
        d.sensors = mergeSensorLists(d.sensor_channels, live)
        d.sensor_channels = d.sensors.map((s) => s.sensor_id)
        if (live.some((s) => s.sample != null)) {
          d.status = d.status === "offline" ? "online" : d.status
        }
      })
    )
  } else {
    for (const d of devices) {
      d.sensors = mergeSensorLists(d.sensor_channels, d.sensors)
    }
  }

  const sensors = devices.flatMap((d) =>
    d.sensors.map((s) => ({
      device_id: d.device_id,
      sensor_id: s.sensor_id,
      modality: s.modality,
      status: s.status,
      sample: s.sample,
      network_href: d.network_href,
      last_sample_age_sec: s.last_sample_age_sec,
    }))
  )

  const liveCount = devices.filter((d) => d.status === "online").length
  const hasAny = devices.length > 0

  return {
    devices,
    sensors,
    source: hasAny ? "live" : "empty",
    count: devices.length,
    note: hasAny
      ? `MAS/MycoBrain/field map: ${devices.length} devices (${liveCount} online). Sensor samples null when offline — no synthetic waveforms.`
      : "No MycoBrain / MAS devices registered. Connect a device or wait for heartbeat.",
    tried,
  }
}
