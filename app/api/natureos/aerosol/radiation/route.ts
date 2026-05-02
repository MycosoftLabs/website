import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

/** v1 placeholder — radiation monitoring feeds tracked in follow-up plan. */
export async function GET() {
  return NextResponse.json({
    layer: "radiation",
    status: "pending_data_source",
    message:
      "Radiation monitoring integrations (EPA RadNet, international feeds) are not wired in v1. See MAS doc AEROSOL_VIRUS_RADIATION_FEEDS plan.",
    items: [],
  })
}
