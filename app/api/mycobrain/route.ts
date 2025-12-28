import { NextRequest, NextResponse } from "next/server"

// MycoBrain service URL - can be local Python service or Docker container
const MYCOBRAIN_SERVICE_URL = process.env.MYCOBRAIN_SERVICE_URL || "http://localhost:8765"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  try {
    // Fetch all connected devices from the MycoBrain service
    const response = await fetch(`${MYCOBRAIN_SERVICE_URL}/devices`, {
      signal: AbortSignal.timeout(5000),
    })
    
    if (response.ok) {
      const data = await response.json()
      return NextResponse.json({
        ...data,
        source: "mycobrain-service",
      })
    }
    
    throw new Error("Service unavailable")
  } catch (error) {
    // Fallback: Return mock device data for development
    return NextResponse.json({
      devices: [
        {
          port: "COM4",
          connected: true,
          device_info: {
            side: "gateway",
            mdp_version: 1,
            status: "ready",
            lora_status: "ok",
          },
          sensor_data: {
            bme688_1: {
              temperature: 23.5,
              humidity: 45.2,
              pressure: 1013.25,
              gas_resistance: 50000,
              iaq: 85,
            },
            bme688_2: {
              temperature: 24.1,
              humidity: 44.8,
              pressure: 1013.20,
              gas_resistance: 48500,
              iaq: 82,
            },
            last_update: new Date().toISOString(),
          },
          last_message_time: new Date().toISOString(),
        },
      ],
      source: "mock",
      note: "MycoBrain service not running. Start with: python services/mycobrain/mycobrain_service.py",
      timestamp: new Date().toISOString(),
    })
  }
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { action, port = "COM4" } = body
  
  try {
    let endpoint = ""
    let method = "POST"
    let payload = {}
    
    switch (action) {
      case "connect":
        endpoint = `/devices/connect/${encodeURIComponent(port)}`
        break
      case "disconnect":
        endpoint = `/devices/disconnect/${encodeURIComponent(port)}`
        break
      case "neopixel":
        endpoint = `/devices/${encodeURIComponent(port)}/neopixel`
        payload = body.data || { r: 0, g: 255, b: 0, brightness: 128, mode: "solid" }
        break
      case "buzzer":
        endpoint = `/devices/${encodeURIComponent(port)}/buzzer`
        payload = body.data || { frequency: 1000, duration_ms: 100, pattern: "beep" }
        break
      case "command":
        endpoint = `/devices/${encodeURIComponent(port)}/command`
        payload = body.data || { cmd_id: 0, dst: 0xA1, data: [] }
        break
      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 })
    }
    
    const response = await fetch(`${MYCOBRAIN_SERVICE_URL}${endpoint}`, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(5000),
    })
    
    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to communicate with MycoBrain service", details: String(error) },
      { status: 503 }
    )
  }
}

