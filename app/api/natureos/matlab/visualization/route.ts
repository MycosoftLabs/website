/**
 * MATLAB Visualization API
 *
 * Proxies to NatureOS backend MATLAB endpoint.
 * Returns plot image bytes.
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
    const plotType = body.plotType ?? "timeseries"
    const data = body.data ?? {}

    const res = await fetch(`${NATUREOS_URL}/api/Matlab/visualization`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plotType, data }),
      signal: AbortSignal.timeout(30000),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      return NextResponse.json(
        { error: err.title ?? err.detail ?? err.message ?? "Visualization failed" },
        { status: res.status }
      )
    }

    const buffer = await res.arrayBuffer()
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "no-store",
      },
    })
  } catch (error) {
    console.error("MATLAB visualization error:", error)
    return NextResponse.json(
      { error: "NatureOS MATLAB backend unavailable" },
      { status: 503 }
    )
  }
}
