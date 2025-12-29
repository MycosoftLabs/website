import { NextRequest, NextResponse } from "next/server"

// Port 8003 = MAS dual service (preferred), Port 8765 = legacy website service
const MYCOBRAIN_SERVICE_URL = process.env.MYCOBRAIN_SERVICE_URL || "http://localhost:8003"

export const dynamic = "force-dynamic"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ port: string }> }
) {
  const { port } = await params
  
  try {
    const response = await fetch(
      `${MYCOBRAIN_SERVICE_URL}/devices/${encodeURIComponent(port)}/sensors`,
      { signal: AbortSignal.timeout(5000) }
    )
    
    if (response.ok) {
      const data = await response.json()
      return NextResponse.json(data)
    }
    
    throw new Error("Failed to get sensor data")
  } catch (error) {
    // Return error - no mock data
    return NextResponse.json(
      {
        port,
        error: "Failed to fetch sensor data",
        message: "MycoBrain service not available or device not connected",
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    )
  }
}

