import { NextRequest, NextResponse } from "next/server"
import { readCache, writeCache, SHODAN_BASE, TTL, ShodanHost } from "@/lib/crep/shodan"

/**
 * Shodan /shodan/host/{ip} proxy — Apr 22, 2026
 *
 * Returns all services, banners, and CVEs for a single IP. 1 credit per
 * lookup — cached aggressively (7 d) since a host's service footprint
 * doesn't meaningfully change inside a week.
 */
export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(req: NextRequest, { params }: { params: { ip: string } }) {
  const key = process.env.SHODAN_API_KEY?.trim() || ""
  if (!key) {
    return NextResponse.json({ error: "SHODAN_API_KEY not configured" }, { status: 501 })
  }

  const ip = (params.ip || "").trim()
  // Basic IPv4 / IPv6 allowlist. Shodan host API only accepts valid IPs.
  if (!/^([0-9a-fA-F:.]+)$/.test(ip) || ip.length > 45) {
    return NextResponse.json({ error: "invalid ip" }, { status: 400 })
  }

  const referer = req.headers.get("referer") || ""
  if (/\/natureos\//.test(referer) && !/\/defense\//.test(referer) && !/\/dashboard\//.test(referer)) {
    return NextResponse.json({ error: "shodan not available in natureos context" }, { status: 403 })
  }

  const cacheKey = `host|${ip}`
  const cached = readCache<ShodanHost>("host", cacheKey)
  if (cached) {
    return NextResponse.json(cached, {
      headers: { "X-Shodan-Cache": "hit", "Cache-Control": "private, max-age=300" },
    })
  }

  try {
    const url = `${SHODAN_BASE}/shodan/host/${encodeURIComponent(ip)}?key=${encodeURIComponent(key)}`
    const res = await fetch(url, {
      headers: { "User-Agent": "MycosoftCREP/1.0", Accept: "application/json" },
      signal: AbortSignal.timeout(20_000),
    })
    if (res.status === 404) {
      return NextResponse.json({ error: "no information for that IP" }, { status: 404 })
    }
    if (!res.ok) {
      const body = await res.text().catch(() => "")
      return NextResponse.json(
        { error: `shodan ${res.status}`, upstream_body: body.slice(0, 500) },
        { status: 502 },
      )
    }
    const data = (await res.json()) as ShodanHost
    writeCache("host", cacheKey, data, TTL.host)
    return NextResponse.json(data, {
      headers: { "X-Shodan-Cache": "miss", "Cache-Control": "private, max-age=300" },
    })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "shodan fetch failed" }, { status: 502 })
  }
}
