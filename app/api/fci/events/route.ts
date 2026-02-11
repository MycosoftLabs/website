/**
 * FCI Events API Route
 * 
 * GET /api/fci/events - Get recent FCI events with optional correlation
 */

import { NextRequest, NextResponse } from "next/server"

const MAS_API_URL = process.env.MAS_API_URL || "http://192.168.0.188:8001"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const deviceId = searchParams.get("device_id")
    const eventType = searchParams.get("type")
    const limit = searchParams.get("limit") || "50"
    const correlate = searchParams.get("correlate") === "true"
    
    // Build query
    const params = new URLSearchParams()
    if (deviceId) params.append("device_id", deviceId)
    if (eventType) params.append("type", eventType)
    params.append("limit", limit)
    
    const response = await fetch(
      `${MAS_API_URL}/api/fci/events?${params.toString()}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        next: { revalidate: 2 },
      }
    )
    
    if (!response.ok) {
      // Return empty events list if endpoint doesn't exist
      if (response.status === 404) {
        return NextResponse.json({ events: [], correlations: [] })
      }
      
      const error = await response.text()
      return NextResponse.json(
        { error: `MAS API error: ${error}` },
        { status: response.status }
      )
    }
    
    const data = await response.json()
    
    // If correlation is requested, fetch environmental data
    if (correlate && data.events?.length > 0) {
      try {
        const correlationResponse = await fetch(
          `${MAS_API_URL}/api/fci/events/correlate`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              event_ids: data.events.map((e: any) => e.id).slice(0, 10),
            }),
          }
        )
        
        if (correlationResponse.ok) {
          const correlations = await correlationResponse.json()
          data.correlations = correlations
        }
      } catch (e) {
        console.warn("Correlation fetch failed:", e)
      }
    }
    
    return NextResponse.json(data)
  } catch (error) {
    console.error("FCI events fetch error:", error)
    return NextResponse.json(
      { error: "Failed to fetch FCI events" },
      { status: 500 }
    )
  }
}
