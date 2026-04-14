/**
 * MINDEX Cache Client — Client-side wrapper for CREP map data fetching
 *
 * All CREP data requests should go through this client so they benefit from
 * MINDEX's multi-tier caching (LRU → Redis → PostGIS → Supabase → Live API).
 *
 * Usage:
 *   import { mindexFetch } from "@/lib/crep/mindex-cache-client"
 *   const { entities } = await mindexFetch("earthquakes", bounds)
 */

export interface MapBounds {
  north: number
  south: number
  east: number
  west: number
}

export interface MapEntity {
  id: string
  entity_type: string
  domain: string
  name: string
  lat: number | null
  lng: number | null
  occurred_at: string | null
  source: string | null
  properties: Record<string, any>
}

export interface MapLayerResponse {
  layer: string
  entities: MapEntity[]
  total: number
  bounds?: MapBounds | null
}

/** Available MINDEX data sources for CREP map layers */
export type MindexSource =
  | "earthquakes" | "volcanoes" | "wildfires" | "storms" | "lightning" | "floods"
  | "aircraft" | "vessels" | "airports" | "ports"
  | "satellites" | "solar-events"
  | "species" | "sightings"
  | "facilities" | "power-grid" | "power-plants" | "substations" | "transmission-lines" | "internet-cables" | "submarine-cables" | "antennas" | "wifi-hotspots" | "military"
  | "weather" | "air-quality" | "greenhouse-gas"
  | "buoys" | "stream-gauges"
  | "cameras" | "military"

/**
 * Fetch map entities from MINDEX for a given source and bounding box.
 * Automatically uses the MINDEX cache proxy which handles:
 * - Multi-tier caching (Redis + PostGIS)
 * - Automatic fallback to direct APIs when MINDEX is down
 * - Data persistence for offline operation
 */
export async function mindexFetch(
  source: MindexSource,
  bounds?: MapBounds | null,
  limit = 500,
  signal?: AbortSignal
): Promise<MapLayerResponse> {
  const params = new URLSearchParams({ limit: String(limit) })

  if (bounds) {
    params.set("lat_min", String(bounds.south))
    params.set("lat_max", String(bounds.north))
    params.set("lng_min", String(bounds.west))
    params.set("lng_max", String(bounds.east))
  }

  const res = await fetch(`/api/mindex/proxy/${source}?${params}`, {
    cache: "no-store",
    signal,
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Unknown error" }))
    throw new Error(err.error || `MINDEX proxy returned ${res.status}`)
  }

  const data = await res.json()

  // Check cache status from headers
  const cacheStatus = res.headers.get("X-MINDEX-Source") || "unknown"
  if (cacheStatus === "fallback") {
    console.warn(`[MINDEX] Using fallback for ${source} — MINDEX may be down`)
  }

  return data
}

/**
 * Fetch multiple map layers in parallel.
 * Useful for initial CREP load or when panning to a new region.
 */
export async function mindexFetchMultiple(
  sources: MindexSource[],
  bounds?: MapBounds | null,
  limit = 500
): Promise<Record<MindexSource, MapLayerResponse>> {
  const results = await Promise.allSettled(
    sources.map((source) => mindexFetch(source, bounds, limit))
  )

  const data: Record<string, MapLayerResponse> = {}
  results.forEach((result, i) => {
    if (result.status === "fulfilled") {
      data[sources[i]] = result.value
    } else {
      console.warn(`[MINDEX] Failed to fetch ${sources[i]}:`, result.reason)
      data[sources[i]] = { layer: sources[i], entities: [], total: 0 }
    }
  })

  return data as Record<MindexSource, MapLayerResponse>
}

/**
 * Ingest data into MINDEX for persistence.
 * Used by CREP collectors and ETL pipelines.
 */
export async function mindexIngest(
  source: MindexSource,
  entities: MapEntity[]
): Promise<void> {
  await fetch(`/api/mindex/proxy/${source}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ entities }),
  })
}
