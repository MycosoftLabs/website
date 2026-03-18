/**
 * Ground Station Satellites API Proxy
 *
 * Proxies satellite data requests to the ground-station backend.
 * Supports: list satellites, get by NORAD ID, transmitters, passes
 */

import { NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"

const GS_API_URL = process.env.GROUND_STATION_URL || "http://localhost:5000"

async function gsProxy(path: string, init?: RequestInit) {
  const res = await fetch(`${GS_API_URL}${path}`, {
    ...init,
    signal: AbortSignal.timeout(15000),
  })
  if (!res.ok) throw new Error(`GS backend: ${res.status}`)
  return res.json()
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams
  const action = params.get("action")
  const groupId = params.get("group_id")
  const noradId = params.get("norad_id")

  try {
    if (action === "transmitters" && noradId) {
      const data = await gsProxy(`/api/transmitters?norad_id=${noradId}`)
      return NextResponse.json(data)
    }

    if (action === "passes" && groupId) {
      const hours = params.get("hours") || "24"
      const data = await gsProxy(`/api/passes?group_id=${groupId}&hours=${hours}`)
      return NextResponse.json(data)
    }

    if (noradId) {
      const data = await gsProxy(`/api/satellites/${noradId}`)
      return NextResponse.json(data)
    }

    if (groupId) {
      const data = await gsProxy(`/api/satellites?group_id=${groupId}`)
      return NextResponse.json(data)
    }

    // Default: all satellites
    const data = await gsProxy("/api/satellites")
    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json(
      { error: "Ground Station satellites unavailable", details: String(error) },
      { status: 502 }
    )
  }
}
