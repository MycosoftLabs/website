/**
 * Satellite Tracking API Route
 * 
 * GET /api/oei/satellites - Fetch satellite positions and TLE data
 * 
 * Query params:
 * - category: stations | starlink | oneweb | weather | gnss | active | debris
 * - norad: Comma-separated NORAD catalog IDs
 * - limit: Maximum results to return
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

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  
  const category = searchParams.get("category") as SatelliteCategory | null
  const noradParam = searchParams.get("norad")
  const limit = searchParams.get("limit")

  try {
    const startTime = Date.now()
    const client = getSatelliteTrackingClient()

    // Parse NORAD IDs if provided
    const noradIds = noradParam
      ? noradParam.split(",").map(id => parseInt(id.trim())).filter(id => !isNaN(id))
      : undefined

    // Validate category
    const validCategory = category && validCategories.includes(category)
      ? category
      : "stations"

    const query = {
      category: validCategory,
      noradIds,
      limit: limit ? parseInt(limit) : undefined, // No default limit - fetch all available
    }

    // Add timeout to prevent long hangs
    const timeoutPromise = new Promise<never>((_, reject) => 
      setTimeout(() => reject(new Error("Satellite fetch timeout")), 8000)
    );
    
    const satellites = await Promise.race([
      client.fetchSatellites(query),
      timeoutPromise
    ]);
    
    const latency = Date.now() - startTime
    
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
      available: true,
    })
  } catch (error) {
    console.error("[API] Satellite tracking error:", error)
    logAPIError("satellites", "celestrak.org", String(error))
    
    // Graceful fallback - return empty array with 200 status to prevent dashboard crashes
    return NextResponse.json({
      source: "celestrak",
      timestamp: new Date().toISOString(),
      category: searchParams.get("category") || "stations",
      total: 0,
      satellites: [],
      available: false,
      message: error instanceof Error ? error.message : "Failed to fetch satellite data"
    })
  }
}
