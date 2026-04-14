import { NextRequest, NextResponse } from "next/server"

/**
 * MINDEX Cache Proxy — Unified data access for all CREP map layers
 *
 * Routes: /api/mindex/proxy/[source]?lat_min=&lat_max=&lng_min=&lng_max=&limit=
 *
 * This proxy routes to MINDEX's earth/map/bbox PostGIS endpoint which already
 * has spatial queries for all entity types:
 *   earthquakes, volcanoes, wildfires, storms, species, facilities,
 *   antennas, aircraft, vessels, airports, ports, satellites, cameras,
 *   military, buoys, weather, air_quality, wifi_hotspots, power_grid
 *
 * MINDEX handles caching internally via its multi-tier cache:
 *   Tier 0: In-process LRU (< 0.1ms)
 *   Tier 1: Redis (< 1ms) with map:{layer}:{bbox_hash} keys
 *   Tier 2: PostgreSQL/PostGIS (< 5ms)
 *   Tier 3: Supabase cloud sync (< 50ms)
 *   Tier 4: Live API scrape + cache (100-2000ms)
 *
 * If MINDEX is unavailable, we fall back to the existing direct API routes
 * (/api/oei/*, /api/crep/*, /api/natureos/*) but data won't be persisted.
 */

const MINDEX_URL =
  process.env.MINDEX_API_URL ||
  process.env.NEXT_PUBLIC_MINDEX_URL ||
  "http://192.168.0.189:8000"

const MINDEX_API_KEY = process.env.MINDEX_API_KEY || "local-dev-key"

/** Map source names to MINDEX earth/map/bbox layer names */
const SOURCE_TO_MINDEX_LAYER: Record<string, string> = {
  // Earth events
  earthquakes: "earthquakes",
  volcanoes: "volcanoes",
  wildfires: "wildfires",
  storms: "storms",
  lightning: "lightning",
  floods: "floods",

  // Transport
  aircraft: "aircraft",
  vessels: "vessels",
  airports: "airports",
  ports: "ports",

  // Space
  satellites: "satellites",
  "solar-events": "solar_events",

  // Species
  species: "species",
  sightings: "sightings",

  // Infrastructure
  facilities: "facilities",
  "power-grid": "power_grid",
  "power-plants": "facilities",
  substations: "power_grid",
  "transmission-lines": "power_grid",
  "internet-cables": "internet_cables",
  "submarine-cables": "internet_cables",
  antennas: "antennas",
  "wifi-hotspots": "wifi_hotspots",

  // Atmosphere
  weather: "weather",
  "air-quality": "air_quality",
  "greenhouse-gas": "greenhouse_gas",

  // Water
  buoys: "buoys",
  "stream-gauges": "stream_gauges",

  // Monitoring
  cameras: "cameras",
  military: "military",
}

/** Fallback internal API routes when MINDEX is unavailable */
const FALLBACK_ROUTES: Record<string, string> = {
  aircraft: "/api/oei/flights",
  vessels: "/api/oei/marine",
  satellites: "/api/oei/satellites",
  earthquakes: "/api/natureos/global-events",
  species: "/api/crep/fungal",
  "internet-cables": "/api/oei/submarine-cables",
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ source: string }> }
) {
  const { source } = await params
  const { searchParams } = new URL(request.url)

  const mindexLayer = SOURCE_TO_MINDEX_LAYER[source]
  if (!mindexLayer) {
    return NextResponse.json(
      { error: `Unknown source: ${source}`, available: Object.keys(SOURCE_TO_MINDEX_LAYER) },
      { status: 400 }
    )
  }

  // Build MINDEX earth/map/bbox query params
  const lat_min = searchParams.get("lat_min") || searchParams.get("south") || "-90"
  const lat_max = searchParams.get("lat_max") || searchParams.get("north") || "90"
  const lng_min = searchParams.get("lng_min") || searchParams.get("west") || "-180"
  const lng_max = searchParams.get("lng_max") || searchParams.get("east") || "180"
  const limit = searchParams.get("limit") || "500"

  try {
    // Primary: Query MINDEX earth/map/bbox endpoint (PostGIS spatial query + Redis cache)
    const mindexUrl = `${MINDEX_URL}/api/mindex/earth/map/bbox?layer=${mindexLayer}&lat_min=${lat_min}&lat_max=${lat_max}&lng_min=${lng_min}&lng_max=${lng_max}&limit=${limit}`

    const res = await fetch(mindexUrl, {
      cache: "no-store",
      signal: AbortSignal.timeout(10000),
      headers: { Accept: "application/json", "X-API-Key": MINDEX_API_KEY },
    })

    if (res.ok) {
      const data = await res.json()
      return NextResponse.json(data, {
        headers: {
          "X-MINDEX-Source": "live",
          "X-MINDEX-Layer": mindexLayer,
          "Cache-Control": "public, max-age=10",
        },
      })
    }

    console.warn(`[MINDEX/Proxy] MINDEX returned ${res.status} for layer=${mindexLayer}`)
  } catch (err) {
    console.warn(`[MINDEX/Proxy] MINDEX unreachable for layer=${mindexLayer}:`, err)
  }

  // Fallback: Try internal API routes (no MINDEX caching, no persistence)
  const fallbackRoute = FALLBACK_ROUTES[source]
  if (fallbackRoute) {
    try {
      const baseUrl =
        process.env.NEXT_PUBLIC_SITE_URL ||
        (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000")

      const fallbackUrl = new URL(fallbackRoute, baseUrl)
      // Forward bbox params
      if (searchParams.get("lat_min")) {
        fallbackUrl.searchParams.set("lat_min", lat_min)
        fallbackUrl.searchParams.set("lat_max", lat_max)
        fallbackUrl.searchParams.set("lng_min", lng_min)
        fallbackUrl.searchParams.set("lng_max", lng_max)
      }
      fallbackUrl.searchParams.set("limit", limit)

      const fallbackRes = await fetch(fallbackUrl.toString(), {
        cache: "no-store",
        signal: AbortSignal.timeout(15000),
      })

      if (fallbackRes.ok) {
        const data = await fallbackRes.json()
        return NextResponse.json(data, {
          headers: {
            "X-MINDEX-Source": "fallback",
            "X-MINDEX-Layer": mindexLayer,
            "X-MINDEX-Warning": "mindex-unavailable-using-direct-api",
          },
        })
      }
    } catch {
      // Both MINDEX and fallback failed
    }
  }

  return NextResponse.json(
    {
      error: "Data unavailable",
      source,
      layer: mindexLayer,
      message: `MINDEX and fallback APIs are unreachable for ${source}`,
    },
    { status: 503 }
  )
}

/**
 * POST — Ingest data into MINDEX for a given source.
 * Used by CREP collectors and ETL pipelines to push data into MINDEX.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ source: string }> }
) {
  const { source } = await params
  const body = await request.json()

  try {
    const res = await fetch(`${MINDEX_URL}/api/mindex/earth/ingest`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ source, entities: body.entities || [] }),
      signal: AbortSignal.timeout(10000),
    })

    if (res.ok) {
      const data = await res.json()
      return NextResponse.json(data)
    }

    return NextResponse.json(
      { error: `MINDEX ingest failed: ${res.status}` },
      { status: res.status }
    )
  } catch (err) {
    return NextResponse.json(
      { error: "MINDEX unreachable for ingest" },
      { status: 503 }
    )
  }
}
