/**
 * FCI WebSocket Status API Route
 * 
 * GET /api/fci/ws-status - Get WebSocket connection status
 */

import { NextRequest, NextResponse } from "next/server"

const MAS_API_URL = process.env.MAS_API_URL || "http://192.168.0.188:8001"

export async function GET(request: NextRequest) {
  try {
    const response = await fetch(`${MAS_API_URL}/api/fci/ws/status`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      next: { revalidate: 5 },
    })
    
    if (!response.ok) {
      // Return default status if endpoint doesn't exist
      if (response.status === 404) {
        return NextResponse.json({
          active_devices: [],
          total_connections: 0,
          sdr_available: true,
          ws_endpoint: `${MAS_API_URL.replace("http", "ws")}/api/fci/ws/stream`,
        })
      }
      
      const error = await response.text()
      return NextResponse.json(
        { error: `MAS API error: ${error}` },
        { status: response.status }
      )
    }
    
    const data = await response.json()
    data.ws_endpoint = `${MAS_API_URL.replace("http", "ws")}/api/fci/ws/stream`
    
    return NextResponse.json(data)
  } catch (error) {
    console.error("FCI WS status error:", error)
    return NextResponse.json({
      active_devices: [],
      total_connections: 0,
      sdr_available: false,
      ws_endpoint: null,
      error: "Unable to reach MAS API",
    })
  }
}
