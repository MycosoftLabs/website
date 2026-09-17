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
  const [health, runtime, weights, weka, decision] = await Promise.all([
    getJson("/api/nlm/health"),
    getJson("/api/nlm/runtime"),
    getJson("/api/nlm/weights"),
    getJson("/api/nlm/weka-features"),
    getJson("/api/nlm/decision-path", 2500, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    }),
  ])

  const rt = runtime.body ?? {}
  const belief = nlmBeliefFromRuntime({
    model_loaded: Boolean(health.body?.model_loaded ?? rt.model_loaded),
    weights_sha256: typeof rt.weights_sha256 === "string" ? rt.weights_sha256 : null,
    parameter_count: typeof rt.parameter_count === "number" ? rt.parameter_count : null,
    architecture_family: typeof rt.architecture_family === "string" ? rt.architecture_family : null,
    bound_to_ollama: false,
  })

  return NextResponse.json({
    live: false,
    forecast_p: null,
    bound_to_ollama: false,
    mas: MAS,
    bind: health.ok || Boolean(rt.model_loaded) ? "BOUND" : "UNBOUND",
    paper_weights_sha256: NLM_WEIGHTS_SHA256_PAPER,
    weights_match_paper:
      rt.weights_sha256 === NLM_WEIGHTS_SHA256_PAPER ||
      health.body?.weights_sha256 === NLM_WEIGHTS_SHA256_PAPER,
    health: health.body,
    runtime: rt,
    weights: weights.body,
    weka_features: weka.body,
    decision_path: decision.body,
    belief,
  })
}
