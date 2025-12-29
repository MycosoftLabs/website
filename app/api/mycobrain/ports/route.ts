import { NextResponse } from "next/server"

// Port 8003 = MAS dual service (preferred), Port 8765 = legacy website service
const MYCOBRAIN_SERVICE_URL = process.env.MYCOBRAIN_SERVICE_URL || "http://localhost:8003"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const response = await fetch(`${MYCOBRAIN_SERVICE_URL}/ports`, {
      signal: AbortSignal.timeout(5000),
    })
    
    if (response.ok) {
      const data = await response.json()
      return NextResponse.json(data)
    }
    
    throw new Error("Service unavailable")
  } catch (error) {
    return NextResponse.json(
      {
        ports: [],
        discovery_running: false,
        error: "MycoBrain service not available",
        message: "Start the MycoBrain service to scan for devices",
      },
      { status: 503 }
    )
  }
}






