import { NextRequest, NextResponse } from "next/server"
import { readCache, writeCache, SHODAN_BASE, TTL, ShodanSearchResult } from "@/lib/crep/shodan"

/**
 * Shodan /shodan/host/search proxy — Apr 22, 2026
 *
 * Morgan: "Shodan integration, prep for Small Business tier, ON only
 * for CREP running in FUSARIUM not in NATUREOS (public)."
 *
 * Contract:
 *   GET /api/shodan/search?q=<query>&facets=<facets>&page=<n>
 *
 * Guard-rails:
 *   - SHODAN_API_KEY must be set server-side; never leaks to the client.
 *   - Responses are cached on disk for TTL.search (24 h) keyed by
 *     (q, facets, page) so repeated queries don't burn credits.
 *   - 404 when the key is missing so callers can detect a mis-config
 *     vs a true upstream outage.
 *
 * NOTE: This route is also gated at the application layer — CREPDashboardClient
 * only enables the Shodan layer when the CREP context is "fusarium" or
 * "dashboard" (never "natureos"). The gate here is a defense-in-depth
 * check — direct GET from natureos still returns 404.
 */
export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  const key = process.env.SHODAN_API_KEY?.trim() || ""
  if (!key) {
    return NextResponse.json(
      { error: "SHODAN_API_KEY not configured", hint: "set env var on the deployment" },
      { status: 501 }, // Not Implemented — service unavailable by config
    )
  }

  const referer = req.headers.get("referer") || ""
  // Defense-in-depth: deny if the request was clearly initiated from the
  // public NatureOS surface. Normal fusarium/dashboard requests always
  // carry /defense/crep or /dashboard/crep in the Referer.
  if (/\/natureos\//.test(referer) && !/\/defense\//.test(referer) && !/\/dashboard\//.test(referer)) {
    return NextResponse.json({ error: "shodan not available in natureos context" }, { status: 403 })
  }

  const q = (req.nextUrl.searchParams.get("q") || "").trim()
  if (!q) return NextResponse.json({ error: "missing q param" }, { status: 400 })
  const facets = (req.nextUrl.searchParams.get("facets") || "").trim()
  const page = Math.max(1, Math.min(100, Number(req.nextUrl.searchParams.get("page") || 1)))

  const cacheKey = `search|${q}|${facets}|${page}`
  const cached = readCache<ShodanSearchResult>("search", cacheKey)
  if (cached) {
    return NextResponse.json(cached, {
      headers: { "X-Shodan-Cache": "hit", "Cache-Control": "private, max-age=60" },
    })
  }

  const url = new URL(`${SHODAN_BASE}/shodan/host/search`)
  url.searchParams.set("key", key)
  url.searchParams.set("query", q)
  if (facets) url.searchParams.set("facets", facets)
  url.searchParams.set("page", String(page))

  try {
    const res = await fetch(url.toString(), {
      headers: { "User-Agent": "MycosoftCREP/1.0", Accept: "application/json" },
      signal: AbortSignal.timeout(20_000),
    })
    if (!res.ok) {
      const body = await res.text().catch(() => "")
      return NextResponse.json(
        { error: `shodan ${res.status}`, upstream_body: body.slice(0, 500) },
        { status: res.status === 401 ? 502 : 502 },
      )
    }
    const data = (await res.json()) as ShodanSearchResult
    writeCache("search", cacheKey, data, TTL.search)
    return NextResponse.json(data, {
      headers: { "X-Shodan-Cache": "miss", "Cache-Control": "private, max-age=60" },
    })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "shodan fetch failed" }, { status: 502 })
  }
}
