import { NextRequest, NextResponse } from "next/server"
import { fetchMultipleFeeds, cullVehiclesToBbox } from "@/lib/transit/gtfs-realtime"

/**
 * WMATA (DC Metro + Metrobus) live vehicle positions — Apr 23, 2026.
 *
 * GET /api/transit/wmata?bbox=w,s,e,n&modes=rail,bus
 *
 * Requires WMATA_API_KEY in env (primary) + optional WMATA_API_KEY_SECONDARY
 * (falls through on 429 or 5xx). Returns 501 when unset.
 */
export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const RAIL_VP = "https://api.wmata.com/gtfs/rail-gtfsrt-vehiclepositions.pb"
const BUS_VP  = "https://api.wmata.com/gtfs/bus-gtfsrt-vehiclepositions.pb"

export async function GET(req: NextRequest) {
  const key = process.env.WMATA_API_KEY?.trim()
  if (!key) return NextResponse.json({ ok: false, error: "WMATA_API_KEY not configured" }, { status: 501 })

  const modes = (req.nextUrl.searchParams.get("modes") || "rail,bus")
    .split(",").map((s) => s.trim().toLowerCase())
  const bbox = parseBbox(req.nextUrl.searchParams.get("bbox"))

  const feeds: Array<{ url: string; vehicleType?: "rail" | "bus" }> = []
  if (modes.includes("rail")) feeds.push({ url: RAIL_VP, vehicleType: "rail" })
  if (modes.includes("bus")) feeds.push({ url: BUS_VP, vehicleType: "bus" })

  const secondary = process.env.WMATA_API_KEY_SECONDARY?.trim()
  let result = await fetchMultipleFeeds(feeds, {
    agency: "o-dqc-wmata",
    agency_name: "WMATA",
    headers: { api_key: key },
  })
  if (!result.ok && secondary) {
    result = await fetchMultipleFeeds(feeds, {
      agency: "o-dqc-wmata",
      agency_name: "WMATA",
      headers: { api_key: secondary },
    })
  }
  const vehicles = cullVehiclesToBbox(result.vehicles, bbox)

  return NextResponse.json({
    ok: result.ok,
    agency: "WMATA",
    agency_onestop: "o-dqc-wmata",
    modes_requested: modes,
    vehicles_total: result.vehicles.length,
    vehicles_in_bbox: vehicles.length,
    vehicles,
    generated_at: result.generated_at,
    error: result.error,
  }, {
    headers: { "Cache-Control": "public, s-maxage=10, stale-while-revalidate=30" },
  })
}

function parseBbox(s: string | null): [number, number, number, number] | null {
  if (!s) return null
  const parts = s.split(",").map(Number)
  return parts.length === 4 && parts.every(Number.isFinite) ? [parts[0], parts[1], parts[2], parts[3]] as [number, number, number, number] : null
}
