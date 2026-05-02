import { NextRequest, NextResponse } from "next/server"
import { mindexProxyHeaders, mindexUrl } from "@/lib/server/mindex-proxy-request"

export const dynamic = "force-dynamic"

/**
 * CREP/MINDEX earth map bbox — default layer `weather` (atmospheric / dust-related feeds).
 * Pass-through query string except we ensure required params when missing.
 */
export async function GET(req: NextRequest) {
  const incoming = new URLSearchParams(req.nextUrl.searchParams)
  if (!incoming.has("layer")) incoming.set("layer", "weather")
  if (!incoming.has("lat_min")) incoming.set("lat_min", "24")
  if (!incoming.has("lat_max")) incoming.set("lat_max", "50")
  if (!incoming.has("lng_min")) incoming.set("lng_min", "-125")
  if (!incoming.has("lng_max")) incoming.set("lng_max", "-65")
  if (!incoming.has("limit")) incoming.set("limit", "300")

  const url = `${mindexUrl("/api/mindex/earth/map/bbox")}?${incoming.toString()}`
  try {
    const res = await fetch(url, {
      headers: mindexProxyHeaders(),
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
    })
    const text = await res.text()
    return new NextResponse(text, {
      status: res.status,
      headers: { "Content-Type": res.headers.get("Content-Type") || "application/json" },
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : "upstream_error"
    return NextResponse.json(
      { layer: "dust", ok: false, error: message },
      { status: 502 },
    )
  }
}
