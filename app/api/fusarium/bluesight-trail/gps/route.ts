import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

export async function GET() {
  return NextResponse.json({
    live: false,
    bind: "UNBOUND",
    lat: null,
    lon: null,
    source: "none",
    detail:
      "PXL clip GPS was not extracted in the laptop lab. Browser geolocation is the operator device, not the trail capture. MycoBrain has no GNSS fix on this replay.",
    forecast_p: null,
  })
}
