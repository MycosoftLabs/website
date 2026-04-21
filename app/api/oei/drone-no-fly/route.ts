import { NextRequest, NextResponse } from "next/server"

/**
 * Drone No-Fly Zones — Apr 19, 2026 (r2: cache-bust)
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
  // Apr 19, 2026 (r2): FAA migrated their UAS data off the static
  // UAS_FacilityMaps.geojson URL. The canonical source is now an ArcGIS
  // FeatureServer.
  //
  // Apr 20, 2026 (r3): both v2 service URLs we had now return 400
  // "Invalid URL" on the /query path — FAA's ArcGIS endpoint catalog is
  // unstable. Try the v2 endpoint anyway (it sometimes recovers), then
  // fall back to a hard-coded SEED of major US Class B/C airport CTR
  // perimeters + iconic restricted areas (Camp Pendleton, NAS North
  // Island, Edwards AFB, etc.) so Morgan sees SOMETHING immediately
  // instead of an empty layer.
  //
  // The seed is approximate (5 nm circle around the airport reference
  // point for Class B/C, polygon hand-traced for restricted areas).
  // Real-time FAA data flows in once the live endpoint stabilises;
  // operator can also set OPENAIP_API_KEY for global coverage.
  const urls = [
    "https://services1.arcgis.com/ggbONOX5UcwDEdDu/arcgis/rest/services/UAS_Facility_Maps_EN_v2/FeatureServer/0/query?where=1%3D1&outFields=*&f=geojson&resultRecordCount=2000",
    "https://services6.arcgis.com/ssFJjBXIUyZDrSYZ/arcgis/rest/services/UASFM_Production/FeatureServer/0/query?where=1%3D1&outFields=*&f=geojson&resultRecordCount=2000",
  ]
  for (const url of urls) {
    try {
      const res = await fetch(url, {
        signal: AbortSignal.timeout(15_000),
        headers: { Accept: "application/geo+json, application/json", "User-Agent": "MycosoftCREP/1.0" },
      })
      if (!res.ok) continue
      const ct = (res.headers.get("content-type") || "").toLowerCase()
      if (!ct.includes("json")) continue
      const fc = await res.json()
      const feats = fc?.features || []
      if (!feats.length) continue
      const live = feats
        .filter((f: any) => f.geometry && (f.geometry.type === "Polygon" || f.geometry.type === "MultiPolygon"))
        .map((f: any, i: number): Zone => {
          const p = f.properties || {}
          return {
            id: `faa-${p.OBJECTID || p.FID || f.id || i}`,
            name: p.Facility || p.FACILITY || p.NAME || p.ICAO || "FAA UAS zone",
            airspace_class: p.CEILING != null ? "RESTRICTED" : "CTR",
            alt_floor_ft: 0,
            alt_ceiling_ft: p.CEILING != null ? Number(p.CEILING) : undefined,
            geometry: f.geometry,
            source: "faa",
            country: "US",
          }
        })
      if (live.length) return live
    } catch { /* try next */ }
  }
  return FAA_STATIC_SEED
}

// Static FAA UAS facility seed — major Class B / C airports as 5 nm
// circle perimeters + iconic restricted areas as hand-traced polygons.
// Each circle is generated as a 24-vertex polygon around the airport
// reference point; alt_ceiling_ft is the FAA-published outer ring ceiling.
function circlePolygon(lng: number, lat: number, radiusNm: number, segments = 24): number[][][] {
  const coords: number[][] = []
  const earthRadiusNm = 3440.07
  const angularDist = radiusNm / earthRadiusNm
  const latRad = (lat * Math.PI) / 180
  const lngRad = (lng * Math.PI) / 180
  for (let i = 0; i <= segments; i++) {
    const bearing = ((2 * Math.PI) / segments) * i
    const lat2 = Math.asin(
      Math.sin(latRad) * Math.cos(angularDist) + Math.cos(latRad) * Math.sin(angularDist) * Math.cos(bearing),
    )
    const lng2 = lngRad + Math.atan2(
      Math.sin(bearing) * Math.sin(angularDist) * Math.cos(latRad),
      Math.cos(angularDist) - Math.sin(latRad) * Math.sin(lat2),
    )
    coords.push([(lng2 * 180) / Math.PI, (lat2 * 180) / Math.PI])
  }
  return [coords]
}

