import { NextRequest, NextResponse } from "next/server"
import { fetchVehiclePositions, cullVehiclesToBbox } from "@/lib/transit/gtfs-realtime"

/**
 * MBTA (Boston) live vehicle positions — Apr 23, 2026
 *
 * MBTA exposes GTFS-rt protobuf openly on cdn.mbta.com (no key needed
 * for .pb feeds — the key only raises rate limits on the REST layer).
 * We use the open .pb endpoint directly for vehicle positions.
 *
 * GET /api/transit/mbta?bbox=w,s,e,n
 */
export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const VP_FEED = "https://cdn.mbta.com/realtime/VehiclePositions.pb"

export async function GET(req: NextRequest) {
  const bbox = parseBbox(req.nextUrl.searchParams.get("bbox"))
  // Pass the key as x-api-key if available — raises our rate limit on
  // the v3 REST layer (harmless on the .pb endpoint).
  const headers: Record<string, string> = {}
  const key = process.env.MBTA_API_KEY?.trim()
  if (key) headers["x-api-key"] = key

  const result = await fetchVehiclePositions(VP_FEED, {
    agency: "o-drt-mbta",
    agency_name: "MBTA",
    headers,
  })
  const vehicles = cullVehiclesToBbox(result.vehicles, bbox)

  return NextResponse.json({
    ok: result.ok,
    agency: "MBTA",
    agency_onestop: "o-drt-mbta",
    vehicles_total: result.vehicles.length,
    vehicles_in_bbox: vehicles.length,
    vehicles,
    generated_at: result.generated_at,
    error: result.error,
  }, { headers: { "Cache-Control": "public, s-maxage=10, stale-while-revalidate=30" } })
}

function parseBbox(s: string | null): [number, number, number, number] | null {
  if (!s) return null
  const parts = s.split(",").map(Number)
  return parts.length === 4 && parts.every(Number.isFinite) ? [parts[0], parts[1], parts[2], parts[3]] as [number, number, number, number] : null
}
