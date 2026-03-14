/**
 * Worldstate API Proxy — Mar 14, 2026
 *
 * Proxies GET requests to MAS canonical worldstate API (/api/myca/world).
 * Read-only passive awareness — CREP commands and Earth2 simulation stay specialist.
 *
 * @route GET /api/mas/world
 * @route GET /api/mas/world/summary
 * @route GET /api/mas/world/region
 * @route GET /api/mas/world/sources
 * @route GET /api/mas/world/diff
 */

import { NextRequest, NextResponse } from "next/server"

const MAS_API_URL = process.env.MAS_API_URL || "http://192.168.0.188:8001"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path?: string[] }> }
) {
  try {
    const { path = [] } = await params
    const base = `${MAS_API_URL}/api/myca/world`
    const pathSuffix = path.length ? `/${path.join("/")}` : ""
    const url = new URL(base + pathSuffix)
    request.nextUrl.searchParams.forEach((v, k) => url.searchParams.set(k, v))

    const response = await fetch(url.toString(), {
      cache: "no-store",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(10000),
    })

    if (!response.ok) {
      return NextResponse.json(
        {
          error: "Worldstate API unavailable",
          status: response.status,
          degraded: true,
        },
        { status: response.status >= 500 ? 502 : response.status }
      )
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error("[worldstate] Proxy error:", error)
    return NextResponse.json(
      {
        error: "Worldstate API unreachable",
        degraded: true,
        detail: "MAS worldstate endpoint not available",
      },
      { status: 502 }
    )
  }
}
