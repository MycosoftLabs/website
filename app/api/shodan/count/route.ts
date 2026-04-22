import { NextRequest, NextResponse } from "next/server"
import { readCache, writeCache, SHODAN_BASE, TTL } from "@/lib/crep/shodan"

/**
 * Shodan /shodan/host/count proxy — Apr 22, 2026
 *
 * Like /shodan/host/search but returns only the match count + facet
 * breakdown. Does NOT consume query credits — useful for:
 *   - Showing exposure counts by country/product/port as headline stats
 *   - "Is this query worth running?" gut-checks before burning a credit
 *
 * Cached 12 h.
 */
export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  const key = process.env.SHODAN_API_KEY?.trim() || ""
  if (!key) {
    return NextResponse.json({ error: "SHODAN_API_KEY not configured" }, { status: 501 })
  }

  const q = (req.nextUrl.searchParams.get("q") || "").trim()
  if (!q) return NextResponse.json({ error: "missing q param" }, { status: 400 })
  const facets = (req.nextUrl.searchParams.get("facets") || "").trim()

  const referer = req.headers.get("referer") || ""
  if (/\/natureos\//.test(referer) && !/\/defense\//.test(referer) && !/\/dashboard\//.test(referer)) {
    return NextResponse.json({ error: "shodan not available in natureos context" }, { status: 403 })
  }

  const cacheKey = `count|${q}|${facets}`
  const cached = readCache<any>("count", cacheKey)
  if (cached) {
    return NextResponse.json(cached, {
      headers: { "X-Shodan-Cache": "hit", "Cache-Control": "private, max-age=600" },
    })
  }

  try {
    const url = new URL(`${SHODAN_BASE}/shodan/host/count`)
    url.searchParams.set("key", key)
    url.searchParams.set("query", q)
    if (facets) url.searchParams.set("facets", facets)
    const res = await fetch(url.toString(), {
      headers: { "User-Agent": "MycosoftCREP/1.0", Accept: "application/json" },
      signal: AbortSignal.timeout(15_000),
    })
    if (!res.ok) {
      const body = await res.text().catch(() => "")
      return NextResponse.json(
        { error: `shodan ${res.status}`, upstream_body: body.slice(0, 500) },
        { status: 502 },
      )
    }
    const data = await res.json()
    writeCache("count", cacheKey, data, TTL.count)
    return NextResponse.json(data, {
      headers: { "X-Shodan-Cache": "miss", "Cache-Control": "private, max-age=600" },
    })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "shodan fetch failed" }, { status: 502 })
  }
}
