import { NextResponse } from "next/server";
import { KNOWN_DEVICE_CATALOG } from "@/lib/devices/catalog";
import {
  FIELD_MYCOBRAIN_DEPLOYMENTS,
  deploymentByHost,
  deploymentByRegistryId,
  deploymentForLocalDevice,
  parseLocation,
  toEarthSimConnectionStatus,
} from "@/lib/devices/field-deployments";
import { probeAllOperatorAgents } from "@/lib/devices/operator-probe"
import { resolveDevBenchLocation, DEV_BENCH_LOCATION_LABEL } from "@/lib/devices/dev-bench-location";
import { resolveMasServerBaseUrl } from "@/lib/mas-server-url";

/**
 * Device Locations API — Earth Simulator map markers.
 *
 * Merge order (later wins for same id):
 *   1) KNOWN_DEVICE_CATALOG (types roster)
 *   2) FIELD_MYCOBRAIN_DEPLOYMENTS (fixed SD/Chula Vista sites)
 *   3) MAS device registry (MQTT/heartbeat — works on prod without LAN)
 *   4) LAN operator probes (:8787) when website host can reach 192.168.0.x
 *   5) Local MycoBrain service :8003 serial devices
 */

interface EarthSimDeviceRow {
  id: string
  name: string
  type?: string
  role?: string
  page_href?: string
  firmware_repo?: string | null
  source: "live" | "catalog" | "field" | "mas" | "operator"
  port?: string | number | null
  status?: string
  location: { lat: number; lon: number } | null
  lastSeen?: string | null
  telemetry?: unknown
  agent_url?: string | null
  host?: string | null
  registry_id?: string
  location_label?: string | null
}

type EarthSimDevicesPayload = {
  success: boolean
  devices: EarthSimDeviceRow[]
  count: number
  sources: {
    mas: number
    operator: number
    field_deployments: number
  }
  mas_url: string
  timestamp: string
}

const MAS_API_URL = resolveMasServerBaseUrl();
const DEVICES_CACHE_TTL_MS = 8_000;
const DEVICE_ONLINE_GRACE_MS = 10 * 60_000;
const FIELD_OPERATOR_DEVICE_IDS = new Set(["mushroom-1", "hyphae-1", "psathyrella-buoy-com4"]);

function operatorProbeEarthSimStatus(
  probe: { reachable: boolean; online: boolean },
  previousStatus: string | undefined
): string {
  if (probe.reachable) {
    return toEarthSimConnectionStatus(undefined, probe.online);
  }
  if (previousStatus === "connected" || previousStatus === "online") {
    return previousStatus;
  }
  return "stale";
}
const ENABLE_COM4_TELEMETRY_FALLBACK =
  process.env.EARTH_SIM_DEVICES_ENABLE_COM4_TELEMETRY_FALLBACK === "1";
/** Sensor command is required for Psathyrella BME (envelope on wire); enabled unless explicitly disabled. */
const DISABLE_SENSOR_COMMAND_SNAPSHOT =
  process.env.EARTH_SIM_DEVICES_DISABLE_SENSOR_COMMAND_SNAPSHOT === "1";
let devicesCache: { at: number; payload: EarthSimDevicesPayload } | null = null;
let devicesInFlight: Promise<EarthSimDevicesPayload> | null = null;
const lastConnectedDevices = new Map<
  string,
  {
    at: number
    status: string
    telemetry: unknown
    lastSeen?: string | null
    source: EarthSimDeviceRow["source"]
    agent_url?: string | null
    host?: string | null
  }
>();

function boundedTimeoutMs(value: string | undefined, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) && n >= 250 ? Math.min(n, 10_000) : fallback;
}

async function fetchNetworkTelemetrySnapshot(deviceId: string): Promise<Record<string, unknown> | null> {
  try {
    const res = await fetch(`${MAS_API_URL}/api/devices/${encodeURIComponent(deviceId)}/telemetry`, {
      cache: "no-store",
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(700),
    })
    if (!res.ok) return null
    const data = (await res.json()) as Record<string, unknown>
    const telemetry = data.telemetry
    return telemetry && typeof telemetry === "object" ? telemetry as Record<string, unknown> : null
  } catch {
    return null
  }
}

