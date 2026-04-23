import { NextRequest, NextResponse } from "next/server"
import { fetchVehiclePositions, cullVehiclesToBbox } from "@/lib/transit/gtfs-realtime"

/**
 * MARTA (Atlanta) live vehicle positions. GTFS-rt protobuf.
 *
 * GET /api/transit/marta?bbox=w,s,e,n
 *
 * Requires MARTA_API_KEY (no unauthenticated path in production).
 */
export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const MARTA_VP = "https://gtfs-rt.itsmarta.com/TMGTFSRealTimeWebService/vehicle/vehiclepositions.pb"

export async function GET(req: NextRequest) {
  const key = process.env.MARTA_API_KEY?.trim()
  if (!key) {
    return NextResponse.json(
      { ok: false, error: "MARTA_API_KEY not configured" },
      { status: 501 },
    )
  }
  const url = `${MARTA_VP}?apiKey=${encodeURIComponent(key)}`
  const bbox = parseBbox(req.nextUrl.searchParams.get("bbox"))
  const result = await fetchVehiclePositions(url, {
    agency: "o-dn5-marta",
    agency_name: "MARTA",
  })
  const vehicles = cullVehiclesToBbox(result.vehicles, bbox)
  return NextResponse.json({
    ok: result.ok, agency: "MARTA", agency_onestop: "o-dn5-marta",
    vehicles_total: result.vehicles.length, vehicles_in_bbox: vehicles.length,
    vehicles, generated_at: result.generated_at, error: result.error,
  }, { headers: { "Cache-Control": "public, s-maxage=10, stale-while-revalidate=30" } })
}

function parseBbox(s: string | null): [number, number, number, number] | null {
  if (!s) return null
  const parts = s.split(",").map(Number)
  return parts.length === 4 && parts.every(Number.isFinite) ? [parts[0], parts[1], parts[2], parts[3]] as [number, number, number, number] : null
}
