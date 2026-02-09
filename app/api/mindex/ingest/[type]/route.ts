import { NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"

const MINDEX_API_URL = process.env.MINDEX_API_URL || "http://localhost:8000"

// Valid ingestion types for CREP data
const VALID_TYPES = [
  "aircraft", 
  "vessels", 
  "satellites", 
  "events", 
  "weather", 
  "telemetry",
  // Added Feb 4, 2026 for comprehensive event logging
  "lightning",
  "fires",
  "smoke",
  "spores",
  "debris",
] as const
type IngestType = typeof VALID_TYPES[number]

interface IngestPayload {
  source: string
  timestamp: string
  data: Record<string, unknown>[] | Record<string, unknown>
  metadata?: Record<string, unknown>
}

/**
 * POST /api/mindex/ingest/[type]
 * Ingest CREP data into MINDEX for persistent storage and playback
 * 
 * Types supported:
 * - aircraft: Aircraft positions and tracks from FlightRadar24/OpenSky
 * - vessels: Vessel positions and tracks from AIS
 * - satellites: Satellite passes and TLE data
 * - events: Global events (earthquakes, volcanoes, wildfires, storms)
 * - weather: Weather data and alerts
 * - telemetry: Device telemetry data
 * - lightning: Lightning strike data from Blitzortung
 * - fires: Wildfire data from NASA FIRMS
 * - smoke: Smoke dispersion data
 * - spores: Spore dispersal data from FUSARIUM
 * - debris: Space debris tracking data
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ type: string }> }
) {
  const { type } = await params
  
  // Validate type
  if (!VALID_TYPES.includes(type as IngestType)) {
    return NextResponse.json(
      { 
        error: "Invalid ingestion type", 
        valid_types: VALID_TYPES,
        received: type
      },
      { status: 400 }
    )
  }
  
  try {
    const body: IngestPayload = await request.json()
    
    // Validate required fields
    if (!body.source || !body.data) {
      return NextResponse.json(
        { error: "Missing required fields: source, data" },
        { status: 400 }
      )
    }
    
    // Normalize data to array
    const dataArray = Array.isArray(body.data) ? body.data : [body.data]
    
    // Generate unique IDs for each record if not present
    const records = dataArray.map((item, index) => ({
      id: (item as Record<string, unknown>).id || `${type}-${body.source}-${Date.now()}-${index}`,
      type,
      source: body.source,
      timestamp: body.timestamp || new Date().toISOString(),
      data: item,
      indexed_at: new Date().toISOString(),
    }))
    
    // Send to MINDEX
    const mindexResponse = await fetch(`${MINDEX_API_URL}/api/mindex/crep/ingest`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "X-API-Key": process.env.MINDEX_API_KEY || "local-dev-key",
      },
      body: JSON.stringify({
        type,
        records,
        metadata: {
          ...body.metadata,
          source: body.source,
          ingested_at: new Date().toISOString(),
          record_count: records.length,
        },
      }),
      signal: AbortSignal.timeout(10000),
    })
    
    if (!mindexResponse.ok) {
      // If MINDEX endpoint doesn't exist yet, log and continue
      const errorText = await mindexResponse.text()
      console.warn(`MINDEX ingest failed for ${type}:`, errorText)
      
      // Return success anyway - data was processed, just not persisted
      return NextResponse.json({
        success: true,
        warning: "MINDEX persistence unavailable - data processed but not stored",
        type,
        source: body.source,
        record_count: records.length,
        timestamp: new Date().toISOString(),
      })
    }
    
    const result = await mindexResponse.json()
    
    return NextResponse.json({
      success: true,
      type,
      source: body.source,
      record_count: records.length,
      mindex_response: result,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error(`Ingestion error for ${type}:`, error)
    return NextResponse.json(
      {
        success: false,
        error: "Ingestion failed",
        details: String(error),
        type,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/mindex/ingest/[type]
 * Query ingested CREP data from MINDEX
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ type: string }> }
) {
  const { type } = await params
  
  if (!VALID_TYPES.includes(type as IngestType)) {
    return NextResponse.json(
      { error: "Invalid type", valid_types: VALID_TYPES },
      { status: 400 }
    )
  }
  
  const searchParams = request.nextUrl.searchParams
  const limit = parseInt(searchParams.get("limit") || "100")
  const offset = parseInt(searchParams.get("offset") || "0")
  const source = searchParams.get("source")
  const since = searchParams.get("since") // ISO timestamp
  const until = searchParams.get("until") // ISO timestamp
  
  try {
    const queryParams = new URLSearchParams({
      type,
      limit: limit.toString(),
      offset: offset.toString(),
    })
    
    if (source) queryParams.append("source", source)
    if (since) queryParams.append("since", since)
    if (until) queryParams.append("until", until)
    
    const mindexResponse = await fetch(
      `${MINDEX_API_URL}/api/mindex/crep/query?${queryParams}`,
      {
        headers: {
          "X-API-Key": process.env.MINDEX_API_KEY || "local-dev-key",
        },
        signal: AbortSignal.timeout(10000),
      }
    )
    
    if (!mindexResponse.ok) {
      // Return empty results if MINDEX query fails
      return NextResponse.json({
        type,
        records: [],
        total: 0,
        limit,
        offset,
        warning: "MINDEX query unavailable",
        timestamp: new Date().toISOString(),
      })
    }
    
    const result = await mindexResponse.json()
    
    return NextResponse.json({
      type,
      records: result.records || [],
      total: result.total || 0,
      limit,
      offset,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    return NextResponse.json(
      {
        type,
        records: [],
        total: 0,
        error: "Query failed",
        details: String(error),
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    )
  }
}
