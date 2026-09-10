import { NextRequest, NextResponse } from "next/server"
import {
  MOVEMENT_CLASSIFICATION,
  MOVEMENT_SNAPSHOT_SCHEMA,
  type CoordinationPair,
  type LiveMovementDevice,
  type MovementFix,
  type MovementSnapshot,
  type PathTreeDepiction,
  type TriangulationDepiction,
} from "@/lib/fusarium/movement/contracts"
import {
  FORT_STEWART_AO,
  haversineMeters,
  initialBearingDeg,
  kinematicReachabilityTree,
  triangulateThreePoints,
} from "@/lib/fusarium/movement/geometry"

export const dynamic = "force-dynamic"
export const revalidate = 0

const HEADERS = {
  "Cache-Control": "private, no-store, max-age=0",
  "X-Content-Type-Options": "nosniff",
}

const LIVE_SOURCES = new Set(["live", "mas", "operator", "mindex"])
const LIVE_STATUS = new Set(["connected", "online"])

interface EarthSimDeviceRow {
  id: string
  name?: string
  status?: string
  source?: string
  lastSeen?: string | null
  location: { lat: number; lon: number } | null
  telemetry?: unknown
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null
  return value as Record<string, unknown>
}

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

function parseFix(value: unknown, observedAt: string | null, source: MovementFix["source"]): MovementFix | null {
  const row = asRecord(value)
  if (!row) return null
  const lat = asNumber(row.lat ?? row.latitude)
  const lng = asNumber(row.lon ?? row.lng ?? row.longitude)
  if (lat == null || lng == null || Math.abs(lat) > 90 || Math.abs(lng) > 180) return null
  const stamp =
    (typeof row.observedAt === "string" && row.observedAt) ||
    (typeof row.timestamp === "string" && row.timestamp) ||
    (typeof row.captured_at === "string" && row.captured_at) ||
    observedAt
  return { lat, lng, observedAt: stamp, source }
}

function extractTrail(telemetry: unknown, fallbackAt: string | null): MovementFix[] {
  const row = asRecord(telemetry)
  if (!row) return []
  const candidates = [row.positions, row.trail, row.history, row.samples, row.fixes, row.path]
  for (const candidate of candidates) {
    if (!Array.isArray(candidate)) continue
    const fixes = candidate
      .map((entry) => parseFix(entry, fallbackAt, "device-telemetry"))
      .filter((entry): entry is MovementFix => entry != null)
    if (fixes.length >= 2) return fixes
  }
  return []
}

function isLiveDevice(device: EarthSimDeviceRow): boolean {
  if (!device.location) return false
  if (!LIVE_SOURCES.has(String(device.source || ""))) return false
  if (!LIVE_STATUS.has(String(device.status || "").toLowerCase())) return false
  return true
}

function commandSeam(): MovementSnapshot["commandSeam"] {
  return {
    waypointCommand: "propose-only",
    missionCommand: "propose-only",
    existingCommandApi: "/api/devices/network/[deviceId]/command",
    commandCapability: "ping-health-sensors-only",
    receipt: "NOT_SUPPLIED",
    note: "Network command API exists for health/sensor reads. Waypoint and mission tasking are not accepted; C2 may propose only.",
  }
}

function buildPathTree(devices: LiveMovementDevice[]): PathTreeDepiction {
  const originDevice = devices[0]
  const origin: [number, number] = originDevice
    ? [originDevice.fix.lng, originDevice.fix.lat]
    : [FORT_STEWART_AO.lng, FORT_STEWART_AO.lat]
  return {
    origin,
    originLabel: originDevice
      ? `${originDevice.name} last live fix`
      : FORT_STEWART_AO.label,
    branches: kinematicReachabilityTree(origin, originDevice?.headingDeg ?? 0, 2500),
    live: false,
    source: "local-geometry",
    note: "ITDX Weka / NLM did not return movement proposals. This is a local kinematic reachability tree labeled hypothesis — not a live COP track.",
  }
}

