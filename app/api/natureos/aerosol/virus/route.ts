import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

/** v1 placeholder — real public-health feeds tracked in follow-up plan. */
export async function GET() {
  return NextResponse.json({
    layer: "virus",
    status: "pending_data_source",
    message:
      "Virus / pathogen aerosol layers require curated public-health feeds; not wired in v1. See MAS doc AEROSOL_VIRUS_RADIATION_FEEDS plan.",
    items: [],
  })
}
