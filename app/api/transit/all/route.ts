import { NextRequest, NextResponse } from "next/server"
import type { TransitVehicle } from "@/lib/transit/gtfs-realtime"
import { resolveInternalBaseUrl } from "@/lib/internal-base-url"

/**
 * Aggregate every connected transit agency into one GeoJSON FeatureCollection
 * so the CREP map layer can consume a single source of truth. Each agency is
 * fetched in parallel; a failing agency does not break the aggregate.
 *
 * GET /api/transit/all?bbox=w,s,e,n&agencies=mta,wmata,septa
 *   bbox     optional viewport filter (applied AFTER the per-agency fetch
 *            so we can cache per-agency and cull per request).
 *   agencies comma-separated subset; omit for all known agencies.
 *
 * Response:
 *   {
 *     type: "FeatureCollection",
 *     features: [{ type:"Feature", geometry:{type:"Point",coordinates:[lng,lat]},
 *                  properties:{ id, agency, agency_name, route_id, vehicle_type,
 *                               bearing, speed_mps, timestamp, ... } }, ...],
 *     agencies: [{ id, vehicles, ok }],
 *     vehicles_total, vehicles_in_bbox, generated_at, errors
 *   }
 */
export const runtime = "nodejs"
export const dynamic = "force-dynamic"

interface AgencyDef {
  id: string
  path: string // absolute path used for origin-fetch
  keyEnv?: string // env var required to include (skip if unset)
  region?: [number, number, number, number] // west,south,east,north
  national?: boolean
}

// Order matters for the map layer legend; earliest wins on dedupe by id.
const AGENCIES: AgencyDef[] = [
  { id: "mta", path: "/api/transit/mta", region: [-74.35, 40.45, -71.65, 41.25] },
  { id: "wmata", path: "/api/transit/wmata", keyEnv: "WMATA_API_KEY", region: [-77.65, 38.55, -76.65, 39.35] },
  { id: "bart", path: "/api/transit/bart", region: [-122.65, 37.45, -121.65, 38.15] },
  { id: "mbta", path: "/api/transit/mbta", region: [-71.45, 42.05, -70.65, 42.65] },
  { id: "511-bay", path: "/api/transit/511-bay", keyEnv: "TRANSIT_511_API_KEY", region: [-123.0, 36.8, -121.1, 38.6] },
  { id: "cta-train", path: "/api/transit/cta-train", keyEnv: "CTA_TRAIN_TRACKER_API_KEY", region: [-88.0, 41.55, -87.35, 42.15] },
  { id: "trimet", path: "/api/transit/trimet", keyEnv: "TRIMET_API_KEY", region: [-123.0, 45.25, -122.2, 45.75] },
  { id: "marta", path: "/api/transit/marta", keyEnv: "MARTA_API_KEY", region: [-84.75, 33.45, -84.05, 34.05] },
  { id: "amtrak", path: "/api/transit/amtrak", national: true, region: [-125, 24, -66, 50] },
  { id: "septa", path: "/api/transit/septa", region: [-75.75, 39.65, -74.75, 40.35] },
  { id: "metrolink", path: "/api/transit/metrolink", keyEnv: "METROLINK_API_KEY", region: [-118.95, 32.45, -116.5, 34.8] },
  { id: "dart", path: "/api/transit/dart", keyEnv: "DART_API_KEY", region: [-97.15, 32.45, -96.35, 33.25] },
]

function parseBbox(bbox: string | null): [number, number, number, number] | null {
  if (!bbox) return null
  const parts = bbox.split(",").map((part) => Number(part))
  if (parts.length !== 4 || parts.some((part) => !Number.isFinite(part))) return null
  return [parts[0], parts[1], parts[2], parts[3]]
}

function intersects(a: [number, number, number, number], b: [number, number, number, number]) {
  const [aw, as, ae, an] = a
  const [bw, bs, be, bn] = b
  return aw <= be && ae >= bw && as <= bn && an >= bs
}

