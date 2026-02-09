import { NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"

const MINDEX_API_URL = process.env.MINDEX_API_URL || "http://localhost:8000"

// Event types tracked in the registry
const EVENT_TYPES = [
  // Natural disasters
  "earthquake",
  "volcano",
  "wildfire",
  "storm",
  "flood",
  "tsunami",
  "tornado",
  "hurricane",
  "landslide",
  // Space weather
  "solar_flare",
  "geomagnetic_storm",
  "aurora",
  "meteor",
  // Environmental
  "lightning",
  "air_quality",
  "radiation",
  // Biological
  "fungal_bloom",
  "animal_migration",
  "insect_swarm",
  "algae_bloom",
  "biological",
  // Transport entities (for tracking)
  "aircraft",
  "vessel",
  "satellite",
  // Other
  "other",
] as const

type EventType = typeof EVENT_TYPES[number]

const SEVERITY_LEVELS = ["info", "low", "medium", "high", "critical", "extreme"] as const
type SeverityLevel = typeof SEVERITY_LEVELS[number]

interface EventRegistration {
  id: string
  type: EventType
  title: string
  description?: string
  severity: SeverityLevel
  timestamp: string
  location: {
    lat: number
    lng: number
    name?: string
    depth?: number
    altitude?: number
  }
  magnitude?: number
  source: string
  source_url?: string
  link?: string
  indexed: boolean
  metadata?: Record<string, unknown>
}

/**
 * GET /api/mindex/registry/events
 * Query registered events with filtering
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const type = searchParams.get("type") as EventType | null
  const severity = searchParams.get("severity") as SeverityLevel | null
  const since = searchParams.get("since") // ISO timestamp
  const until = searchParams.get("until") // ISO timestamp
  const source = searchParams.get("source")
  const limit = parseInt(searchParams.get("limit") || "100")
  const offset = parseInt(searchParams.get("offset") || "0")
  const indexed_only = searchParams.get("indexed") === "true"
  
  try {
    // Build query params
    const queryParams = new URLSearchParams({
      limit: limit.toString(),
      offset: offset.toString(),
    })
    
    if (type && EVENT_TYPES.includes(type)) {
      queryParams.append("type", type)
    }
    if (severity && SEVERITY_LEVELS.includes(severity)) {
      queryParams.append("severity", severity)
    }
    if (since) queryParams.append("since", since)
    if (until) queryParams.append("until", until)
    if (source) queryParams.append("source", source)
    if (indexed_only) queryParams.append("indexed", "true")
    
    // Query MINDEX
    const mindexResponse = await fetch(
      `${MINDEX_API_URL}/api/mindex/crep/events?${queryParams}`,
      {
        headers: {
          "X-API-Key": process.env.MINDEX_API_KEY || "local-dev-key",
        },
        signal: AbortSignal.timeout(10000),
      }
    )
    
    if (mindexResponse.ok) {
      const data = await mindexResponse.json()
      return NextResponse.json({
        events: data.events || [],
        total: data.total || 0,
        limit,
        offset,
        event_types: EVENT_TYPES,
        severity_levels: SEVERITY_LEVELS,
        timestamp: new Date().toISOString(),
      })
    }
    
    // If MINDEX unavailable, return empty
    return NextResponse.json({
      events: [],
      total: 0,
      limit,
      offset,
      event_types: EVENT_TYPES,
      severity_levels: SEVERITY_LEVELS,
      warning: "MINDEX event registry unavailable",
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("[Event Registry] Query error:", error)
    return NextResponse.json({
      events: [],
      total: 0,
      error: "Failed to query event registry",
      event_types: EVENT_TYPES,
      severity_levels: SEVERITY_LEVELS,
      timestamp: new Date().toISOString(),
    })
  }
}

/**
 * POST /api/mindex/registry/events
 * Register a new event or batch of events
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Handle single event or array
    const events: Partial<EventRegistration>[] = Array.isArray(body) ? body : [body]
    
    if (events.length === 0) {
      return NextResponse.json(
        { error: "No events provided" },
        { status: 400 }
      )
    }
    
    // Validate and normalize events
    const registrations: EventRegistration[] = []
    const errors: string[] = []
    
    for (const event of events) {
      if (!event.id || !event.type || !event.location) {
        errors.push(`Event missing required fields: ${event.id || "unknown"}`)
        continue
      }
      
      if (!EVENT_TYPES.includes(event.type as EventType)) {
        errors.push(`Invalid event type: ${event.type}`)
        continue
      }
      
      registrations.push({
        id: event.id,
        type: event.type as EventType,
        title: event.title || `${event.type} Event`,
        description: event.description,
        severity: (SEVERITY_LEVELS.includes(event.severity as SeverityLevel) 
          ? event.severity 
          : "info") as SeverityLevel,
        timestamp: event.timestamp || new Date().toISOString(),
        location: {
          lat: event.location.lat,
          lng: event.location.lng,
          name: event.location.name,
          depth: event.location.depth,
          altitude: event.location.altitude,
        },
        magnitude: event.magnitude,
        source: event.source || "unknown",
        source_url: event.source_url,
        link: event.link,
        indexed: true,
        metadata: event.metadata,
      })
    }
    
    if (registrations.length === 0) {
      return NextResponse.json(
        { error: "No valid events to register", validation_errors: errors },
        { status: 400 }
      )
    }
    
    // Register with MINDEX
    const mindexResponse = await fetch(
      `${MINDEX_API_URL}/api/mindex/crep/events/register`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": process.env.MINDEX_API_KEY || "local-dev-key",
        },
        body: JSON.stringify({
          events: registrations,
          metadata: {
            registered_at: new Date().toISOString(),
            batch_size: registrations.length,
          },
        }),
        signal: AbortSignal.timeout(10000),
      }
    )
    
    const mindex_synced = mindexResponse.ok
    
    return NextResponse.json({
      success: true,
      registered: registrations.length,
      validation_errors: errors.length > 0 ? errors : undefined,
      mindex_synced,
      events: registrations,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("[Event Registry] Registration error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to register events",
        details: String(error),
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/mindex/registry/events
 * Remove events from registry (for cleanup)
 */
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json()
    const ids: string[] = Array.isArray(body.ids) ? body.ids : [body.id].filter(Boolean)
    
    if (ids.length === 0) {
      return NextResponse.json(
        { error: "No event IDs provided" },
        { status: 400 }
      )
    }
    
    // Delete from MINDEX
    const mindexResponse = await fetch(
      `${MINDEX_API_URL}/api/mindex/crep/events/delete`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": process.env.MINDEX_API_KEY || "local-dev-key",
        },
        body: JSON.stringify({ ids }),
        signal: AbortSignal.timeout(10000),
      }
    )
    
    return NextResponse.json({
      success: true,
      deleted: ids.length,
      ids,
      mindex_synced: mindexResponse.ok,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("[Event Registry] Delete error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to delete events",
        details: String(error),
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    )
  }
}
