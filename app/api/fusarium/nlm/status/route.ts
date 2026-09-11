import { NextResponse } from "next/server"
import { requireOwner } from "@/lib/auth/api-auth"
import { FUSARIUM_NLM_STATUS_SCHEMA, normalizeNlmTrainingState, normalizeProviderTimestamp, type NlmTrainingLatest } from "@/lib/fusarium/nlm/status"
import { resolveMasServerBaseUrl } from "@/lib/mas-server-url"

export const dynamic = "force-dynamic"
export const revalidate = 0

const NLM_BASE_URL = resolveMasServerBaseUrl()

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

function mapWeightRow(row: Record<string, unknown>, fallbackSha: string | null) {
  const path = typeof row.path === "string" ? row.path : null
  const name = typeof row.name === "string" ? row.name : null
  return {
    id: String(row.id || row.checkpoint_id || name || path || "weights"),
    name,
    path,
    bytes: typeof row.bytes === "number" ? row.bytes : null,
    sha256: typeof row.sha256 === "string" ? row.sha256 : fallbackSha,
    source: typeof row.source === "string" ? row.source : "MAS /api/nlm/weights",
    role: typeof row.role === "string" ? row.role : null,
    kind: typeof row.kind === "string" ? row.kind : null,
    loaded: typeof row.loaded === "boolean" ? row.loaded : null,
    modified_at: typeof row.modified_at === "string" ? row.modified_at : null,
  }
}

export async function GET() {
  const auth = await requireOwner()
  if (auth.error) return auth.error

  const receivedAt = new Date().toISOString()
  const health = await readJson("/api/nlm/health")
  const ready = await readJson("/api/nlm/runtime")
  const weights = await readJson("/api/nlm/weights")
  const training = await readJson("/api/nlm/training/status", 12000)
  const latest = (training.data?.latest ?? training.data ?? null) as NlmTrainingLatest | null
  const forecastQualified = Boolean(health.data?.forecast_qualified)
  const masReachable = health.ok || ready.ok || weights.ok
  const modelLoaded = Boolean(health.data?.model_loaded || ready.data?.model_loaded)
  const engineState = !masReachable ? "unavailable" : modelLoaded ? "available" : "unloaded"
  const weightsSha =
    (typeof health.data?.weights_sha256 === "string" && health.data.weights_sha256) ||
    (typeof ready.data?.weights_sha256 === "string" && ready.data.weights_sha256) ||
    null
  const rawItems = Array.isArray(weights.data?.weights)
    ? weights.data.weights
    : Array.isArray(ready.data?.weights)
      ? ready.data.weights
      : []
  const items = rawItems.map((row: Record<string, unknown>) => mapWeightRow(row, weightsSha))

  return NextResponse.json({
    schema: FUSARIUM_NLM_STATUS_SCHEMA,
    classification: "UNCLASSIFIED",
    receivedAt,
    nlm: {
      model_loaded: health.ok ? Boolean(health.data?.model_loaded) : null,
      forecast_qualified: forecastQualified,
      bound_to_ollama: false,
      model_name: typeof health.data?.model_name === "string" ? health.data.model_name : "nlm",
      model_id: typeof ready.data?.model_id === "string" ? ready.data.model_id : null,
      model_dir:
        (typeof ready.data?.model_dir === "string" && ready.data.model_dir) ||
        (typeof health.data?.model_dir === "string" && health.data.model_dir) ||
        null,
      weights_sha256: weightsSha,
      p: null,
      qualification_status:
        typeof health.data?.qualification_status === "string"
          ? health.data.qualification_status
          : forecastQualified
            ? "qualified"
            : "UNQUALIFIED",
      training_origin:
        typeof health.data?.training_origin === "string" ? health.data.training_origin : "synthetic",
    },
    runtime: ready.ok
      ? {
          model_id: ready.data?.model_id ?? null,
          model_dir: ready.data?.model_dir ?? null,
          tensor_count: typeof ready.data?.tensor_count === "number" ? ready.data.tensor_count : null,
          parameter_count: typeof ready.data?.parameter_count === "number" ? ready.data.parameter_count : null,
          weights_sha256: typeof ready.data?.weights_sha256 === "string" ? ready.data.weights_sha256 : weightsSha,
          architecture_family: ready.data?.architecture_family ?? null,
        }
      : null,
    engine: {
      state: engineState,
      health: health.ok ? String(health.data?.status ?? "unknown") : "unavailable",
      ready: ready.ok
        ? Boolean(
            ready.data?.ready ??
              ready.data?.model_loaded ??
              (ready.data?.status === "ready" || ready.data?.status === "healthy"),
          )
        : null,
      forecast_state: forecastQualified ? "qualified" : "unqualified",
      healthLatencyMs: health.latencyMs,
      readyLatencyMs: ready.latencyMs,
      errors: [health.error, ready.error, weights.error].filter(Boolean),
    },
    weights: {
      source: "MAS /api/nlm/weights",
      count: typeof weights.data?.count === "number" ? weights.data.count : items.length,
      items,
      checkpoints: items,
      home: weights.data?.home || null,
      reachable: weights.ok,
      error: weights.error,
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
      provider: "MAS scientific NLM :8001",
      healthPath: "/api/nlm/health",
      readinessPath: "/api/nlm/runtime",
      weightsPath: "/api/nlm/weights",
      trainingPath: "/api/nlm/training/status",
      note: "Same MAS NLM service as NatureOS/training. Weight list is /api/nlm/weights — never stubbed. Not :8200. Not Ollama. Unqualified forecast p stays null.",
    },
  }, { headers: { "Cache-Control": "no-store, max-age=0" } })
}
