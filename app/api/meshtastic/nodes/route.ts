import { NextRequest, NextResponse } from "next/server"

import { getMasApiBaseUrl } from "@/lib/meshtastic/mas-url"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams
  const limit = sp.get("limit") ?? "200"
  const offset = sp.get("offset") ?? "0"
  const qs = new URLSearchParams({ limit, offset }).toString()
  try {
    const res = await fetch(`${getMasApiBaseUrl()}/api/meshtastic/nodes?${qs}`, {
      headers: { Accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(45_000),
    })
    const text = await res.text()
    let payload: unknown = text
    try {
      payload = text ? JSON.parse(text) : {}
    } catch {
      payload = { raw: text }
    }
    if (!res.ok) return NextResponse.json({ available: false, nodes: [], items: [] })
    return NextResponse.json(payload as object)
  } catch (e) {
    const message = e instanceof Error ? e.message : "mas_unreachable"
    return NextResponse.json({ available: false, nodes: [], items: [], error: "proxy_failed", detail: message })
  }
}