const LOCAL_MYCOBRAIN_TELEMETRY_TIMEOUT_MS = boundedTimeoutMs(
  process.env.EARTH_SIM_DEVICES_TELEMETRY_TIMEOUT_MS,
  4_500
);
const LOCAL_MYCOBRAIN_SENSOR_COMMAND_TIMEOUT_MS = boundedTimeoutMs(
  process.env.EARTH_SIM_DEVICES_SENSOR_COMMAND_TIMEOUT_MS,
  3_500
);
const LOCAL_MYCOBRAIN_DEVICE_LIST_TIMEOUT_MS = boundedTimeoutMs(
  process.env.EARTH_SIM_DEVICES_LIST_TIMEOUT_MS,
  1_200
);

async function fetchLocalMycoBrainTelemetrySnapshot(
  baseUrl: string,
  deviceId: string
): Promise<Record<string, unknown> | null> {
  try {
    const res = await fetch(`${baseUrl.replace(/\/+$/, "")}/devices/${encodeURIComponent(deviceId)}/telemetry`, {
      cache: "no-store",
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(LOCAL_MYCOBRAIN_TELEMETRY_TIMEOUT_MS),
    })
    if (!res.ok) return null
    const data = (await res.json()) as Record<string, unknown>
    const telemetry = data.telemetry
    if (!telemetry || typeof telemetry !== "object") return null
    const record = telemetry as Record<string, unknown>
    if (hasUsefulTelemetry(record)) return record
    const raw = typeof record.raw === "string" ? record.raw : ""
    if (raw) {
      const parsed = buildPsathyrellaTelemetryFromSensorResponse(raw)
      if (parsed) return parsed
    }
    const envelope = record.envelope
    if (envelope && typeof envelope === "object") {
      const parsed = buildPsathyrellaTelemetryFromSensorResponse(JSON.stringify(envelope))
      if (parsed) return parsed
    }
    const bme1 = normalizeBmeSlot(record.bme1)
    if (bme1) {
      return buildPsathyrellaTelemetryFromBmeSlots(raw || JSON.stringify(record), bme1, normalizeBmeSlot(record.bme2))
    }
    return record
  } catch {
    return null
  }
}

function finiteTelemetryNumber(value: unknown): number | undefined {
  const n = Number(value)
  return Number.isFinite(n) ? n : undefined
}

function parseJsonObjectsFromMixedSerial(response: string): unknown[] {
  const found: unknown[] = []
  let depth = 0
  let start = -1
  let inString = false
  let escaped = false

  for (let i = 0; i < response.length; i += 1) {
    const ch = response[i]
    if (inString) {
      if (escaped) escaped = false
      else if (ch === "\\") escaped = true
      else if (ch === "\"") inString = false
      continue
    }
    if (ch === "\"") {
      inString = true
      continue
    }
    if (ch === "{") {
      if (depth === 0) start = i
      depth += 1
      continue
    }
    if (ch === "}" && depth > 0) {
      depth -= 1
      if (depth === 0 && start >= 0) {
        try {
          found.push(JSON.parse(response.slice(start, i + 1)))
        } catch {
          // Ignore serial fragments that look JSON-like but are not valid.
        }
        start = -1
      }
    }
  }

  return found
}

function normalizeBmeSlot(slot: unknown): Record<string, unknown> | null {
  if (!slot || typeof slot !== "object") return null
  const data = slot as Record<string, unknown>
  const normalized: Record<string, unknown> = {
    temperature_c: finiteTelemetryNumber(data.temperature_c ?? data.temp_c ?? data.temperature),
    humidity_pct: finiteTelemetryNumber(data.humidity_pct ?? data.humidity),
    pressure_hpa: finiteTelemetryNumber(data.pressure_hpa ?? data.pressure),
    gas_ohm: finiteTelemetryNumber(data.gas_ohm ?? data.gas_resistance_ohm ?? data.gas_resistance),
    iaq: finiteTelemetryNumber(data.iaq),
    co2_equivalent: finiteTelemetryNumber(data.co2_equivalent ?? data.co2eq ?? data.eco2_ppm),
    voc_equivalent: finiteTelemetryNumber(data.voc_equivalent ?? data.voc ?? data.bvoc_ppm),
  }
  for (const key of Object.keys(normalized)) {
    if (normalized[key] === undefined) delete normalized[key]
  }
  return Object.keys(normalized).length ? normalized : null
}

