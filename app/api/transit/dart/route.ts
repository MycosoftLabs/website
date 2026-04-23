import { NextRequest, NextResponse } from "next/server"
import { fetchVehiclePositions, cullVehiclesToBbox } from "@/lib/transit/gtfs-realtime"

/**
 * DART (Dallas Area Rapid Transit) — GTFS-rt protobuf.
 *
 * Apr 23, 2026 correction: DART moved its realtime feeds behind an Azure API
 * Management gateway (https://dart.developer.azure-api.net/). The older
 * `www.dart.org/transitdata/gtfsrt/vehiclepositions.pb` path returns 404.
 * Subscription key required via header `Ocp-Apim-Subscription-Key` → env
 * var DART_API_KEY.
 *
 * GET /api/transit/dart?bbox=w,s,e,n
 */
export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  const key = process.env.DART_API_KEY?.trim()
  if (!key) return NextResponse.json({ ok: false, error: "DART_API_KEY not configured" }, { status: 501 })
  const bbox = parseBbox(req.nextUrl.searchParams.get("bbox"))
  const url = "https://dartgtfsrealtime.azure-api.net/vehiclepositions.pb"
  const result = await fetchVehiclePositions(url, {
    agency: "o-9vfh-dart",
    agency_name: "DART",
    vehicleType: "bus",
    headers: { "Ocp-Apim-Subscription-Key": key },
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
