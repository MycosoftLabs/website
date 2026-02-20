/**
 * Single Lab Sample API
 *
 * Proxies to NatureOS backend when available.
 * NO MOCK DATA - all data from real backends.
 */

import { NextRequest, NextResponse } from "next/server"
import { env } from "@/lib/env"

export const dynamic = "force-dynamic"

const NATUREOS_URL =
  process.env.NATUREOS_API_BASE_URL || env.natureosApiBaseUrl

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  if (!id) {
    return NextResponse.json({ error: "Sample ID required" }, { status: 400 })
  }

  if (!NATUREOS_URL) {
    return NextResponse.json(
      { error: "NatureOS backend not configured" },
      { status: 503 }
    )
  }

  try {
    const res = await fetch(`${NATUREOS_URL}/api/LabTools/samples/${encodeURIComponent(id)}`, {
      signal: AbortSignal.timeout(5000),
    })
    if (res.status === 404) {
      return NextResponse.json({ error: "Sample not found" }, { status: 404 })
    }
    if (!res.ok) {
      return NextResponse.json(
        { error: "Failed to fetch sample" },
        { status: res.status }
      )
    }
    const data = await res.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error("Lab sample fetch error:", error)
    return NextResponse.json(
      { error: "NatureOS backend unavailable" },
      { status: 503 }
    )
  }
}
