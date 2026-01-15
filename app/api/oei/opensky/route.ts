import { NextRequest, NextResponse } from "next/server"
import { getOpenSkyClient } from "@/lib/oei/connectors/opensky-adsb"
import type { GeoBounds } from "@/types/oei"

export const dynamic = "force-dynamic"

/**
 * GET /api/oei/opensky
 * Fetch real-time aircraft positions from OpenSky Network
 * 
 * Query params:
 * - lamin, lamax, lomin, lomax: Bounding box coordinates
 * - lat, lon, radius: Point search with radius in degrees
 * - icao24: Comma-separated ICAO24 addresses
 * - publish: "true" to publish to event bus
 * - limit: Maximum number of results
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  
  // Parse bounding box
  const lamin = searchParams.get("lamin")
  const lamax = searchParams.get("lamax")
  const lomin = searchParams.get("lomin")
  const lomax = searchParams.get("lomax")
  
  // Parse point search
  const lat = searchParams.get("lat")
  const lon = searchParams.get("lon")
  const radius = searchParams.get("radius")
  
  // Other params
  const icao24 = searchParams.get("icao24")
  const publish = searchParams.get("publish") === "true"
  const limit = parseInt(searchParams.get("limit") || "500")

  try {
    const client = getOpenSkyClient()
    
    let bounds: GeoBounds | undefined
    
    // Build bounds from params
    if (lamin && lamax && lomin && lomax) {
      bounds = {
        south: parseFloat(lamin),
        north: parseFloat(lamax),
        west: parseFloat(lomin),
        east: parseFloat(lomax),
      }
    } else if (lat && lon) {
      const latNum = parseFloat(lat)
      const lonNum = parseFloat(lon)
      const radiusNum = parseFloat(radius || "1")
      bounds = {
        north: latNum + radiusNum,
        south: latNum - radiusNum,
        east: lonNum + radiusNum,
        west: lonNum - radiusNum,
      }
    }
    
    const query = {
      bounds,
      icao24: icao24 ? icao24.split(",") : undefined,
    }
    
    if (publish) {
      const result = await client.fetchAndPublish(query)
      const entities = result.entities.slice(0, limit)
      return NextResponse.json({
        success: true,
        published: Math.min(result.published, limit),
        total: result.entities.length,
        limited: result.entities.length > limit,
        aircraft: entities,
        timestamp: new Date().toISOString(),
      })
    } else {
      const entities = await client.fetchAllStates(query)
      const limited = entities.slice(0, limit)
      return NextResponse.json({
        success: true,
        total: entities.length,
        limited: entities.length > limit,
        aircraft: limited,
        timestamp: new Date().toISOString(),
      })
    }
  } catch (error) {
    console.error("[OpenSky] Error:", error)
    
    // Handle rate limit specifically
    const errorMessage = String(error)
    if (errorMessage.includes("rate limit")) {
      return NextResponse.json(
        { 
          error: "Rate limit exceeded", 
          message: "OpenSky API rate limit exceeded. Anonymous users: 100 requests/day. Register at opensky-network.org for 400 requests/day.",
          timestamp: new Date().toISOString(),
        },
        { status: 429 }
      )
    }
    
    return NextResponse.json(
      { 
        error: "Failed to fetch OpenSky data", 
        details: errorMessage,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    )
  }
}
