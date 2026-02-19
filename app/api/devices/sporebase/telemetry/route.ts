/**
 * SporeBase telemetry from deployed units.
 * Proxies to MAS /api/sporebase/devices/{id}/telemetry.
 * Created: February 12, 2026
 */

import { NextRequest, NextResponse } from "next/server"

const MAS_API_URL = process.env.MAS_API_URL || "http://192.168.0.188:8001"

/**
 * GET /api/devices/sporebase/telemetry
 * Query: device_id (required) - SporeBase device ID.
 * Optional: since, limit for time range and limit.
 */
export async function GET(request: NextRequest) {
  const deviceId = request.nextUrl.searchParams.get("device_id")
  const since = request.nextUrl.searchParams.get("since")
  const limit = request.nextUrl.searchParams.get("limit")

  if (!deviceId) {
    return NextResponse.json(
      { error: "device_id is required" },
      { status: 400 }
    )
  }

  try {
    const params = new URLSearchParams()
    if (since) params.set("since", since)
    if (limit) params.set("limit", limit)
    const query = params.toString()
    const url = `${MAS_API_URL}/api/sporebase/devices/${encodeURIComponent(deviceId)}/telemetry${query ? `?${query}` : ""}`

    const response = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(15000),
      cache: "no-store",
    })

    if (!response.ok) {
      if (response.status === 404) {
        return NextResponse.json({
          device_id: deviceId,
          telemetry: [],
          note: "No telemetry for this device.",
          timestamp: new Date().toISOString(),
        })
      }
      const text = await response.text()
      return NextResponse.json(
        { error: `Telemetry failed: ${text}` },
        { status: response.status }
      )
    }

    const data = await response.json()
    return NextResponse.json({
      ...data,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.warn("SporeBase telemetry fetch failed:", error)
    return NextResponse.json(
      { error: "MAS unreachable; telemetry unavailable." },
      { status: 502 }
    )
  }
}
