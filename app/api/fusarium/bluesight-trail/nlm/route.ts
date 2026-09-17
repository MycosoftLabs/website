import { NextResponse } from "next/server"
import { NLM_WEIGHTS_SHA256_PAPER, nlmBeliefFromRuntime } from "@/lib/fusarium/bluesight/formspace-nlm"

export const dynamic = "force-dynamic"

const MAS = (process.env.MAS_API_URL || "http://192.168.0.188:8001").replace(/\/$/, "")

async function getJson(
  path: string,
  ms = 2500,
  init?: RequestInit,
): Promise<{ ok: boolean; body: Record<string, unknown> | null }> {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), ms)
  try {
    const res = await fetch(`${MAS}${path}`, { ...init, signal: ctrl.signal, cache: "no-store" })
    const body = (await res.json().catch(() => null)) as Record<string, unknown> | null
    return { ok: res.ok, body }
  } catch {
    return { ok: false, body: null }
  } finally {
    clearTimeout(timer)
  }
}

export async function GET() {
  const [health, runtime] = await Promise.all([
    getJson("/api/nlm/health", 1800),
    getJson("/api/nlm/runtime", 1800),
  ])
  const weights = { ok: false, body: null as Record<string, unknown> | null }
  const weka = { ok: false, body: null as Record<string, unknown> | null }
  const decision = { ok: false, body: null as Record<string, unknown> | null }

  const rt = runtime.body ?? {}
  const weightsBody = weights.body ?? {}
  const modelLoaded = Boolean(health.body?.model_loaded ?? rt.model_loaded)
  const weightsSha =
    (typeof health.body?.weights_sha256 === "string" && health.body.weights_sha256) ||
    (typeof rt.weights_sha256 === "string" && rt.weights_sha256) ||
    (typeof weightsBody.loaded_sha256 === "string" && weightsBody.loaded_sha256) ||
    null
  const serviceUp = health.ok || runtime.ok || Boolean(rt.model_loaded) || Boolean(weightsSha)
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
    weights_match_paper:
      weightsSha === NLM_WEIGHTS_SHA256_PAPER ||
      rt.weights_sha256 === NLM_WEIGHTS_SHA256_PAPER ||
      health.body?.weights_sha256 === NLM_WEIGHTS_SHA256_PAPER,
    health: health.body,
    runtime: rt,
    weights: weightsBody,
    weka_features: weka.body,
    decision_path: decision.body,
    belief,
  })
}
