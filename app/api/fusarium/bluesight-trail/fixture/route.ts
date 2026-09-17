import { NextResponse } from "next/server"
import { runGeometryFixture } from "@/lib/fusarium/bluesight/geometry-fixture"

export const dynamic = "force-dynamic"

export function GET() {
  const fixture = runGeometryFixture()
  return NextResponse.json({
    live: false,
    banner: "SYNTHETIC EXERCISE",
    forecast_p: null,
    bound_to_ollama: false,
    cell_count: fixture.patches.length,
    candidates: fixture.patches.filter((p) => p.state === "GEOMETRY_CANDIDATE").length,
    rejects: fixture.patches.filter((p) => p.state === "REJECT").length,
    fixture,
  })
}
