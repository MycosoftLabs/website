import { NextRequest, NextResponse } from "next/server"
import { fetchMultipleFeeds, cullVehiclesToBbox } from "@/lib/transit/gtfs-realtime"

/**
 * MTA live vehicle positions — Apr 23, 2026
 *
 * Covers NYC subway (all 8 line groups), LIRR, Metro-North, and bus.
 * No API key required — MTA opened the gate in 2023.
 *
 * GET /api/transit/mta?bbox=-74.05,40.70,-73.90,40.90&modes=subway,bus
 *
 * modes (comma-separated, default = all):
 *   subway  8 NYCT subway feeds (ACE, BDFM, G, JZ, NQRW, L, 1234567, SI)
 *   lirr    Long Island Rail Road
 *   mnr     Metro-North
 *   bus     OBA NYCT Bus (all 5 boroughs via gtfsrt.prod.obanyc.com)
 */
export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const SUBWAY_FEEDS = [
  "https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs-ace",
  "https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs-bdfm",
  "https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs-g",
  "https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs-jz",
  "https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs-nqrw",
  "https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs-l",
  "https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs",        // 1-7
  "https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs-si",      // Staten Island
]
const LIRR_FEED = "https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/lirr%2Fgtfs-lirr"
const MNR_FEED = "https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/mnr%2Fgtfs-mnr"
const BUS_FEED = "http://gtfsrt.prod.obanyc.com/vehiclePositions"

export async function GET(req: NextRequest) {
  const modes = (req.nextUrl.searchParams.get("modes") || "subway,lirr,mnr,bus")
    .split(",").map((s) => s.trim().toLowerCase())
  const bbox = parseBbox(req.nextUrl.searchParams.get("bbox"))

  const feeds: Array<{ url: string; vehicleType?: "subway" | "rail" | "bus" }> = []
  if (modes.includes("subway")) {
    for (const url of SUBWAY_FEEDS) feeds.push({ url, vehicleType: "subway" })
  }
  if (modes.includes("lirr")) feeds.push({ url: LIRR_FEED, vehicleType: "rail" })
  if (modes.includes("mnr")) feeds.push({ url: MNR_FEED, vehicleType: "rail" })
  if (modes.includes("bus")) feeds.push({ url: BUS_FEED, vehicleType: "bus" })

  const result = await fetchMultipleFeeds(feeds, {
    agency: "o-dr5r-mta",
    agency_name: "MTA",
  })
  const vehicles = cullVehiclesToBbox(result.vehicles, bbox)

  return NextResponse.json({
    ok: result.ok,
    agency: "MTA",
    agency_onestop: "o-dr5r-mta",
    modes_requested: modes,
    feed_count: feeds.length,
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
  if (parts.length !== 4 || !parts.every(Number.isFinite)) return null
  return [parts[0], parts[1], parts[2], parts[3]]
}
