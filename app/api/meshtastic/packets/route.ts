import { NextRequest, NextResponse } from "next/server"

import { getMasApiBaseUrl } from "@/lib/meshtastic/mas-url"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams
  const limit = sp.get("limit") ?? "100"
  const offset = sp.get("offset") ?? "0"
  const since = sp.get("since")
  const qs = new URLSearchParams({ limit, offset })
  if (since) qs.set("since", since)
  try {
    const res = await fetch(`${getMasApiBaseUrl()}/api/meshtastic/packets?${qs.toString()}`, {
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
    if (!res.ok) return NextResponse.json({ available: false, packets: [], items: [] })
    return NextResponse.json(payload as object)
  } catch (e) {
    const message = e instanceof Error ? e.message : "mas_unreachable"
    return NextResponse.json({ available: false, packets: [], items: [], error: "proxy_failed", detail: message })
  }
}
