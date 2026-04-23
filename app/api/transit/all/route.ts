import { NextRequest, NextResponse } from "next/server"
import type { TransitVehicle } from "@/lib/transit/gtfs-realtime"

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
}

// Order matters for the map layer legend; earliest wins on dedupe by id.
const AGENCIES: AgencyDef[] = [
  { id: "mta", path: "/api/transit/mta" },
  { id: "wmata", path: "/api/transit/wmata", keyEnv: "WMATA_API_KEY" },
  { id: "bart", path: "/api/transit/bart" },
  { id: "mbta", path: "/api/transit/mbta" },
  { id: "511-bay", path: "/api/transit/511-bay", keyEnv: "TRANSIT_511_API_KEY" },
  { id: "cta-train", path: "/api/transit/cta-train", keyEnv: "CTA_TRAIN_TRACKER_API_KEY" },
  { id: "trimet", path: "/api/transit/trimet", keyEnv: "TRIMET_API_KEY" },
  { id: "marta", path: "/api/transit/marta", keyEnv: "MARTA_API_KEY" },
  { id: "amtrak", path: "/api/transit/amtrak" },
  { id: "septa", path: "/api/transit/septa" },
  { id: "metrolink", path: "/api/transit/metrolink" },
  { id: "dart", path: "/api/transit/dart" },
]

/**
 * Resolve the internal base URL for the aggregator's per-agency fetches.
 *
 * Apr 23, 2026 — Morgan verification found the aggregator returning 0 vehicles
 * on prod even though the direct endpoints were live: `/api/transit/mta`
 * returned 278 vehicles while `/api/transit/all` returned `fetch failed` for
 * every agency. Root cause: `new URL(req.url).origin` on prod resolves to
 * `https://mycosoft.com`, and the Next.js container fetching its own public
 * origin bounces off Cloudflare (origin-self-fetch loop / SSL handshake
 * failure / 502). Solution: always target the container's own localhost:PORT
 * when we're already inside the server, which is how Docker health checks
 * reach the app in the same container.
 */
function resolveInternalBase(reqOrigin: string): string {
  const explicit = process.env.INTERNAL_SELF_URL?.trim()
  if (explicit) return explicit
  if (typeof window === "undefined") {
    const port = process.env.PORT || "3000"
    return `http://localhost:${port}`
  }
  return reqOrigin
}

async function fetchAgency(internalBase: string, def: AgencyDef, bbox: string | null): Promise<{ id: string; vehicles: TransitVehicle[]; ok: boolean; err?: string }> {
  if (def.keyEnv && !process.env[def.keyEnv]?.trim()) {
    return { id: def.id, vehicles: [], ok: false, err: `${def.keyEnv} not configured` }
  }
  try {
    const url = `${internalBase}${def.path}${bbox ? `?bbox=${encodeURIComponent(bbox)}` : ""}`
    const r = await fetch(url, { signal: AbortSignal.timeout(12_000), cache: "no-store" })
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
  const defs = agenciesParam.length
    ? AGENCIES.filter((a) => agenciesParam.includes(a.id))
    : AGENCIES

  const internalBase = resolveInternalBase(new URL(req.url).origin)
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
