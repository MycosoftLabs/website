import { NextRequest, NextResponse } from "next/server"
import type { TransitVehicle } from "@/lib/transit/gtfs-realtime"
import { cullVehiclesToBbox } from "@/lib/transit/gtfs-realtime"

/**
 * CTA — Chicago Bus Tracker (Bustime v2 getvehicles).
 *
 * GET /api/transit/cta-bus?bbox=w,s,e,n&rt=22,36,4
 *   rt — comma-separated route numbers (default: broad coverage set below).
 *
 * Requires CTA_BUS_TRACKER_API_KEY (separate from train key).
 * Portal: https://www.transitchicago.com/developers/bustracker/
 */
export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const BUSTIME_GETVEHICLES =
  "https://ctabustracker.com/bustime/api/v2/getvehicles"

/** Default CTA bus routes (numeric ids) for map density when `rt` omitted. */
const DEFAULT_BUS_RT =
  "1,2,3,4,5,6,7,8,9,10,11,20,22,24,26,28,29,32,35,36,38,55,60,80"

function parseBustimeTimestamp(s: string | undefined): number {
  if (!s) return Date.now()
  // e.g. "20260423 12:00:00" or epoch-like from API
  const cleaned = s.trim()
  if (/^\d{8} \d{2}:\d{2}:\d{2}$/.test(cleaned)) {
    const y = Number(cleaned.slice(0, 4))
    const mo = Number(cleaned.slice(4, 6)) - 1
    const d = Number(cleaned.slice(6, 8))
    const t = cleaned.slice(9)
    const [hh, mm, ss] = t.split(":").map(Number)
    return new Date(y, mo, d, hh, mm, ss).getTime() || Date.now()
  }
  const n = Number(cleaned)
  return Number.isFinite(n) ? n * 1000 : Date.now()
}

export async function GET(req: NextRequest) {
  const key = process.env.CTA_BUS_TRACKER_API_KEY?.trim()
  if (!key) {
    return NextResponse.json(
      { ok: false, error: "CTA_BUS_TRACKER_API_KEY not configured" },
      { status: 501 },
    )
  }

  const rtParam = (req.nextUrl.searchParams.get("rt") || DEFAULT_BUS_RT)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .join(",")
  const bbox = parseBbox(req.nextUrl.searchParams.get("bbox"))

  const url = new URL(BUSTIME_GETVEHICLES)
  url.searchParams.set("key", key)
  url.searchParams.set("rt", rtParam)
  url.searchParams.set("format", "json")

  let data: { "bustime-response"?: { vehicle?: any[]; error?: { msg?: string } } }
  try {
    const r = await fetch(url.toString(), {
      signal: AbortSignal.timeout(12_000),
      cache: "no-store",
      headers: { "User-Agent": "Mycosoft-CREP-Transit/1.0" },
    })
    if (!r.ok) {
      return NextResponse.json(
        { ok: false, error: `upstream ${r.status}` },
        { status: 502 },
      )
    }
    data = (await r.json()) as typeof data
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "bustime fetch failed" },
      { status: 502 },
    )
  }

  const br = data["bustime-response"]
  const err = br?.error
  if (err?.msg) {
    return NextResponse.json(
      { ok: false, error: err.msg, agency: "CTA Bus" },
      { status: 502 },
    )
  }

  const raw = br?.vehicle
  const list = Array.isArray(raw) ? raw : raw ? [raw] : []
  const vehicles: TransitVehicle[] = []
  for (const v of list) {
    const lat = Number(v.lat)
    const lng = Number(v.lon)
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue
    const vid = v.vid != null ? String(v.vid) : "?"
    vehicles.push({
      id: `cta-bus:${vid}`,
      agency: "o-dp3-cta",
      agency_name: "CTA",
      route_id: v.rt != null ? String(v.rt) : undefined,
      vehicle_id: vid,
      lat,
      lng,
      bearing: v.hdg != null ? Number(v.hdg) : undefined,
      timestamp: parseBustimeTimestamp(
        typeof v.tmstmp === "string" ? v.tmstmp : undefined,
      ),
      current_status: v.dly === "1" ? "DELAYED" : "IN_TRANSIT_TO",
      vehicle_type: "bus",
    })
  }

  const inBbox = cullVehiclesToBbox(vehicles, bbox)
  return NextResponse.json(
    {
      ok: true,
      agency: "CTA Bus",
      agency_onestop: "o-dp3-cta",
      routes_requested: rtParam,
      vehicles_total: vehicles.length,
      vehicles_in_bbox: inBbox.length,
      vehicles: inBbox,
      generated_at: new Date().toISOString(),
    },
    { headers: { "Cache-Control": "public, s-maxage=10, stale-while-revalidate=30" } },
  )
}

function parseBbox(s: string | null): [number, number, number, number] | null {
  if (!s) return null
  const parts = s.split(",").map(Number)
  return parts.length === 4 && parts.every(Number.isFinite)
    ? ([parts[0], parts[1], parts[2], parts[3]] as [number, number, number, number])
    : null
}
