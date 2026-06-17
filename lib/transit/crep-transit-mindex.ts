/**
 * CREP transit BFF — MINDEX proxy + optional live fallback (Jun 15, 2026).
 *
 * Contract for Earth Simulator liveTransit mover (Claude Code).
 */

import { resolveMindexServerBaseUrl } from "@/lib/mindex-base-url"
import {
  fetchVehiclePositions,
  type TransitVehicle,
} from "@/lib/transit/gtfs-realtime"

const MINDEX_BASE = resolveMindexServerBaseUrl()
const MINDEX_INTERNAL_TOKEN = process.env.MINDEX_INTERNAL_TOKEN?.trim() || ""
const MINDEX_API_KEY = process.env.MINDEX_API_KEY?.trim() || ""

export interface TransitGeoJsonFeatureCollection {
  type: "FeatureCollection"
  features: Array<{
    type: "Feature"
    properties: Record<string, unknown>
    geometry: { type: "Point"; coordinates: [number, number] }
  }>
  count?: number
  source?: string
  stale?: boolean
}

function mindexAuthHeaders(): Record<string, string> {
  if (MINDEX_INTERNAL_TOKEN) return { "X-Internal-Token": MINDEX_INTERNAL_TOKEN }
  if (MINDEX_API_KEY) return { "X-API-Key": MINDEX_API_KEY }
  return {}
}

export function parseBboxParam(bbox: string | null): [number, number, number, number] | null {
  if (!bbox) return null
  const parts = bbox.split(",").map(Number)
  if (parts.length !== 4 || !parts.every(Number.isFinite)) return null
  return parts as [number, number, number, number]
}

export async function fetchTransitVehiclesFromMindex(
  bbox: string,
): Promise<TransitGeoJsonFeatureCollection | null> {
  const url = `${MINDEX_BASE}/api/mindex/transit/vehicles?bbox=${encodeURIComponent(bbox)}`
  try {
    const res = await fetch(url, {
      headers: { Accept: "application/json", ...mindexAuthHeaders() },
      signal: AbortSignal.timeout(8000),
      cache: "no-store",
    })
    if (!res.ok) return null
    const data = await res.json()
    if (data?.type === "FeatureCollection") return data
    return null
  } catch {
    return null
  }
}

export async function fetchTransitShapesFromMindex(
  bbox: string,
): Promise<TransitGeoJsonFeatureCollection | null> {
  const url = `${MINDEX_BASE}/api/mindex/transit/shapes?bbox=${encodeURIComponent(bbox)}`
  try {
    const res = await fetch(url, {
      headers: { Accept: "application/json", ...mindexAuthHeaders() },
      signal: AbortSignal.timeout(8000),
      cache: "no-store",
    })
    if (!res.ok) return null
    const data = await res.json()
    if (data?.type === "FeatureCollection") return data
    return null
  } catch {
    return null
  }
}

const ROUTE_TYPE_MAP: Record<string, number> = {
  tram: 0,
  subway: 1,
  rail: 2,
  bus: 3,
  ferry: 4,
  other: 3,
}

function normalizeFeatureId(rawId: string, prefix: string): string {
  const tail = rawId.includes(":") ? rawId.split(":").pop()! : rawId
  return `${prefix}_${tail}`
}

function vehicleToCrepFeature(
  v: TransitVehicle,
  agency: string,
  idPrefix: string,
  routeType?: number,
): TransitGeoJsonFeatureCollection["features"][0] {
  return {
    type: "Feature",
    properties: {
      id: normalizeFeatureId(v.id, idPrefix),
      agency,
      route_short_name: v.route_short_name || v.route_id,
      route_color: undefined,
      route_type: routeType ?? (v.vehicle_type ? ROUTE_TYPE_MAP[v.vehicle_type] : 2),
      bearing: v.bearing,
      speed: v.speed_mps,
      current_status: v.current_status,
      stop_id: v.stop_id,
      next_stop_eta: undefined,
      occupancy: v.occupancy,
    },
    geometry: { type: "Point", coordinates: [v.lng, v.lat] },
  }
}

function cullFeatures(
  features: TransitGeoJsonFeatureCollection["features"],
  bbox: [number, number, number, number] | null,
): TransitGeoJsonFeatureCollection["features"] {
  if (!bbox) return features
  const [w, s, e, n] = bbox
  return features.filter((f) => {
    const [lng, lat] = f.geometry.coordinates
    return lng >= w && lng <= e && lat >= s && lat <= n
  })
}

