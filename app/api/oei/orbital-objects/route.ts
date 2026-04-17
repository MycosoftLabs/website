/**
 * OEI Orbital Objects — full catalog (active + rocket bodies + debris + analyst).
 *
 * Fuses CelesTrak/active + CelesTrak/SatCat + CelesTrak/analyst + MINDEX.
 *
 * Query params:
 *   objectType  PAYLOAD | ROCKET BODY | DEBRIS | UNKNOWN
 *   orbit       LEO | MEO | GEO | HEO | SSO | decaying | decayed
 *   country     ISO country code filter (launch country)
 *   minAlt, maxAlt  km altitude filter
 *   includeSatCat    true → include full 64k catalog (adds ~30s)
 *   includeAnalyst   true → include CelesTrak analyst / UCT TLEs
 *   limit       default 15000, cap 100000
 */

import { NextRequest, NextResponse } from "next/server"
import { getOrbitalObjects } from "@/lib/crep/registries/orbital-object-registry"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const baseUrl = `${url.protocol}//${url.host}`
  const objectType = url.searchParams.get("objectType")
  const orbit = url.searchParams.get("orbit")
  const country = url.searchParams.get("country")
  const minAlt = Number(url.searchParams.get("minAlt") || 0)
  const maxAlt = Number(url.searchParams.get("maxAlt") || 1e9)
  const includeSatCat = url.searchParams.get("includeSatCat") === "true"
  const includeAnalyst = url.searchParams.get("includeAnalyst") === "true"
  const limit = Math.min(Number(url.searchParams.get("limit") || 15000), 100000)

  try {
    const r = await getOrbitalObjects({ baseUrl, includeSatCat, includeAnalyst })
    let objects = r.objects
    if (objectType) objects = objects.filter((o) => o.objectType === objectType)
    if (orbit) objects = objects.filter((o) => o.orbitType === orbit)
    if (country) objects = objects.filter((o) => o.country === country)
    if (minAlt > 0) objects = objects.filter((o) => (o.altitude_km || 0) >= minAlt)
    if (maxAlt < 1e9) objects = objects.filter((o) => (o.altitude_km || 0) <= maxAlt)
    objects = objects.slice(0, limit)

    return NextResponse.json({
      source: "orbital-objects-multi",
      total: r.total,
      returned: objects.length,
      sources: r.sources,
      byType: r.byType,
      byOrbit: r.byOrbit,
      byCountry: r.byCountry,
      objects,
      generatedAt: r.generatedAt,
    }, { headers: { "Cache-Control": "public, s-maxage=600, stale-while-revalidate=1200" } })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "orbital-objects registry failed" }, { status: 500 })
  }
}
