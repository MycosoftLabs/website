import { NextRequest, NextResponse } from "next/server"
import type { TransitVehicle } from "@/lib/transit/gtfs-realtime"

/**
 * TriMet (Portland) live vehicle positions.
 *
 * GET /api/transit/trimet?bbox=w,s,e,n
 *
 * TriMet exposes a JSON endpoint directly — no protobuf needed.
 */
export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  const key = process.env.TRIMET_API_KEY?.trim()
  if (!key) return NextResponse.json({ ok: false, error: "TRIMET_API_KEY not configured" }, { status: 501 })

  const bbox = parseBbox(req.nextUrl.searchParams.get("bbox"))
  try {
    const url = `https://developer.trimet.org/ws/v2/vehicles?appID=${encodeURIComponent(key)}`
    const r = await fetch(url, { signal: AbortSignal.timeout(10_000), cache: "no-store" })
    if (!r.ok) return NextResponse.json({ ok: false, error: `upstream ${r.status}` }, { status: 502 })
    const j = await r.json()
    const items: any[] = j?.resultSet?.vehicle || []
    const vehicles: TransitVehicle[] = items
      .filter((v) => Number.isFinite(Number(v.latitude)) && Number.isFinite(Number(v.longitude)))
      .map((v) => ({
        id: `trimet:${v.vehicleID}`,
        agency: "o-c20-trimet",
        agency_name: "TriMet",
        route_id: v.signMessage ? String(v.routeNumber || "") : String(v.routeNumber || ""),
        route_short_name: v.signMessage,
        vehicle_id: String(v.vehicleID),
        lat: Number(v.latitude),
        lng: Number(v.longitude),
        bearing: Number.isFinite(Number(v.bearing)) ? Number(v.bearing) : undefined,
        speed_mps: Number.isFinite(Number(v.speed)) ? Number(v.speed) * 0.44704 : undefined, // mph→m/s
        timestamp: v.time ? Number(v.time) : Date.now(),
        vehicle_type: v.type === "rail" ? "rail" : "bus",
      }))
    const filtered = bbox
      ? vehicles.filter((v) => v.lng >= bbox[0] && v.lng <= bbox[2] && v.lat >= bbox[1] && v.lat <= bbox[3])
      : vehicles
    return NextResponse.json({
      ok: true, agency: "TriMet", agency_onestop: "o-c20-trimet",
      vehicles_total: vehicles.length, vehicles_in_bbox: filtered.length,
      vehicles: filtered, generated_at: new Date().toISOString(),
    }, { headers: { "Cache-Control": "public, s-maxage=10, stale-while-revalidate=30" } })
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || "fetch failed" }, { status: 502 })
  }
}

function parseBbox(s: string | null): [number, number, number, number] | null {
  if (!s) return null
  const parts = s.split(",").map(Number)
  return parts.length === 4 && parts.every(Number.isFinite) ? [parts[0], parts[1], parts[2], parts[3]] as [number, number, number, number] : null
}