function buildTriangulation(devices: LiveMovementDevice[]): TriangulationDepiction {
  const observers = devices.slice(0, 3)
  if (observers.length >= 3) {
    const vertices: Array<[number, number]> = observers.map((device) => [device.fix.lng, device.fix.lat])
    const solved = triangulateThreePoints(vertices[0], vertices[1], vertices[2])
    return {
      observerIds: observers.map((device) => device.id),
      vertices,
      fix: solved?.fix ?? null,
      residualM: solved?.residualM ?? null,
      live: Boolean(solved),
      qualification: solved ? "geometric-fix" : "unqualified-proposal",
      note: solved
        ? "Circumcenter of three live device fixes on a WGS-84 sphere. Not a classified TTP."
        : "Three live observers were collinear or degenerate; no lock.",
    }
  }
  const vertices: Array<[number, number]> = observers.map((device) => [device.fix.lng, device.fix.lat])
  if (vertices.length === 2) {
    vertices.push([FORT_STEWART_AO.lng, FORT_STEWART_AO.lat])
  } else if (vertices.length === 1) {
    vertices.push([FORT_STEWART_AO.lng, FORT_STEWART_AO.lat])
    vertices.push([FORT_STEWART_AO.lng + 0.04, FORT_STEWART_AO.lat + 0.03])
  } else {
    vertices.push(
      [FORT_STEWART_AO.lng, FORT_STEWART_AO.lat],
      [FORT_STEWART_AO.lng + 0.05, FORT_STEWART_AO.lat],
      [FORT_STEWART_AO.lng + 0.025, FORT_STEWART_AO.lat + 0.04],
    )
  }
  return {
    observerIds: observers.map((device) => device.id),
    vertices: vertices.slice(0, 3) as Array<[number, number]>,
    fix: null,
    residualM: null,
    live: false,
    qualification: "unqualified-proposal",
    note: "Fewer than three live observers/sensors. Triangle is a MYCA/AVANI/ITDX proposal (live: false). Never a fake lock.",
  }
}

export async function GET(request: NextRequest) {
  const devicesUrl = new URL("/api/earth-simulator/devices?refresh=1", request.url)
  let earthSimStatus: MovementSnapshot["sources"]["earthSimDevices"] = "error"
  let rows: EarthSimDeviceRow[] = []

  try {
    const response = await fetch(devicesUrl, {
      headers: { Accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(20000),
    })
    if (response.ok) {
      const payload = (await response.json()) as { devices?: EarthSimDeviceRow[] }
      rows = Array.isArray(payload.devices) ? payload.devices : []
      earthSimStatus = rows.length > 0 ? "ok" : "empty"
    }
  } catch {
    earthSimStatus = "error"
  }

  const liveRows = rows.filter(isLiveDevice)
  const devices: LiveMovementDevice[] = liveRows.map((row) => {
    const loc = row.location as { lat: number; lon: number }
    const trail = extractTrail(row.telemetry, row.lastSeen ?? null)
    return {
      id: row.id,
      name: row.name || row.id,
      status: row.status || "online",
      source: row.source || "mas",
      live: true,
      fix: {
        lat: loc.lat,
        lng: loc.lon,
        observedAt: row.lastSeen ?? null,
        source: "earth-simulator-devices",
      },
      path: trail.length >= 2 ? trail : "NOT_SUPPLIED",
      headingDeg: trail.length >= 2
        ? initialBearingDeg(
          [trail[trail.length - 2].lng, trail[trail.length - 2].lat],
          [trail[trail.length - 1].lng, trail[trail.length - 1].lat],
        )
        : null,
    }
  })

  const coordination: CoordinationPair[] = []
  for (let i = 0; i < devices.length; i += 1) {
    for (let j = i + 1; j < devices.length; j += 1) {
      const from = devices[i]
      const to = devices[j]
      coordination.push({
        fromId: from.id,
        toId: to.id,
        rangeM: haversineMeters([from.fix.lng, from.fix.lat], [to.fix.lng, to.fix.lat]),
        bearingDeg: initialBearingDeg([from.fix.lng, from.fix.lat], [to.fix.lng, to.fix.lat]),
        formula: "haversine + forward azimuth (WGS-84 sphere)",
        live: true,
      })
    }
  }

  const trailsPresent = devices.filter((device) => device.path !== "NOT_SUPPLIED").length
  const snapshot: MovementSnapshot = {
    schema: MOVEMENT_SNAPSHOT_SCHEMA,
    classification: MOVEMENT_CLASSIFICATION,
    generatedAt: new Date().toISOString(),
    liveDeviceCount: devices.length,
    devices,
    coordination,
    triangulation: buildTriangulation(devices),
    pathTree: buildPathTree(devices),
    commandSeam: commandSeam(),
    emptyReason: devices.length === 0
      ? rows.some((row) => row.source === "field" || row.source === "catalog")
        ? "No live devices. Known field/catalog sites are not treated as a live convoy. Connect a MAS / MINDEX / operator heartbeat for paths."
        : "No live devices. Heartbeats / MAS registry / MINDEX returned zero online positions. Not a fake convoy."
      : null,
    sources: {
      earthSimDevices: earthSimStatus,
      telemetryTrails: trailsPresent === 0 ? "NOT_SUPPLIED" : trailsPresent === devices.length ? "ok" : "partial",
      itdxWeka: "NOT_SUPPLIED",
    },
  }

  return NextResponse.json(snapshot, { headers: HEADERS })
}
