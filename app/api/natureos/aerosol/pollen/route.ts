import { NextRequest, NextResponse } from "next/server"
import { mindexProxyHeaders, mindexUrl } from "@/lib/server/mindex-proxy-request"

export const dynamic = "force-dynamic"

/**
 * Thin BFF: MINDEX unified-search for pollen-related biological/atmosphere hits.
 * Empty JSON from upstream → UI shows empty state (no fabricated rows).
 */
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim() || "pollen"
  const limit = req.nextUrl.searchParams.get("limit") || "24"
  const url = `${mindexUrl("/api/mindex/unified-search")}?${new URLSearchParams({ q, limit }).toString()}`
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
      { layer: "pollen", ok: false, error: message },
      { status: 502 },
    )
  }
}
