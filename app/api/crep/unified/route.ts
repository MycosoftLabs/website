/**
 * Unified CREP Data API
 * 
 * Single endpoint for fetching all CREP data with caching.
 * This prevents the dashboard from making 10+ separate API calls
 * and overwhelming the dev server.
 * 
 * GET /api/crep/unified
 *   - Returns all cached CREP data
 *   - Uses stale-while-revalidate pattern
 *   - Much less load than individual endpoints
 * 
 * GET /api/crep/unified?type=aircraft
 *   - Returns specific data type only
 *   
 * GET /api/crep/unified?refresh=true
 *   - Forces cache refresh
 *   
 * GET /api/crep/unified?stats=true
 *   - Returns cache statistics
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
  fetchAllData,
} from "@/lib/crep/crep-data-service"

export const dynamic = "force-dynamic"
export const maxDuration = 60 // Allow up to 60 seconds for full data fetch

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const type = searchParams.get("type")
  const refresh = searchParams.get("refresh") === "true"
  const stats = searchParams.get("stats") === "true"

  try {
    // Return cache stats
    if (stats) {
      return NextResponse.json({
        success: true,
        ...getServiceStats(),
      })
    }

    // Fetch specific data type
    if (type) {
      const forceRefresh = refresh
      let data: unknown = null

      switch (type) {
        case "aircraft":
          data = await getAircraft({ forceRefresh })
          break
        case "vessels":
          data = await getVessels({ forceRefresh })
          break
        case "satellites":
          data = await getSatellites({ forceRefresh })
          break
        case "spaceWeather":
          data = await getSpaceWeather({ forceRefresh })
          break
        case "globalEvents":
          data = await getGlobalEvents({ forceRefresh })
          break
        case "fungalObservations":
          data = await getFungalObservations({ forceRefresh })
          break
        case "devices":
          data = await getDevices({ forceRefresh })
          break
        case "summary":
          data = await getDataSummary()
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

    // Fetch all data
    console.log("[CREP Unified] Fetching all data...")
    const startTime = Date.now()

    const allData = await fetchAllData()

    const elapsed = Date.now() - startTime
    console.log(`[CREP Unified] All data fetched in ${elapsed}ms`)

    return NextResponse.json({
      success: true,
      data: allData,
      counts: {
        aircraft: allData.aircraft.length,
        vessels: allData.vessels.length,
        satellites: allData.satellites.length,
        fungalObservations: allData.fungalObservations.length,
        globalEvents: allData.globalEvents.length,
        devices: allData.devices.length,
      },
      elapsed,
      timestamp: new Date().toISOString(),
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
        },
        counts: {
          aircraft: 0,
          vessels: 0,
          satellites: 0,
          fungalObservations: 0,
          globalEvents: 0,
          devices: 0,
        },
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    )
  }
}
