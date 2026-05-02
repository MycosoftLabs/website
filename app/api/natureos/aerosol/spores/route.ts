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
    return new NextResponse(text, {
      status: res.status,
      headers: { "Content-Type": res.headers.get("Content-Type") || "application/json" },
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : "upstream_error"
    return NextResponse.json(
      { layer: "spores", ok: false, error: message },
      { status: 502 },
    )
  }
}
