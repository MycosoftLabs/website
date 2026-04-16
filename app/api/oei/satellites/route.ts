/**
 * Satellite Tracking API Route - Feb 18, 2026 (updated Apr 2026)
 * REAL DATA ONLY - no mock/sample data
 *
 * GET /api/oei/satellites - Fetch satellite positions and TLE data from ALL
 * available sources via the Satellite Registry (CelesTrak, MINDEX, TLE API
 * mirror, Space-Track.org, N2YO, UCS enrichment). Deduplicated by NORAD ID.
 *
 * Query params:
 * - category: stations | starlink | oneweb | weather | gnss | active | debris | planet
 *             (used as a post-filter on orbitType/objectType when registry mode is active)
 * - norad: Comma-separated NORAD catalog IDs
 * - limit: Maximum results to return
 * - refresh: Force cache refresh
 * - mode: "registry" (default) uses multi-source registry; "legacy" uses single CelesTrak
 *
 * Results are cached for 30 seconds (registry) or 2 minutes (legacy).
 */

import { NextResponse } from "next/server"
import { getSatelliteTrackingClient, type SatelliteCategory } from "@/lib/oei/connectors"
import { logDataCollection, logAPIError } from "@/lib/oei/mindex-logger"
import { ingestSatellites } from "@/lib/oei/mindex-ingest"
import { fetchAllSatellitesWithMeta, type SatelliteRecord } from "@/lib/crep/registries/satellite-registry"

// In-memory cache to prevent overwhelming external APIs and dev server
interface CacheEntry {
  data: unknown
  timestamp: number
  expiresAt: number
}

const satelliteCache = new Map<string, CacheEntry>()
const REGISTRY_CACHE_TTL_MS = 30_000 // 30 seconds for registry mode
const LEGACY_CACHE_TTL_MS = 120_000 // 2 minutes for legacy mode
const CACHE_STALE_MS = 300_000 // 5 minutes before forced refresh

const validCategories: SatelliteCategory[] = [
  "stations",
  "starlink",
  "oneweb",
  "planet",
  "weather",
  "gnss",
  "active",
  "debris",
]