/** When MDP JSON is truncated on the wire, still extract BME readings by unit from the raw string. */
function normalizeBmeSlotFromEnvelopeRegex(response: string): Record<string, unknown> | null {
  const slot: Record<string, unknown> = {}
  const unitValue = (unit: string) => {
    const re = new RegExp(`"v"\\s*:\\s*([-+0-9.eE]+)\\s*,\\s*"u"\\s*:\\s*"${unit}"`, "i")
    const match = response.match(re)
    if (!match) return undefined
    return finiteTelemetryNumber(match[1])
  }
  const temperature_c = unitValue("C")
  const humidity_pct = unitValue("%")
  const pressure_hpa = unitValue("hPa")
  const gas_ohm = unitValue("Ohm")
  const iaq = unitValue("IAQ")
  if (temperature_c !== undefined) slot.temperature_c = temperature_c
  if (humidity_pct !== undefined) slot.humidity_pct = humidity_pct
  if (pressure_hpa !== undefined) slot.pressure_hpa = pressure_hpa
  if (gas_ohm !== undefined) slot.gas_ohm = gas_ohm
  if (iaq !== undefined) slot.iaq = iaq
  const ppmMatches = [...response.matchAll(/"v"\s*:\s*([-+0-9.eE]+)\s*,\s*"u"\s*:\s*"ppm"/gi)]
  if (ppmMatches[0]) slot.co2_equivalent = finiteTelemetryNumber(ppmMatches[0][1])
  if (ppmMatches[1]) slot.voc_equivalent = finiteTelemetryNumber(ppmMatches[1][1])
  return normalizeBmeSlot(slot)
}

/** MDP envelope pack[] — firmware may ship garbled ids; map by unit + known id suffixes. */
function normalizeBmeSlotFromEnvelopePack(pack: unknown): Record<string, unknown> | null {
  if (!Array.isArray(pack)) return null
  const slot: Record<string, unknown> = {}
  let eco2: number | undefined
  let bvoc: number | undefined

  for (const item of pack) {
    if (!item || typeof item !== "object") continue
    const row = item as Record<string, unknown>
    const unit = String(row.u ?? "").trim()
    const id = String(row.id ?? "").toLowerCase()
    const value = finiteTelemetryNumber(row.v)
    if (value === undefined) continue

    if (unit === "C" || id.endsWith(".tc") || id.includes("temp")) {
      slot.temperature_c = value
    } else if (unit === "%" || id.endsWith(".rh") || id.includes("humid")) {
      slot.humidity_pct = value
    } else if (unit === "hpa" || id.endsWith(".p") || id.includes("press")) {
      slot.pressure_hpa = value
    } else if (unit === "ohm" || id.endsWith(".gas") || id.includes("gas")) {
      slot.gas_ohm = value
    } else if (unit === "iaq" || id.endsWith(".iaq")) {
      slot.iaq = value
    } else if (unit === "ppm") {
      if (id.includes("eco2") || id.includes("co2")) eco2 = value
      else if (id.includes("bvoc") || id.includes("voc")) bvoc = value
      else if (eco2 === undefined) eco2 = value
      else if (bvoc === undefined) bvoc = value
    }
  }

  if (eco2 !== undefined) slot.co2_equivalent = eco2
  if (bvoc !== undefined) slot.voc_equivalent = bvoc
  return normalizeBmeSlot(slot)
}