function defsForViewport(bbox: string | null, explicitAgencyIds: string[]) {
  if (explicitAgencyIds.length) return AGENCIES.filter((a) => explicitAgencyIds.includes(a.id))
  const parsed = parseBbox(bbox)
  if (!parsed) return AGENCIES
  const regional = AGENCIES.filter((agency) => agency.region && intersects(parsed, agency.region))
  const national = AGENCIES.filter((agency) => agency.national && agency.region && intersects(parsed, agency.region))
  const scoped = [...regional, ...national.filter((agency) => !regional.some((r) => r.id === agency.id))]
  return scoped.length ? scoped : []
}

async function fetchAgency(internalBase: string, def: AgencyDef, bbox: string | null): Promise<{ id: string; vehicles: TransitVehicle[]; ok: boolean; err?: string }> {
  if (def.keyEnv && !process.env[def.keyEnv]?.trim()) {
    return { id: def.id, vehicles: [], ok: false, err: `${def.keyEnv} not configured` }
  }
  try {
    const url = `${internalBase}${def.path}${bbox ? `?bbox=${encodeURIComponent(bbox)}` : ""}`
    const r = await fetch(url, { signal: AbortSignal.timeout(2_500), cache: "no-store" })
    if (!r.ok) return { id: def.id, vehicles: [], ok: false, err: `upstream ${r.status}` }
    const j = await r.json()
    const vehicles: TransitVehicle[] = Array.isArray(j?.vehicles) ? j.vehicles : []
    return { id: def.id, vehicles, ok: true }
  } catch (err: any) {
    return { id: def.id, vehicles: [], ok: false, err: err?.message || "fetch failed" }
  }
}

export async function GET(req: NextRequest) {
  const bboxParam = req.nextUrl.searchParams.get("bbox")
  const agenciesParam = (req.nextUrl.searchParams.get("agencies") || "")
    .split(",").map((s) => s.trim().toLowerCase()).filter(Boolean)
  const defs = defsForViewport(bboxParam, agenciesParam)

  const internalBase = resolveInternalBaseUrl(new URL(req.url).origin)
  const results = await Promise.all(defs.map((d) => fetchAgency(internalBase, d, bboxParam)))

  // Dedupe by id across agencies (shouldn't overlap, but defensive)
  const seen = new Set<string>()
  const features: any[] = []
  let vehiclesTotal = 0
  const agencySummary: Array<{ id: string; vehicles: number; ok: boolean; err?: string }> = []

  for (const r of results) {
    agencySummary.push({ id: r.id, vehicles: r.vehicles.length, ok: r.ok, err: r.err })
    for (const v of r.vehicles) {
      if (seen.has(v.id)) continue
      seen.add(v.id)
      features.push({
        type: "Feature",
        geometry: { type: "Point", coordinates: [v.lng, v.lat] },
        properties: {
          id: v.id,
          agency: v.agency,
          agency_name: v.agency_name,
          route_id: v.route_id,
          route_short_name: v.route_short_name,
          trip_id: v.trip_id,
          vehicle_id: v.vehicle_id,
          bearing: v.bearing,
          speed_mps: v.speed_mps,
          timestamp: v.timestamp,
          vehicle_type: v.vehicle_type || "other",
          occupancy: v.occupancy,
          current_status: v.current_status,
          stop_id: v.stop_id,
        },
      })
      vehiclesTotal++
    }
  }

  const errors = agencySummary.filter((a) => !a.ok).map((a) => `${a.id}: ${a.err}`)
  return NextResponse.json({
    type: "FeatureCollection",
    features,
    agencies: agencySummary,
    vehicles_total: vehiclesTotal,
    vehicles_in_bbox: vehiclesTotal, // per-agency already culled by bbox
    generated_at: new Date().toISOString(),
    errors: errors.length ? errors : undefined,
  }, { headers: { "Cache-Control": "public, s-maxage=10, stale-while-revalidate=30" } })
}
