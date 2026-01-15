/**
 * Railways API Route
 * 
 * GET /api/oei/railways - Fetch railway stations and infrastructure data
 * 
 * Query params:
 * - lamin, lamax, lomin, lomax: Bounding box coordinates
 * - type: Filter by railway type (station, halt, yard, junction)
 * - limit: Maximum results to return
 */

import { NextResponse } from "next/server"
import { getOpenRailwayClient } from "@/lib/oei/connectors"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  
  // Parse bounding box
  const lamin = searchParams.get("lamin")
  const lamax = searchParams.get("lamax")
  const lomin = searchParams.get("lomin")
  const lomax = searchParams.get("lomax")
  
  // Other params
  const railwayType = searchParams.get("type")
  const limit = searchParams.get("limit")

  try {
    const client = getOpenRailwayClient()
    
    const query = {
      bounds: lamin && lamax && lomin && lomax
        ? {
            south: parseFloat(lamin),
            north: parseFloat(lamax),
            west: parseFloat(lomin),
            east: parseFloat(lomax),
          }
        : undefined,
      railwayType: railwayType ? railwayType.split(",") : undefined,
      limit: limit ? parseInt(limit) : undefined,
    }

    const stations = await client.fetchStations(query)

    return NextResponse.json({
      source: "openrailwaymap",
      timestamp: new Date().toISOString(),
      total: stations.length,
      stations,
    })
  } catch (error) {
    console.error("[API] Railways error:", error)
    return NextResponse.json(
      { error: "Failed to fetch railway data" },
      { status: 500 }
    )
  }
}
