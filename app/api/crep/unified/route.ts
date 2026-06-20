/**
 * Unified CREP Data API
 *
 * Single endpoint for fetching all CREP data with caching.
 * Default bundle is capped (Jun 20 2026) to avoid multi-MB payloads.
 */

import { NextRequest, NextResponse } from "next/server"
import {
  getAircraft,
  getVessels,
  getSatellites,
  getSpaceWeather,
  getGlobalEvents,
  getFungalObservations,
  getDevices,
  getDataSummary,
  getServiceStats,
  fetchAllEarthData,
  getEarthStats,
  getEarthDataByBbox,
  UNIFIED_DEFAULT_LIMITS,
  type UnifiedLimits,
} from "@/lib/crep/crep-data-service"

export const dynamic = "force-dynamic"
export const maxDuration = 60

const UNIFIED_CACHE_TTL_MS = 45_000
let unifiedCache: {
  key: string
  at: number
  body: Record<string, unknown>
} | null = null

function parseBbox(raw: string | null): {
  north: number
  south: number
  east: number
  west: number
} | null {
  if (!raw) return null
  const parts = raw.split(",").map((p) => Number(p.trim()))
  if (parts.length !== 4 || parts.some((n) => !Number.isFinite(n))) return null
  const [north, south, east, west] = parts
  return { north, south, east, west }
}

function resolveLimits(searchParams: URLSearchParams): UnifiedLimits {
  const limitParam = searchParams.get("limit")
  if (!limitParam) return UNIFIED_DEFAULT_LIMITS
  const n = Number(limitParam)
  if (!Number.isFinite(n) || n <= 0) return UNIFIED_DEFAULT_LIMITS
  const cap = Math.min(n, 5000)
  return {
    aircraft: cap,
    vessels: cap,
    satellites: cap,
    fungal: cap,
    events: cap,
  }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const type = searchParams.get("type")
  const refresh = searchParams.get("refresh") === "true"
  const stats = searchParams.get("stats") === "true"
  const countsOnly = searchParams.get("countsOnly") === "true"
  const bbox = parseBbox(searchParams.get("bbox"))
  const limits = resolveLimits(searchParams)

  try {
    if (stats) {
      return NextResponse.json({
        success: true,
        ...getServiceStats(),
      })
    }

    if (countsOnly) {
      const earthStats = await getEarthStats()
      const summary = await getDataSummary(undefined, limits)
      return NextResponse.json({
        success: true,
        counts: {
          ...earthStats,
          aircraft: summary.aircraft,
          vessels: summary.vessels,
          satellites: summary.satellites,
          fungalObservations: summary.fungalObservations,
          globalEvents: summary.globalEvents,
          devices: summary.devices,
        },
        timestamp: new Date().toISOString(),
      })
    }

    if (type) {
      const forceRefresh = refresh
      let data: unknown = null

      const typeLimits: UnifiedLimits = limits

      switch (type) {
        case "aircraft":
          data = await getAircraft({ forceRefresh, limit: typeLimits.aircraft })
          break
        case "vessels":
          data = await getVessels({ forceRefresh, limit: typeLimits.vessels })
          break
        case "satellites":
          data = await getSatellites({ forceRefresh, limit: typeLimits.satellites })
          break
        case "spaceWeather":
          data = await getSpaceWeather({ forceRefresh })
          break
        case "globalEvents":
          data = await getGlobalEvents({ forceRefresh, limit: typeLimits.events })
          break
        case "fungalObservations":
          data = await getFungalObservations({ forceRefresh, limit: typeLimits.fungal })
          break
        case "devices":
          data = await getDevices({ forceRefresh })
          break
        case "earthStats":
          data = await getEarthStats()
          break
        case "summary":
          data = await getDataSummary(undefined, typeLimits)
          break
        default:
          return NextResponse.json(
            { success: false, error: `Unknown type: ${type}` },
            { status: 400 }
          )
      }

      return NextResponse.json({
        success: true,
        type,
        data,
        count: Array.isArray(data) ? data.length : 1,
        timestamp: new Date().toISOString(),
      })
    }

    const cacheKey = bbox
      ? `bbox:${bbox.north},${bbox.south},${bbox.east},${bbox.west}:${limits.aircraft}`
      : `global:${limits.aircraft}`

    if (!refresh && unifiedCache && unifiedCache.key === cacheKey) {
      const age = Date.now() - unifiedCache.at
      if (age < UNIFIED_CACHE_TTL_MS) {
        return NextResponse.json({
          ...unifiedCache.body,
          cached: true,
          cacheAgeMs: age,
        })
      }
    }

    console.log("[CREP Unified] Fetching earth data...", bbox ? "bbox" : "global capped")
    const startTime = Date.now()

    const allData = bbox
      ? await getEarthDataByBbox({
          north: bbox.north,
          south: bbox.south,
          east: bbox.east,
          west: bbox.west,
          limit: limits.aircraft,
        })
      : await fetchAllEarthData(undefined, undefined, limits)

    const elapsed = Date.now() - startTime
    console.log(`[CREP Unified] Fetched in ${elapsed}ms`)

    const body = {
      success: true,
      data: allData,
      counts: {
        aircraft: allData.aircraft.length,
        vessels: allData.vessels.length,
        satellites: allData.satellites.length,
        fungalObservations: allData.fungalObservations.length,
        globalEvents: allData.globalEvents.length,
        devices: allData.devices.length,
        weather: allData.weather.length,
        emissions: allData.emissions.length,
        infrastructure: allData.infrastructure.length,
        spaceWeather: allData.spaceWeather.length,
      },
      elapsed,
      timestamp: new Date().toISOString(),
      cached: false,
    }

    unifiedCache = { key: cacheKey, at: Date.now(), body }

    return NextResponse.json(body, {
      headers: {
        "Cache-Control": "s-maxage=30, stale-while-revalidate=120",
      },
    })
  } catch (error) {
    console.error("[CREP Unified] Error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        data: {
          aircraft: [],
          vessels: [],
          satellites: [],
          fungalObservations: [],
          globalEvents: [],
          devices: [],
          weather: [],
          emissions: [],
          infrastructure: [],
          spaceWeather: [],
        },
        counts: {
          aircraft: 0,
          vessels: 0,
          satellites: 0,
          fungalObservations: 0,
          globalEvents: 0,
          devices: 0,
          weather: 0,
          emissions: 0,
          infrastructure: 0,
          spaceWeather: 0,
        },
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    )
  }
}
