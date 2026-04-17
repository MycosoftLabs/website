/**
 * OEI Factories / Industrial Facilities — multi-source registry.
 *
 * Fuses OSM man_made=works + GEM steel/cement + Climate TRACE assets
 * + MINDEX. bbox strongly recommended (OSM Overpass will time out planet-wide).
 */

import { NextRequest, NextResponse } from "next/server"
import { getAllFactories } from "@/lib/crep/registries/factory-registry"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const bbox = url.searchParams.get("bbox")?.split(",").map(Number) as [number, number, number, number] | undefined
  const industry = url.searchParams.get("industry")
  const country = url.searchParams.get("country")
  const limit = Math.min(Number(url.searchParams.get("limit") || 10000), 50000)

  try {
    const baseUrl = `${url.protocol}//${url.host}`
    const r = await getAllFactories({
      baseUrl,
      bbox: bbox && bbox.length === 4 ? bbox : undefined,
    })

    let factories = r.factories
    if (industry) factories = factories.filter((f) => f.industry === industry)
    if (country) factories = factories.filter((f) => f.country === country.toUpperCase())
    factories = factories.slice(0, limit)

    return NextResponse.json({
      source: "factories-multi",
      total: r.total,
      returned: factories.length,
      sources: r.sources,
      byIndustry: r.byIndustry,
      byCountry: r.byCountry,
      factories,
      generatedAt: r.generatedAt,
    }, { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" } })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "factory registry failed" }, { status: 500 })
  }
}
