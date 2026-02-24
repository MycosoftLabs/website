/**
 * A2A Agent Card proxy - February 17, 2026
 *
 * Proxies GET to MAS /.well-known/agent-card.json for browser CORS and auth boundaries.
 * Path: GET /api/myca/a2a/agent-card
 */

import { NextRequest, NextResponse } from "next/server"

const MAS_API_URL =
  process.env.MAS_API_URL ||
  process.env.NEXT_PUBLIC_MAS_API_URL ||
  "http://192.168.0.188:8001"

export async function GET(req: NextRequest) {
  try {
    const base = MAS_API_URL.replace(/\/$/, "")
    const res = await fetch(`${base}/.well-known/agent-card.json`, {
      method: "GET",
      signal: AbortSignal.timeout(5000),
      headers: { Accept: "application/json" },
      cache: "no-store",
    })

    const data = await res.json().catch(() => ({}))
    return NextResponse.json(data, {
      status: res.status,
      headers: { "Cache-Control": "no-store" },
    })
  } catch (e) {
    return NextResponse.json(
      { error: "A2A agent card unavailable", detail: String(e) },
      { status: 502, headers: { "Cache-Control": "no-store" } }
    )
  }
}