function buildPsathyrellaTelemetryFromBmeSlots(
  response: string,
  a: Record<string, unknown> | null,
  b: Record<string, unknown> | null
): Record<string, unknown> | null {
  if (!a && !b) return null

  const telemetry: Record<string, unknown> = {
    raw: response,
    bme688: {
      ...(a ? { a } : {}),
      ...(b ? { b } : {}),
    },
    wave_height_m: null,
    water_temperature_c: null,
    wave_period_s: null,
    hydrophone_low: "standby",
    hydrophone_high: "standby",
    transducer: "standby",
    captured_at: new Date().toISOString(),
  }

  if (a) {
    telemetry.temperature_c = a.temperature_c
    telemetry.humidity_pct = a.humidity_pct
    telemetry.pressure_hpa = a.pressure_hpa
    telemetry.gas_resistance_ohm = a.gas_ohm
    telemetry.iaq = a.iaq
    telemetry.eco2_ppm = a.co2_equivalent
    telemetry.bvoc_ppm = a.voc_equivalent
  }
  if (b) {
    telemetry.bme_b_temperature_c = b.temperature_c
    telemetry.bme_b_humidity_pct = b.humidity_pct
    telemetry.bme_b_pressure_hpa = b.pressure_hpa
    telemetry.bme_b_gas_resistance_ohm = b.gas_ohm
    telemetry.bme_b_iaq = b.iaq
    telemetry.bme_b_eco2_ppm = b.co2_equivalent
    telemetry.bme_b_bvoc_ppm = b.voc_equivalent
  }

  return telemetry
}

function buildPsathyrellaTelemetryFromSensorResponse(response: string): Record<string, unknown> | null {
  if (response.includes("mycosoft.envelope.v1")) {
    const fromRegex = normalizeBmeSlotFromEnvelopeRegex(response)
    const fromRegexTelemetry = buildPsathyrellaTelemetryFromBmeSlots(response, fromRegex, null)
    if (fromRegexTelemetry) return fromRegexTelemetry
  }

  const jsonMessages = parseJsonObjectsFromMixedSerial(response)
  for (const msg of jsonMessages) {
    if (!msg || typeof msg !== "object") continue
    const record = msg as Record<string, unknown>

    if (record.schema === "mycosoft.envelope.v1" && Array.isArray(record.pack)) {
      const a = normalizeBmeSlotFromEnvelopePack(record.pack)
      const fromEnvelope = buildPsathyrellaTelemetryFromBmeSlots(response, a, null)
      if (fromEnvelope) return fromEnvelope
    }

    const nested =
      record.envelope && typeof record.envelope === "object"
        ? (record.envelope as Record<string, unknown>)
        : null
    if (nested?.schema === "mycosoft.envelope.v1" && Array.isArray(nested.pack)) {
      const a = normalizeBmeSlotFromEnvelopePack(nested.pack)
      const fromNested = buildPsathyrellaTelemetryFromBmeSlots(response, a, null)
      if (fromNested) return fromNested
    }

    const bme = record.bme688 && typeof record.bme688 === "object" ? record.bme688 : null
    const a = normalizeBmeSlot((bme as Record<string, unknown> | null)?.a ?? record.bme1)
    const b = normalizeBmeSlot((bme as Record<string, unknown> | null)?.b ?? record.bme2)
    const fromLegacy = buildPsathyrellaTelemetryFromBmeSlots(response, a, b)
    if (fromLegacy) return fromLegacy
  }
  return null
}

async function fetchLocalMycoBrainSensorCommandSnapshot(
  baseUrl: string,
  deviceId: string
): Promise<Record<string, unknown> | null> {
  try {
    const url = `${baseUrl.replace(/\/+$/, "")}/devices/${encodeURIComponent(deviceId)}/command?command=${encodeURIComponent("read_sensors")}`
    const res = await fetch(url, {
      method: "POST",
      cache: "no-store",
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(LOCAL_MYCOBRAIN_SENSOR_COMMAND_TIMEOUT_MS),
    })
    if (!res.ok) return null
    const data = (await res.json()) as Record<string, unknown>
    const response = typeof data.response === "string" ? data.response : ""
    return response ? buildPsathyrellaTelemetryFromSensorResponse(response) : null
  } catch {
    return null
  }
}

