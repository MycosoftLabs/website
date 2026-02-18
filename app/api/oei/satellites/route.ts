/**
 * Satellite Tracking API Route - Feb 18, 2026
 * REAL DATA ONLY - no mock/sample data
 * 
 * GET /api/oei/satellites - Fetch satellite positions and TLE data from CelesTrak
 * 
 * Query params:
 * - category: stations | starlink | oneweb | weather | gnss | active | debris | planet
 * - norad: Comma-separated NORAD catalog IDs
 * - limit: Maximum results to return
 * - refresh: Force cache refresh
 * 
 * Notes:
 * - "debris" fetches from iridium-33-debris + cosmos-2251-debris (both real CelesTrak groups)
 * - Timeout is 15 seconds to accommodate large categories like "active" and "starlink"
 * - Results are cached for 2 minutes to prevent overwhelming the dev server
 */

import { NextResponse } from "next/server"
import { getSatelliteTrackingClient, type SatelliteCategory } from "@/lib/oei/connectors"
import { logDataCollection, logAPIError } from "@/lib/oei/mindex-logger"
import { ingestSatellites } from "@/lib/oei/mindex-ingest"

// In-memory cache to prevent overwhelming external APIs and dev server
interface CacheEntry {
  data: unknown
  timestamp: number
  expiresAt: number
}

const satelliteCache = new Map<string, CacheEntry>()
const CACHE_TTL_MS = 120_000 // 2 minutes cache
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

  const validCategory = category && validCategories.includes(category)
    ? category
    : "stations"

  const cacheKey = `satellites_${validCategory}_${noradParam || "all"}_${limit || "unlimited"}`
  const now = Date.now()
  
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
      // Could trigger background refresh here if needed
      return NextResponse.json(cached.data)
    }
  }

  const timeoutMs = CATEGORY_TIMEOUTS[validCategory] ?? CATEGORY_TIMEOUTS.default

  try {
    const startTime = Date.now()
    const client = getSatelliteTrackingClient()

    // Parse NORAD IDs if provided
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
    console.log(`[Satellites] Category "${validCategory}": ${satellites.length} satellites in ${latency}ms`)
    
    // Log to MINDEX
    logDataCollection("satellites", "celestrak.org", satellites.length, latency, false)
    
    // Ingest satellite data to MINDEX for persistent storage (non-blocking)
    ingestSatellites("celestrak", satellites)

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
    
    // Store in cache
    satelliteCache.set(cacheKey, {
      data: { ...responseData, cached: true },
      timestamp: now,
      expiresAt: now + CACHE_TTL_MS,
    })
    console.log(`[Satellites] Cache SET for "${validCategory}" (TTL: ${CACHE_TTL_MS / 1000}s)`)

    return NextResponse.json(responseData)
  } catch (error) {
    const errMsg = (error as Error).message
    const is429 = errMsg.includes("429") || errMsg.includes("rate limit")
    console.error(`[API] Satellite tracking error for category "${validCategory}":`, errMsg)
    logAPIError("satellites", "celestrak.org", errMsg)

    // On 429, return stale cache if available so the widget can keep showing data
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
