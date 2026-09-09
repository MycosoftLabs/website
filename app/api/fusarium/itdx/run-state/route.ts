import { NextResponse } from "next/server"
import { requireFusariumOwner } from "@/lib/auth/api-auth"
import { AO_PLACE, AO_ORIGIN_LAT, AO_ORIGIN_LNG } from "@/lib/itdx/replay-core.mjs"
import { nlmQualification, officialInjectsStatus } from "@/lib/itdx/run-narration.mjs"
import { assessSituation, mindexHealth, nlmBind } from "@/lib/itdx/task8-client.mjs"
import { loadWekaWalkthrough } from "@/lib/itdx/weka-v14-receipt"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const HEADERS = {
  "Cache-Control": "private, no-store, max-age=0",
  Vary: "Cookie, Authorization",
  "X-Content-Type-Options": "nosniff",
}

async function summarizeFormspace() {
  const origin = process.env.FORMSPACE_BACKEND_URL?.trim()
  if (!origin) return { status: 503, origin: null, model_sha256: null }
  const response = await fetch(new URL("/api/formspace", origin), { cache: "no-store", signal: AbortSignal.timeout(15000) })
  if (!response.ok) return { status: response.status, origin: null, model_sha256: null }
  const data = await response.json()
  const result = data.result || {}
  return {
    status: 200,
    origin: data.origin || null,
    run_id: data.run_id || null,
    model_sha256: result.model_sha256 || null,
    task12: result.task12?.metrics || null,
    task13: result.task13?.metrics || null,
    task8_gates: (result.task8?.options || []).map((option: { id: string; formspace_gate?: string; title?: string }) => ({
      id: option.id,
      title: option.title,
      gate: option.formspace_gate,
    })),
    rank_semantics: result.task8?.rank_semantics || null,
    prediction_set: result.task12?.predictions?.[0]?.prediction_set || null,
    chart_id: result.task12?.predictions?.[0]?.chart_id || null,
    position_uncertainty: "NOT_ESTIMATED",
  }
}

export async function GET() {
  const auth = await requireFusariumOwner()
  if (auth.error) return auth.error

  const [formspace, nlm, mindex, situation] = await Promise.all([
    summarizeFormspace(),
    nlmBind(),
    mindexHealth(),
    assessSituation(),
  ])
  let weka_v14 = null
  try {
    weka_v14 = loadWekaWalkthrough()
  } catch {
    weka_v14 = { verify_status: "UNAVAILABLE", formspace_is_not_mas: true }
  }
  const nlmQ = nlmQualification(nlm.health as { model_loaded?: boolean }, nlm.checkpoints as { count?: number; checkpoints?: unknown[] })

  return NextResponse.json(
    {
      formspace,
      weka_v14,
      nlm: { ...nlm, ...nlmQ },
      mindex,
      situation: situation.situation,
      situation_status: situation.status,
      official_injects: officialInjectsStatus(null),
      ao_place: AO_PLACE,
      ao_origin: [AO_ORIGIN_LNG, AO_ORIGIN_LAT],
      overlay: { synthetic: true, live: false },
      class_p_is_geo_radius: false,
      borda_is_success_probability: false,
    },
    { headers: HEADERS },
  )
}
