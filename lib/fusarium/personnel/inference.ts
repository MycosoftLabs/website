import { appendInference, readMeasurementStore } from "./outcomes-store"
import type { InferenceRecord } from "./types"

/**
 * Labeled hypotheses only. Never a measured fatality/stress/error reduction.
 * Never derived from hours saved or headcount consolidation.
 */
export async function inferForRole(roleId: string, personaId: string): Promise<InferenceRecord | null> {
  const store = await readMeasurementStore()
  const surveys = store.surveys.filter((row) => row.role_id === roleId)
  const telemetry = store.telemetry.filter((row) => row.role_id === roleId)
  if (surveys.length === 0 && telemetry.length === 0) return null

  const comments = surveys.map((row) => row.comments || "").join(" ").toLowerCase()
  const tlx = surveys.filter((row) => row.instrument === "NASA-TLX")
  const lastTlx = tlx.at(-1)
  const meanTlx = lastTlx
    ? Object.values(lastTlx.scores).filter((v): v is number => typeof v === "number").reduce((a, b) => a + b, 0) /
      Math.max(1, Object.values(lastTlx.scores).filter((v) => typeof v === "number").length)
    : null

  let hypothesis = "Use and survey volume is too small for a directional workload hypothesis."
  if (meanTlx !== null && meanTlx >= 60) {
    hypothesis = "Survey NASA-TLX scores are high. Hypothesis only: workload may be elevated. Not a stress diagnosis."
  } else if (meanTlx !== null && meanTlx <= 30) {
    hypothesis = "Survey NASA-TLX scores are low. Hypothesis only: workload may be manageable. Not a wellbeing claim."
  }
  if (comments.includes("fatigue") || comments.includes("exhaust")) {
    hypothesis += " Comment text mentions fatigue; treat as an unvalidated cue."
  }
  if (telemetry.length >= 5) {
    hypothesis += " Repeated tool use is present; this is habit telemetry, not an error rate."
  }

  return appendInference({
    role_id: roleId,
    persona_id: personaId,
    hypothesis,
    uncertainty: "Low-confidence commercial inference. Clustered, causal, and CUI-backed analysis are NOT_SUPPLIED. Fatality reduction is not computed.",
    confidence: surveys.length >= 3 ? "medium" : "low",
    related_survey_ids: surveys.map((row) => row.id),
  })
}
