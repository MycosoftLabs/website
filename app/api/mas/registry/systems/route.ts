import { NextRequest, NextResponse } from "next/server"

/**
 * Proxy to MAS registry systems list.
 * GET /api/mas/registry/systems - used by Activity topology for live system catalog.
 */
const MAS_API_URL = process.env.MAS_API_URL || process.env.NEXT_PUBLIC_MAS_API_URL || "http://192.168.0.188:8001"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  try {
    const url = new URL("/api/registry/systems", MAS_API_URL)
    request.nextUrl.searchParams.forEach((v, k) => url.searchParams.set(k, v))
    const res = await fetch(url.toString(), { cache: "no-store", signal: AbortSignal.timeout(5000) })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      return NextResponse.json(data, { status: res.status })
    }
    return NextResponse.json(data)
  } catch (e) {
    return NextResponse.json(
      { error: "MAS registry unavailable", detail: e instanceof Error ? e.message : "Unknown error" },
      { status: 503 }
    )
  }
}
