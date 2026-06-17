import { NextRequest, NextResponse } from "next/server"

/**
 * Ocean — NOAA ENC maintained navigation channels + fairways — Jun 15 2026
 *
 * Authoritative SD-Bay (and any bbox) channel geometry for the Earth Simulator
 * "Ocean & Coastal" layer — the "channels in the water" Morgan asked for. Proxies
 * NOAA's ENC MarineTransportation ArcGIS service (Layer 1 = Coastal Maintained
 * Channels; Layer 0 = Shipping Lanes, often empty for a small bbox) and returns
 * ready-to-render WGS84 GeoJSON polygons with maintained depth (DRVAL1). No key,
 * updated weekly upstream. Tier-A (direct frontend proxy; no MAS/MINDEX).
 *
 *   GET /api/crep/ocean/channels?bbox=west,south,east,north[&layer=1]
 *   default bbox = San Diego Bay.
 */

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const ENC_BASE =
  "https://encdirect.noaa.gov/arcgis/rest/services/NavigationChartData/MarineTransportation/MapServer"

// SD Bay default (west,south,east,north)
const DEFAULT_BBOX: [number, number, number, number] = [-117.27, 32.58, -117.08, 32.76]

function parseBbox(s: string | null): [number, number, number, number] {
  if (!s) return DEFAULT_BBOX
  const p = s.split(",").map(Number)
  if (p.length === 4 && p.every(Number.isFinite)) return p as [number, number, number, number]
  return DEFAULT_BBOX
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const [west, south, east, north] = parseBbox(url.searchParams.get("bbox"))
  const layer = url.searchParams.get("layer") || "1" // 1 = maintained channels

  const qp = new URLSearchParams({
    where: "1=1",
    geometry: `${west},${south},${east},${north}`,
    geometryType: "esriGeometryEnvelope",
    inSR: "4326",
    outSR: "4326",
    spatialRel: "esriSpatialRelIntersects",
    outFields: "*",
    returnGeometry: "true",
    f: "geojson",
  })
  const target = `${ENC_BASE}/${encodeURIComponent(layer)}/query?${qp}`

  try {
    const res = await fetch(target, {
      headers: { Accept: "application/geo+json,application/json", "User-Agent": "MycosoftCREP/1.0" },
      signal: AbortSignal.timeout(12_000),
      cache: "no-store",
    })
    if (!res.ok) {
      return NextResponse.json(
        { type: "FeatureCollection", features: [], error: `ENC ${res.status}`, source: "noaa-enc" },
        { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=3600" } },
      )
    }
    const fc = await res.json()
    const features = Array.isArray(fc?.features) ? fc.features : []
    return NextResponse.json(
      {
        type: "FeatureCollection",
        source: "noaa-enc-marine-transportation",
        layer,
        bbox: [west, south, east, north],
        count: features.length,
        features,
      },
      // Channels change weekly upstream — cache aggressively at the edge.
      { headers: { "Cache-Control": "public, s-maxage=21600, stale-while-revalidate=86400" } },
    )
  } catch (err: any) {
    return NextResponse.json(
      { type: "FeatureCollection", features: [], error: err?.message || "fetch failed", source: "noaa-enc" },
      { status: 200, headers: { "Cache-Control": "public, s-maxage=120" } },
    )
  }
}
