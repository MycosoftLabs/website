import { NextRequest, NextResponse } from "next/server"
import { resolveMindexServerBaseUrl } from "@/lib/mindex-base-url"

export const dynamic = "force-dynamic"

const MINDEX_API = resolveMindexServerBaseUrl()

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams
  const bbox = params.get("bbox")
  if (!bbox) {
    return NextResponse.json({ error: "bbox is required" }, { status: 400 })
  }

  const limit = Number(params.get("limit") || 20)
  const mission = params.get("mission") || "mushroom1-fci"
  const query = new URLSearchParams({
    bbox,
    limit: String(limit),
    mission,
  })

  const upstream = await fetch(`${MINDEX_API}/api/mindex/fungal-overlays/deployment/land?${query.toString()}`, {
    headers: {
      Accept: "application/json",
      "X-API-Key": process.env.MINDEX_API_KEY || "local-dev-key",
    },
    signal: AbortSignal.timeout(6000),
    cache: "no-store",
  })

  if (!upstream.ok) {
    return NextResponse.json(
      { error: "MINDEX deployment ranking unavailable", status: upstream.status },
      { status: 502 },
    )
  }

  const body = await upstream.json()
  return NextResponse.json({
    ...body,
    source: "mindex-fungal-overlays",
  })
}
