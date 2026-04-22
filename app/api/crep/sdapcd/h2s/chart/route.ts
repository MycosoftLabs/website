/**
 * /api/crep/sdapcd/h2s/chart?id=X — Apr 22, 2026
 *
 * Serves the cached UCSD H₂S chart PNGs from the collector (stored in
 * var/cache/h2s-ucsd/). Falls back to fetching fresh from UCSD if the
 * cache miss (first-run or flushed cache).
 *
 * This decouples the CREP widget from UCSD's uptime — when UCSD is
 * slow or 5xx, the map still shows the last known chart up to 12 h
 * old per the widget's context.
 */

import { NextRequest, NextResponse } from "next/server"
import { readChart, collectH2sCharts } from "@/lib/crep/h2s-ucsd-collector"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id") || ""
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 })

  let entry = readChart(id)
  if (!entry) {
    // Cache miss — run the collector once to populate it
    await collectH2sCharts()
    entry = readChart(id)
  }
  if (!entry) {
    // Last-ditch: 302 to UCSD directly so the widget still renders
    // while the cache is cold. Map upstream ids back to canonical URLs.
    const directMap: Record<string, string> = {
      nestor_30m: "https://airborne.ucsd.edu/wp-json/airborne/v1/30minutes",
      nestor_12h: "https://airborne.ucsd.edu/wp-json/airborne/v1/12hours",
      nestor_2d:  "https://airborne.ucsd.edu/wp-json/airborne/v1/latest-png",
      coast_30m:  "https://airborne.ucsd.edu/wp-json/airborne/v1/coast_30minutes",
      coast_12h:  "https://airborne.ucsd.edu/wp-json/airborne/v1/coast_12hours",
      coast_2d:   "https://airborne.ucsd.edu/wp-json/airborne/v1/coast_2days",
    }
    const direct = directMap[id]
    if (direct) {
      return NextResponse.redirect(direct, 302)
    }
    return NextResponse.json({ error: "chart not found", id }, { status: 404 })
  }

  return new NextResponse(entry.buf as any, {
    status: 200,
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=60, stale-while-revalidate=300",
      "X-Source-URL": entry.meta.source_url,
      "X-Fetched-At": entry.meta.fetched_at,
      "X-H2S-Site": entry.meta.site,
      "X-H2S-Range": entry.meta.range,
    },
  })
}
