/**
 * PersonaPlex Bridge proxy (health)
 *
 * Browser -> Next.js (same-origin) -> Bridge (LAN)
 */

import { NextResponse } from "next/server"

export async function GET() {
  const bridgeBaseUrl =
    process.env.PERSONAPLEX_BRIDGE_URL ||
    process.env.NEXT_PUBLIC_PERSONAPLEX_BRIDGE_URL ||
    "http://localhost:8999"

  try {
    const res = await fetch(`${bridgeBaseUrl.replace(/\/$/, "")}/health`, {
      method: "GET",
      signal: AbortSignal.timeout(5000),
      headers: { "Accept": "application/json" },
      cache: "no-store",
    })

    const bodyText = await res.text()
    return new NextResponse(bodyText, {
      status: res.status,
      headers: {
        "Content-Type": res.headers.get("content-type") || "application/json",
        "Cache-Control": "no-store",
      },
    })
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: String(e) },
      { status: 502, headers: { "Cache-Control": "no-store" } }
    )
  }
}

