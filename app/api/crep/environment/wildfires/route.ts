import { NextRequest, NextResponse } from "next/server"
import { resolveMindexServerBaseUrl } from "@/lib/mindex-base-url"

/**
 * Earth Simulator wildfire BFF — proxies the internal MINDEX route
 * `GET /api/mindex/environment/wildfires` (auth: X-Internal-Token) and returns
 * a GeoJSON FeatureCollection of NASA FIRMS VIIRS detections from
 * `earth.wildfires`. Internal-token only — never forwards a customer mk_ key.
 *
 * Fails open to an empty FeatureCollection (no mock data) so the map degrades
 * gracefully when MINDEX is unreachable or returns nothing for the viewport.
 */
export const dynamic = "force-dynamic"

const MINDEX_API = resolveMindexServerBaseUrl()

type Bounds = { west: number; south: number; east: number; north: number }

function parseBounds(params: URLSearchParams): Bounds | undefined {
  const bbox = params.get("bbox")
  if (bbox) {
    const [west, south, east, north] = bbox.split(",").map(Number)
    if ([west, south, east, north].every(Number.isFinite) && north > south && east > west) {
      return { west, south, east, north }
    }
  }
  const north = Number(params.get("north"))
  const south = Number(params.get("south"))
  const east = Number(params.get("east"))
  const west = Number(params.get("west"))
  if ([north, south, east, west].every(Number.isFinite) && north > south) {
    return { north, south, east, west }
  }
  return undefined
}

function internalToken(): string {
  const raw = process.env.MINDEX_INTERNAL_TOKEN || process.env.MINDEX_INTERNAL_TOKENS || ""
  return (raw.includes(",") ? raw.split(",")[0] : raw).trim()
}

async function fetchMindexWildfires(bounds: Bounds, limit: number) {
  const token = internalToken()
  const qs = new URLSearchParams({
    lat_min: String(bounds.south),
    lat_max: String(bounds.north),
    lng_min: String(bounds.west),
    lng_max: String(bounds.east),
    limit: String(limit),
  })
  const res = await fetch(`${MINDEX_API}/api/mindex/environment/wildfires?${qs.toString()}`, {
    headers: {
      Accept: "application/json",
      ...(token ? { "X-Internal-Token": token } : {}),
    },
    signal: AbortSignal.timeout(5000),
    cache: "no-store",
  })
  if (!res.ok) return null
  const body = await res.json()
  const items = Array.isArray(body?.items) ? body.items : Array.isArray(body?.data) ? body.data : null
  return items
}

export async function GET(request: NextRequest) {
  const startedAt = Date.now()
  const params = request.nextUrl.searchParams
  const limit = Math.min(Math.max(Number(params.get("limit") || 1000), 1), 2000)
  // Default to a global bbox so callers without bounds still get data.
  const bounds = parseBounds(params) ?? { west: -179.9, south: -89.9, east: 179.9, north: 89.9 }

  const items = await fetchMindexWildfires(bounds, limit).catch(() => null)
  const upstreamOk = items != null

  const features = (items || [])
    .map((row: any) => {
      const lat = Number(row.lat ?? row.latitude ?? row.centroid_lat)
      const lng = Number(row.lng ?? row.longitude ?? row.centroid_lng)
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
      return {
        type: "Feature" as const,
        geometry: { type: "Point" as const, coordinates: [lng, lat] },
        properties: {
          source: row.source ?? "firms",
          sourceId: row.source_id ?? null,
          name: row.name ?? "Wildfire detection",
          status: row.status ?? null,
          severity: row.severity ?? null,
          geomType: row.geom_type ?? "point",
          detectedAt: row.detected_at ?? null,
          sourceResolution: "MINDEX earth.wildfires (NASA FIRMS VIIRS)",
          nativeResolutionMeters: 375,
        },
      }
    })
    .filter(Boolean)

  const totalMs = Date.now() - startedAt
  const response = NextResponse.json(
    {
      type: "FeatureCollection",
      features,
      count: features.length,
      meta: {
        source: "mindex.earth.wildfires",
        upstream: upstreamOk ? "mindex" : "unavailable",
        bbox: bounds,
        renderer: "mycosoft-maplibre",
        nativeResolutionMeters: 375,
        timings: { totalMs, budgetMs: 1000, withinBudget: totalMs <= 1000 },
        timestamp: new Date().toISOString(),
      },
    },
    {
      headers: {
        "Cache-Control": "public, max-age=60, stale-while-revalidate=300",
      },
    },
  )
  response.headers.set("Server-Timing", `total;dur=${totalMs}`)
  return response
}
