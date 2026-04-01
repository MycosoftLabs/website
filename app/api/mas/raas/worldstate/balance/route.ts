/**
 * RaaS Worldstate Balance — proxy to MAS
 * GET with X-API-Key returns agent minute balance.
 * Created: March 14, 2026
 */

import { NextRequest, NextResponse } from "next/server"

const MAS_API_URL = process.env.MAS_API_URL || "http://localhost:8001"

export async function GET(request: NextRequest) {
  const apiKey = request.headers.get("X-API-Key")
  if (!apiKey || apiKey.length < 10) {
    return NextResponse.json(
      { error: "X-API-Key header required" },
      { status: 401 }
    )
  }

  try {
    const res = await fetch(`${MAS_API_URL}/api/raas/worldstate/balance`, {
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": apiKey,
      },
      signal: AbortSignal.timeout(10000),
    })

    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      return NextResponse.json(
        data?.detail ?? data?.error ?? "Balance unavailable",
        { status: res.status }
      )
    }
    return NextResponse.json(data)
  } catch (error) {
    console.error("[raas/balance] Proxy error:", error)
    return NextResponse.json(
      { error: "MAS unreachable" },
      { status: 502 }
    )
  }
}
