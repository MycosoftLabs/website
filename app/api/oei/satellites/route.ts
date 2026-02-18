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
 * 
 * Notes:
 * - "debris" fetches from iridium-33-debris + cosmos-2251-debris (both real CelesTrak groups)
 * - Timeout is 15 seconds to accommodate large categories like "active" and "starlink"
 */

import { NextResponse } from "next/server"
import { getSatelliteTrackingClient, type SatelliteCategory } from "@/lib/oei/connectors"
import { logDataCollection, logAPIError } from "@/lib/oei/mindex-logger"
import { ingestSatellites } from "@/lib/oei/mindex-ingest"

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

  const validCategory = category && validCategories.includes(category)
    ? category
    : "stations"

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

    return NextResponse.json({
      source: "celestrak",
      timestamp: new Date().toISOString(),
      category: validCategory,
      total: satellites.length,
      satellites,
      available: satellites.length > 0,
      latencyMs: latency,
    })
  } catch (error) {
    const errMsg = (error as Error).message
    console.error(`[API] Satellite tracking error for category "${validCategory}":`, errMsg)
    logAPIError("satellites", "celestrak.org", errMsg)
    
    return NextResponse.json({
      source: "celestrak",
      timestamp: new Date().toISOString(),
      category: validCategory,
      total: 0,
      satellites: [],
      available: false,
      error: errMsg,
      message: `CelesTrak API unavailable for category "${validCategory}" - no satellite data`,
    }, { status: 503 })
  }
}
