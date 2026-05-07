import { NextRequest, NextResponse } from "next/server"
import { resolveMasServerBaseUrl } from "@/lib/mas-server-url"

export const dynamic = "force-dynamic"

const MAS_API_URL = resolveMasServerBaseUrl()

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams
  const limit = sp.get("limit") ?? "25"
  const country = sp.get("country") ?? ""
  const qs = new URLSearchParams({ limit })
  if (country) qs.set("country", country)
  try {
    const res = await fetch(`${MAS_API_URL}/api/natureos/feeds/openaq/measurements?${qs}`, {
      headers: { Accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(30000),
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
