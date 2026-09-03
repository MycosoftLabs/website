import { NextResponse } from "next/server"
import { requireOwner } from "@/lib/auth/api-auth"
import { FUSARIUM_NLM_STATUS_SCHEMA, normalizeNlmTrainingState, normalizeProviderTimestamp, type NlmTrainingLatest } from "@/lib/fusarium/nlm/status"

export const dynamic = "force-dynamic"
export const revalidate = 0

const NLM_BASE_URL = (process.env.NLM_API_URL || process.env.NLM_API_BASE_URL || "http://192.168.0.188:8200").replace(/\/$/, "")

async function readJson(path: string, timeoutMs = 10000): Promise<{ ok: boolean; status: number | null; data: any; error: string | null; latencyMs: number }> {
  const started = Date.now()
  try {
    const response = await fetch(`${NLM_BASE_URL}${path}`, { cache: "no-store", headers: { Accept: "application/json" }, signal: AbortSignal.timeout(timeoutMs) })
    const data = response.ok ? await response.json().catch(() => null) : null
    return { ok: response.ok, status: response.status, data, error: response.ok ? null : `HTTP ${response.status}`, latencyMs: Date.now() - started }
  } catch (error) {
    return { ok: false, status: null, data: null, error: error instanceof Error ? error.message : "unreachable", latencyMs: Date.now() - started }
  }
}

export async function GET() {
  const auth = await requireOwner()
  if (auth.error) return auth.error

  const receivedAt = new Date().toISOString()
  // The deployed NLM service is resource-constrained and may serialize requests.
  // Keep these probes sequential so this read-only dashboard does not create its
  // own false timeout by hitting health, readiness, and training concurrently.
  const health = await readJson("/health")
  const ready = await readJson("/ready")
  const training = await readJson("/api/training/status", 12000)
  const latest = (training.data?.latest ?? null) as NlmTrainingLatest | null
  const engineState = health.ok && String(health.data?.status ?? "").toLowerCase() === "healthy" ? "available" : health.ok || ready.ok || training.ok ? "degraded" : "unavailable"

  return NextResponse.json({
    schema: FUSARIUM_NLM_STATUS_SCHEMA,
    classification: "UNCLASSIFIED",
    receivedAt,
    engine: {
      state: engineState,
      health: health.ok ? String(health.data?.status ?? "unknown") : "unavailable",
      ready: ready.ok
        ? Boolean(
            ready.data?.ready ??
              (ready.data?.status === "ready" || ready.data?.status === "healthy"),
          )
        : null,
      healthLatencyMs: health.latencyMs,
      readyLatencyMs: ready.latencyMs,
      errors: [health.error, ready.error].filter(Boolean),
    },
    training: {
      state: normalizeNlmTrainingState(latest),
      epoch: typeof latest?.epoch === "number" ? latest.epoch : null,
      progress: typeof latest?.overall_progress === "number" ? latest.overall_progress : null,
      loss: typeof latest?.loss === "number" ? latest.loss : null,
      providerReportedAccuracy: typeof latest?.accuracy === "number" ? latest.accuracy : null,
      signalSamples: typeof latest?.signal_samples === "number" ? latest.signal_samples : null,
      observedAt: normalizeProviderTimestamp(latest?.timestamp),
      reachable: training.ok,
      latencyMs: training.latencyMs,
      error: training.error,
    },
    capabilities: ["environmental-process", "predict", "recommend", "verified-telemetry-ingest", "translate", "nmf-create", "token-vocabulary", "fruiting-prediction", "knowledge-query", "earth-search", "myca-ask", "crep-layers", "earth-stats", "sync"],
    provenance: {
      provider: "Mycosoft NLM service",
      healthPath: "/health",
      readinessPath: "/ready",
      trainingPath: "/api/training/status",
      note: "Capability names come from the deployed NLM v0.1.0 OpenAPI inspected during the bounded recovery probe. This route performs GET status reads only.",
    },
  }, { headers: { "Cache-Control": "no-store, max-age=0" } })
}
