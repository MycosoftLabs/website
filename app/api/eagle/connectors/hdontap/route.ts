import { NextRequest, NextResponse } from "next/server"
import { getHdontapCatalogCached } from "@/lib/crep/hdontap-catalog"

/**
 * HDOnTap full-catalog connector — Jun 15 2026
 *
 * Serves HDOnTap's entire public webcam catalog (every cam on hdontap.com) at
 * its true location, by bbox. Backed by an in-memory cache that is seeded
 * instantly from the baked seed and background-refreshed from hdontap.com's
 * sitemap (see lib/crep/hdontap-catalog.ts), so the catalog stays current
 * without a manual re-crawl. Shape matches the other eagle connectors
 * (`{ cams: [...] }`) so app/api/eagle/sources can merge it.
 */

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const bbox = url.searchParams.get("bbox") || undefined
  let cams = await getHdontapCatalogCached()
  if (bbox) {
    const [w, s, e, n] = bbox.split(",").map(Number)
    if ([w, s, e, n].every(Number.isFinite)) {
      cams = cams.filter((c) => c.lat >= s && c.lat <= n && c.lng >= w && c.lng <= e)
    }
  }
  return NextResponse.json(
    { source: "hdontap-catalog", total: cams.length, cams },
    { headers: { "Cache-Control": "public, s-maxage=600, stale-while-revalidate=3600" } },
  )
}
