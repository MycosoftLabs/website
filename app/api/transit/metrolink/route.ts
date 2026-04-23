import { NextRequest, NextResponse } from "next/server"
import { fetchVehiclePositions, cullVehiclesToBbox } from "@/lib/transit/gtfs-realtime"

/**
 * Metrolink (LA Commuter Rail) — GTFS-rt protobuf.
 *
 * Apr 23, 2026 correction: Metrolink's VehiclePositions feed requires an
 * API key (registered at https://metrolinktrains.com/about/gtfs/gtfs-rt-access/).
 * Previously the code hit `metrolinktrains.com/advisories/gtfs/vehiclepositions.pb`
 * which returned 404. The right path is via SimplifyTransit's CDN once the
 * key is issued. Env var: METROLINK_API_KEY.
 * Alerts feed IS open at `https://cdn.simplifytransit.com/metrolink/alerts/service-alerts.pb`
 * but we only care about positions here.
 *
 * GET /api/transit/metrolink?bbox=w,s,e,n
 */
export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  const key = process.env.METROLINK_API_KEY?.trim()
  if (!key) return NextResponse.json({ ok: false, error: "METROLINK_API_KEY not configured" }, { status: 501 })
  const bbox = parseBbox(req.nextUrl.searchParams.get("bbox"))
  const url = `https://api.simplifytransit.com/metrolink/vehicles/vehicles.pb?key=${encodeURIComponent(key)}`
  const result = await fetchVehiclePositions(url, {
    agency: "o-9q5-metrolink",
    agency_name: "Metrolink",
    vehicleType: "rail",
  })
  const vehicles = cullVehiclesToBbox(result.vehicles, bbox)
  return NextResponse.json({
    ok: result.ok, agency: "Metrolink", agency_onestop: "o-9q5-metrolink",
    vehicles_total: result.vehicles.length, vehicles_in_bbox: vehicles.length,
    vehicles, generated_at: result.generated_at, error: result.error,
  }, { headers: { "Cache-Control": "public, s-maxage=15, stale-while-revalidate=45" } })
}

function parseBbox(s: string | null): [number, number, number, number] | null {
  if (!s) return null
  const parts = s.split(",").map(Number)
  return parts.length === 4 && parts.every(Number.isFinite) ? [parts[0], parts[1], parts[2], parts[3]] as [number, number, number, number] : null
}
