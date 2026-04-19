import { NextRequest, NextResponse } from "next/server"

/**
 * Drone No-Fly Zones — Apr 19, 2026
 *
 * Polygon airspace dataset covering controlled, restricted, prohibited,
 * danger, and temporary-flight-restriction areas. Used by the CREP drone
 * operator / defense user to see where UAS flight is legal.
 *
 * Sources (time-boxed, fail-isolated):
 *   1. OpenAIP airspaces API — https://api.core.openaip.net/api/airspaces
 *      Requires OPENAIP_API_KEY (free tier, generous limits). Global.
 *   2. FAA UAS Restrictions (public) — https://api.faa.gov/s/public/uas-restrictions
 *      (fallback when OpenAIP not configured; US-only TFRs + prohibited areas)
 *   3. MINDEX /api/mindex/proxy/drone-no-fly (custom overrides + partner data)
 *
 * Response shape:
 *   { source, total, zones: [{ id, name, airspace_class, alt_floor_ft,
 *                              alt_ceiling_ft, geometry: Polygon|MultiPolygon,
 *                              source, country }] }
 */

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const OPENAIP_BASE = "https://api.core.openaip.net/api"

type Zone = {
  id: string
  name: string
  airspace_class?: string
  alt_floor_ft?: number
  alt_ceiling_ft?: number
  geometry: any
  source: string
  country?: string
}

async function fromOpenAIP(bbox?: [number, number, number, number], limit = 5000): Promise<Zone[]> {
  const key = process.env.OPENAIP_API_KEY
  if (!key) return []
  try {
    const bboxParam = bbox ? `&bbox=${bbox[0]},${bbox[1]},${bbox[2]},${bbox[3]}` : ""
    const url = `${OPENAIP_BASE}/airspaces?limit=${limit}${bboxParam}&apiKey=${key}`
    const res = await fetch(url, { signal: AbortSignal.timeout(15_000) })
    if (!res.ok) return []
    const j = await res.json()
    const items = j?.items || j?.data || j?.features || []
    return items.map((z: any) => ({
      id: `openaip-${z._id || z.id}`,
      name: z.name || z.ident || "Airspace",
      airspace_class: z.type === 2 ? "CTR" : z.type === 4 ? "CTA" : z.type === 10 ? "TRA" : z.icaoClass === 7 ? "RESTRICTED" : z.icaoClass === 8 ? "PROHIBITED" : "CTR",
      alt_floor_ft: z.lowerLimit?.value,
      alt_ceiling_ft: z.upperLimit?.value,
      geometry: z.geometry,
      source: "openaip",
      country: z.country,
    } satisfies Zone))
  } catch { return [] }
}

async function fromFAA(bbox?: [number, number, number, number]): Promise<Zone[]> {
  // FAA's public UAS-restrictions feed is more of a bundle of GeoJSON
  // files served from NGA/FAA open-data portals than a single API. Best-
  // effort fetch of the consolidated national dataset; bbox is applied
  // client-side in our filter below.
  try {
    const url = "https://www.faa.gov/uas/open_data/UAS_FacilityMaps.geojson"
    const res = await fetch(url, { signal: AbortSignal.timeout(20_000) })
    if (!res.ok) return []
    const fc = await res.json()
    const feats = fc?.features || []
    return feats
      .filter((f: any) => f.geometry && (f.geometry.type === "Polygon" || f.geometry.type === "MultiPolygon"))
      .map((f: any, i: number): Zone => ({
        id: `faa-${f.properties?.OBJECTID || f.id || i}`,
        name: f.properties?.Facility || f.properties?.FACILITY || f.properties?.NAME || "FAA UAS zone",
        airspace_class: f.properties?.CEILING ? "RESTRICTED" : "CTR",
        alt_floor_ft: 0,
        alt_ceiling_ft: f.properties?.CEILING != null ? Number(f.properties.CEILING) : undefined,
        geometry: f.geometry,
        source: "faa",
        country: "US",
      }))
  } catch { return [] }
}

async function fromMindex(bbox?: [number, number, number, number], baseUrl?: string): Promise<Zone[]> {
  if (!baseUrl) return []
  try {
    const bboxParam = bbox ? `&bbox=${bbox.join(",")}` : ""
    const res = await fetch(`${baseUrl}/api/mindex/proxy/drone-no-fly?limit=5000${bboxParam}`, {
      signal: AbortSignal.timeout(10_000),
    })
    if (!res.ok) return []
    const j = await res.json()
    const arr = j?.zones || j?.features || []
    return arr.map((z: any) => ({
      id: z.id || `mindex-nfz-${Math.random().toString(36).slice(2, 10)}`,
      name: z.name,
      airspace_class: z.airspace_class || z.class,
      alt_floor_ft: z.alt_floor_ft,
      alt_ceiling_ft: z.alt_ceiling_ft,
      geometry: z.geometry,
      source: "mindex",
      country: z.country,
    } satisfies Zone))
  } catch { return [] }
}

function inBbox(geom: any, bbox?: [number, number, number, number]): boolean {
  if (!bbox) return true
  if (!geom || !geom.coordinates) return false
  const [w, s, e, n] = bbox
  const checkPoint = ([lng, lat]: number[]) => lng >= w && lng <= e && lat >= s && lat <= n
  const firstCoord = (g: any): number[] | null => {
    if (g.type === "Polygon") return g.coordinates?.[0]?.[0] ?? null
    if (g.type === "MultiPolygon") return g.coordinates?.[0]?.[0]?.[0] ?? null
    return null
  }
  const pt = firstCoord(geom)
  return pt ? checkPoint(pt) : true
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const bboxStr = url.searchParams.get("bbox")
  const bbox = bboxStr ? (bboxStr.split(",").map(Number) as [number, number, number, number]) : undefined
  const limit = Math.min(Number(url.searchParams.get("limit") || 2000), 10000)
  const baseUrl = `${url.protocol}//${url.host}`

  const [openaip, faa, mindex] = await Promise.all([
    fromOpenAIP(bbox, limit).catch(() => []),
    fromFAA(bbox).catch(() => []),
    fromMindex(bbox, baseUrl).catch(() => []),
  ])

  const merged = [...openaip, ...faa, ...mindex]
    .filter((z) => z.geometry && inBbox(z.geometry, bbox))
    .slice(0, limit)

  return NextResponse.json(
    {
      source: "drone-no-fly-multi",
      total: merged.length,
      sources: { openaip: openaip.length, faa: faa.length, mindex: mindex.length },
      zones: merged,
      generatedAt: new Date().toISOString(),
      note: "Set OPENAIP_API_KEY for global airspace. Without it, FAA UAS FacilityMaps (US only) is used.",
    },
    {
      headers: {
        "Cache-Control": "public, s-maxage=600, stale-while-revalidate=3600",
      },
    },
  )
}
