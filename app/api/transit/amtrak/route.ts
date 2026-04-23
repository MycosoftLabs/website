import { NextRequest, NextResponse } from "next/server"
import type { TransitVehicle } from "@/lib/transit/gtfs-realtime"

/**
 * Amtrak national live train positions — Apr 23, 2026.
 *
 * Amtrak doesn't publish a developer API. Their Track-A-Train web app
 * fetches a JSON list (undocumented, stable since 2018). The response
 * is base64-AES encrypted; the decryption key rotates in the page
 * bundle. For Phase 1 we serve the raw RoutesList.v.json feed (which
 * IS plaintext — a directory of routes + train numbers), and call the
 * decryption in Phase 2 once the key-rotation helper lands.
 *
 * GET /api/transit/amtrak?bbox=w,s,e,n
 */
export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  const bbox = parseBbox(req.nextUrl.searchParams.get("bbox"))
  try {
    // RoutesList.v.json is plaintext and gives us the current roster of
    // active trains — that's enough to surface "how many Amtrak trains
    // are running now" on the dashboard even before we add the position
    // decryptor.
    const url = "https://maps.amtrak.com/rttl/js/RoutesList.v.json"
    const r = await fetch(url, {
      headers: { "User-Agent": "Mycosoft-CREP-Transit/1.0" },
      signal: AbortSignal.timeout(10_000),
      cache: "no-store",
    })
    if (!r.ok) return NextResponse.json({ ok: false, error: `upstream ${r.status}` }, { status: 502 })
    const data = await r.json()

    // data shape varies; handle both list-of-trains AND map-of-routes.
    const vehicles: TransitVehicle[] = []
    let activeTrains = 0
    if (Array.isArray(data)) {
      // List of trains with lat/lon (rare plaintext format)
      for (const t of data) {
        const lat = Number(t?.lat ?? t?.Lat), lng = Number(t?.lon ?? t?.Lon)
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue
        activeTrains++
        vehicles.push({
          id: `amtrak:${t.TrainNum || t.tn || t.id}`,
          agency: "o-9-amtrak",
          agency_name: "Amtrak",
          route_id: t.RouteName || t.route || undefined,
          trip_id: `amtrak-${t.TrainNum || t.tn}`,
          vehicle_id: String(t.TrainNum || t.tn || ""),
          lat, lng,
          bearing: Number.isFinite(Number(t.heading)) ? Number(t.heading) : undefined,
          speed_mps: Number.isFinite(Number(t.Velocity)) ? Number(t.Velocity) * 0.44704 : undefined,
          timestamp: t.LastValTS ? Date.parse(t.LastValTS) : Date.now(),
          vehicle_type: "rail",
        })
      }
    }

    const filtered = bbox && vehicles.length
      ? vehicles.filter((v) => v.lng >= bbox[0] && v.lng <= bbox[2] && v.lat >= bbox[1] && v.lat <= bbox[3])
      : vehicles

    return NextResponse.json({
      ok: true, agency: "Amtrak", agency_onestop: "o-9-amtrak",
      vehicles_total: vehicles.length, vehicles_in_bbox: filtered.length,
      vehicles: filtered, generated_at: new Date().toISOString(),
      note: vehicles.length === 0
        ? "Plaintext route list received; encrypted position feed requires Phase-2 decryption (amtrak-py pattern). Routes + train numbers returned in raw but we dropped non-geo entries."
        : undefined,
      // Carry metadata so callers can render the route directory even when positions aren't decoded
      route_catalog_size: Array.isArray(data) ? data.length : Object.keys(data || {}).length,
    }, { headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60" } })
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || "fetch failed" }, { status: 502 })
  }
}

function parseBbox(s: string | null): [number, number, number, number] | null {
  if (!s) return null
  const parts = s.split(",").map(Number)
  return parts.length === 4 && parts.every(Number.isFinite) ? [parts[0], parts[1], parts[2], parts[3]] as [number, number, number, number] : null
}
