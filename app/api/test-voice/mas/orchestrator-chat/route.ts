/**
 * MAS proxy: POST /voice/orchestrator/chat
 *
 * Used by /test-voice "text clone" path so it doesn't rely on CORS to MAS.
 */

import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  const masBaseUrl =
    process.env.MAS_API_URL ||
    process.env.NEXT_PUBLIC_MAS_API_URL ||
    "http://192.168.0.188:8001"

  let body: unknown = null
  try {
    body = await req.json()
  } catch {
    // ignore
  }

  try {
    const res = await fetch(`${masBaseUrl.replace(/\/$/, "")}/voice/orchestrator/chat`, {
      method: "POST",
      signal: AbortSignal.timeout(12000),
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body ?? {}),
      cache: "no-store",
    })

    const text = await res.text()
    return new NextResponse(text, {
      status: res.status,
      headers: {
        "Content-Type": res.headers.get("content-type") || "application/json",
        "Cache-Control": "no-store",
      },
    })
  } catch (e) {
    return NextResponse.json(
      { error: String(e) },
      { status: 502, headers: { "Cache-Control": "no-store" } }
    )
  }
}

