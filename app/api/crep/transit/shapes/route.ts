import { NextRequest, NextResponse } from "next/server"
import {
  fetchTransitShapesFromMindex,
  parseBboxParam,
} from "@/lib/transit/crep-transit-mindex"

/**
 * CREP transit route shapes — GeoJSON LineStrings (Jun 15, 2026).
 *
 * Requires MAS transit_rt_collector static GTFS ingest into MINDEX transit.shapes.
 *
 * GET /api/crep/transit/shapes?bbox=west,south,east,north
 */

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  const bboxParam = req.nextUrl.searchParams.get("bbox")
  if (!bboxParam) {
    return NextResponse.json({ error: "bbox required (west,south,east,north)" }, { status: 400 })
  }
  if (!parseBboxParam(bboxParam)) {
    return NextResponse.json({ error: "invalid bbox" }, { status: 400 })
  }

  const payload =
    (await fetchTransitShapesFromMindex(bboxParam)) ?? {
      type: "FeatureCollection",
      features: [],
      count: 0,
      stale: true,
      source: "mindex",
    }

  return NextResponse.json(payload, {
    headers: {
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=7200",
      "X-Transit-Source": "mindex",
    },
  })
}
