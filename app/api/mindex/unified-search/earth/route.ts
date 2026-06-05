/**
 * Proxy MINDEX unified earth search for Fluid Search / Earth Simulator.
 * May 27, 2026 — canonical path: /api/mindex/unified-search/earth
 */

import { NextRequest, NextResponse } from "next/server"
import { resolveMindexServerBaseUrl } from "@/lib/mindex-base-url"
import { fetchMindexWithAuthRetry } from "@/lib/mindex-bff-auth"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const mindexBase = resolveMindexServerBaseUrl()
  const params = request.nextUrl.searchParams
  const upstream = `${mindexBase}/api/mindex/unified-search/earth?${params.toString()}`

  try {
    const res = await fetchMindexWithAuthRetry(upstream, {
      signal: AbortSignal.timeout(12_000),
      cache: "no-store",
    })
    const body = await res.json().catch(() => ({}))
    return NextResponse.json(body, { status: res.status })
  } catch (error) {
    console.error("[mindex unified-search/earth proxy]", error)
    return NextResponse.json(
      { error: "MINDEX earth search unavailable", results: {}, universal_results: [], total_count: 0 },
      { status: 502 }
    )
  }
}
