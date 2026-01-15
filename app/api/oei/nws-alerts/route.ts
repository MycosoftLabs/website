import { NextRequest, NextResponse } from "next/server"
import { getNWSAlertsClient, type NWSAlertQuery } from "@/lib/oei/connectors/nws-alerts"

export const dynamic = "force-dynamic"

/**
 * GET /api/oei/nws-alerts
 * Fetch weather alerts from NWS and publish to event bus
 * 
 * Query params:
 * - area: State code (e.g., "CA", "NY")
 * - lat, lon: Point location
 * - severity: "Extreme", "Severe", "Moderate", "Minor" (comma-separated)
 * - publish: "true" to publish to event bus
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  
  const query: NWSAlertQuery = {}
  
  // Parse query params
  const area = searchParams.get("area")
  const lat = searchParams.get("lat")
  const lon = searchParams.get("lon")
  const severity = searchParams.get("severity")
  const urgency = searchParams.get("urgency")
  const event = searchParams.get("event")
  const limit = searchParams.get("limit")
  const publish = searchParams.get("publish") === "true"

  if (area) query.area = area.toUpperCase()
  if (lat && lon) query.point = `${lat},${lon}`
  if (severity) query.severity = severity.split(",")
  if (urgency) query.urgency = urgency.split(",")
  if (event) query.event = event.split(",")
  if (limit) query.limit = parseInt(limit)

  try {
    const client = getNWSAlertsClient()
    
    if (publish) {
      const result = await client.fetchAndPublish(query)
      return NextResponse.json({
        success: true,
        published: result.published,
        total: result.events.length,
        events: result.events,
        timestamp: new Date().toISOString(),
      })
    } else {
      const events = await client.fetchAlerts(query)
      return NextResponse.json({
        success: true,
        total: events.length,
        events,
        timestamp: new Date().toISOString(),
      })
    }
  } catch (error) {
    console.error("[NWS Alerts] Error:", error)
    return NextResponse.json(
      { 
        error: "Failed to fetch NWS alerts", 
        details: String(error),
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    )
  }
}
