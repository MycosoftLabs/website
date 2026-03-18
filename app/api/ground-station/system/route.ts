/**
 * Ground Station System API Proxy
 *
 * System info, TLE sources, TLE sync, health checks
 */

import { NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"

const GS_API_URL = process.env.GROUND_STATION_URL || "http://localhost:5000"

export async function GET(request: NextRequest) {
  const action = request.nextUrl.searchParams.get("action")

  try {
    if (action === "tle_sources") {
      const res = await fetch(`${GS_API_URL}/api/tle-sources`, {
        signal: AbortSignal.timeout(10000),
      })
      if (!res.ok) throw new Error(`GS backend: ${res.status}`)
      return NextResponse.json(await res.json())
    }

    if (action === "health") {
      const res = await fetch(`${GS_API_URL}/api/health`, {
        signal: AbortSignal.timeout(5000),
      })
      return NextResponse.json({
        status: res.ok ? "connected" : "error",
        timestamp: new Date().toISOString(),
      })
    }

    // Default: system info
    const res = await fetch(`${GS_API_URL}/api/system-info`, {
      signal: AbortSignal.timeout(10000),
    })
    if (!res.ok) throw new Error(`GS backend: ${res.status}`)
    return NextResponse.json(await res.json())
  } catch (error) {
    return NextResponse.json(
      { error: "Ground Station system info unavailable", details: String(error) },
      { status: 502 }
    )
  }
}

export async function POST(request: NextRequest) {
  const action = request.nextUrl.searchParams.get("action")

  try {
    if (action === "sync_tles") {
      const res = await fetch(`${GS_API_URL}/api/tle-sync`, {
        method: "POST",
        signal: AbortSignal.timeout(30000),
      })
      if (!res.ok) throw new Error(`GS backend: ${res.status}`)
      return NextResponse.json(await res.json())
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 })
  } catch (error) {
    return NextResponse.json(
      { error: "Ground Station system action failed", details: String(error) },
      { status: 502 }
    )
  }
}
