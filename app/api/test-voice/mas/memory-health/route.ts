/**
 * MAS proxy: /api/memory/health
 */

import { NextResponse } from "next/server"

export async function GET() {
  const masBaseUrl =
    process.env.MAS_API_URL ||
    process.env.NEXT_PUBLIC_MAS_API_URL ||
    "http://192.168.0.188:8001"

  try {
    const res = await fetch(`${masBaseUrl.replace(/\/$/, "")}/api/memory/health`, {
      method: "GET",
      signal: AbortSignal.timeout(8000),
      headers: { "Accept": "application/json" },
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

