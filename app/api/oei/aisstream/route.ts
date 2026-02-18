import { NextRequest, NextResponse } from "next/server"
import { getAISStreamClient } from "@/lib/oei/connectors/aisstream-ships"
import { logDataCollection, logAPIError } from "@/lib/oei/mindex-logger"
import { ingestVessels } from "@/lib/oei/mindex-ingest"

export const dynamic = "force-dynamic"

/**
 * GET /api/oei/aisstream
 * Fetch AIS vessel positions (REAL DATA ONLY - no mock/sample data)
 * 
 * Query params:
 * - lamin, lamax, lomin, lomax: Bounding box coordinates
 * - mmsi: Comma-separated MMSI numbers
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
  
  // Other params
  const mmsi = searchParams.get("mmsi")
  const publish = searchParams.get("publish") === "true"
  const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!) : undefined // No default limit
  try {
    const startTime = Date.now()
    const client = getAISStreamClient()
    
    const query = {
      bounds: lamin && lamax && lomin && lomax ? {
        south: parseFloat(lamin),
        north: parseFloat(lamax),
        west: parseFloat(lomin),
        east: parseFloat(lomax),
      } : undefined,
      mmsi: mmsi ? mmsi.split(",") : undefined,
      limit,
    }
    
    // Get cached vessels from WebSocket stream (REAL data only - no mock/sample data)
    const vessels = client.getCachedVessels(query)
    
    const latency = Date.now() - startTime
    
    if (publish) {
      const result = await client.publishCachedVessels(query)
      logDataCollection("aisstream", "aisstream.com", result.entities.length, latency, true, "memory")
      // Ingest vessel data to MINDEX for persistent storage (non-blocking)
      ingestVessels("aisstream", result.entities)
      return NextResponse.json({
        success: true,
        published: result.published,
        total: result.entities.length,
        vessels: result.entities,
        timestamp: new Date().toISOString(),
      })
    } else {
      logDataCollection("aisstream", "aisstream.com", vessels.length, latency, true, "memory")
      // Ingest vessel data to MINDEX for persistent storage (non-blocking)
      ingestVessels("aisstream", vessels)
      return NextResponse.json({
        success: true,
        total: vessels.length,
        vessels,
        timestamp: new Date().toISOString(),
      })
    }
  } catch (error) {
    console.error("[AISStream] Error:", error)
    logAPIError("aisstream", "aisstream.com", String(error))
    return NextResponse.json(
      { 
        error: "Failed to fetch AIS vessel data", 
        details: String(error),
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    )
  }
}
