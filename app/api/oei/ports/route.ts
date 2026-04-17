/**
 * OEI Ports — multi-source global seaport registry (3,600+ target).
 *
 * Fuses:
 *   - Static bundle: public/data/crep/ports-global.geojson (WPI/NGA seed)
 *   - MINDEX registry: /api/mindex/proxy/ports
 *   - MarineCadastre (US)
 *   - OSM Overpass (global fallback, bbox-scoped)
 */

import { NextRequest, NextResponse } from "next/server"
import { getAllPorts } from "@/lib/crep/registries/port-registry"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const bbox = url.searchParams.get("bbox")?.split(",").map(Number) as [number, number, number, number] | undefined
  const limit = Math.min(Number(url.searchParams.get("limit") || 10000), 25000)

  try {
    const baseUrl = `${url.protocol}//${url.host}`
    const result = await getAllPorts({
      baseUrl,
      bbox: bbox && bbox.length === 4 ? bbox : undefined,
    })

    // Optional bbox filter applied client-side
    let ports = result.ports
    if (bbox && bbox.length === 4) {
      const [w, s, e, n] = bbox
      ports = ports.filter((p) => p.lat >= s && p.lat <= n && p.lng >= w && p.lng <= e)
    }
    ports = ports.slice(0, limit)

    return NextResponse.json({
      source: "ports-multi",
      total: result.total,
      returned: ports.length,
      sources: result.sources,
      ports,
      generatedAt: result.generatedAt,
    }, { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" } })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "port registry failed" }, { status: 500 })
  }
}
