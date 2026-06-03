import { NextResponse } from "next/server"
import { fetchSanYsidroWaitTimes } from "@/lib/crep/border-wait-times"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const payload = await fetchSanYsidroWaitTimes()
    return NextResponse.json(payload, {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
        "X-Source": "cbp-border-wait-times",
      },
    })
  } catch (error: any) {
    return NextResponse.json(
      {
        source: "cbp-border-wait-times",
        source_url: "https://bwt.cbp.gov/api/waittimes",
        error: error?.message || "CBP wait-times fetch failed",
        generated_at: new Date().toISOString(),
        crossings: [],
      },
      { status: 502, headers: { "Cache-Control": "no-store" } },
    )
  }
}
