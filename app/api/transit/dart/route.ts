import { NextRequest, NextResponse } from "next/server"
import { fetchVehiclePositions, cullVehiclesToBbox } from "@/lib/transit/gtfs-realtime"

/**
 * DART (Dallas Area Rapid Transit) — GTFS-rt protobuf (open).
 * Covers bus + light rail (Red/Blue/Green/Orange) + TRE commuter rail.
 *
 * Feed URL — DART publishes via trackingmap.org aggregator (no key required);
 * the `?agency=DART` param filters to DART only.
 *
 * GET /api/transit/dart?bbox=w,s,e,n
 */
export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  const bbox = parseBbox(req.nextUrl.searchParams.get("bbox"))
  // Primary: DART's own GTFS-rt VP endpoint (OpenMobilityData mirror).
  const url = "https://www.dart.org/transitdata/gtfsrt/vehiclepositions.pb"
  const result = await fetchVehiclePositions(url, {
    agency: "o-9vfh-dart",
    agency_name: "DART",
    vehicleType: "bus",
  })
  const vehicles = cullVehiclesToBbox(result.vehicles, bbox)
  return NextResponse.json({
    ok: result.ok, agency: "DART", agency_onestop: "o-9vfh-dart",
    vehicles_total: result.vehicles.length, vehicles_in_bbox: vehicles.length,
    vehicles, generated_at: result.generated_at, error: result.error,
  }, { headers: { "Cache-Control": "public, s-maxage=15, stale-while-revalidate=45" } })
}

function parseBbox(s: string | null): [number, number, number, number] | null {
  if (!s) return null
  const parts = s.split(",").map(Number)
  return parts.length === 4 && parts.every(Number.isFinite) ? [parts[0], parts[1], parts[2], parts[3]] as [number, number, number, number] : null
}
