/**
 * MATLAB Health API
 *
 * Proxies to NatureOS backend for MATLAB integration status.
 */

import { NextRequest, NextResponse } from "next/server"
import { env } from "@/lib/env"

export const dynamic = "force-dynamic"

const NATUREOS_URL =
  process.env.NATUREOS_API_BASE_URL || env.natureosApiBaseUrl

export async function GET(_request: NextRequest) {
  if (!NATUREOS_URL) {
    return NextResponse.json(
      { available: false, mode: "Unavailable", message: "NatureOS backend not configured" },
      { status: 200 }
    )
  }

  try {
    const res = await fetch(`${NATUREOS_URL}/api/Matlab/health`, {
      signal: AbortSignal.timeout(5000),
    })
    const data = await res.json().catch(() => ({}))
    return NextResponse.json(
      res.ok
        ? data
        : { available: false, mode: "Unavailable", message: data.detail ?? "MATLAB health check failed" },
      { status: 200 }
    )
  } catch (error) {
    console.error("MATLAB health check error:", error)
    return NextResponse.json(
      { available: false, mode: "Unavailable", message: "NatureOS backend unreachable" },
      { status: 200 }
    )
  }
}
