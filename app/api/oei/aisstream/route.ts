import { NextRequest, NextResponse } from "next/server"
import { getAISStreamClient } from "@/lib/oei/connectors/aisstream-ships"

export const dynamic = "force-dynamic"

/**
 * GET /api/oei/aisstream
 * Fetch AIS vessel positions
 * 
 * Query params:
 * - lamin, lamax, lomin, lomax: Bounding box coordinates
 * - mmsi: Comma-separated MMSI numbers
 * - publish: "true" to publish to event bus
 * - limit: Maximum number of results
 * - sample: "true" to return sample data (for development)
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
  const sample = searchParams.get("sample") === "true"

  try {
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
    
    // If sample data explicitly requested, return sample vessels
    if (sample) {
      const vessels = client.getSampleVessels()
      return NextResponse.json({
        success: true,
        sample: true,
        message: "Returning sample data as requested",
        total: vessels.length,
        vessels,
        timestamp: new Date().toISOString(),
      })
    }
    
    // Try to get cached vessels from WebSocket stream
    let vessels = client.getCachedVessels(query)
    
    // If cache is empty (no WebSocket connection or no data), use sample data as fallback
    // This ensures the dashboard always has vessel data to display
    if (vessels.length === 0) {
      console.log("[AISStream] Cache empty, using sample vessel data as fallback")
      vessels = client.getSampleVessels()
      
      // Apply query filters to sample data if provided
      if (query.bounds) {
        vessels = vessels.filter(v => {
          if (!v.location) return false
          const loc = v.location as { latitude: number; longitude: number }
          return (
            loc.latitude >= query.bounds!.south &&
            loc.latitude <= query.bounds!.north &&
            loc.longitude >= query.bounds!.west &&
            loc.longitude <= query.bounds!.east
          )
        })
      }
      
      if (query.limit && query.limit > 0) {
        vessels = vessels.slice(0, query.limit)
      }
      
      return NextResponse.json({
        success: true,
        sample: true,
        message: "Using sample data - AISStream WebSocket cache is empty. For live data, start the AIS streaming service.",
        total: vessels.length,
        vessels,
        timestamp: new Date().toISOString(),
      })
    }
    
    if (publish) {
      const result = await client.publishCachedVessels(query)
      return NextResponse.json({
        success: true,
        published: result.published,
        total: result.entities.length,
        vessels: result.entities,
        timestamp: new Date().toISOString(),
      })
    } else {
      return NextResponse.json({
        success: true,
        total: vessels.length,
        vessels,
        timestamp: new Date().toISOString(),
      })
    }
  } catch (error) {
    console.error("[AISStream] Error:", error)
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
