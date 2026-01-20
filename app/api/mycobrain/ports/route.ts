import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

const MYCOBRAIN_SERVICE_URL = process.env.MYCOBRAIN_SERVICE_URL || "http://localhost:8003"

export async function GET() {
  try {
    const response = await fetch(`${MYCOBRAIN_SERVICE_URL}/ports`, {
      signal: AbortSignal.timeout(3000),
    })
    
    if (response.ok) {
      const data = await response.json()
      
      // Normalize port field - API returns "device" but frontend expects "port"
      const normalizedPorts = (data.ports || []).map((p: any) => ({
        ...p,
        port: p.port || p.device, // Support both field names
        device: p.device || p.port, // Keep device for backwards compat
      }))
      
      return NextResponse.json({
        ...data,
        ports: normalizedPorts,
      })
    }
    
    return NextResponse.json(
      { ports: [], error: "Service unavailable", message: "MycoBrain service is not running" },
      { status: 503 }
    )
  } catch (error) {
    return NextResponse.json(
      { ports: [], error: "Failed to fetch ports", details: String(error), serviceUrl: MYCOBRAIN_SERVICE_URL },
      { status: 503 }
    )
  }
}
