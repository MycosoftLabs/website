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
  const limit = parseInt(searchParams.get("limit") || "100")
  const sample = searchParams.get("sample") === "true"

  try {
    const client = getAISStreamClient()
    
    // If sample data requested or no API key, return sample vessels
    if (sample || !client.hasApiKey()) {
      const vessels = client.getSampleVessels()
      return NextResponse.json({
        success: true,
        sample: true,
        message: client.hasApiKey() 
          ? "Returning sample data as requested"
          : "AISstream API key not configured. Set AISSTREAM_API_KEY env var. Returning sample data.",
        total: vessels.length,
        vessels,
        timestamp: new Date().toISOString(),
      })
    }
    
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
      const vessels = client.getCachedVessels(query)
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