function hasUsefulTelemetry(telemetry: unknown): boolean {
  if (!telemetry || typeof telemetry !== "object") return false
  const record = telemetry as Record<string, unknown>
  if (finiteTelemetryNumber(record.temperature_c) !== undefined) return true
  if (finiteTelemetryNumber(record.humidity_pct) !== undefined) return true
  const bme = record.bme688
  if (bme && typeof bme === "object") {
    const slots = bme as Record<string, unknown>
    if (normalizeBmeSlot(slots.a) || normalizeBmeSlot(slots.b)) return true
  }
  if (normalizeBmeSlot(record.bme1) || normalizeBmeSlot(record.bme2)) return true
  const envelope = record.envelope
  if (envelope && typeof envelope === "object") {
    const env = envelope as Record<string, unknown>
    if (env.schema === "mycosoft.envelope.v1" && normalizeBmeSlotFromEnvelopePack(env.pack)) return true
  }
  if (record.schema === "mycosoft.envelope.v1" && normalizeBmeSlotFromEnvelopePack(record.pack)) return true
  return false
}

function resolvePsathyrellaSerialDeviceId(
  localDevices: Record<string, unknown>[],
  registryId: string
): string {
  for (const device of localDevices) {
    const serialId = String(device.device_id ?? device.id ?? "")
    const portalId = String(device.registry_id ?? device.portal_device_id ?? "")
    const role = String(device.device_role ?? device.role ?? "").toLowerCase()
    if (!serialId) continue
    if (portalId === registryId || serialId === registryId || role === "psathyrella") {
      return serialId
    }
  }
  return registryId
}

async function fetchMasDevices(): Promise<Record<string, unknown>[]> {
  try {
    const res = await fetch(`${MAS_API_URL}/api/devices?include_offline=true`, {
      cache: "no-store",
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(1200),
    });
    if (!res.ok) return [];
    const data = (await res.json()) as { devices?: Record<string, unknown>[] };
    return data.devices || [];
  } catch {
    return [];
  }
}

async function fetchLocalMycoBrainDevices(baseUrl: string): Promise<Record<string, unknown>[]> {
  try {
    const response = await fetch(`${baseUrl.replace(/\/+$/, "")}/devices`, {
      cache: "no-store",
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(LOCAL_MYCOBRAIN_DEVICE_LIST_TIMEOUT_MS),
    });
    if (!response.ok) return [];
    const data = (await response.json()) as { devices?: Record<string, unknown>[] };
    return Array.isArray(data.devices) ? data.devices : [];
  } catch {
    return [];
  }
}

function mergeMasDevice(
  byId: Map<string, EarthSimDeviceRow>,
  d: Record<string, unknown>
) {
  const id = String(d.device_id ?? d.id ?? "");
  if (!id) return;

  const host = typeof d.host === "string" ? d.host : null;
  const field = host ? deploymentByHost(host) : undefined;
  const extra = (d.extra as Record<string, unknown>) || {};
  const agentUrl =
    (typeof extra.agent_url === "string" ? extra.agent_url : null) ||
    (host ? `http://${host}:${d.port ?? 8787}` : null);

  const loc =
    field?.location ||
    parseLocation(d.location) ||
    parseLocation(extra.location) ||
    resolveDevBenchLocation(id, host) ||
    null;

  const existing = byId.get(field?.catalog_id || id);
  byId.set(field?.catalog_id || id, {
    id: field?.catalog_id || id,
    registry_id: id,
    name: field?.name ?? String(d.device_display_name ?? d.device_name ?? id),
    type: field?.role ?? String(d.device_role ?? existing?.type ?? "mycobrain"),
    role: String(d.device_role ?? field?.role ?? existing?.role ?? "standalone"),
    page_href: field?.page_href ?? existing?.page_href,
    firmware_repo: existing?.firmware_repo ?? null,
    port: d.port as string | number | undefined,
    status: toEarthSimConnectionStatus(String(d.status ?? "")),
    location: loc,
    location_label:
      field?.location_label ??
      (resolveDevBenchLocation(id, host) ? DEV_BENCH_LOCATION_LABEL : null) ??
      existing?.location_label ??
      null,
    lastSeen: typeof d.last_seen === "string" ? d.last_seen : null,
    telemetry: extra.latest_telemetry ?? existing?.telemetry ?? null,
    source: "mas",
    agent_url: agentUrl,
    host,
  });
}

