import { NextRequest, NextResponse } from "next/server"
import { getEventBus } from "@/lib/oei"
import type { Event, EventQuery } from "@/types/oei"

export const dynamic = "force-dynamic"

/**
 * GET /api/oei/events
 * Query recent events from the event bus
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  
  const query: EventQuery = {
    type: searchParams.get("type") || undefined,
    severity: searchParams.get("severity")?.split(",") as EventQuery["severity"],
    status: searchParams.get("status")?.split(",") as EventQuery["status"],
    since: searchParams.get("since") || undefined,
    until: searchParams.get("until") || undefined,
    limit: parseInt(searchParams.get("limit") || "50"),
    offset: parseInt(searchParams.get("offset") || "0"),
  }

  try {
    const eventBus = getEventBus()
    const messages = eventBus.getRecentMessages("alerts", query.limit || 50)
    
    // Filter messages based on query
    let events = messages
      .filter(msg => msg.type !== "heartbeat")
      .map(msg => msg.payload as Event)
    
    if (query.type) {
      events = events.filter(e => e.type === query.type)
    }
    
    if (query.severity?.length) {
      events = events.filter(e => query.severity!.includes(e.severity))
    }
    
    if (query.status?.length) {
      events = events.filter(e => query.status!.includes(e.status as "active" | "resolved" | "expired"))
    }
    
    if (query.since) {
      const sinceDate = new Date(query.since)
      events = events.filter(e => new Date(e.occurredAt) >= sinceDate)
    }
    
    if (query.until) {
      const untilDate = new Date(query.until)
      events = events.filter(e => new Date(e.occurredAt) <= untilDate)
    }

    return NextResponse.json({
      data: events,
      total: events.length,
      page: Math.floor((query.offset || 0) / (query.limit || 50)) + 1,
      pageSize: query.limit || 50,
      hasMore: false,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("[OEI Events] Error:", error)
    return NextResponse.json(
      { error: "Failed to fetch events", details: String(error) },
      { status: 500 }
    )
  }
}

/**
 * POST /api/oei/events
 * Publish a new event to the event bus
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    const event: Event = {
      id: body.id || `evt_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      type: body.type || "custom",
      severity: body.severity || "info",
      title: body.title || "Untitled Event",
      description: body.description || "",
      details: body.details,
      location: body.location,
      affectedArea: body.affectedArea,
      occurredAt: body.occurredAt || new Date().toISOString(),
      detectedAt: new Date().toISOString(),
      expiresAt: body.expiresAt,
      status: body.status || "active",
      entityIds: body.entityIds,
      observationIds: body.observationIds,
      provenance: body.provenance || {
        source: "natureos",
        collectedAt: new Date().toISOString(),
      },
      actions: body.actions,
    }
    
    const eventBus = getEventBus()
    const messageId = await eventBus.publishEvent(event)
    
    return NextResponse.json({
      success: true,
      messageId,
      event,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("[OEI Events] Publish error:", error)
    return NextResponse.json(
      { error: "Failed to publish event", details: String(error) },
      { status: 500 }
    )
  }
}