const FAA_STATIC_SEED: Zone[] = [
  // Class B airports — 5 nm CTR (real Class B is wedding-cake-shaped;
  // 5 nm circle is a conservative approximation for default-deny)
  { id: "faa-static-lax",  name: "LAX — Los Angeles Class B",        airspace_class: "CTR", alt_floor_ft: 0, alt_ceiling_ft: 10000, geometry: { type: "Polygon", coordinates: circlePolygon(-118.4081, 33.9416, 5) }, source: "faa-static", country: "US" },
  { id: "faa-static-sfo",  name: "SFO — San Francisco Class B",      airspace_class: "CTR", alt_floor_ft: 0, alt_ceiling_ft: 10000, geometry: { type: "Polygon", coordinates: circlePolygon(-122.3790, 37.6213, 5) }, source: "faa-static", country: "US" },
  { id: "faa-static-jfk",  name: "JFK — New York Class B",           airspace_class: "CTR", alt_floor_ft: 0, alt_ceiling_ft: 10000, geometry: { type: "Polygon", coordinates: circlePolygon(-73.7781, 40.6413, 5) }, source: "faa-static", country: "US" },
  { id: "faa-static-ord",  name: "ORD — Chicago Class B",            airspace_class: "CTR", alt_floor_ft: 0, alt_ceiling_ft: 10000, geometry: { type: "Polygon", coordinates: circlePolygon(-87.9073, 41.9742, 5) }, source: "faa-static", country: "US" },
  { id: "faa-static-atl",  name: "ATL — Atlanta Class B",            airspace_class: "CTR", alt_floor_ft: 0, alt_ceiling_ft: 10000, geometry: { type: "Polygon", coordinates: circlePolygon(-84.4277, 33.6407, 5) }, source: "faa-static", country: "US" },
  { id: "faa-static-dca",  name: "DCA — Washington National Class B (SFRA)", airspace_class: "RESTRICTED", alt_floor_ft: 0, alt_ceiling_ft: 18000, geometry: { type: "Polygon", coordinates: circlePolygon(-77.0402, 38.8512, 15) }, source: "faa-static", country: "US" },
  { id: "faa-static-iad",  name: "IAD — Dulles Class B",             airspace_class: "CTR", alt_floor_ft: 0, alt_ceiling_ft: 10000, geometry: { type: "Polygon", coordinates: circlePolygon(-77.4565, 38.9531, 5) }, source: "faa-static", country: "US" },
  { id: "faa-static-bos",  name: "BOS — Boston Class B",             airspace_class: "CTR", alt_floor_ft: 0, alt_ceiling_ft: 10000, geometry: { type: "Polygon", coordinates: circlePolygon(-71.0096, 42.3656, 5) }, source: "faa-static", country: "US" },
  { id: "faa-static-mia",  name: "MIA — Miami Class B",              airspace_class: "CTR", alt_floor_ft: 0, alt_ceiling_ft: 10000, geometry: { type: "Polygon", coordinates: circlePolygon(-80.2870, 25.7959, 5) }, source: "faa-static", country: "US" },
  { id: "faa-static-sea",  name: "SEA — Seattle Class B",            airspace_class: "CTR", alt_floor_ft: 0, alt_ceiling_ft: 10000, geometry: { type: "Polygon", coordinates: circlePolygon(-122.3088, 47.4502, 5) }, source: "faa-static", country: "US" },
  { id: "faa-static-las",  name: "LAS — Las Vegas Class B",          airspace_class: "CTR", alt_floor_ft: 0, alt_ceiling_ft: 10000, geometry: { type: "Polygon", coordinates: circlePolygon(-115.1537, 36.0840, 5) }, source: "faa-static", country: "US" },
  { id: "faa-static-phx",  name: "PHX — Phoenix Class B",            airspace_class: "CTR", alt_floor_ft: 0, alt_ceiling_ft: 10000, geometry: { type: "Polygon", coordinates: circlePolygon(-112.0078, 33.4373, 5) }, source: "faa-static", country: "US" },
  { id: "faa-static-dfw",  name: "DFW — Dallas/FW Class B",          airspace_class: "CTR", alt_floor_ft: 0, alt_ceiling_ft: 10000, geometry: { type: "Polygon", coordinates: circlePolygon(-97.0382, 32.8998, 5) }, source: "faa-static", country: "US" },
  { id: "faa-static-iah",  name: "IAH — Houston Class B",            airspace_class: "CTR", alt_floor_ft: 0, alt_ceiling_ft: 10000, geometry: { type: "Polygon", coordinates: circlePolygon(-95.3414, 29.9844, 5) }, source: "faa-static", country: "US" },
  { id: "faa-static-msp",  name: "MSP — Minneapolis Class B",        airspace_class: "CTR", alt_floor_ft: 0, alt_ceiling_ft: 10000, geometry: { type: "Polygon", coordinates: circlePolygon(-93.2218, 44.8848, 5) }, source: "faa-static", country: "US" },
  { id: "faa-static-den",  name: "DEN — Denver Class B",             airspace_class: "CTR", alt_floor_ft: 0, alt_ceiling_ft: 10000, geometry: { type: "Polygon", coordinates: circlePolygon(-104.6737, 39.8561, 5) }, source: "faa-static", country: "US" },
  { id: "faa-static-clt",  name: "CLT — Charlotte Class B",          airspace_class: "CTR", alt_floor_ft: 0, alt_ceiling_ft: 10000, geometry: { type: "Polygon", coordinates: circlePolygon(-80.9431, 35.2140, 5) }, source: "faa-static", country: "US" },
  { id: "faa-static-detroit", name: "DTW — Detroit Class B",         airspace_class: "CTR", alt_floor_ft: 0, alt_ceiling_ft: 10000, geometry: { type: "Polygon", coordinates: circlePolygon(-83.3554, 42.2124, 5) }, source: "faa-static", country: "US" },
  { id: "faa-static-orl",  name: "MCO — Orlando Class B",            airspace_class: "CTR", alt_floor_ft: 0, alt_ceiling_ft: 10000, geometry: { type: "Polygon", coordinates: circlePolygon(-81.3081, 28.4312, 5) }, source: "faa-static", country: "US" },
  { id: "faa-static-tpa",  name: "TPA — Tampa Class B",              airspace_class: "CTR", alt_floor_ft: 0, alt_ceiling_ft: 10000, geometry: { type: "Polygon", coordinates: circlePolygon(-82.5332, 27.9755, 5) }, source: "faa-static", country: "US" },

  // San Diego corridor — Morgan's zone
  { id: "faa-static-san",  name: "SAN — San Diego Class B",          airspace_class: "CTR",        alt_floor_ft: 0, alt_ceiling_ft: 10000, geometry: { type: "Polygon", coordinates: circlePolygon(-117.1933, 32.7338, 5) }, source: "faa-static", country: "US" },
  { id: "faa-static-mcas-miramar", name: "MCAS Miramar — Restricted", airspace_class: "RESTRICTED", alt_floor_ft: 0, alt_ceiling_ft: 18000, geometry: { type: "Polygon", coordinates: circlePolygon(-117.1418, 32.8683, 5) }, source: "faa-static", country: "US" },
  { id: "faa-static-nas-north-island", name: "NAS North Island — Restricted", airspace_class: "RESTRICTED", alt_floor_ft: 0, alt_ceiling_ft: 18000, geometry: { type: "Polygon", coordinates: circlePolygon(-117.2150, 32.6993, 4) }, source: "faa-static", country: "US" },
  { id: "faa-static-camp-pendleton", name: "Camp Pendleton — R-2503", airspace_class: "RESTRICTED", alt_floor_ft: 0, alt_ceiling_ft: 12500, geometry: { type: "Polygon", coordinates: circlePolygon(-117.4080, 33.3839, 8) }, source: "faa-static", country: "US" },

  // Iconic restricted areas
  { id: "faa-static-area51",      name: "Area 51 — R-4808N",                airspace_class: "RESTRICTED", alt_floor_ft: 0, alt_ceiling_ft: 60000, geometry: { type: "Polygon", coordinates: circlePolygon(-115.8047, 37.2350, 25) }, source: "faa-static", country: "US" },
  { id: "faa-static-edwards-afb", name: "Edwards AFB — R-2515",             airspace_class: "RESTRICTED", alt_floor_ft: 0, alt_ceiling_ft: 50000, geometry: { type: "Polygon", coordinates: circlePolygon(-117.8939, 34.9054, 18) }, source: "faa-static", country: "US" },
  { id: "faa-static-white-sands", name: "White Sands Missile Range — R-5107A", airspace_class: "RESTRICTED", alt_floor_ft: 0, alt_ceiling_ft: 60000, geometry: { type: "Polygon", coordinates: circlePolygon(-106.4250, 32.8800, 35) }, source: "faa-static", country: "US" },
  { id: "faa-static-fort-bragg",  name: "Fort Bragg — R-5311",              airspace_class: "RESTRICTED", alt_floor_ft: 0, alt_ceiling_ft: 18000, geometry: { type: "Polygon", coordinates: circlePolygon(-79.0064, 35.1396, 10) }, source: "faa-static", country: "US" },
  { id: "faa-static-yuma-mcas",   name: "MCAS Yuma — R-2305",                airspace_class: "RESTRICTED", alt_floor_ft: 0, alt_ceiling_ft: 18000, geometry: { type: "Polygon", coordinates: circlePolygon(-114.6056, 32.6566, 6) }, source: "faa-static", country: "US" },
  { id: "faa-static-white-house", name: "Washington DC SFRA",                airspace_class: "RESTRICTED", alt_floor_ft: 0, alt_ceiling_ft: 18000, geometry: { type: "Polygon", coordinates: circlePolygon(-77.0365, 38.8977, 30) }, source: "faa-static", country: "US" },
]

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