/**
 * Live fallback when MINDEX/collector not yet deployed — uses same upstream
 * feeds as transit_rt_collector (keys must be in env). No mock data.
 */
export async function fetchTransitVehiclesLiveFallback(
  bbox: [number, number, number, number] | null,
): Promise<TransitGeoJsonFeatureCollection> {
  const key511 = process.env.TRANSIT_511_API_KEY?.trim()
  const keyMetrolink = process.env.METROLINK_API_KEY?.trim()
  const keySd = process.env.SDMTS_API_KEY?.trim() || key511
  const mtsAgency = process.env.MTS_511_AGENCY_CODE?.trim() || "MTS"

  const tasks: Promise<TransitGeoJsonFeatureCollection["features"]>[] = []

  if (keySd) {
    tasks.push(
      fetchVehiclePositions(
        `http://api.511.org/transit/VehiclePositions?api_key=${encodeURIComponent(keySd)}&agency=${encodeURIComponent(mtsAgency)}`,
        { agency: "MTS", agency_name: "MTS", vehicleType: "tram", timeoutMs: 10_000 },
      ).then((r) => r.vehicles.map((v) => vehicleToCrepFeature(v, "MTS", "mts", 0))),
    )
  }

  if (key511) {
    tasks.push(
      fetchVehiclePositions(
        `http://api.511.org/transit/VehiclePositions?api_key=${encodeURIComponent(key511)}&agency=CT`,
        { agency: "Caltrain", agency_name: "Caltrain", vehicleType: "rail", timeoutMs: 10_000 },
      ).then((r) => r.vehicles.map((v) => vehicleToCrepFeature(v, "Caltrain", "caltrain", 2))),
    )
  }

  if (keyMetrolink) {
    tasks.push(
      fetchVehiclePositions(
        `https://api.simplifytransit.com/metrolink/vehicles/vehicles.pb?key=${encodeURIComponent(keyMetrolink)}`,
        { agency: "Metrolink", agency_name: "Metrolink", vehicleType: "rail", timeoutMs: 10_000 },
      ).then((r) => r.vehicles.map((v) => vehicleToCrepFeature(v, "Metrolink", "metrolink", 2))),
    )
  }

  // NCTD — public protobuf URL (key optional via NCTD_API_KEY header if required later)
  tasks.push(
    fetchVehiclePositions(
      process.env.NCTD_GTFS_RT_VP_URL ||
        "https://www.gonctd.com/google_transit/gtfs-realtime/GTFS-RT-VehiclePositions.pb",
      { agency: "NCTD", agency_name: "NCTD", vehicleType: "rail", timeoutMs: 10_000 },
    ).then((r) => r.vehicles.map((v) => vehicleToCrepFeature(v, "NCTD", "nctd", 2))),
  )

  // Amtraker v3 (no key)
  tasks.push(
    (async () => {
      try {
        const res = await fetch("https://api-v3.amtraker.com/v3/trains", {
          signal: AbortSignal.timeout(12_000),
          cache: "no-store",
        })
        if (!res.ok) return []
        const data = await res.json()
        const features: TransitGeoJsonFeatureCollection["features"] = []
        for (const [, arr] of Object.entries(data as Record<string, unknown>)) {
          if (!Array.isArray(arr)) continue
          for (const t of arr as Record<string, unknown>[]) {
            const lat = Number(t.lat)
            const lng = Number(t.lon ?? t.lng)
            if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue
            const num = String(t.trainNum ?? t.trainID ?? "")
            features.push({
              type: "Feature",
              properties: {
                id: `amtrak_${num || `${lat},${lng}`}`,
                agency: "Amtrak",
                route_short_name: t.routeName || t.route,
                route_type: 2,
                bearing: Number(t.heading) || undefined,
                speed: Number(t.velocity) ? Number(t.velocity) * 0.44704 : undefined,
                current_status: t.trainState || t.eventCode,
              },
              geometry: { type: "Point", coordinates: [lng, lat] },
            })
          }
        }
        return features
      } catch {
        return []
      }
    })(),
  )

  const batches = await Promise.all(tasks)
  const features = cullFeatures(batches.flat(), bbox)
  return {
    type: "FeatureCollection",
    features,
    count: features.length,
    source: "live-fallback",
  }
}
