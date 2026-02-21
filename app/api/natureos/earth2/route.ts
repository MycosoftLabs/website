/**
 * NatureOS Earth-2 API
 *
 * Proxies Earth-2 requests to MAS Earth-2 endpoints.
 * NO MOCK DATA - requires MAS Earth-2 services.
 */

import { NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"

const MAS_API_URL = process.env.MAS_API_URL

const ACTION_ENDPOINTS: Record<string, string> = {
  forecast: "forecast",
  nowcast: "nowcast",
  downscale: "downscale",
  "spore-dispersal": "spore-dispersal",
}

export async function GET(_request: NextRequest) {
  if (!MAS_API_URL) {
    return NextResponse.json(
      { available: false, status: "offline", error: "MAS API not configured" },
      { status: 503 }
    )
  }

  try {
    const res = await fetch(`${MAS_API_URL}/api/earth2/status`, {
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    })

    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      return NextResponse.json(
        { available: false, status: "offline", error: data.detail ?? "Earth-2 status unavailable" },
        { status: res.status }
      )
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error("NatureOS Earth-2 status error:", error)
    return NextResponse.json(
      { available: false, status: "offline", error: "Earth-2 status unreachable" },
      { status: 503 }
    )
  }
}

export async function POST(request: NextRequest) {
  if (!MAS_API_URL) {
    return NextResponse.json(
      { error: "MAS API not configured" },
      { status: 503 }
    )
  }

  try {
    const body = await request.json().catch(() => ({}))
    const action = String(body.action ?? body.type ?? "").toLowerCase()
    const endpoint = ACTION_ENDPOINTS[action]

    if (!endpoint) {
      return NextResponse.json(
        { error: "action must be one of: forecast, nowcast, downscale, spore-dispersal" },
        { status: 400 }
      )
    }

    const res = await fetch(`${MAS_API_URL}/api/earth2/${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body.payload ?? body),
      signal: AbortSignal.timeout(30000),
    })

    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      return NextResponse.json(
        { error: data.detail ?? data.message ?? "Earth-2 request failed" },
        { status: res.status }
      )
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error("NatureOS Earth-2 request error:", error)
    return NextResponse.json(
      { error: "Earth-2 backend unavailable" },
      { status: 503 }
    )
  }
}
