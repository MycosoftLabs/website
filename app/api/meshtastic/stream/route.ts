import { NextResponse } from "next/server"

import { getMasApiBaseUrl } from "@/lib/meshtastic/mas-url"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

/**
 * Proxies MAS SSE `GET /api/meshtastic/stream` (Redis tail of mesh:packets).
 * Browser connects to same-origin `/api/meshtastic/stream`.
 */
export async function GET() {
  try {
    const res = await fetch(`${getMasApiBaseUrl()}/api/meshtastic/stream`, {
      headers: { Accept: "text/event-stream" },
      cache: "no-store",
    })
    if (!res.ok) {
      const t = await res.text().catch(() => "")
      return NextResponse.json(
        { error: "upstream_mesh_stream", status: res.status, detail: t.slice(0, 500) },
        { status: 502 }
      )
    }
    if (!res.body) {
      return NextResponse.json({ error: "empty_upstream_body" }, { status: 502 })
    }
    return new NextResponse(res.body, {
      status: 200,
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : "mas_unreachable"
    return NextResponse.json({ error: "proxy_failed", detail: message }, { status: 502 })
  }
}
