/**
 * MAS proxy: POST /api/voice/session/{sessionId}/end
 */

import { NextRequest, NextResponse } from "next/server"

interface RouteContext {
  params: Promise<{ sessionId: string }>
}

export async function POST(_req: NextRequest, context: RouteContext) {
  const { sessionId } = await context.params

  const masBaseUrl =
    process.env.MAS_API_URL ||
    process.env.NEXT_PUBLIC_MAS_API_URL ||
    "http://192.168.0.188:8001"

  if (!sessionId) {
    return NextResponse.json({ error: "Missing sessionId" }, { status: 400 })
  }

  try {
    const res = await fetch(
      `${masBaseUrl.replace(/\/$/, "")}/api/voice/session/${encodeURIComponent(sessionId)}/end`,
      {
        method: "POST",
        signal: AbortSignal.timeout(12000),
        cache: "no-store",
      }
    )

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

