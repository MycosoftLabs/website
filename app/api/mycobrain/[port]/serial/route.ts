import { NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"

const MYCOBRAIN_SERVICE_URL = process.env.MYCOBRAIN_SERVICE_URL || "http://localhost:8003"

export async function GET(
  request: NextRequest,
  { params }: { params: { port: string } }
) {
  const port = params.port
  
  try {
    // Try to get serial data from device
    const response = await fetch(`${MYCOBRAIN_SERVICE_URL}/devices/${encodeURIComponent(port)}/serial`, {
      signal: AbortSignal.timeout(5000),
    })
    
    if (response.ok) {
      const data = await response.json()
      return NextResponse.json(data)
    }
    
    // If endpoint doesn't exist, return empty data
    return NextResponse.json({
      data: [],
      message: "Serial endpoint not available. Device may not support serial streaming.",
    })
  } catch (error) {
    return NextResponse.json(
      { data: [], error: "Failed to fetch serial data", details: String(error) },
      { status: 500 }
    )
  }
}



