function seedBaseDeviceRows(): Map<string, EarthSimDeviceRow> {
  const byId = new Map<string, EarthSimDeviceRow>();

  for (const entry of KNOWN_DEVICE_CATALOG) {
    byId.set(entry.id, {
      id: entry.id,
      name: entry.name,
      type: entry.type,
      role: entry.role,
      page_href: entry.page_href,
      firmware_repo: entry.firmware_repo,
      status: entry.status,
      location: entry.default_location,
      lastSeen: null,
      telemetry: null,
      source: "catalog",
    });
  }

  for (const field of FIELD_MYCOBRAIN_DEPLOYMENTS) {
    byId.set(field.catalog_id, {
      id: field.catalog_id,
      registry_id: field.registry_id,
      name: field.name,
      type: field.role,
      role: field.role,
      page_href: field.page_href,
      firmware_repo: "mycobrain/firmware",
      status: "offline",
      location: field.location,
      location_label: field.location_label,
      lastSeen: null,
      telemetry: null,
      source: "field",
      agent_url: field.agent_url,
      host: field.host_ip,
      port: field.agent_port,
    });
  }

  return byId;
}

function buildBootstrapDevicesPayload(): EarthSimDevicesPayload {
  const devices = Array.from(seedBaseDeviceRows().values()).filter((d) => d.location != null);
  return {
    success: true,
    devices,
    count: devices.length,
    sources: {
      mas: 0,
      operator: 0,
      field_deployments: FIELD_MYCOBRAIN_DEPLOYMENTS.length,
    },
    mas_url: MAS_API_URL,
    timestamp: new Date().toISOString(),
  };
}

