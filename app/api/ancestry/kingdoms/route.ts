import { NextResponse } from "next/server"
import { mindexOpenGetJson } from "@/lib/mindex-open-fetch"

/**
 * BFF: Kingdom coverage stats from MINDEX bio.kingdom_stats (all-life migration).
 */
export async function GET() {
  try {
    const data = await mindexOpenGetJson<
      { kingdom: string; taxon_count: number }[]
    >("/api/mindex/all-life/kingdom-stats")
    return NextResponse.json({ kingdoms: data, source: "mindex" })
  } catch (e) {
    console.error("ancestry/kingdoms:", e)
    return NextResponse.json(
      { kingdoms: [], source: "error", message: "MINDEX all-life stats unavailable" },
      { status: 503 },
    )
  }
}
