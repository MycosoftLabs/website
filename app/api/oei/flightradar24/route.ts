/**
 * FlightRadar24 Aircraft API Route - Feb 18, 2026 (updated Apr 2026)
 *
 * GET /api/oei/flightradar24 - Fetch aircraft from ALL available sources
 * via the Aircraft Registry (FlightRadar24, OpenSky, MINDEX, ADS-B Exchange,
 * ADSB.lol). Deduplicated by ICAO hex code.
 *
 * Query params:
 * - lamin: South latitude bound
 * - lamax: North latitude bound
 * - lomin: West longitude bound
 * - lomax: East longitude bound
 * - airline: Filter by airline code (post-filter on callsign prefix)
 * - limit: Maximum results to return
 * - refresh: Force cache refresh
 *
 * Results cached for 30 seconds to prevent overwhelming the dev server
 */

import { NextResponse } from "next/server"
import { logDataCollection, logAPIError } from "@/lib/oei/mindex-logger"
import { ingestAircraft } from "@/lib/oei/mindex-ingest"
import { fetchAllAircraftWithMeta, type AircraftRecord } from "@/lib/crep/registries/aircraft-registry"

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

    const bbox =
      lamin && lamax && lomin && lomax
        ? {
            south: parseFloat(lamin),
            north: parseFloat(lamax),
            west: parseFloat(lomin),
            east: parseFloat(lomax),
          }
        : undefined
    const parsedLimit = limit ? parseInt(limit) : undefined

    const registryResult = await fetchAllAircraftWithMeta({ bbox, limit: parsedLimit })
    let aircraft: AircraftRecord[] = registryResult.aircraft

    if (airline) {
      const prefix = airline.toUpperCase()
      aircraft = aircraft.filter(
        (a) => a.callsign.toUpperCase().startsWith(prefix)
      )
    }

    const latency = Date.now() - startTime
    const activeSource = registryResult.usedSource || "none"

    // Log to MINDEX
    logDataCollection("aircraft-registry", "multi-source", aircraft.length, latency, false)

    // Ingest aircraft data to MINDEX for persistent storage (non-blocking)
    ingestAircraft("aircraft-registry", aircraft as any)

    const responseData = {
      source: activeSource,
      sources: registryResult.sources,
      usedSource: registryResult.usedSource,
      failedUpstreams: registryResult.failedUpstreams,
      attempts: registryResult.attempts,
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
    console.log(`[FlightRadar24] Cache SET (TTL: ${CACHE_TTL_MS / 1000}s, sources: ${activeSource})`)

    return NextResponse.json(responseData)
  } catch (error) {
    console.error("[API] Aircraft registry error:", error)
    logAPIError("aircraft-registry", "multi-source", String(error))

    // Return empty data on error instead of error status (graceful fallback)
    return NextResponse.json({
      source: "none",
      usedSource: null,
      failedUpstreams: [String(error)],
      timestamp: new Date().toISOString(),
      total: 0,
      aircraft: [],
      available: false,
      error: String(error),
    })
  }
}
