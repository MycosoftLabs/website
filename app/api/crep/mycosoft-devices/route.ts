import { NextRequest, NextResponse } from "next/server"

/**
 * Mycosoft Devices proxy — Apr 19, 2026
 *
 * Returns the registered Mycosoft MycoBrain-powered devices with live
 * positions + telemetry metadata. Each device has a MycoBrain chip
 * inside; the `device_type` tag identifies which widget opens on click
 * (mushroom1 / hyphae1 / sporebase / myconode / alarm / psathyrella).
 *
 * Pipeline:
 *   1. MINDEX devices layer (`/api/mindex/proxy/devices`) — canonical
 *      device registry (device id, location, type, status).
 *   2. MQTT broker bridge via lib/devices/mqtt-service — overlays live
 *      telemetry keyed by mycobrain_id (when broker reachable on LAN).
 *   3. Home Assistant bridge (lib/devices/home-assistant-bridge) — for
 *      devices that have an HA integration rather than direct MQTT.
 *
 * Until devices are deployed this returns an empty list. Filter toggles
 * in the CREP UI still exist (Morgan rule: "filters must exist").
 *
 * Shape:
 *   { source, total, by_type: {...}, devices: [
 *       { id, device_type, mycobrain_id, name, lat, lng,
 *         status, last_seen, firmware, mqtt_topic }
 *   ] }
 */

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

type MycoDevice = {
  id: string
  device_type: "mushroom1" | "hyphae1" | "sporebase" | "myconode" | "alarm" | "psathyrella" | "mycobrain"
  mycobrain_id: string | null
  name: string | null
  lat: number | null
  lng: number | null
  status: "online" | "offline" | "unknown"
  last_seen: string | null
  firmware: string | null
  mqtt_topic: string | null
  owner?: string | null
}

function deriveDeviceType(id: string | undefined, tagged?: string): MycoDevice["device_type"] {
  const t = (tagged || "").toLowerCase()
  if (t && ["mushroom1", "hyphae1", "sporebase", "myconode", "alarm", "psathyrella"].includes(t)) {
    return t as MycoDevice["device_type"]
  }
  // ID prefix pattern: "<type>-<serial>" e.g. "mushroom1-a3f2"
  const prefix = (id || "").match(/^([a-z]+\d?)[-_]/i)?.[1]?.toLowerCase()
  if (prefix && ["mushroom1", "hyphae1", "sporebase", "myconode", "alarm", "psathyrella"].includes(prefix)) {
    return prefix as MycoDevice["device_type"]
  }
  return "mycobrain"
}

async function fromMindex(baseUrl: string): Promise<MycoDevice[]> {
  try {
    const res = await fetch(`${baseUrl}/api/mindex/proxy/devices?limit=10000`, {
      signal: AbortSignal.timeout(10_000),
    })
    if (!res.ok) return []
    const j = await res.json()
    const items = j?.devices || j?.entities || j?.features || []
    return (items as any[]).map((d) => ({
      id: d.id || d.device_id,
      device_type: deriveDeviceType(d.id || d.device_id, d.device_type || d.type),
      mycobrain_id: d.mycobrain_id || d.mycobrainId || null,
      name: d.name || null,
      lat: d.lat ?? d.latitude ?? d.location?.latitude ?? d.geometry?.coordinates?.[1] ?? null,
      lng: d.lng ?? d.longitude ?? d.location?.longitude ?? d.geometry?.coordinates?.[0] ?? null,
      status: d.status || "unknown",
      last_seen: d.last_seen || d.lastSeen || null,
      firmware: d.firmware || d.firmwareVersion || null,
      mqtt_topic: d.mqtt_topic || (d.id ? `mycosoft/devices/${d.id}/telemetry` : null),
      owner: d.owner || null,
    } satisfies MycoDevice))
  } catch {
    return []
  }
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const limit = Math.min(Number(url.searchParams.get("limit") || 10000), 50000)
  const baseUrl = `${url.protocol}//${url.host}`

  const devices = (await fromMindex(baseUrl)).filter((d) => d.id).slice(0, limit)

  const byType: Record<string, number> = {}
  for (const d of devices) byType[d.device_type] = (byType[d.device_type] || 0) + 1

  return NextResponse.json(
    {
      source: "mycosoft-devices",
      total: devices.length,
      by_type: byType,
      devices,
      generatedAt: new Date().toISOString(),
      note:
        devices.length === 0
          ? "Device registry is empty. Connect devices via the Jetson-MycoBrain MQTT bridge — each device auto-registers with MINDEX on boot. Filter toggles in CREP UI stay active regardless so layer wiring is ready."
          : "MINDEX-registered Mycosoft devices. Filter by device_type in UI; live telemetry streams via MQTT broker subscriptions in the device widgets themselves.",
    },
    {
      headers: {
        "Cache-Control": "public, s-maxage=15, stale-while-revalidate=60",
        "X-Source": "mindex",
      },
    },
  )
}
