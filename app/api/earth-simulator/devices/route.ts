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
const DEVICES_CACHE_TTL_MS = 15_000;
const DEVICE_ONLINE_GRACE_MS = 2 * 60_000;
const ENABLE_COM4_TELEMETRY_FALLBACK =
  process.env.EARTH_SIM_DEVICES_ENABLE_COM4_TELEMETRY_FALLBACK === "1";
const DISABLE_SENSOR_COMMAND_SNAPSHOT =
  process.env.EARTH_SIM_DEVICES_DISABLE_SENSOR_COMMAND_SNAPSHOT !== "0";
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

async function fetchNetworkTelemetrySnapshot(deviceId: string): Promise<Record<string, unknown> | null> {
  try {
    const res = await fetch(`${MAS_API_URL}/api/devices/${encodeURIComponent(deviceId)}/telemetry`, {
      cache: "no-store",
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(1500),
    })
    if (!res.ok) return null
    const data = (await res.json()) as Record<string, unknown>
    const telemetry = data.telemetry
    return telemetry && typeof telemetry === "object" ? telemetry as Record<string, unknown> : null
  } catch {
    return null
  }
}

async function fetchLocalMycoBrainTelemetrySnapshot(
  baseUrl: string,
  deviceId: string
): Promise<Record<string, unknown> | null> {
  try {
    const res = await fetch(`${baseUrl.replace(/\/+$/, "")}/devices/${encodeURIComponent(deviceId)}/telemetry`, {
      cache: "no-store",
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(900),
    })
    if (!res.ok) return null
    const data = (await res.json()) as Record<string, unknown>
    const telemetry = data.telemetry
    return telemetry && typeof telemetry === "object" ? telemetry as Record<string, unknown> : null
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

function buildPsathyrellaTelemetryFromSensorResponse(response: string): Record<string, unknown> | null {
  const jsonMessages = parseJsonObjectsFromMixedSerial(response)
  for (const msg of jsonMessages) {
    if (!msg || typeof msg !== "object") continue
    const record = msg as Record<string, any>
    const bme = record.bme688 && typeof record.bme688 === "object" ? record.bme688 : null
    const a = normalizeBmeSlot(bme?.a ?? record.bme1)
    const b = normalizeBmeSlot(bme?.b ?? record.bme2)
    if (!a && !b) continue

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
  return null
}

async function fetchLocalMycoBrainSensorCommandSnapshot(
  baseUrl: string,
  deviceId: string
): Promise<Record<string, unknown> | null> {
  try {
    const res = await fetch(`${baseUrl.replace(/\/+$/, "")}/devices/${encodeURIComponent(deviceId)}/command`, {
      method: "POST",
      cache: "no-store",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ command: { cmd: "read_sensors" } }),
      signal: AbortSignal.timeout(1200),
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
  if (Object.keys(record).some((key) => key !== "raw")) return true
  return false
}

async function fetchMasDevices(): Promise<Record<string, unknown>[]> {
  try {
    const res = await fetch(`${MAS_API_URL}/api/devices?include_offline=true`, {
      cache: "no-store",
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(3500),
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
      signal: AbortSignal.timeout(900),
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

async function buildDevicesPayload(): Promise<EarthSimDevicesPayload> {
    const mycobrainUrl =
      process.env.MYCOBRAIN_SERVICE_URL ||
      process.env.MYCOBRAIN_API_URL ||
      "http://localhost:8003";

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
        status: toEarthSimConnectionStatus(undefined, probe.online),
        location: field.location,
        location_label: field.location_label,
        lastSeen: probe.last_seen,
        telemetry: probe.telemetry,
        agent_url: probe.agent_url,
        host: probe.host,
        port: field.agent_port,
        source: "operator",
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
    if (psathyrella && !hasUsefulTelemetry(psathyrella.telemetry)) {
      const registryTarget = psathyrella.registry_id || "mycobrain-COM4"
      let telemetry = await fetchLocalMycoBrainTelemetrySnapshot(mycobrainUrl, registryTarget)
      if (!hasUsefulTelemetry(telemetry)) {
        telemetry = await fetchNetworkTelemetrySnapshot(registryTarget)
      }
      if (!hasUsefulTelemetry(telemetry) && !DISABLE_SENSOR_COMMAND_SNAPSHOT) {
        telemetry = await fetchLocalMycoBrainSensorCommandSnapshot(mycobrainUrl, registryTarget)
      }
      if (telemetry) {
        byId.set("psathyrella-buoy-com4", {
          ...psathyrella,
          telemetry,
          status: "connected",
          lastSeen: String(telemetry.timestamp || psathyrella.lastSeen || new Date().toISOString()),
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
        operator: operatorProbes.filter((p) => p.online).length,
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
    if (!nextIsOffline || !remembered) return device

    const withinGrace = now - remembered.at <= DEVICE_ONLINE_GRACE_MS
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

export async function GET() {
  const now = Date.now();
  if (devicesCache) {
    const ageMs = now - devicesCache.at;
    if (ageMs <= DEVICES_CACHE_TTL_MS) {
      return NextResponse.json({
        ...devicesCache.payload,
        cache: { hit: true, age_ms: ageMs, stale: false },
      });
    }
    if (!devicesInFlight) {
      devicesInFlight = buildDevicesPayload()
        .then((payload) => {
          payload = stabilizeDevicePayload(payload);
          devicesCache = { at: Date.now(), payload };
          return payload;
        })
        .catch((error) => {
          console.warn("Devices API background refresh failed:", error);
          return devicesCache!.payload;
        })
        .finally(() => {
          devicesInFlight = null;
        });
    }
    return NextResponse.json({
      ...devicesCache.payload,
      cache: { hit: true, age_ms: ageMs, stale: true, revalidating: true },
    });
  }

  if (!devicesInFlight) {
    devicesInFlight = buildDevicesPayload()
      .then((payload) => {
        payload = stabilizeDevicePayload(payload);
        devicesCache = { at: Date.now(), payload };
        return payload;
      })
      .finally(() => {
        devicesInFlight = null;
      });
  }

  try {
    const payload = await devicesInFlight;
    return NextResponse.json({
      ...payload,
      cache: { hit: false, age_ms: 0, stale: false },
    });
  } catch (error) {
    console.error("Devices API error:", error);
    if (devicesCache) {
      return NextResponse.json({
        ...devicesCache.payload,
        cache: { hit: true, age_ms: Date.now() - devicesCache.at, stale: true },
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
