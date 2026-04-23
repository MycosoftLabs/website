import { NextRequest, NextResponse } from "next/server"
import { fetchMultipleFeeds, cullVehiclesToBbox } from "@/lib/transit/gtfs-realtime"

/**
 * 511 SF Bay Area — aggregated feed for 45+ operators.
 *
 * One TRANSIT_511_API_KEY covers Muni (SF), AC Transit, BART, Caltrain,
 * VTA, SamTrans, Golden Gate ferry/bus, SF Bay Ferry, and 37 others.
 *
 * GET /api/transit/511-bay?bbox=w,s,e,n&operators=SF,AC,CT
 *   operators (default: SF,AC,BA,CT,SC,SM,GF,SB) — comma-separated ids
 */
export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const DEFAULT_OPS = ["SF", "AC", "BA", "CT", "SC", "SM", "GF", "SB"]

// Rough mapping of operator_id → vehicle_type for coloring the CREP layer
const OP_TYPE: Record<string, "bus" | "rail" | "subway" | "ferry" | "tram"> = {
  SF: "bus",  // Muni (mixed — but dominantly bus; light-rail Muni Metro gets filtered by route)
  AC: "bus",
  BA: "subway",
  CT: "rail", // Caltrain
  SC: "bus",  // VTA (mixed with light rail)
  SM: "bus",  // SamTrans
  GF: "ferry",
  SB: "ferry",
  WC: "bus",
  UN: "bus",
}

export async function GET(req: NextRequest) {
  const key = process.env.TRANSIT_511_API_KEY?.trim()
  if (!key) return NextResponse.json({ ok: false, error: "TRANSIT_511_API_KEY not configured" }, { status: 501 })

  const ops = (req.nextUrl.searchParams.get("operators") || DEFAULT_OPS.join(","))
    .split(",").map((s) => s.trim().toUpperCase()).filter(Boolean)
  const bbox = parseBbox(req.nextUrl.searchParams.get("bbox"))

  const feeds = ops.map((op) => ({
    url: `http://api.511.org/transit/vehiclepositions?api_key=${encodeURIComponent(key)}&agency=${encodeURIComponent(op)}`,
    vehicleType: OP_TYPE[op] || "bus" as const,
  }))

  const result = await fetchMultipleFeeds(feeds, {
    agency: "o-9q9-511-sfbay",
    agency_name: "511 SF Bay",
  })
  const vehicles = cullVehiclesToBbox(result.vehicles, bbox)

  return NextResponse.json({
    ok: result.ok,
    agency: "511 SF Bay",
    operators_requested: ops,
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
