import { NextRequest, NextResponse } from "next/server"
import type { TransitVehicle } from "@/lib/transit/gtfs-realtime"

/**
 * CTA — Chicago "L" train tracker.
 *
 * CTA exposes a JSON "ttpositions" endpoint — one request per line.
 * We pull all 8 lines in parallel, normalize to TransitVehicle.
 *
 * GET /api/transit/cta-train?bbox=w,s,e,n&routes=red,blue,brn
 *   routes (default = all): red, blue, brn (Brown), g (Green),
 *                           org (Orange), p (Purple), pink, y (Yellow)
 */
export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const LINES = ["red", "blue", "brn", "g", "org", "p", "pink", "y"] as const

export async function GET(req: NextRequest) {
  const key = process.env.CTA_TRAIN_TRACKER_API_KEY?.trim()
  if (!key) return NextResponse.json({ ok: false, error: "CTA_TRAIN_TRACKER_API_KEY not configured" }, { status: 501 })

  const routesParam = (req.nextUrl.searchParams.get("routes") || "")
    .split(",").map((s) => s.trim().toLowerCase()).filter(Boolean)
  const routes = routesParam.length ? routesParam.filter((r) => (LINES as readonly string[]).includes(r)) : LINES
  const bbox = parseBbox(req.nextUrl.searchParams.get("bbox"))

  const fetches = await Promise.all(
    routes.map(async (rt) => {
      try {
        const url = `http://lapi.transitchicago.com/api/1.0/ttpositions.aspx?key=${encodeURIComponent(key)}&rt=${encodeURIComponent(rt)}&outputType=JSON`
        const r = await fetch(url, { signal: AbortSignal.timeout(8_000), cache: "no-store" })
        if (!r.ok) return { route: rt, trains: [] as any[] }
        const j = await r.json()
        const trains: any[] = j?.ctatt?.route?.[0]?.train || []
        return { route: rt, trains }
      } catch { return { route: rt, trains: [] as any[] } }
    })
  )

  const vehicles: TransitVehicle[] = []
  for (const { route, trains } of fetches) {
    for (const t of trains) {
      const lat = Number(t.lat), lng = Number(t.lon)
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue
      vehicles.push({
        id: `cta:${t.rn || `${route}-${t.nextStaId || ""}-${t.arrT || ""}`}`,
        agency: "o-dp3-cta",
        agency_name: "CTA",
        route_id: route.toUpperCase(),
        trip_id: t.destNm ? `cta-${route}-${t.destNm}` : undefined,
        vehicle_id: t.rn ? String(t.rn) : undefined,
        lat, lng,
        bearing: typeof t.heading === "number" ? Number(t.heading) : undefined,
        timestamp: Date.now(),
        vehicle_type: "subway",
        current_status: t.isApp === "1" ? "INCOMING_AT" : "IN_TRANSIT_TO",
        stop_id: t.nextStaId ? String(t.nextStaId) : undefined,
      })
    }
  }

  const filtered = bbox
    ? vehicles.filter((v) => v.lng >= bbox[0] && v.lng <= bbox[2] && v.lat >= bbox[1] && v.lat <= bbox[3])
    : vehicles

  return NextResponse.json({
    ok: true,
    agency: "CTA Train",
    agency_onestop: "o-dp3-cta",
    routes_requested: routes,
    vehicles_total: vehicles.length,
    vehicles_in_bbox: filtered.length,
    vehicles: filtered,
    generated_at: new Date().toISOString(),
  }, { headers: { "Cache-Control": "public, s-maxage=10, stale-while-revalidate=30" } })
}

function parseBbox(s: string | null): [number, number, number, number] | null {
  if (!s) return null
  const parts = s.split(",").map(Number)
  return parts.length === 4 && parts.every(Number.isFinite) ? [parts[0], parts[1], parts[2], parts[3]] as [number, number, number, number] : null
}
