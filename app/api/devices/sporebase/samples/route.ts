/**
 * SporeBase sample tracking and lab results.
 * Proxies to MAS /api/sporebase/samples.
 * Created: February 12, 2026
 */

import { NextRequest, NextResponse } from "next/server"

const MAS_API_URL = process.env.MAS_API_URL || "http://192.168.0.188:8001"

/**
 * GET /api/devices/sporebase/samples
 * Query: device_id, status, limit, offset.
 */
export async function GET(request: NextRequest) {
  const deviceId = request.nextUrl.searchParams.get("device_id")
  const status = request.nextUrl.searchParams.get("status")
  const limit = request.nextUrl.searchParams.get("limit")
  const offset = request.nextUrl.searchParams.get("offset")

  try {
    const params = new URLSearchParams()
    if (deviceId) params.set("device_id", deviceId)
    if (status) params.set("status", status)
    if (limit) params.set("limit", limit)
    if (offset) params.set("offset", offset)
    const query = params.toString()
    const url = `${MAS_API_URL}/api/sporebase/samples${query ? `?${query}` : ""}`

    const response = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(10000),
      cache: "no-store",
    })

    if (!response.ok) {
      if (response.status === 404) {
        return NextResponse.json({
          samples: [],
          count: 0,
          note: "SporeBase samples API not available.",
          timestamp: new Date().toISOString(),
        })
      }
      const text = await response.text()
      return NextResponse.json(
        { error: `Samples fetch failed: ${text}` },
        { status: response.status }
      )
    }

    const data = await response.json()
    return NextResponse.json({
      ...data,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.warn("SporeBase samples fetch failed:", error)
    return NextResponse.json({
      samples: [],
      count: 0,
      note: "MAS unreachable; no sample data.",
      timestamp: new Date().toISOString(),
    })
  }
}

/**
 * POST /api/devices/sporebase/samples
 * Body: device_id, segment_number, start_time, end_time, tape_position, status, lab_id.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const response = await fetch(`${MAS_API_URL}/api/sporebase/samples`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10000),
    })

    if (!response.ok) {
      const text = await response.text()
      return NextResponse.json(
        { error: `Create sample failed: ${text}` },
        { status: response.status }
      )
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.warn("SporeBase sample create failed:", error)
    return NextResponse.json(
      { error: "MAS unreachable; cannot create sample." },
      { status: 502 }
    )
  }
}
