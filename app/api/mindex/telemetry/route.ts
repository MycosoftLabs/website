import { NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"

const MINDEX_API_URL = process.env.MINDEX_API_URL || "http://localhost:8000"
const MINDEX_API_KEY = process.env.MINDEX_API_KEY || ""

/**
 * GET /api/mindex/telemetry
 * Query telemetry data from MINDEX
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const mode = searchParams.get("mode") || "latest_samples"
  const limit = parseInt(searchParams.get("limit") || "100")
  
  try {
    const params = new URLSearchParams(searchParams)
    params.set("limit", limit.toString())

    const upstreamPath =
      mode === "devices" ? "/api/telemetry/devices" : "/api/telemetry/devices/latest-samples"

    const res = await fetch(`${MINDEX_API_URL}${upstreamPath}?${params}`, {
      signal: AbortSignal.timeout(10000),
      headers: MINDEX_API_KEY ? { "X-API-Key": MINDEX_API_KEY } : undefined,
    })
    
    if (!res.ok) {
      throw new Error(`MINDEX query failed: ${res.status}`)
    }
    
    const data = await res.json()
    
    return NextResponse.json({
      data,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to query telemetry",
        details: String(error),
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    )
  }
}

/**
 * POST /api/mindex/telemetry
 * Proxy envelope ingest into MINDEX (server-side API key).
 */
export async function POST(request: NextRequest) {
  if (!MINDEX_API_KEY) {
    return NextResponse.json({ error: "MINDEX_API_KEY not configured" }, { status: 500 })
  }

  try {
    const body = await request.json()
    const res = await fetch(`${MINDEX_API_URL}/api/telemetry/envelope`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-API-Key": MINDEX_API_KEY },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10000),
    })

    const text = await res.text()
    if (!res.ok) return NextResponse.json({ error: "MINDEX ingest failed", details: text }, { status: res.status })
    return NextResponse.json(JSON.parse(text))
  } catch (error) {
    return NextResponse.json({ error: "Failed to ingest envelope", details: String(error) }, { status: 500 })
  }
}
























