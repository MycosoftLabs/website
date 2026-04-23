import { NextRequest, NextResponse } from "next/server"
import type { TransitVehicle } from "@/lib/transit/gtfs-realtime"

/**
 * SEPTA (Philadelphia) — bus + trolley + Regional Rail + Broad/Market-Frankford.
 *
 * SEPTA exposes a JSON bus/trolley tracker at septa.org (no key). Trains have
 * a separate `TrainView` JSON. We aggregate both here.
 *
 * GET /api/transit/septa?bbox=w,s,e,n&modes=bus,rail
 */
export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  const bbox = parseBbox(req.nextUrl.searchParams.get("bbox"))
  const modesParam = (req.nextUrl.searchParams.get("modes") || "bus,rail")
    .split(",").map((s) => s.trim().toLowerCase()).filter(Boolean)
  const wantBus = modesParam.includes("bus")
  const wantRail = modesParam.includes("rail")

  const [bus, rail] = await Promise.all([
    wantBus ? fetchBusTrolley() : Promise.resolve([] as TransitVehicle[]),
    wantRail ? fetchTrainView() : Promise.resolve([] as TransitVehicle[]),
  ])

  const vehicles = [...bus, ...rail]
  const filtered = bbox
    ? vehicles.filter((v) => v.lng >= bbox[0] && v.lng <= bbox[2] && v.lat >= bbox[1] && v.lat <= bbox[3])
    : vehicles

  return NextResponse.json({
    ok: true, agency: "SEPTA", agency_onestop: "o-dr4e-septa",
    modes_requested: modesParam,
    vehicles_total: vehicles.length, vehicles_in_bbox: filtered.length,
    vehicles: filtered, generated_at: new Date().toISOString(),
  }, { headers: { "Cache-Control": "public, s-maxage=15, stale-while-revalidate=45" } })
}

async function fetchBusTrolley(): Promise<TransitVehicle[]> {
  try {
    // SEPTA's TransitView returns all bus/trolley positions
    const url = "https://www3.septa.org/api/TransitViewAll/index.php"
    const r = await fetch(url, { signal: AbortSignal.timeout(10_000), cache: "no-store" })
    if (!r.ok) return []
    const j = await r.json()
    // Shape: { "routes": [ { "<route>": [ {...vehicle...}, ... ] } ] }
    const out: TransitVehicle[] = []
    const routes: any[] = Array.isArray(j?.routes) ? j.routes : []
    for (const routeWrap of routes) {
      for (const [routeId, vehicles] of Object.entries(routeWrap)) {
        if (!Array.isArray(vehicles)) continue
        for (const v of vehicles as any[]) {
          const lat = Number(v.lat), lng = Number(v.lng)
          if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue
          out.push({
            id: `septa-bus:${v.VehicleID}`,
            agency: "o-dr4e-septa",
            agency_name: "SEPTA",
            route_id: String(routeId),
            route_short_name: String(routeId),
            trip_id: v.trip ? String(v.trip) : undefined,
            vehicle_id: String(v.VehicleID),
            lat, lng,
            bearing: Number.isFinite(Number(v.heading)) ? Number(v.heading) : undefined,
            timestamp: v.Offset_sec ? Date.now() - Number(v.Offset_sec) * 1000 : Date.now(),
            vehicle_type: v.mode === "Trolley" ? "tram" : "bus",
          })
        }
      }
    }
    return out
  } catch { return [] }
}

async function fetchTrainView(): Promise<TransitVehicle[]> {
  try {
    // Regional Rail + MFL + BSL live train positions
    const url = "https://www3.septa.org/api/TrainView/index.php"
    const r = await fetch(url, { signal: AbortSignal.timeout(10_000), cache: "no-store" })
    if (!r.ok) return []
    const j = await r.json()
    // Shape: [ { "lat":..., "lon":..., "trainno":..., "service":..., "nextstop":..., "line":... }, ... ]
    const arr: any[] = Array.isArray(j) ? j : []
    return arr.map((t) => {
      const lat = Number(t.lat), lng = Number(t.lon)
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
      return {
        id: `septa-rail:${t.trainno}`,
        agency: "o-dr4e-septa",
        agency_name: "SEPTA",
        route_id: t.line || undefined,
        route_short_name: t.line || undefined,
        trip_id: `septa-${t.trainno}`,
        vehicle_id: String(t.trainno),
        lat, lng,
        bearing: Number.isFinite(Number(t.heading)) ? Number(t.heading) : undefined,
        timestamp: Date.now(),
        vehicle_type: "rail" as const,
        stop_id: t.nextstop ? String(t.nextstop) : undefined,
      } as TransitVehicle
    }).filter((v): v is TransitVehicle => v !== null)
  } catch { return [] }
}

function parseBbox(s: string | null): [number, number, number, number] | null {
  if (!s) return null
  const parts = s.split(",").map(Number)
  return parts.length === 4 && parts.every(Number.isFinite) ? [parts[0], parts[1], parts[2], parts[3]] as [number, number, number, number] : null
}