async function buildDevicesPayload(): Promise<EarthSimDevicesPayload> {
    const mycobrainUrl =
      process.env.MYCOBRAIN_SERVICE_URL ||
      process.env.MYCOBRAIN_API_URL ||
      "http://localhost:8003";

    const byId = seedBaseDeviceRows();

    const [masDevices, operatorProbes, localMycoBrainDevices] = await Promise.all([
      fetchMasDevices(),
      probeAllOperatorAgents(),
      fetchLocalMycoBrainDevices(mycobrainUrl),
    ]);

    for (const d of masDevices) mergeMasDevice(byId, d);

    for (const probe of operatorProbes) {
      const field = deploymentByHost(probe.host);
      if (!field) continue;
      const prev = byId.get(field.catalog_id);
      const status = operatorProbeEarthSimStatus(probe, prev?.status);
      const telemetry =
        probe.telemetry ??
        (hasUsefulTelemetry(prev?.telemetry) ? (prev?.telemetry as Record<string, unknown>) : null);
      byId.set(field.catalog_id, {
        ...(prev || {
          id: field.catalog_id,
          registry_id: field.registry_id,
          name: field.name,
          role: field.role,
          page_href: field.page_href,
          firmware_repo: "mycobrain/firmware",
          source: "operator",
        }),
        status,
        location: field.location,
        location_label: field.location_label,
        lastSeen: probe.last_seen ?? prev?.lastSeen ?? null,
        telemetry,
        agent_url: probe.agent_url,
        host: probe.host,
        port: field.agent_port,
        source: probe.reachable ? "operator" : prev?.source ?? "operator",
      });
    }

        for (const device of localMycoBrainDevices) {
          const d = device as Record<string, unknown>;
          const id = String(d.device_id ?? d.id ?? "");
          const portalId = String(d.registry_id ?? d.portal_device_id ?? id);
          const role = String(d.device_role ?? d.role ?? "");
          if (!id) continue;
          const field = deploymentForLocalDevice(id, role, portalId);
          const normalized =
            field?.location ||
            parseLocation(d.location) ||
            resolveDevBenchLocation(portalId || id, null, role || field?.role);
          if (!normalized) continue;
          const portVal = (d.port as string | number | undefined) ?? null;
          const rowId = field?.catalog_id || portalId || id;
          const existing = byId.get(rowId);
          byId.set(rowId, {
            ...(existing || {}),
            id: rowId,
            registry_id: portalId || field?.registry_id || id,
            name: field?.name ?? String(d.name ?? d.device_id ?? id),
            type: field?.role ?? role ?? "mycobrain",
            role: field?.role ?? role ?? "standalone",
            port: portVal,
            status: toEarthSimConnectionStatus(String(d.status ?? "")),
            location: normalized,
            location_label: field?.location_label ?? null,
            page_href: field?.page_href || `/natureos/mycobrain?device=${encodeURIComponent(portalId || field?.registry_id || id)}`,
            lastSeen:
              (d.last_seen as string | undefined) ??
              (d.lastSeen as string | undefined) ??
              null,
            telemetry: d.telemetry ?? existing?.telemetry ?? null,
            source: "live",
            agent_url: field?.agent_url ?? existing?.agent_url ?? null,
            host: field?.host_ip ?? existing?.host ?? null,
          });
        }

    const psathyrella = byId.get("psathyrella-buoy-com4")
    const localPsathyrellaConnected = localMycoBrainDevices.some((device) => {
      const d = device as Record<string, unknown>
      const role = String(d.device_role ?? d.role ?? "").toLowerCase()
      const status = String(d.status ?? "").toLowerCase()
      return role === "psathyrella" && (status === "connected" || status === "online")
    })
    const canRefreshPsathyrellaTelemetry =
      ENABLE_COM4_TELEMETRY_FALLBACK ||
      localPsathyrellaConnected ||
      psathyrella?.status === "connected" ||
      psathyrella?.status === "online"
    if (psathyrella && canRefreshPsathyrellaTelemetry && !hasUsefulTelemetry(psathyrella.telemetry)) {
      const registryTarget = psathyrella.registry_id || "mycobrain-COM4"
      const serialTarget = resolvePsathyrellaSerialDeviceId(localMycoBrainDevices, registryTarget)
      let telemetry: Record<string, unknown> | null = null

      telemetry = await fetchLocalMycoBrainTelemetrySnapshot(mycobrainUrl, registryTarget)
      if (!hasUsefulTelemetry(telemetry)) {
        telemetry = serialTarget !== registryTarget
          ? await fetchLocalMycoBrainTelemetrySnapshot(mycobrainUrl, serialTarget)
          : null
      }
      if (telemetry && !hasUsefulTelemetry(telemetry)) {
        const parsed = buildPsathyrellaTelemetryFromSensorResponse(
          typeof telemetry.raw === "string" ? telemetry.raw : JSON.stringify(telemetry.envelope ?? telemetry)
        )
        if (parsed) telemetry = parsed
      }
      if (!hasUsefulTelemetry(telemetry) && !DISABLE_SENSOR_COMMAND_SNAPSHOT) {
        telemetry = await fetchLocalMycoBrainSensorCommandSnapshot(mycobrainUrl, registryTarget)
        if (!hasUsefulTelemetry(telemetry) && serialTarget !== registryTarget) {
          telemetry = await fetchLocalMycoBrainSensorCommandSnapshot(mycobrainUrl, serialTarget)
        }
      }
      if (!hasUsefulTelemetry(telemetry)) {
        telemetry = await fetchNetworkTelemetrySnapshot(registryTarget)
      }
      if (telemetry && hasUsefulTelemetry(telemetry)) {
        byId.set("psathyrella-buoy-com4", {
          ...psathyrella,
          telemetry,
          status: "connected",
          lastSeen: String(
            telemetry.captured_at || telemetry.timestamp || psathyrella.lastSeen || new Date().toISOString()
          ),
        })
      }
    }

    const devices = Array.from(byId.values()).filter((d) => d.location != null);

    return {
      success: true,
      devices,
      count: devices.length,
      sources: {
        mas: masDevices.length,
        operator: operatorProbes.filter((p) => p.reachable && p.online).length,
        field_deployments: FIELD_MYCOBRAIN_DEPLOYMENTS.length,
      },
      mas_url: MAS_API_URL,
      timestamp: new Date().toISOString(),
    };
}

