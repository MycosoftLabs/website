/**
 * FlightRadar24 Aircraft API Route
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
 */

import { NextResponse } from "next/server"
import { getFlightRadar24Client } from "@/lib/oei/connectors"
import { logDataCollection, logAPIError } from "@/lib/oei/mindex-logger"
import { ingestAircraft } from "@/lib/oei/mindex-ingest"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  
  const lamin = searchParams.get("lamin")
  const lamax = searchParams.get("lamax")
  const lomin = searchParams.get("lomin")
  const lomax = searchParams.get("lomax")
  const airline = searchParams.get("airline")
  const limit = searchParams.get("limit")

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

    return NextResponse.json({
      source: "flightradar24",
      timestamp: new Date().toISOString(),
      total: aircraft.length,
      aircraft,
    })
  } catch (error) {
    console.error("[API] FlightRadar24 error:", error)
    logAPIError("flightradar24", "flightradar24.com", String(error))
    return NextResponse.json(
      { error: "Failed to fetch FlightRadar24 data" },
      { status: 500 }
    )
  }
}
