import { NextRequest, NextResponse } from "next/server"
import { getUSGSVolcanoClient, type USGSVolcanoQuery } from "@/lib/oei/connectors/usgs-volcano"

export const dynamic = "force-dynamic"

/**
 * GET /api/oei/usgs-volcano
 * Fetch volcanic activity alerts from USGS
 * 
 * Query params:
 * - region: Geographic region (e.g., "Alaska", "Hawaii", "Cascades")
 * - alertLevel: "Normal", "Advisory", "Watch", "Warning" (comma-separated)
 * - activeOnly: "true" to only show active volcanoes
 * - publish: "true" to publish to event bus
 * - listAll: "true" to list all monitored volcanoes
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  
  const region = searchParams.get("region")
  const alertLevel = searchParams.get("alertLevel")
  const activeOnly = searchParams.get("activeOnly") === "true"
  const limit = searchParams.get("limit")
  const publish = searchParams.get("publish") === "true"
  const listAll = searchParams.get("listAll") === "true"

  try {
    const client = getUSGSVolcanoClient()
    
    // If listAll, return all monitored volcanoes
    if (listAll) {
      const volcanoes = await client.fetchMonitoredVolcanoes()
      return NextResponse.json({
        success: true,
        total: volcanoes.length,
        volcanoes,
        timestamp: new Date().toISOString(),
      })
    }
    
    const query: USGSVolcanoQuery = {}
    if (region) query.region = region
    if (alertLevel) query.alertLevel = alertLevel.split(",") as USGSVolcanoQuery["alertLevel"]
    if (activeOnly) query.activeOnly = true
    if (limit) query.limit = parseInt(limit)
    
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
      const events = await client.fetchVolcanoAlerts(query)
      return NextResponse.json({
        success: true,
        total: events.length,
        events,
        timestamp: new Date().toISOString(),
      })
    }
  } catch (error) {
    console.error("[USGS Volcano] Error:", error)
    return NextResponse.json(
      { 
        error: "Failed to fetch USGS volcano data", 
        details: String(error),
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    )
  }
}
