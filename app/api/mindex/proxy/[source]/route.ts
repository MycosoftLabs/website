import { NextRequest, NextResponse } from "next/server"
import { resolveMindexServerBaseUrl } from "@/lib/mindex-base-url"

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

const MINDEX_URL = resolveMindexServerBaseUrl()
const MINDEX_API_KEY = process.env.MINDEX_API_KEY?.trim() || ""
const INATURALIST_API = "https://api.inaturalist.org/v1"
const configuredMindexTimeout = Number(process.env.CREP_MINDEX_PROXY_TIMEOUT_MS)
const MINDEX_PROXY_TIMEOUT_MS =
  Number.isFinite(configuredMindexTimeout) && configuredMindexTimeout > 0
    ? configuredMindexTimeout
    : process.env.NODE_ENV === "development"
      ? 1500
      : 8000
const configuredFallbackTimeout = Number(process.env.CREP_MINDEX_PROXY_FALLBACK_TIMEOUT_MS)
const FALLBACK_TIMEOUT_MS =
  Number.isFinite(configuredFallbackTimeout) && configuredFallbackTimeout > 0
    ? configuredFallbackTimeout
    : process.env.NODE_ENV === "development"
      ? 6000
      : 12000

function mindexHeaders(): HeadersInit {
  const h: Record<string, string> = { Accept: "application/json" }
  if (MINDEX_API_KEY) h["X-API-Key"] = MINDEX_API_KEY
  return h
}

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
  substations: "substations",
  "transmission-lines": "transmission_lines",
  "internet-cables": "internet_cables",
  "submarine-cables": "internet_cables",
  antennas: "antennas",
  "wifi-hotspots": "wifi_hotspots",
  "cell-towers": "antennas",

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
  aircraft: "/api/oei/flightradar24",
  vessels: "/api/oei/aisstream",
  satellites: "/api/oei/satellites",
  earthquakes: "/api/natureos/global-events",
  species: "/api/crep/fungal",
  "internet-cables": "/api/oei/submarine-cables",
}

function entityCount(data: any): number {
  if (Array.isArray(data?.entities)) return data.entities.length
  if (Array.isArray(data?.observations)) return data.observations.length
  if (Array.isArray(data?.features)) return data.features.length
  if (typeof data?.total === "number") return data.total
  return 0
}

function normalizeSpeciesFallback(data: any, bounds: { lat_min: string; lat_max: string; lng_min: string; lng_max: string }) {
  const observations = Array.isArray(data?.observations) ? data.observations : []
  return {
    layer: "species",
    entities: observations.map((obs: any) => ({
      ...obs,
      lat: obs.lat ?? obs.latitude,
      lng: obs.lng ?? obs.longitude,
      name: obs.species || obs.commonName || obs.scientificName || "Unknown",
      source: obs.source || "iNaturalist",
    })),
    observations,
    total: observations.length,
    bounds: {
      lat_min: Number(bounds.lat_min),
      lat_max: Number(bounds.lat_max),
      lng_min: Number(bounds.lng_min),
      lng_max: Number(bounds.lng_max),
    },
    source: "live_api_fallback",
    upstream: data?.meta || null,
  }
}

