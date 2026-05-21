import { NextRequest, NextResponse } from "next/server"

import type { FungalAtlasBounds } from "@/lib/crep/fungal-atlas"

export const dynamic = "force-dynamic"

function parseBounds(params: URLSearchParams): FungalAtlasBounds | undefined {
  const bbox = params.get("bbox")
  if (!bbox) return undefined
  const [west, south, east, north] = bbox.split(",").map(Number)
  if ([west, south, east, north].every(Number.isFinite) && north > south) {
    return { west, south, east, north }
  }
  return undefined
}

export async function GET(request: NextRequest) {
  const bounds = parseBounds(request.nextUrl.searchParams)

  return NextResponse.json(
    {
      status: "pending_real_mindex_fci_model",
      priorities: [],
      meta: {
        bounds,
        consumer: "MYCA",
        deviceCount: 0,
        note:
          "FCI probe priority is intentionally empty until real MINDEX fungal-atlas evidence and known FCI device/probe locations are available. No generated or mock deployment recommendations are returned.",
        timestamp: new Date().toISOString(),
      },
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  )
}