// Timeout varies by category - multi-search categories need more time
const CATEGORY_TIMEOUTS: Record<string, number> = {
  active:   20000,  // broad search
  starlink: 20000,  // thousands of satellites
  debris:   20000,  // many objects
  gnss:     20000,  // two searches in parallel
  weather:  20000,  // two searches in parallel
  planet:   18000,
  oneweb:   18000,
  stations: 15000,
  default:  15000,
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)

  const category = searchParams.get("category") as SatelliteCategory | null
  const noradParam = searchParams.get("norad")
  const limit = searchParams.get("limit")
  const forceRefresh = searchParams.get("refresh") === "true"
  const mode = searchParams.get("mode") || "registry"

  const validCategory = category && validCategories.includes(category)
    ? category
    : "stations"

  const cacheKey = `satellites_${mode}_${validCategory}_${noradParam || "all"}_${limit || "unlimited"}`
  const now = Date.now()
  const cacheTtl = mode === "registry" ? REGISTRY_CACHE_TTL_MS : LEGACY_CACHE_TTL_MS

  // Check cache first (unless force refresh)
  const cached = satelliteCache.get(cacheKey)
  if (!forceRefresh && cached) {
    const isStale = now > cached.expiresAt
    const isTooOld = now > cached.timestamp + CACHE_STALE_MS

    // Return fresh cache
    if (!isStale) {
      console.log(`[Satellites] Cache HIT for "${validCategory}" (${Math.round((cached.expiresAt - now) / 1000)}s remaining)`)
      return NextResponse.json(cached.data)
    }

    // Return stale cache if not too old (stale-while-revalidate pattern)
    if (!isTooOld) {
      console.log(`[Satellites] Cache STALE for "${validCategory}", returning cached data`)
      return NextResponse.json(cached.data)
    }
  }

  // ── Registry mode: multi-source aggregation ─────────────────────────────
  if (mode === "registry") {
    try {
      const startTime = Date.now()

      const registryResult = await fetchAllSatellitesWithMeta()
      let satellites: SatelliteRecord[] = registryResult.satellites

      // Parse NORAD IDs if provided and filter
      if (noradParam) {
        const noradIds = new Set(
          noradParam.split(",").map((id) => parseInt(id.trim())).filter((id) => !isNaN(id))
        )
        satellites = satellites.filter((s) => noradIds.has(s.noradId))
      }

      // Apply category filter (post-filter based on orbit/object type)
      if (category && category !== "active") {
        satellites = filterByCategory(satellites, validCategory)
      }

      // Apply limit
      if (limit) {
        const max = parseInt(limit)
        if (satellites.length > max) satellites = satellites.slice(0, max)
      }

      const latency = Date.now() - startTime
      const activeSource = Object.entries(registryResult.sources)
        .filter(([, c]) => c > 0)
        .map(([s]) => s)
        .join("+") || "none"

      console.log(`[Satellites] Registry "${validCategory}": ${satellites.length} satellites in ${latency}ms`)

      logDataCollection("satellite-registry", "multi-source", satellites.length, latency, false)
      ingestSatellites("satellite-registry", satellites as any)

      const responseData = {
        source: activeSource,
        sources: registryResult.sources,
        enrichedFromUCS: registryResult.enrichedFromUCS,
        timestamp: new Date().toISOString(),
        category: validCategory,
        total: satellites.length,
        satellites,
        available: satellites.length > 0,
        latencyMs: latency,
        cached: false,
      }

      satelliteCache.set(cacheKey, {
        data: { ...responseData, cached: true },
        timestamp: now,
        expiresAt: now + cacheTtl,
      })
      console.log(`[Satellites] Cache SET for registry "${validCategory}" (TTL: ${cacheTtl / 1000}s)`)

      return NextResponse.json(responseData)
    } catch (error) {
      const errMsg = (error as Error).message
      console.error(`[API] Satellite registry error for category "${validCategory}":`, errMsg)
      logAPIError("satellite-registry", "multi-source", errMsg)

      // On error, return stale cache if available
      if (cached) {
        console.log(`[Satellites] Registry error - returning stale cache for "${validCategory}"`)
        return NextResponse.json(cached.data)
      }

      return NextResponse.json({
        source: "satellite-registry",
        timestamp: new Date().toISOString(),
        category: validCategory,
        total: 0,
        satellites: [],
        available: false,
        error: errMsg,
        message: `Satellite registry unavailable for category "${validCategory}"`,
      }, { status: 503 })
    }
  }

  // ── Legacy mode: single CelesTrak source ────────────────────────────────
  const timeoutMs = CATEGORY_TIMEOUTS[validCategory] ?? CATEGORY_TIMEOUTS.default

  try {
    const startTime = Date.now()
    const client = getSatelliteTrackingClient()

    const noradIds = noradParam
      ? noradParam.split(",").map(id => parseInt(id.trim())).filter(id => !isNaN(id))
      : undefined

    const query = {
      category: validCategory,
      noradIds,
      limit: limit ? parseInt(limit) : undefined,
    }

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`Satellite fetch timeout after ${timeoutMs}ms for category "${validCategory}"`)), timeoutMs)
    )

    const satellites = await Promise.race([
      client.fetchSatellites(query),
      timeoutPromise
    ])

    const latency = Date.now() - startTime
    console.log(`[Satellites] Legacy "${validCategory}": ${satellites.length} satellites in ${latency}ms`)

    logDataCollection("satellites", "celestrak.org", satellites.length, latency, false)
    ingestSatellites("celestrak", satellites as any)

    const responseData = {
      source: "celestrak",
      timestamp: new Date().toISOString(),
      category: validCategory,
      total: satellites.length,
      satellites,
      available: satellites.length > 0,
      latencyMs: latency,
      cached: false,
    }

    satelliteCache.set(cacheKey, {
      data: { ...responseData, cached: true },
      timestamp: now,
      expiresAt: now + cacheTtl,
    })
    console.log(`[Satellites] Cache SET for legacy "${validCategory}" (TTL: ${cacheTtl / 1000}s)`)

    return NextResponse.json(responseData)
  } catch (error) {
    const errMsg = (error as Error).message
    const is429 = errMsg.includes("429") || errMsg.includes("rate limit")
    console.error(`[API] Satellite tracking error for category "${validCategory}":`, errMsg)
    logAPIError("satellites", "celestrak.org", errMsg)

    if (is429 && cached) {
      console.log(`[Satellites] 429 rate limit - returning stale cache for "${validCategory}"`)
      return NextResponse.json(
        { ...(cached.data as object), rateLimit: true, message: "Rate limit reached; showing cached data." },
        { status: 200 }
      )
    }

    const status = is429 ? 429 : 503
    const message = is429
      ? "TLE API rate limit (429). Please wait a minute before refreshing."
      : `CelesTrak API unavailable for category "${validCategory}" - no satellite data`

    return NextResponse.json({
      source: "celestrak",
      timestamp: new Date().toISOString(),
      category: validCategory,
      total: 0,
      satellites: [],
      available: false,
      error: errMsg,
      message,
    }, { status })
  }
}

// ── Category post-filter for registry mode ────────────────────────────────────

function filterByCategory(satellites: SatelliteRecord[], category: SatelliteCategory): SatelliteRecord[] {
  switch (category) {
    case "stations":
      return satellites.filter((s) =>
        s.name.toUpperCase().includes("ISS") ||
        s.name.toUpperCase().includes("TIANGONG") ||
        s.name.toUpperCase().includes("STATION") ||
        s.objectType?.toUpperCase().includes("STATION")
      )
    case "starlink":
      return satellites.filter((s) => s.name.toUpperCase().includes("STARLINK"))
    case "oneweb":
      return satellites.filter((s) => s.name.toUpperCase().includes("ONEWEB"))
    case "planet":
      return satellites.filter((s) =>
        s.name.toUpperCase().includes("FLOCK") ||
        s.name.toUpperCase().includes("PLANETSCOPE") ||
        s.name.toUpperCase().includes("DOVE")
      )
    case "weather":
      return satellites.filter((s) =>
        s.name.toUpperCase().includes("NOAA") ||
        s.name.toUpperCase().includes("GOES") ||
        s.name.toUpperCase().includes("METEOSAT") ||
        s.name.toUpperCase().includes("HIMAWARI") ||
        s.objectType?.toUpperCase().includes("WEATHER")
      )
    case "gnss":
      return satellites.filter((s) =>
        s.name.toUpperCase().includes("GPS") ||
        s.name.toUpperCase().includes("NAVSTAR") ||
        s.name.toUpperCase().includes("GLONASS") ||
        s.name.toUpperCase().includes("GALILEO") ||
        s.name.toUpperCase().includes("BEIDOU")
      )
    case "debris":
      return satellites.filter((s) =>
        s.objectType?.toUpperCase().includes("DEBRIS") ||
        s.name.toUpperCase().includes("DEB") ||
        s.name.toUpperCase().includes("DEBRIS")
      )
    default:
      return satellites
  }
}
