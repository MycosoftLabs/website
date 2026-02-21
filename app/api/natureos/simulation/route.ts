/**
 * NatureOS Simulation API
 *
 * Proxies simulation requests to the NatureOS MATLAB analysis endpoint.
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
    const functionName =
      body.functionName ?? body.simulationType ?? body.type ?? ""
    const args = body.args ?? body.parameters ?? body.params ?? []

    if (!functionName || typeof functionName !== "string") {
      return NextResponse.json(
        { error: "functionName or simulationType is required" },
        { status: 400 }
      )
    }

    const res = await fetch(
      `${NATUREOS_URL}/api/Matlab/analysis/${encodeURIComponent(functionName)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(Array.isArray(args) ? args : [args]),
        signal: AbortSignal.timeout(60000),
      }
    )

    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      return NextResponse.json(
        { error: data.title ?? data.detail ?? data.error ?? data.message ?? "Simulation failed" },
        { status: res.status }
      )
    }
    return NextResponse.json(data)
  } catch (error) {
    console.error("NatureOS simulation error:", error)
    return NextResponse.json(
      { error: "NatureOS simulation backend unavailable" },
      { status: 503 }
    )
  }
}
