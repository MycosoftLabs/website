import { NextRequest, NextResponse } from "next/server"
import { mindexProxyHeaders, mindexUrl } from "@/lib/server/mindex-proxy-request"

export const dynamic = "force-dynamic"

/** Proxies MINDEX observations (fungal/spore-relevant field data when present). */
export async function GET(req: NextRequest) {
  const limit = req.nextUrl.searchParams.get("limit") || "50"
  const bbox = req.nextUrl.searchParams.get("bbox")
  const qs = new URLSearchParams({ limit })
  if (bbox) qs.set("bbox", bbox)
  const url = `${mindexUrl("/api/mindex/observations")}?${qs.toString()}`
  try {
    const res = await fetch(url, {
      headers: mindexProxyHeaders(),
      cache: "no-store",
      signal: AbortSignal.timeout(12000),
    })
    const text = await res.text()
    if (!res.ok) return NextResponse.json({ layer: "spores", ok: false, observations: [], features: [], upstreamStatus: res.status })
    return new NextResponse(text, {
      headers: { "Content-Type": res.headers.get("Content-Type") || "application/json" },
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : "upstream_error"
    return NextResponse.json(
      { layer: "spores", ok: false, observations: [], features: [], error: message },
    )
  }
}
