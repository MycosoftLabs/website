/** FormSpace / NLM backbone from the 9–10 Sep 2026 ITDX papers. Terrain chart only. */

export const FORMSPACE_CHART_ID = "terrain-ade20k-pxl/v1" as const
export const NLM_MODEL_ID = "formspace-environmental-reference/0.1.0" as const
export const NLM_WEIGHTS_SHA256_PAPER =
  "0c5fb815bf9b1e75a0e9aa27a3c373eb675d142a93e688b20d3f1084874091b2"
export const NLM_PARAM_COUNT = 25728
export const NLM_SCALE_FLOOR = 0.02
export const NLM_DAY_S = 86400
export const WEKA_SEED = "itdx-pxl-20260913-v16"

export type AvaniDisposition = "DENY" | "PAUSE" | "PASS" | "REVIEW"
export type NlmLaneBind = "BOUND" | "MAS_NLM_DOWN"
export type NlmServiceStatus = "NLM_ONLINE" | "MAS_NLM_DOWN"

export function nlmServiceChip(input: {
  nlm_status?: string | null
  bind?: string | null
  model_loaded?: boolean
}): string {
  const down = input.nlm_status === "MAS_NLM_DOWN" || input.bind === "MAS_NLM_DOWN"
  if (down) return "NLM runtime unreachable"
  if (input.model_loaded || input.nlm_status === "NLM_ONLINE" || input.bind === "BOUND") {
    return "NLM BOUND · forecast_p null · not NLM=WEKA"
  }
  return "NLM probing"
}

export interface FormSpaceRecord {
  s: string
  k: typeof FORMSPACE_CHART_ID
  ft: number[]
  ct: { actor: string; live: false; video_time_s: number }
  Ut: {
    missing_nlm_channels: number
    metres: "UNQUALIFIED" | "SIMULATION_BOUNDED_M"
    channel_source: "absent" | "simulation" | "live_bff"
  }
  Et: { ade20k_record: string; nlm_weights_sha256: string | null }
}

export interface TerrainFormState {
  record: FormSpaceRecord
  elapsed_ell: number
  standardized: number[]
  prototype_cell: number
  novelty_r: number
  novel: boolean
  path_bearing_deg: number
  earth_pct: number
  tree_pct: number
  rock_pct: number
  plant_pct: number
}

export interface NlmBelief {
  schema: "nlm-belief/v1"
  live: false
  forecast_p: null
  p_candidate: null
  p_background: null
  abstained: boolean
  sim_channels_present: boolean
  reason: string
  bound_to_ollama: false
  weights_sha256: string | null
  parameter_count: number | null
  model_loaded: boolean
  architecture_family: string | null
}

export interface DecisionLoop {
  bt: NlmBelief
  Ft: TerrainFormState
  a_star: "HOLD" | "COLLECT_EVIDENCE"
  dt: AvaniDisposition
  ut: "none"
}

export function elapsedFeature(deltaS: number): number {
  const capped = Math.min(Math.max(deltaS, 0), NLM_DAY_S)
  return Math.log(1 + capped) / Math.log(1 + NLM_DAY_S)
}

export function sigmoid(z: number): number {
  return 1 / (1 + Math.exp(-z))
}

export function softplus(x: number): number {
  return Math.log1p(Math.exp(-Math.abs(x))) + Math.max(x, 0)
}

/** Paper: A = −exp(A_log). Audited block0 A_log[0]=0.0187466871 */
export function ssmDecayA(aLog: number): number {
  return -Math.exp(aLog)
}

/** Native scan term: H_t = exp(Δ A) H_{t-1} + Δ B v  (not exact ZOH). */
export function ssmStep(hPrev: number, delta: number, a: number, b: number, v: number): number {
  return Math.exp(delta * a) * hPrev + delta * b * v
}

export function standardize(f: number[], mu: number[], s: number[]): number[] {
  return f.map((v, i) => (v - mu[i]) / Math.max(s[i], NLM_SCALE_FLOOR))
}

export function mahalanobisDiag(f: number[], g: number[], s: number[]): number {
  let acc = 0
  for (let i = 0; i < f.length; i += 1) {
    const si = Math.max(s[i], NLM_SCALE_FLOOR)
    const d = (f[i] - g[i]) / si
    acc += d * d
  }
  return Math.sqrt(acc)
}

export function nearestPrototype(fTilde: number[], prototypes: number[][]): { cell: number; r: number } {
  let cell = 0
  let best = Number.POSITIVE_INFINITY
  for (let k = 0; k < prototypes.length; k += 1) {
    let d2 = 0
    const mu = prototypes[k]
    for (let i = 0; i < fTilde.length; i += 1) {
      const d = fTilde[i] - mu[i]
      d2 += d * d
    }
    if (d2 < best) {
      best = d2
      cell = k
    }
  }
  return { cell, r: Math.sqrt(best) }
}

/** ADE20K appearance fractions as a 4-D terrain chart (not the 32-D SSM chart). */
export const TERRAIN_MU = [70, 20, 3, 0.2]
export const TERRAIN_S = [12, 8, 3, 0.4]
export const TERRAIN_PROTOS: number[][] = [
  [1.2, -0.4, -0.2, 0],
  [0.2, 0.8, -0.3, 0.1],
  [-0.4, 0.1, 1.4, 0],
  [0.0, 0.0, 0.0, 1.2],
]
export const TERRAIN_NOVELTY_Q99 = 2.8

