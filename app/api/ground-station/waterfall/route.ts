/**
 * Ground Station Waterfall/SDR API Proxy
 *
 * Proxies waterfall state queries and SDR control commands.
 */

import { NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"

const GS_API_URL = process.env.GROUND_STATION_URL || "http://localhost:5000"

export async function GET() {
  try {
    const res = await fetch(`${GS_API_URL}/api/waterfall/state`, {
      signal: AbortSignal.timeout(10000),
    })
    if (!res.ok) throw new Error(`GS backend: ${res.status}`)
    return NextResponse.json(await res.json())
  } catch (error) {
    return NextResponse.json(
      { error: "Ground Station waterfall unavailable", details: String(error) },
      { status: 502 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const action = body.action

    const endpoint = action === "stop" ? "/api/waterfall/stop" : "/api/waterfall/start"
    const res = await fetch(`${GS_API_URL}${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10000),
    })
    if (!res.ok) throw new Error(`GS backend: ${res.status}`)
    return NextResponse.json(await res.json())
  } catch (error) {
    return NextResponse.json(
      { error: "Ground Station waterfall control failed", details: String(error) },
      { status: 502 }
    )
  }
}
