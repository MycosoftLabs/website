/**
 * PersonaPlex Bridge proxy (session create)
 *
 * Browser -> Next.js (same-origin) -> Bridge (LAN)
 */

import { NextRequest, NextResponse } from "next/server"
import { resolvePersonaplexBridgeBaseUrl } from "@/lib/config/resolve-voice-bridge"

export async function POST(req: NextRequest) {
  const bridgeBaseUrl = resolvePersonaplexBridgeBaseUrl()

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

