/**
 * OEI Power Plants — Global multi-source registry (35,000+ target).
 *
 * Fuses:
 *   - WRI Global Power Plant Database (CC-BY 4.0) — bundled, 34,936 plants
 *   - MINDEX registry — /api/mindex/proxy/power-plants
 *   - EIA Form 860 (US, live via ArcGIS)
 *   - OpenStreetMap power=plant (bbox-scoped live fill-in)
 */

import { NextRequest, NextResponse } from "next/server"
import { getAllPowerPlants } from "@/lib/crep/registries/power-plant-registry"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const bbox = url.searchParams.get("bbox")?.split(",").map(Number) as [number, number, number, number] | undefined
  const limit = Math.min(Number(url.searchParams.get("limit") || 50000), 100000)
  const fuel = url.searchParams.get("fuel")
  const country = url.searchParams.get("country")
  const minCapacity = Number(url.searchParams.get("minCapacity") || 0)

  try {
    const baseUrl = `${url.protocol}//${url.host}`
    const r = await getAllPowerPlants({
      baseUrl,
      bbox: bbox && bbox.length === 4 ? bbox : undefined,
    })

    let plants = r.plants
    if (bbox && bbox.length === 4) {
      const [w, s, e, n] = bbox
      plants = plants.filter((p) => p.lat >= s && p.lat <= n && p.lng >= w && p.lng <= e)
    }
    if (fuel) plants = plants.filter((p) => p.fuel?.toLowerCase().includes(fuel.toLowerCase()))
    if (country) plants = plants.filter((p) => p.country === country.toUpperCase())
    if (minCapacity > 0) plants = plants.filter((p) => (p.capacity_mw || 0) >= minCapacity)

    plants = plants.slice(0, limit)

    return NextResponse.json({
      source: "power-plants-multi",
      total: r.total,
      returned: plants.length,
      sources: r.sources,
      byCountry: r.byCountry,
      byFuel: r.byFuel,
      countries: Object.keys(r.byCountry).length,
      plants,
      generatedAt: r.generatedAt,
    }, { headers: { "Cache-Control": "public, s-maxage=600, stale-while-revalidate=1200" } })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "power plant registry failed" }, { status: 500 })
  }
}
