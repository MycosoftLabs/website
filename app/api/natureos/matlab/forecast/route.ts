/**
 * MATLAB Environmental Forecast API
 *
 * Proxies to NatureOS backend MATLAB endpoint.
 * NO MOCK DATA - requires NatureOS backend with MATLAB integration.
 */

import { NextRequest, NextResponse } from "next/server"
import { env } from "@/lib/env"

export const dynamic = "force-dynamic"

const NATUREOS_URL =
  process.env.NATUREOS_API_BASE_URL || env.natureosApiBaseUrl

export async function POST(request: NextRequest) {
  if (!NATUREOS_URL) {
    return NextResponse.json(
      { error: "NatureOS backend not configured" },
      { status: 503 }
    )
  }

  try {
    const body = await request.json().catch(() => ({}))
    const metric = body.metric ?? "temperature"
    const horizonHours = body.horizonHours ?? 24
    const historicalData = body.historicalData ?? []

    const res = await fetch(`${NATUREOS_URL}/api/Matlab/forecast`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ metric, horizonHours, historicalData }),
      signal: AbortSignal.timeout(30000),
    })

    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      return NextResponse.json(
        { error: data.title ?? data.detail ?? data.message ?? "Forecast failed" },
        { status: res.status }
      )
    }
    return NextResponse.json(data)
  } catch (error) {
    console.error("MATLAB forecast error:", error)
    return NextResponse.json(
      { error: "NatureOS MATLAB backend unavailable" },
      { status: 503 }
    )
  }
}