function stabilizeDevicePayload(payload: EarthSimDevicesPayload): EarthSimDevicesPayload {
  const now = Date.now()
  const devices = payload.devices.map((device) => {
    const remembered = lastConnectedDevices.get(device.id)
    const nextIsOffline = device.status === "offline" || !device.status
    const nextIsStale = device.status === "stale"
    if ((!nextIsOffline && !nextIsStale) || !remembered) return device

    const graceMs = FIELD_OPERATOR_DEVICE_IDS.has(device.id)
      ? DEVICE_ONLINE_GRACE_MS
      : 2 * 60_000
    const withinGrace = now - remembered.at <= graceMs
    if (!withinGrace) return device

    return {
      ...device,
      status: remembered.status,
      telemetry: hasUsefulTelemetry(device.telemetry) ? device.telemetry : remembered.telemetry,
      lastSeen: device.lastSeen || remembered.lastSeen,
      source: remembered.source,
      agent_url: device.agent_url || remembered.agent_url,
      host: device.host || remembered.host,
    }
  })

  for (const device of devices) {
    if (device.status === "connected" || device.status === "online") {
      lastConnectedDevices.set(device.id, {
        at: now,
        status: device.status,
        telemetry: device.telemetry,
        lastSeen: device.lastSeen,
        source: device.source,
        agent_url: device.agent_url,
        host: device.host,
      })
    }
  }

  return { ...payload, devices }
}

function earthSimDevicesResponse(
  payload: EarthSimDevicesPayload,
  cache: Record<string, unknown>
) {
  const stabilized = stabilizeDevicePayload(payload)
  return NextResponse.json({ ...stabilized, cache })
}

function startDevicesRefresh(): Promise<EarthSimDevicesPayload> {
  if (!devicesInFlight) {
    devicesInFlight = buildDevicesPayload()
      .then((payload) => {
        payload = stabilizeDevicePayload(payload);
        devicesCache = { at: Date.now(), payload };
        return payload;
      })
      .catch((error) => {
        console.warn("Devices API refresh failed:", error);
        if (devicesCache) return devicesCache.payload;
        throw error;
      })
      .finally(() => {
        devicesInFlight = null;
      });
  }
  return devicesInFlight;
}

export async function GET(request: Request) {
  const now = Date.now();
  const searchParams = new URL(request.url).searchParams;
  const forceRefresh = searchParams.get("refresh") === "1";
  const waitForRefresh = searchParams.get("wait") === "1" || searchParams.get("blocking") === "1";
  if (devicesCache) {
    const ageMs = now - devicesCache.at;
    if (forceRefresh) {
      const refresh = startDevicesRefresh();
      if (waitForRefresh) {
        const payload = await refresh;
        return earthSimDevicesResponse(payload, { hit: false, age_ms: 0, stale: false, forced: true });
      }
      return earthSimDevicesResponse(devicesCache.payload, {
        hit: true,
        age_ms: ageMs,
        stale: true,
        revalidating: true,
        forced: true,
      });
    }
    if (ageMs <= DEVICES_CACHE_TTL_MS && !waitForRefresh) {
      return earthSimDevicesResponse(devicesCache.payload, {
        hit: true,
        age_ms: ageMs,
        stale: false,
      });
    }
    const refresh = startDevicesRefresh();
    if (waitForRefresh) {
      const payload = await refresh;
      return earthSimDevicesResponse(payload, { hit: false, age_ms: 0, stale: false });
    }
    return earthSimDevicesResponse(devicesCache.payload, {
      hit: true,
      age_ms: ageMs,
      stale: true,
      revalidating: true,
    });
  }

  const refresh = startDevicesRefresh();
  if (!waitForRefresh) {
    const payload = stabilizeDevicePayload(buildBootstrapDevicesPayload());
    devicesCache = { at: now, payload };
    return earthSimDevicesResponse(payload, {
      hit: false,
      age_ms: 0,
      stale: true,
      bootstrap: true,
      revalidating: true,
    });
  }

  try {
    const payload = await refresh;
    return earthSimDevicesResponse(payload, { hit: false, age_ms: 0, stale: false });
  } catch (error) {
    console.error("Devices API error:", error);
    if (devicesCache) {
      return earthSimDevicesResponse(devicesCache.payload, {
        hit: true,
        age_ms: Date.now() - devicesCache.at,
        stale: true,
      });
    }
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
