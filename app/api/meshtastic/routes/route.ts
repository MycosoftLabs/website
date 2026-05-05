import { NextRequest, NextResponse } from "next/server"

import { getMasApiBaseUrl } from "@/lib/meshtastic/mas-url"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams
  const limit = sp.get("limit") ?? "500"
  const qs = new URLSearchParams({ limit }).toString()
  try {
    const res = await fetch(`${getMasApiBaseUrl()}/api/meshtastic/routes?${qs}`, {
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
    return NextResponse.json(payload as object, { status: res.status })
  } catch (e) {
    const message = e instanceof Error ? e.message : "mas_unreachable"
    return NextResponse.json({ error: "proxy_failed", detail: message }, { status: 502 })
  }
}
