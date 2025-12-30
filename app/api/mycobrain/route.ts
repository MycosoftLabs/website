import { NextRequest, NextResponse } from "next/server"

// MycoBrain service URL - can be local Python service or Docker container
// Port 8003 = MAS dual service (preferred), Port 8765 = legacy website service
const MYCOBRAIN_SERVICE_URL = process.env.MYCOBRAIN_SERVICE_URL || "http://localhost:8003"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  try {
    // First check if service is running - try /devices endpoint as health check
    const healthRes = await fetch(`${MYCOBRAIN_SERVICE_URL}/devices`, {
      signal: AbortSignal.timeout(2000),
    }).catch(() => null)
    
    if (!healthRes?.ok) {
      return NextResponse.json({
        devices: [],
        source: "api",
        error: "MycoBrain service not running",
        message: "Start the MycoBrain service: python services/mycobrain/mycobrain_service.py",
        timestamp: new Date().toISOString(),
        serviceUrl: MYCOBRAIN_SERVICE_URL,
        serviceHealthy: false,
      })
    }
    
    // Fetch all connected devices from the MycoBrain service
    const response = await fetch(`${MYCOBRAIN_SERVICE_URL}/devices`, {
      signal: AbortSignal.timeout(5000),
    })
    
    if (response.ok) {
      const data = await response.json()
      
      // Also get available ports to show discovery status
      const portsRes = await fetch(`${MYCOBRAIN_SERVICE_URL}/ports`, {
        signal: AbortSignal.timeout(2000),
      }).catch(() => null)
      
      const portsData = portsRes?.ok ? await portsRes.json() : { ports: [], discovery_running: false }
      
      return NextResponse.json({
        ...data,
        source: "mycobrain-service",
        availablePorts: portsData.ports || [],
        discoveryRunning: portsData.discovery_running || false,
        serviceHealthy: true,
      })
    }
    
    throw new Error("Service unavailable")
  } catch (error) {
    // Return empty devices array - no mock data
    return NextResponse.json({
      devices: [],
      source: "api",
      error: "MycoBrain service not available",
      message: "Start the MycoBrain service to connect devices",
      timestamp: new Date().toISOString(),
      serviceUrl: MYCOBRAIN_SERVICE_URL,
    })
  }
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { action, port = "COM5" } = body
  
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
      case "diagnostics":
        endpoint = `/devices/${encodeURIComponent(port)}/diagnostics`
        method = "GET"
        break
      case "sensors":
        endpoint = `/devices/${encodeURIComponent(port)}/sensors`
        method = "GET"
        break
      case "serial":
        endpoint = `/devices/${encodeURIComponent(port)}/serial`
        method = "GET"
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

