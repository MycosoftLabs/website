import { NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"

const MINDEX_API_URL = process.env.MINDEX_API_URL || "http://localhost:8000"

/**
 * GET /api/mindex/telemetry
 * Query telemetry data from MINDEX
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const device_id = searchParams.get("device_id")
  const source = searchParams.get("source") || "mycobrain"
  const limit = parseInt(searchParams.get("limit") || "100")
  
  try {
    // Query MINDEX telemetry
    const params = new URLSearchParams({
      source,
      limit: limit.toString(),
    })
    if (device_id) {
      params.append("device_id", device_id)
    }
    
    const res = await fetch(`${MINDEX_API_URL}/api/mindex/telemetry?${params}`, {
      signal: AbortSignal.timeout(10000),
    })
    
    if (!res.ok) {
      throw new Error(`MINDEX query failed: ${res.status}`)
    }
    
    const data = await res.json()
    
    return NextResponse.json({
      telemetry: data.telemetry || [],
      count: data.count || 0,
      device_id,
      source,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    return NextResponse.json(
      {
        telemetry: [],
        error: "Failed to query telemetry",
        details: String(error),
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    )
  }
}
























