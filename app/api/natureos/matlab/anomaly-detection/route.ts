/**
 * MATLAB Anomaly Detection API
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
    const body = await request.json()
    const timeSeries = Array.isArray(body) ? body : body.timeSeries ?? body.data ?? []

    if (!Array.isArray(timeSeries) || timeSeries.length === 0) {
      return NextResponse.json(
        { error: "Time series data is required" },
        { status: 400 }
      )
    }

    const res = await fetch(`${NATUREOS_URL}/api/Matlab/anomaly-detection`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(timeSeries),
      signal: AbortSignal.timeout(30000),
    })

    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      return NextResponse.json(
        { error: data.title ?? data.detail ?? data.message ?? "Anomaly detection failed" },
        { status: res.status }
      )
    }
    return NextResponse.json(data)
  } catch (error) {
    console.error("MATLAB anomaly-detection error:", error)
    return NextResponse.json(
      { error: "NatureOS MATLAB backend unavailable" },
      { status: 503 }
    )
  }
}
