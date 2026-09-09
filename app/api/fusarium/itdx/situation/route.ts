import { NextResponse } from "next/server"
import { requireFusariumOwner } from "@/lib/auth/api-auth"
import { FORT_STEWART_SLICE } from "@/lib/itdx/run-narration.mjs"
import { assessSituation, collectDemoSituationLayers, itdxHealth, mindexHealth, probeMasTask8Fast } from "@/lib/itdx/task8-client.mjs"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const HEADERS = {
  "Cache-Control": "private, no-store, max-age=0",
  Vary: "Cookie, Authorization",
  "X-Content-Type-Options": "nosniff",
}

export async function GET() {
  return POST()
}

export async function POST() {
  const auth = await requireFusariumOwner()
  if (auth.error) return auth.error

  // Situation POST is the live cite source. Do not race it with Task 8 POST.
  let situation = await assessSituation({ slice: FORT_STEWART_SLICE })
  if (!situation.ok) {
    situation = await assessSituation({ slice: FORT_STEWART_SLICE })
  }
  const [task8, health, mindex] = await Promise.all([
    probeMasTask8Fast({ slice: FORT_STEWART_SLICE }),
    itdxHealth(),
    mindexHealth(),
  ])
  const demo = await collectDemoSituationLayers(situation.situation)

  return NextResponse.json(
    {
      schema: "itdx-situation-ui/v1",
      source: "mas+mindex+public-osm",
      ao: situation.situation?.ao || FORT_STEWART_SLICE,
      situation: situation.situation,
      situation_status: situation.status,
      situation_error: situation.ok ? null : situation.data?.error || `MAS situation HTTP ${situation.status}`,
      situation_path: situation.path,
      demo: demo.demo,
      google: demo.google,
      pathways: demo.pathways,
      base: demo.base,
      devices: demo.devices,
      task8: task8.task8,
      task8_probes: task8.probes,
      health: health.data,
      health_status: health.status,
      mindex,
      p_truth_owner: "website_geometry",
      synthetic: true,
      live_cop: false,
    },
    { headers: HEADERS },
  )
}
