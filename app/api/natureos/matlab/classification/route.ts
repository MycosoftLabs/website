/**
 * MATLAB Classification API
 *
 * Proxies to NatureOS backend for fungal morphology classification.
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
    const signalVector = Array.isArray(body) ? body : body.signalVector ?? body.data ?? []

    if (!Array.isArray(signalVector) || signalVector.length === 0) {
      return NextResponse.json(
        { error: "Signal vector is required" },
        { status: 400 }
      )
    }

    const res = await fetch(`${NATUREOS_URL}/api/Matlab/classification`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(signalVector),
      signal: AbortSignal.timeout(30000),
    })

    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      return NextResponse.json(
        { error: data.title ?? data.detail ?? data.message ?? "Classification failed" },
        { status: res.status }
      )
    }
    return NextResponse.json(data)
  } catch (error) {
    console.error("MATLAB classification error:", error)
    return NextResponse.json(
      { error: "NatureOS MATLAB backend unavailable" },
      { status: 503 }
    )
  }
}
