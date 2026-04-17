/**
 * OEI Radar — NEXRAD + ECCC + FAA + Mycosoft SDR.
 *
 * Returns all radar sites with bbox filter, live observation URLs for
 * NEXRAD, and streamUrl endpoints for Mycosoft SDR devices.
 *
 * Weather data: api.weather.gov is the live NOAA source for NEXRAD
 * coverage + base reflectivity GIFs. Each site's lastObservationUrl
 * points at the latest public radar image.
 */

import { NextRequest, NextResponse } from "next/server"
import { getAllRadarSites } from "@/lib/crep/registries/radar-registry"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const bbox = url.searchParams.get("bbox")?.split(",").map(Number) as [number, number, number, number] | undefined
  const network = url.searchParams.get("network")   // NEXRAD | ECCC | OPERA | FAA-ASR | Mycosoft-SDR
  const kind = url.searchParams.get("kind")

  try {
    const baseUrl = `${url.protocol}//${url.host}`
    const r = await getAllRadarSites({ baseUrl })

    let sites = r.sites
    if (bbox && bbox.length === 4) {
      const [w, s, e, n] = bbox
      sites = sites.filter((x) => x.lat >= s && x.lat <= n && x.lng >= w && x.lng <= e)
    }
    if (network) sites = sites.filter((x) => x.network === network)
    if (kind) sites = sites.filter((x) => x.kind === kind)

    // Try to enrich with live api.weather.gov NEXRAD station status
    try {
      const liveRes = await fetch("https://api.weather.gov/radar/stations", {
        headers: { "User-Agent": "MycosoftCREP/1.0 (radar-coverage@mycosoft.com)" },
        signal: AbortSignal.timeout(8_000),
      })
      if (liveRes.ok) {
        const liveJson = await liveRes.json() as any
        const liveMap = new Map<string, any>()
        for (const f of liveJson.features || []) {
          liveMap.set(`nexrad-${f.properties?.id || f.id}`, f)
        }
        sites = sites.map((s) => {
          const hit = liveMap.get(s.id)
          if (!hit) return s
          return {
            ...s,
            lastObservationUrl: s.lastObservationUrl || `https://radar.weather.gov/ridge/standard/${hit.properties.id}_0.gif`,
            _status: hit.properties?.radarStatus?.properties,
          }
        })
      }
    } catch { /* live enrichment best-effort */ }

    return NextResponse.json({
      source: "radar-multi",
      total: r.total,
      returned: sites.length,
      sources: r.sources,
      byNetwork: r.byNetwork,
      sites,
      generatedAt: r.generatedAt,
    }, { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" } })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "radar registry failed" }, { status: 500 })
  }
}
