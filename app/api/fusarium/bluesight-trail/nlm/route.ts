import { NextResponse } from "next/server"
import { NLM_WEIGHTS_SHA256_PAPER, nlmBeliefFromRuntime } from "@/lib/fusarium/bluesight/formspace-nlm"
import { getLanJson } from "@/lib/fusarium/itdx/lan-json"
import { resolveMasServerBaseUrl } from "@/lib/mas-server-url"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const MAS = resolveMasServerBaseUrl()
const NLM_PROBE_MS = 4000

async function getJson(path: string, ms = NLM_PROBE_MS): Promise<{ ok: boolean; body: Record<string, unknown> | null }> {
  const result = await getLanJson(`${MAS}${path}`, ms)
  return { ok: result.ok, body: result.body }
}

export async function GET() {
  // Health first: bind must not wait on WEKA extras or decision-path.
  const health = await getJson("/api/nlm/health")
  const [runtime, weights] = await Promise.all([
    getJson("/api/nlm/runtime"),
    getJson("/api/nlm/weights"),
  ])

  const rt = runtime.body ?? {}
  const weightsBody = weights.body ?? {}
  const modelLoaded = Boolean(health.body?.model_loaded ?? rt.model_loaded ?? weightsBody.model_loaded)
  const weightsSha =
    (typeof health.body?.weights_sha256 === "string" && health.body.weights_sha256) ||
    (typeof rt.weights_sha256 === "string" && rt.weights_sha256) ||
    (typeof weightsBody.loaded_sha256 === "string" && weightsBody.loaded_sha256) ||
    null
  const serviceUp = health.ok || runtime.ok || weights.ok || modelLoaded
  const weightCount =
    (typeof weightsBody.count === "number" && weightsBody.count) ||
    (typeof rt.weight_count === "number" && rt.weight_count) ||
    (Array.isArray(weightsBody.weights) ? weightsBody.weights.length : null) ||
    (Array.isArray(rt.weights) ? (rt.weights as unknown[]).length : null)
  const parameterCount =
    (typeof rt.parameter_count === "number" && rt.parameter_count) ||
    (typeof health.body?.parameter_count === "number" && health.body.parameter_count) ||
    null
  const belief = nlmBeliefFromRuntime({
    model_loaded: modelLoaded,
    weights_sha256: weightsSha,
    parameter_count: parameterCount,
    architecture_family: typeof rt.architecture_family === "string" ? rt.architecture_family : null,
    bound_to_ollama: false,
  })

  return NextResponse.json({
    live: false,
    forecast_p: null,
    forecast_status: "FORECAST_ABSTAIN",
    bound_to_ollama: false,
    mas: MAS,
    bind: serviceUp ? "BOUND" : "MAS_NLM_DOWN",
    nlm_status: serviceUp ? "NLM_ONLINE" : "MAS_NLM_DOWN",
    weight_count: weightCount,
    weights_sha256: weightsSha,
    paper_weights_sha256: NLM_WEIGHTS_SHA256_PAPER,
    weights_match_paper: weightsSha === NLM_WEIGHTS_SHA256_PAPER,
    health: health.body,
    runtime: rt,
    weights: weightsBody,
    weka_features: null,
    decision_path: null,
    belief,
  })
}
