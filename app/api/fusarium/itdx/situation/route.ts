import { NextResponse } from "next/server"
import { requireFusariumOwner } from "@/lib/auth/api-auth"
import { FORT_STEWART_SLICE, officialInjectsStatus } from "@/lib/itdx/run-narration.mjs"
import { assessSituation, collectDemoSituationLayers, itdxHealth, mindexHealth, probeMasTask8Fast } from "@/lib/itdx/task8-client.mjs"
import {
  bindCrepAliases,
  bindEarth2Honesty,
  bindOpenMeteoWeather,
  bindPackagedCatalog,
  bindPublicBiology,
  bindSyntheticPhysics,
  preferBound,
} from "@/lib/itdx/local-situation-bind.mjs"

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
  const earth2Configured = Boolean((process.env.EARTH2_API_URL || process.env.NEXT_PUBLIC_EARTH2_API_URL || "").trim())
  const [demo, weather, biology] = await Promise.all([
    collectDemoSituationLayers(situation.situation),
    bindOpenMeteoWeather(),
    bindPublicBiology(),
  ])
  const localById: Record<string, ReturnType<typeof bindPackagedCatalog> | Awaited<ReturnType<typeof bindOpenMeteoWeather>>> = {
    weather,
    biology,
    information: bindPackagedCatalog(),
    physics: bindSyntheticPhysics(),
    crep: bindCrepAliases(),
    earth2: bindEarth2Honesty(earth2Configured),
    traffic: demo.google,
    pathways: demo.pathways,
    navigation: demo.demo.find((row) => row.id === "navigation") || demo.google,
    equipment_weapons_assets: demo.base,
  }
  const masChannels = situation.situation?.channels || []
  const ids = Array.from(new Set([...masChannels.map((row) => row.id), ...Object.keys(localById)]))
  const channels = ids.map((id) => preferBound(masChannels.find((row) => row.id === id) || null, localById[id] || null))
  const merged = situation.situation
    ? { ...situation.situation, channels, source: situation.ok ? "mas+website-local" : "website-local" }
    : {
        schema_version: "itdx.situation_assessment/v1",
        source: "website-local",
        ao: FORT_STEWART_SLICE,
        channels,
        geojson: demo.pathways?.geojson || null,
        synthetic: true,
        live_cop: false,
      }

  return NextResponse.json(
    {
      schema: "itdx-situation-ui/v1",
      source: "mas+mindex+website-local",
      ao: merged.ao || FORT_STEWART_SLICE,
      situation: merged,
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
      official_injects: officialInjectsStatus(null),
      synthetic: true,
      live_cop: false,
    },
    { headers: HEADERS },
  )
}
