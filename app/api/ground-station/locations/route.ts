/**
 * Ground Station Locations API Proxy
 */

import { NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"

const GS_API_URL = process.env.GROUND_STATION_URL || "http://localhost:5000"

export async function GET() {
  try {
    const res = await fetch(`${GS_API_URL}/api/locations`, {
      signal: AbortSignal.timeout(10000),
    })
    if (!res.ok) throw new Error(`GS backend: ${res.status}`)
    return NextResponse.json(await res.json())
  } catch (error) {
    return NextResponse.json(
      { error: "Ground Station locations unavailable", details: String(error) },
      { status: 502 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const res = await fetch(`${GS_API_URL}/api/locations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10000),
    })
    if (!res.ok) throw new Error(`GS backend: ${res.status}`)
    return NextResponse.json(await res.json())
  } catch (error) {
    return NextResponse.json(
      { error: "Ground Station location update failed", details: String(error) },
      { status: 502 }
    )
  }
}