export function terrainState(input: {
  actor: string
  video_time_s: number
  earth: number
  tree: number
  rock: number
  plant: number
  bearing_deg: number
  ade_record: string
  nlm_sha: string | null
  channel_source?: "absent" | "simulation" | "live_bff"
}): TerrainFormState {
  const source = input.channel_source ?? "absent"
  const ft = [input.earth, input.tree, input.rock, input.plant]
  const standardized = standardize(ft, TERRAIN_MU, TERRAIN_S)
  const { cell, r } = nearestPrototype(standardized, TERRAIN_PROTOS)
  return {
    record: {
      s: "pxl-trail-20260913",
      k: FORMSPACE_CHART_ID,
      ft,
      ct: { actor: input.actor, live: false, video_time_s: input.video_time_s },
      Ut: {
        missing_nlm_channels: source === "absent" ? 7 : 0,
        metres: source === "simulation" ? "SIMULATION_BOUNDED_M" : "UNQUALIFIED",
        channel_source: source,
      },
      Et: { ade20k_record: input.ade_record, nlm_weights_sha256: input.nlm_sha },
    },
    elapsed_ell: elapsedFeature(input.video_time_s),
    standardized,
    prototype_cell: cell,
    novelty_r: r,
    novel: r > TERRAIN_NOVELTY_Q99,
    path_bearing_deg: input.bearing_deg,
    earth_pct: input.earth,
    tree_pct: input.tree,
    rock_pct: input.rock,
    plant_pct: input.plant,
  }
}

/** Papers: all measurements missing → abstain. Simulation supplies 7 scalars; pattern p still null. */
export function nlmBeliefFromRuntime(
  runtime: {
    model_loaded?: boolean
    weights_sha256?: string | null
    parameter_count?: number | null
    architecture_family?: string | null
    bound_to_ollama?: boolean
  },
  opts?: { simChannels?: boolean },
): NlmBelief {
  const sim = Boolean(opts?.simChannels)
  return {
    schema: "nlm-belief/v1",
    live: false,
    forecast_p: null,
    p_candidate: null,
    p_background: null,
    abstained: !sim,
    sim_channels_present: sim,
    reason: sim
      ? "Seven NLM scalars are SIMULATION traces locked to video time. 188 did not emit pattern p. forecast_p stays null. Never 0.85."
      : "PXL replay has no temperature/humidity/pressure/gas/IAQ/FCI/audio. Papers: all-missing → ABSTAIN. Never replace null with 0.5 or 0.85.",
    bound_to_ollama: false,
    weights_sha256: runtime.weights_sha256 ?? null,
    parameter_count: runtime.parameter_count ?? NLM_PARAM_COUNT,
    model_loaded: Boolean(runtime.model_loaded),
    architecture_family: runtime.architecture_family ?? null,
  }
}

export function avaniTerrain(belief: NlmBelief): AvaniDisposition {
  if (belief.sim_channels_present) return "REVIEW"
  if (!belief.model_loaded || belief.abstained) return "PAUSE"
  return "REVIEW"
}

export function decideTerrain(belief: NlmBelief, Ft: TerrainFormState): DecisionLoop {
  const dt = avaniTerrain(belief)
  return {
    bt: belief,
    Ft,
    a_star: dt === "PAUSE" ? "COLLECT_EVIDENCE" : "HOLD",
    dt,
    ut: "none",
  }
}

export function f1FromCounts(tp: number, fp: number, fn: number): number | null {
  const den = 2 * tp + fp + fn
  if (den === 0) return null
  return (2 * tp) / den
}

export function brier(pairs: { p: number; y: number }[]): number | null {
  if (!pairs.length) return null
  let acc = 0
  for (const row of pairs) acc += (row.p - row.y) ** 2
  return acc / pairs.length
}

export const PAPER_FORMULA_MAP: { paper: string; symbol: string; code: string }[] = [
  { paper: "White paper §1", symbol: "F_t=(s,k,f_t,c_t,U_t,E_t)", code: "FormSpaceRecord" },
  { paper: "White paper §2", symbol: "ℓ_t=log(1+min(δ,86400))/log(1+86400)", code: "elapsedFeature" },
  { paper: "White paper §2", symbol: "u_t=[v;m;ℓ]∈R^{24}", code: "all-missing on PXL → ABSTAIN" },
  { paper: "White paper §3 / weights §8", symbol: "H=e^{ΔA}H+ΔBv", code: "ssmStep" },
  { paper: "White paper §4", symbol: "p=σ(z/T)", code: "sigmoid; forecast_p stays null" },
  { paper: "White paper §5", symbol: "f̃=(f-μ)/max(s,0.02)", code: "standardize / NLM_SCALE_FLOOR" },
  { paper: "White paper §5", symbol: "c(f)=argmin_k ||f̃-μ_k||", code: "nearestPrototype" },
  { paper: "White paper §8 / loop paper §12", symbol: "AVANI DENY/PAUSE/PASS/REVIEW", code: "avaniTerrain" },
  { paper: "Loop paper §1", symbol: "b=NLM; F=FormSpace; a*=MYCA; d=AVANI", code: "decideTerrain" },
  { paper: "WEKA runbook §8", symbol: "F1=2TP/(2TP+FP+FN); Brier=mean(p-y)^2", code: "f1FromCounts / brier" },
]
