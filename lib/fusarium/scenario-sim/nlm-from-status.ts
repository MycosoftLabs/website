import type { ScenarioNlmVar, ScenarioNlmWeight } from "./contracts"
import { IDLE_NLM } from "./packet"

interface RawCheckpoint {
  id?: string
  checkpoint_id?: string
  name?: string
  path?: string
  bytes?: number
  sha256?: string
  weights_sha256?: string
  modified_at?: string
  source?: string
}

interface RawNlmStatus {
  nlm?: {
    model_loaded?: boolean | null
    forecast_qualified?: boolean
    bound_to_ollama?: boolean
    model_name?: string
    weights_sha256?: string | null
    p?: number | null
    qualification_status?: string
    model_dir?: string | null
    model_id?: string | null
  }
  engine?: { state?: string }
  runtime?: {
    model_id?: string
    model_dir?: string
    tensor_count?: number
    parameter_count?: number
    weights_sha256?: string
  }
  weights?: { checkpoints?: RawCheckpoint[]; items?: RawCheckpoint[]; count?: number }
}

function asWeight(row: RawCheckpoint, fallbackSha: string | null): ScenarioNlmWeight | null {
  const path = typeof row.path === "string" ? row.path : null
  const id = String(row.id || row.checkpoint_id || row.name || path || "").trim()
  if (!id && !path) return null
  const sha = typeof row.sha256 === "string" ? row.sha256 : typeof row.weights_sha256 === "string" ? row.weights_sha256 : fallbackSha
  return {
    id: id || "weights",
    path,
    bytes: typeof row.bytes === "number" ? row.bytes : null,
    sha256: sha,
    source: typeof row.source === "string" ? row.source : "MAS /api/nlm/weights",
    modifiedAt: typeof row.modified_at === "string" ? row.modified_at : null,
  }
}

export function nlmVarFromStatus(data: RawNlmStatus | null, reachable: boolean): ScenarioNlmVar {
  if (!data || !reachable) {
    return {
      ...IDLE_NLM,
      loaded: null,
      note: "MAS NLM status was not reachable. Weights are not invented. bound_to_ollama stays false. p stays null.",
    }
  }
  const nlm = data.nlm || {}
  const runtime = data.runtime || {}
  const sha = nlm.weights_sha256 || runtime.weights_sha256 || null
  const listed = Array.isArray(data.weights?.items)
    ? data.weights.items
    : Array.isArray(data.weights?.checkpoints)
      ? data.weights.checkpoints
      : []
  const weights = listed.map((row) => asWeight(row, sha)).filter((row): row is ScenarioNlmWeight => Boolean(row))
  if (weights.length === 0 && sha) {
    weights.push({
      id: "runtime-sha",
      path: runtime.model_dir || nlm.model_dir || null,
      bytes: null,
      sha256: sha,
      source: "MAS /api/nlm/runtime weights_sha256",
      modifiedAt: null,
    })
  }
  return {
    live: false,
    bound_to_ollama: false,
    forecast_qualified: false,
    p: null,
    loaded: nlm.model_loaded ?? null,
    qualification_status: nlm.qualification_status || "UNQUALIFIED",
    modelId: runtime.model_id || nlm.model_id || nlm.model_name || null,
    modelDir: runtime.model_dir || nlm.model_dir || null,
    tensorCount: typeof runtime.tensor_count === "number" ? runtime.tensor_count : null,
    parameterCount: typeof runtime.parameter_count === "number" ? runtime.parameter_count : null,
    weights,
    weightsSource: "MAS /api/nlm/weights",
    note:
      nlm.model_loaded
        ? "Archived FormSpace reference is loaded for algorithm replay. forecast_qualified=false. bound_to_ollama=false. Fusarium p stays null."
        : "NLM service answered but tensors are not in-process. No stub p. No Ollama bind.",
  }
}
