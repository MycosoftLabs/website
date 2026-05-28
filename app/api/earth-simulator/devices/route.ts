import { NextResponse } from "next/server";
import { KNOWN_DEVICE_CATALOG } from "@/lib/devices/catalog";
import {
  FIELD_MYCOBRAIN_DEPLOYMENTS,
  deploymentByHost,
  parseLocation,
  toEarthSimConnectionStatus,
} from "@/lib/devices/field-deployments";
import { probeAllOperatorAgents } from "@/lib/devices/operator-probe";
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

const MAS_API_URL = resolveMasServerBaseUrl();

async function fetchMasDevices(): Promise<Record<string, unknown>[]> {
  try {
    const res = await fetch(`${MAS_API_URL}/api/devices?include_offline=true`, {
      cache: "no-store",
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return [];
    const data = (await res.json()) as { devices?: Record<string, unknown>[] };
    return data.devices || [];
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
    null;

  const existing = byId.get(field?.catalog_id || id);
  byId.set(field?.catalog_id || id, {
    id: field?.catalog_id || id,
    registry_id: id,
    name: String(d.device_display_name ?? d.device_name ?? field?.name ?? id),
    type: field?.role ?? String(d.device_role ?? existing?.type ?? "mycobrain"),
    role: String(d.device_role ?? field?.role ?? existing?.role ?? "standalone"),
    page_href: field?.page_href ?? existing?.page_href,
    firmware_repo: existing?.firmware_repo ?? null,
    port: d.port as string | number | undefined,
    status: toEarthSimConnectionStatus(String(d.status ?? "")),
    location: loc,
    location_label: field?.location_label ?? existing?.location_label ?? null,
    lastSeen: typeof d.last_seen === "string" ? d.last_seen : null,
    telemetry: extra.latest_telemetry ?? existing?.telemetry ?? null,
    source: "mas",
    agent_url: agentUrl,
    host,
  });
}

export async function GET() {
  try {
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

    const [masDevices, operatorProbes] = await Promise.all([
      fetchMasDevices(),
      probeAllOperatorAgents(),
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

    try {
      const response = await fetch(`${mycobrainUrl}/devices`, {
        cache: "no-store",
        signal: AbortSignal.timeout(5000),
      });
      if (response.ok) {
        const data = (await response.json()) as { devices?: Record<string, unknown>[] };
        for (const device of data.devices || []) {
          const d = device as Record<string, unknown>;
          const id = String(d.device_id ?? d.id ?? "");
          if (!id) continue;
          const normalized = parseLocation(d.location);
          if (!normalized) continue;
          byId.set(id, {
            id,
            name: String(d.name ?? d.device_id ?? id),
            port: (d.port as string | number | undefined) ?? null,
            status: toEarthSimConnectionStatus(String(d.status ?? "")),
            location: normalized,
            lastSeen:
              (d.last_seen as string | undefined) ??
              (d.lastSeen as string | undefined) ??
              null,
            telemetry: d.telemetry ?? null,
            source: "live",
          });
        }
      }
    } catch (error) {
      console.error("Error fetching local MycoBrain service devices:", error);
    }

    const devices = Array.from(byId.values()).filter((d) => d.location != null);

    return NextResponse.json({
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
    });
  } catch (error) {
    console.error("Devices API error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
