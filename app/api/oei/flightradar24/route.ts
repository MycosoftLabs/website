/**
 * FlightRadar24 Aircraft API Route - Feb 18, 2026
 * 
 * GET /api/oei/flightradar24 - Fetch aircraft from FlightRadar24
 * 
 * Query params:
 * - lamin: South latitude bound
 * - lamax: North latitude bound
 * - lomin: West longitude bound
 * - lomax: East longitude bound
 * - airline: Filter by airline code
 * - limit: Maximum results to return
 * - refresh: Force cache refresh
 * 
 * Results cached for 30 seconds to prevent overwhelming the dev server
 */

import { NextResponse } from "next/server"
import { getFlightRadar24Client } from "@/lib/oei/connectors"
import { logDataCollection, logAPIError } from "@/lib/oei/mindex-logger"
import { ingestAircraft } from "@/lib/oei/mindex-ingest"

// In-memory cache
interface CacheEntry {
  data: unknown
  timestamp: number
  expiresAt: number
}

const aircraftCache = new Map<string, CacheEntry>()
const CACHE_TTL_MS = 30_000 // 30 seconds cache for aircraft (more real-time)
const CACHE_STALE_MS = 120_000 // 2 minutes max stale

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  
  const lamin = searchParams.get("lamin")
  const lamax = searchParams.get("lamax")
  const lomin = searchParams.get("lomin")
  const lomax = searchParams.get("lomax")
  const airline = searchParams.get("airline")
  const limit = searchParams.get("limit")
  const forceRefresh = searchParams.get("refresh") === "true"

  const cacheKey = `aircraft_${lamin}_${lamax}_${lomin}_${lomax}_${airline}_${limit}`
  const now = Date.now()
  
  // Check cache first
  const cached = aircraftCache.get(cacheKey)
  if (!forceRefresh && cached) {
    const isStale = now > cached.expiresAt
    const isTooOld = now > cached.timestamp + CACHE_STALE_MS
    
    if (!isStale) {
      console.log(`[FlightRadar24] Cache HIT (${Math.round((cached.expiresAt - now) / 1000)}s remaining)`)
      return NextResponse.json(cached.data)
    }
    
    if (!isTooOld) {
      console.log(`[FlightRadar24] Cache STALE, returning cached data`)
      return NextResponse.json(cached.data)
    }
  }

  try {
    const startTime = Date.now()
    const client = getFlightRadar24Client()
    
    const query = {
      bounds: lamin && lamax && lomin && lomax
        ? {
            south: parseFloat(lamin),
            north: parseFloat(lamax),
            west: parseFloat(lomin),
            east: parseFloat(lomax),
          }
        : undefined,
      airline: airline || undefined,
      limit: limit ? parseInt(limit) : undefined,
    }

    const aircraft = await client.fetchFlights(query)
    const latency = Date.now() - startTime
    
    // Log to MINDEX
    logDataCollection("flightradar24", "flightradar24.com", aircraft.length, latency, false)
    
    // Ingest aircraft data to MINDEX for persistent storage (non-blocking)
    ingestAircraft("flightradar24", aircraft)

    const responseData = {
      source: "flightradar24",
      timestamp: new Date().toISOString(),
      total: aircraft.length,
      aircraft,
      available: aircraft.length > 0,
      cached: false,
    }
    
    // Store in cache
    aircraftCache.set(cacheKey, {
      data: { ...responseData, cached: true },
      timestamp: now,
      expiresAt: now + CACHE_TTL_MS,
    })
    console.log(`[FlightRadar24] Cache SET (TTL: ${CACHE_TTL_MS / 1000}s)`)

    return NextResponse.json(responseData)
  } catch (error) {
    console.error("[API] FlightRadar24 error:", error)
    logAPIError("flightradar24", "flightradar24.com", String(error))
    
    // Return empty data on error instead of error status (graceful fallback)
    return NextResponse.json({
      source: "flightradar24",
      timestamp: new Date().toISOString(),
      total: 0,
      aircraft: [],
      available: false,
      error: String(error),
    })
  }
}