async function fetchLiveSpeciesFallback(bounds: { lat_min: string; lat_max: string; lng_min: string; lng_max: string }, limit: string) {
  const requested = Math.min(Math.max(Number(limit) || 200, 1), 1000)
  const pages = Math.max(1, Math.ceil(requested / 200))
  const observations: any[] = []

  for (let page = 1; page <= pages && observations.length < requested; page++) {
    const params = new URLSearchParams({
      quality_grade: "research,needs_id",
      per_page: String(Math.min(200, requested - observations.length)),
      page: String(page),
      order: "desc",
      order_by: "observed_on",
      geo: "true",
      photos: "true",
      swlat: bounds.lat_min,
      nelat: bounds.lat_max,
      swlng: bounds.lng_min,
      nelng: bounds.lng_max,
    })

    const res = await fetch(`${INATURALIST_API}/observations?${params}`, {
      headers: {
        Accept: "application/json",
        "User-Agent": "Mycosoft-CREP/1.0 (+https://mycosoft.com)",
      },
      signal: AbortSignal.timeout(10_000),
      cache: "no-store",
    })
    if (!res.ok) break

    const data = await res.json()
    const results = Array.isArray(data?.results) ? data.results : []
    for (const obs of results) {
      const coords = obs.geojson?.coordinates
      const lng = Number(coords?.[0] ?? obs.location?.split(",")?.[1])
      const lat = Number(coords?.[1] ?? obs.location?.split(",")?.[0])
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue
      observations.push({
        id: `inat-${obs.id}`,
        externalId: String(obs.id),
        species: obs.taxon?.preferred_common_name || obs.taxon?.name || "Unknown",
        scientificName: obs.taxon?.name || "Unknown",
        commonName: obs.taxon?.preferred_common_name,
        latitude: lat,
        longitude: lng,
        timestamp: obs.observed_on || obs.created_at,
        source: "iNaturalist",
        verified: obs.quality_grade === "research",
        observer: obs.user?.login || "Anonymous",
        imageUrl: obs.photos?.[0]?.url?.replace("square", "medium"),
        thumbnailUrl: obs.photos?.[0]?.url,
        location: obs.place_guess,
        hasGps: true,
        geocodeStatus: "complete",
        kingdom: obs.taxon?.iconic_taxon_name || "Unknown",
        iconicTaxon: obs.taxon?.iconic_taxon_name || "Unknown",
        taxonId: obs.taxon?.id,
        sourceUrl: obs.uri || `https://www.inaturalist.org/observations/${obs.id}`,
      })
    }
    if (results.length < 200) break
  }

  return normalizeSpeciesFallback(
    {
      observations: observations.slice(0, requested),
      meta: {
        total: observations.length,
        sources: { mindex: 0, iNaturalist: observations.length, gbif: 0 },
        dataSource: "live_inaturalist_proxy_fallback",
      },
    },
    bounds,
  )
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
  const liveFallbackEnabled =
    searchParams.get("liveFallback") === "true" ||
    searchParams.get("fallbackLive") === "true" ||
    process.env.CREP_ENABLE_LIVE_NATURE_FALLBACK === "1"

  try {
    // Primary: Query MINDEX earth/map/bbox endpoint (PostGIS spatial query + Redis cache)
    const mindexUrl = `${MINDEX_URL}/api/mindex/earth/map/bbox?layer=${mindexLayer}&lat_min=${lat_min}&lat_max=${lat_max}&lng_min=${lng_min}&lng_max=${lng_max}&limit=${limit}`

    const res = await fetch(mindexUrl, {
      cache: "no-store",
      signal: AbortSignal.timeout(MINDEX_PROXY_TIMEOUT_MS),
      headers: mindexHeaders(),
    })

    if (res.ok) {
      const data = await res.json()
      if (mindexLayer === "species" && entityCount(data) === 0) {
        console.warn(`[MINDEX/Proxy] MINDEX species layer returned 0 entities for bbox; using live fallback`)
      } else {
      return NextResponse.json(data, {
        headers: {
          "X-MINDEX-Source": "live",
          "X-MINDEX-Layer": mindexLayer,
          "Cache-Control": "public, max-age=10",
        },
      })
      }
    }

    console.warn(`[MINDEX/Proxy] MINDEX returned ${res.status} for layer=${mindexLayer}`)
  } catch (err) {
    console.warn(`[MINDEX/Proxy] MINDEX unreachable for layer=${mindexLayer}:`, err)
  }

  // Fallback: Try internal API routes (no MINDEX caching, no persistence)
  const fallbackRoute = FALLBACK_ROUTES[source]
  if (fallbackRoute) {
    try {
      if (mindexLayer === "species") {
        if (!liveFallbackEnabled) {
          return NextResponse.json(
            {
              available: false,
              source,
              layer: mindexLayer,
              entities: [],
              observations: [],
              features: [],
              total: 0,
              message: "MINDEX species cache unavailable; live fallback disabled for low-latency map loading",
            },
            {
              headers: {
                "Cache-Control": "no-store",
                "X-MINDEX-Source": "unavailable",
                "X-MINDEX-Layer": mindexLayer,
              },
            },
          )
        }
        const body = await fetchLiveSpeciesFallback({ lat_min, lat_max, lng_min, lng_max }, limit)
        if (body.total > 0) {
          return NextResponse.json(body, {
            status: 200,
            headers: {
              "X-MINDEX-Source": "fallback",
              "X-MINDEX-Layer": mindexLayer,
              "X-MINDEX-Warning": "mindex-empty-using-live-inaturalist",
            },
          })
        }
      }

      const baseUrl = new URL(request.url).origin

      const fallbackUrl = new URL(fallbackRoute, baseUrl)
      // Forward bbox params
      fallbackUrl.searchParams.set("lat_min", lat_min)
      fallbackUrl.searchParams.set("lat_max", lat_max)
      fallbackUrl.searchParams.set("lng_min", lng_min)
      fallbackUrl.searchParams.set("lng_max", lng_max)
      fallbackUrl.searchParams.set("south", lat_min)
      fallbackUrl.searchParams.set("north", lat_max)
      fallbackUrl.searchParams.set("west", lng_min)
      fallbackUrl.searchParams.set("east", lng_max)
      fallbackUrl.searchParams.set("limit", limit)
      if (mindexLayer === "species") fallbackUrl.searchParams.set("nocache", "true")

      const fallbackRes = await fetch(fallbackUrl.toString(), {
        cache: "no-store",
        signal: AbortSignal.timeout(FALLBACK_TIMEOUT_MS),
      })

      if (fallbackRes.ok) {
        const data = await fallbackRes.json()
        const body = mindexLayer === "species"
          ? normalizeSpeciesFallback(data, { lat_min, lat_max, lng_min, lng_max })
          : data
        return NextResponse.json(body, {
          status: 200,
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
      available: false,
      source,
      layer: mindexLayer,
      entities: [],
      observations: [],
      features: [],
      total: 0,
      message: `MINDEX and fallback APIs are unreachable for ${source}`,
    },
    {
      headers: {
        "Cache-Control": "no-store",
        "X-MINDEX-Source": "unavailable",
        "X-MINDEX-Layer": mindexLayer,
      },
    }
  )
}

/**
 * POST -- Ingest data into MINDEX for a given source.
 * Used by CREP collectors and ETL pipelines to push data into MINDEX.
 *
 * Body: { entities: [{ lat, lng, timestamp, ...properties }] }
 *
 * Each entity MUST include lat, lng, and timestamp. The handler normalizes
 * missing timestamps to the current server time and validates coordinates.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ source: string }> }
) {
  const { source } = await params
  const body = await request.json()

  const mindexLayer = SOURCE_TO_MINDEX_LAYER[source]
  if (!mindexLayer) {
    return NextResponse.json(
      { error: `Unknown source: ${source}`, available: Object.keys(SOURCE_TO_MINDEX_LAYER) },
      { status: 400 }
    )
  }

  const rawEntities: Record<string, unknown>[] = body.entities || []
  if (rawEntities.length === 0) {
    return NextResponse.json({ ingested: 0, source, layer: mindexLayer })
  }

  // Normalize: ensure every entity has lat, lng, timestamp
  const now = new Date().toISOString()
  const entities = rawEntities.map(e => ({
    ...e,
    lat: e.lat ?? e.latitude ?? null,
    lng: e.lng ?? e.longitude ?? null,
    timestamp: e.timestamp || now,
  }))

  // Filter out entities without valid coordinates
  const valid = entities.filter(e => e.lat != null && e.lng != null)

  try {
    const ingestHeaders: Record<string, string> = { "Content-Type": "application/json" }
    if (MINDEX_API_KEY) ingestHeaders["X-API-Key"] = MINDEX_API_KEY
    const res = await fetch(`${MINDEX_URL}/api/mindex/earth/ingest`, {
      method: "POST",
      headers: ingestHeaders,
      body: JSON.stringify({
        source,
        layer: mindexLayer,
        timestamp: now,
        entities: valid,
      }),
      signal: AbortSignal.timeout(10000),
    })

    if (res.ok) {
      const data = await res.json()
      return NextResponse.json({
        ...data,
        ingested: valid.length,
        dropped: rawEntities.length - valid.length,
        source,
        layer: mindexLayer,
      })
    }

    return NextResponse.json(
      {
        ingested: 0,
        dropped: rawEntities.length,
        source,
        layer: mindexLayer,
        persisted: false,
        available: false,
        warning: `MINDEX ingest failed: ${res.status}`,
      },
      { status: 200, headers: { "Cache-Control": "no-store" } },
    )
  } catch (err) {
    return NextResponse.json(
      {
        ingested: 0,
        dropped: rawEntities.length,
        source,
        layer: mindexLayer,
        persisted: false,
        available: false,
        warning: "MINDEX unreachable for ingest",
      },
      { status: 200, headers: { "Cache-Control": "no-store" } },
    )
  }
}
