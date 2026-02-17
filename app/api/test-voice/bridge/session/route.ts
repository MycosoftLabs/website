/**
 * PersonaPlex Bridge proxy (session create)
 *
 * Browser -> Next.js (same-origin) -> Bridge (LAN)
 */

import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  const bridgeBaseUrl =
    process.env.PERSONAPLEX_BRIDGE_URL ||
    process.env.NEXT_PUBLIC_PERSONAPLEX_BRIDGE_URL ||
    "http://localhost:8999"

  let body: unknown = null
  try {
    body = await req.json()
  } catch {
    // ignore
  }

  try {
    const res = await fetch(`${bridgeBaseUrl.replace(/\/$/, "")}/session`, {
      method: "POST",
      signal: AbortSignal.timeout(15000),
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

