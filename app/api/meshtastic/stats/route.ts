import { NextResponse } from "next/server"

import { getMasApiBaseUrl } from "@/lib/meshtastic/mas-url"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const res = await fetch(`${getMasApiBaseUrl()}/api/meshtastic/stats`, {
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
    if (!res.ok) return NextResponse.json({ available: false, nodes: 0, packets: 0, observers: 0 })
    return NextResponse.json(payload as object)
  } catch (e) {
    const message = e instanceof Error ? e.message : "mas_unreachable"
    return NextResponse.json({ available: false, nodes: 0, packets: 0, observers: 0, error: "proxy_failed", detail: message })
  }
}
