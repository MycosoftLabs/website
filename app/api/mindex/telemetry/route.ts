import { NextRequest, NextResponse } from "next/server"
import { resolveMindexServerBaseUrl } from "@/lib/mindex-base-url"
import { recordUsageFromRequest } from "@/lib/usage/record-api-usage"
import { mindexUpstreamHeaders } from "@/lib/mindex-bff-auth"

export const dynamic = "force-dynamic"

const MINDEX_API_URL = resolveMindexServerBaseUrl()

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
      mode === "devices" ? "/api/mindex/internal/devices" : "/api/mindex/internal/telemetry/devices/latest"

    const res = await fetch(`${MINDEX_API_URL}${upstreamPath}?${params}`, {
      signal: AbortSignal.timeout(10000),
      headers: mindexUpstreamHeaders(),
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
  try {
    const body = await request.json()
    const res = await fetch(`${MINDEX_API_URL}/api/telemetry/envelope`, {
      method: "POST",
      headers: mindexUpstreamHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10000),
    })

    const text = await res.text()
    if (!res.ok) return NextResponse.json({ error: "MINDEX ingest failed", details: text }, { status: res.status })
    const quantity = Array.isArray(body?.samples)
      ? body.samples.length
      : Array.isArray(body?.envelope?.samples)
      ? body.envelope.samples.length
      : 1

    await recordUsageFromRequest({
      request,
      usageType: "TELEMETRY_INGESTION",
      quantity,
      metadata: { source: "mindex-envelope" },
    })

    return NextResponse.json(JSON.parse(text))
  } catch (error) {
    return NextResponse.json({ error: "Failed to ingest envelope", details: String(error) }, { status: 500 })
  }
}






















