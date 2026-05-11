import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

const MAS_API_URL =
  process.env.MAS_API_URL || process.env.NEXT_PUBLIC_MAS_API_URL || "http://localhost:8001"

/** Proxies MAS explicit deferral — structured 503, never surrogate viral metrics. */
export async function GET() {
  try {
    const res = await fetch(`${MAS_API_URL}/api/natureos/feeds/virus-aerosol/status`, {
      headers: { Accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
    })
    const body = await res.json().catch(() => ({}))
    return NextResponse.json({ layer: "virus", upstream: body, available: res.ok, upstreamStatus: res.status })
  } catch (e) {
    const message = e instanceof Error ? e.message : "mas_unreachable"
    return NextResponse.json(
      {
        layer: "virus",
        upstream: {
          feed: "virus_aerosol",
          available: false,
          message: "Could not reach MAS virus/aerosol status endpoint.",
          detail: message,
        },
      },
    )
  }
}
