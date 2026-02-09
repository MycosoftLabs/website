import { NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"

const MINDEX_API_URL = process.env.MINDEX_API_URL || "http://localhost:8000"

// Data types available for playback
const PLAYBACK_TYPES = [
  "aircraft",
  "vessels", 
  "satellites",
  "events",
  "telemetry",
  "all",
] as const

type PlaybackType = typeof PLAYBACK_TYPES[number]

interface PlaybackQuery {
  type: PlaybackType
  start: string // ISO timestamp
  end: string // ISO timestamp
  interval_ms?: number // Playback interval for animation
  bounds?: {
    north: number
    south: number
    east: number
    west: number
  }
  sources?: string[]
  limit?: number
}

interface PlaybackFrame {
  timestamp: string
  data: Record<string, unknown>[]
}

/**
 * GET /api/mindex/playback
 * Query historical CREP data for playback/replay
 * 
 * Query params:
 * - type: aircraft|vessels|satellites|events|telemetry|all
 * - start: ISO timestamp for start of playback range
 * - end: ISO timestamp for end of playback range
 * - interval_ms: Interval between frames (default 60000 = 1 minute)
 * - north,south,east,west: Geographic bounds
 * - source: Filter by data source
 * - limit: Max records per frame
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  
  const type = (searchParams.get("type") || "all") as PlaybackType
  const start = searchParams.get("start")
  const end = searchParams.get("end")
  const interval_ms = parseInt(searchParams.get("interval_ms") || "60000")
  const source = searchParams.get("source")
  const limit = parseInt(searchParams.get("limit") || "1000")
  
  // Geographic bounds
  const north = searchParams.get("north")
  const south = searchParams.get("south")
  const east = searchParams.get("east")
  const west = searchParams.get("west")
  
  // Validate required params
  if (!start || !end) {
    return NextResponse.json(
      { 
        error: "Missing required parameters: start, end (ISO timestamps)",
        example: "?start=2026-02-04T00:00:00Z&end=2026-02-04T12:00:00Z&type=aircraft"
      },
      { status: 400 }
    )
  }
  
  if (!PLAYBACK_TYPES.includes(type)) {
    return NextResponse.json(
      { error: "Invalid type", valid_types: PLAYBACK_TYPES },
      { status: 400 }
    )
  }
  
  try {
    const startTime = new Date(start).getTime()
    const endTime = new Date(end).getTime()
    
    if (isNaN(startTime) || isNaN(endTime)) {
      return NextResponse.json(
        { error: "Invalid timestamp format. Use ISO 8601 format." },
        { status: 400 }
      )
    }
    
    if (endTime <= startTime) {
      return NextResponse.json(
        { error: "End time must be after start time" },
        { status: 400 }
      )
    }
    
    // Max playback range: 24 hours
    const maxRange = 24 * 60 * 60 * 1000
    if (endTime - startTime > maxRange) {
      return NextResponse.json(
        { error: "Maximum playback range is 24 hours" },
        { status: 400 }
      )
    }
    
    // Build query for MINDEX
    const queryParams = new URLSearchParams({
      start,
      end,
      limit: limit.toString(),
    })
    
    if (type !== "all") {
      queryParams.append("type", type)
    }
    if (source) {
      queryParams.append("source", source)
    }
    if (north && south && east && west) {
      queryParams.append("bounds", JSON.stringify({
        north: parseFloat(north),
        south: parseFloat(south),
        east: parseFloat(east),
        west: parseFloat(west),
      }))
    }
    
    // Query MINDEX for historical data
    const mindexResponse = await fetch(
      `${MINDEX_API_URL}/api/mindex/crep/playback?${queryParams}`,
      {
        headers: {
          "X-API-Key": process.env.MINDEX_API_KEY || "local-dev-key",
        },
        signal: AbortSignal.timeout(30000),
      }
    )
    
    if (mindexResponse.ok) {
      const data = await mindexResponse.json()
      
      // Organize data into time-based frames for playback
      const frames: PlaybackFrame[] = []
      const records = data.records || []
      
      // Group by timestamp intervals
      const frameMap = new Map<number, Record<string, unknown>[]>()
      
      for (const record of records) {
        const recordTime = new Date(record.timestamp || record.captured_at).getTime()
        const frameTime = Math.floor(recordTime / interval_ms) * interval_ms
        
        if (!frameMap.has(frameTime)) {
          frameMap.set(frameTime, [])
        }
        frameMap.get(frameTime)!.push(record)
      }
      
      // Sort frames by time
      const sortedFrameTimes = [...frameMap.keys()].sort((a, b) => a - b)
      
      for (const frameTime of sortedFrameTimes) {
        frames.push({
          timestamp: new Date(frameTime).toISOString(),
          data: frameMap.get(frameTime) || [],
        })
      }
      
      return NextResponse.json({
        type,
        start,
        end,
        interval_ms,
        total_records: records.length,
        total_frames: frames.length,
        frames,
        playback_info: {
          duration_ms: endTime - startTime,
          frame_count: frames.length,
          avg_records_per_frame: frames.length > 0 
            ? Math.round(records.length / frames.length) 
            : 0,
        },
        timestamp: new Date().toISOString(),
      })
    }
    
    // If MINDEX unavailable, return empty with info
    return NextResponse.json({
      type,
      start,
      end,
      interval_ms,
      total_records: 0,
      total_frames: 0,
      frames: [],
      warning: "MINDEX playback data unavailable - no historical data stored yet",
      playback_types: PLAYBACK_TYPES,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("[Playback] Query error:", error)
    return NextResponse.json(
      {
        error: "Failed to query playback data",
        details: String(error),
        playback_types: PLAYBACK_TYPES,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    )
  }
}

/**
 * POST /api/mindex/playback
 * Create a playback session with configuration
 */
export async function POST(request: NextRequest) {
  try {
    const body: PlaybackQuery = await request.json()
    
    if (!body.start || !body.end || !body.type) {
      return NextResponse.json(
        { error: "Missing required fields: type, start, end" },
        { status: 400 }
      )
    }
    
    // Generate session ID
    const sessionId = `playback-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    
    // Store session in MINDEX (if available)
    const mindexResponse = await fetch(
      `${MINDEX_API_URL}/api/mindex/crep/playback/sessions`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": process.env.MINDEX_API_KEY || "local-dev-key",
        },
        body: JSON.stringify({
          session_id: sessionId,
          ...body,
          created_at: new Date().toISOString(),
        }),
        signal: AbortSignal.timeout(5000),
      }
    )
    
    return NextResponse.json({
      success: true,
      session_id: sessionId,
      config: {
        type: body.type,
        start: body.start,
        end: body.end,
        interval_ms: body.interval_ms || 60000,
        bounds: body.bounds,
        sources: body.sources,
        limit: body.limit || 1000,
      },
      mindex_synced: mindexResponse.ok,
      // URL to fetch playback data
      playback_url: `/api/mindex/playback?type=${body.type}&start=${encodeURIComponent(body.start)}&end=${encodeURIComponent(body.end)}&interval_ms=${body.interval_ms || 60000}`,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("[Playback] Session creation error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to create playback session",
        details: String(error),
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    )
  }
}
