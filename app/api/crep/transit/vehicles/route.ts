import { NextRequest, NextResponse } from "next/server"
import {
  fetchTransitVehiclesFromMindex,
  fetchTransitVehiclesLiveFallback,
  parseBboxParam,
} from "@/lib/transit/crep-transit-mindex"

/**
 * CREP live transit vehicles — GeoJSON FeatureCollection (Jun 15, 2026).
 *
 * Primary: MINDEX transit.vehicles (MAS transit_rt_collector).
 * Fallback: direct GTFS-RT / Amtraker when MINDEX empty (dev / pre-migration).
 *
 * GET /api/crep/transit/vehicles?bbox=west,south,east,north
 */

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  const bboxParam = req.nextUrl.searchParams.get("bbox")
  if (!bboxParam) {
    return NextResponse.json({ error: "bbox required (west,south,east,north)" }, { status: 400 })
  }
  const bbox = parseBboxParam(bboxParam)
  if (!bbox) {
    return NextResponse.json({ error: "invalid bbox" }, { status: 400 })
  }

  let payload = await fetchTransitVehiclesFromMindex(bboxParam)
  const useFallback =
    !payload ||
    !payload.features?.length ||
    process.env.CREP_TRANSIT_FORCE_LIVE_FALLBACK === "1"

  if (useFallback) {
    payload = await fetchTransitVehiclesLiveFallback(bbox)
  }

  const source = (payload as { source?: string }).source || "mindex"

  return NextResponse.json(payload, {
    headers: {
      "Cache-Control": "public, s-maxage=10, stale-while-revalidate=30",
      "X-Transit-Source": source,
    },
  })
}
