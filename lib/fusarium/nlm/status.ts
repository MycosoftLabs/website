export const FUSARIUM_NLM_STATUS_SCHEMA = "fusarium-nlm-status/v1" as const

export interface NlmTrainingLatest {
  epoch?: number
  loss?: number
  accuracy?: number
  signal_samples?: number
  overall_progress?: number
  status?: string
  timestamp?: number | string
}

export type NlmTrainingState = "completed" | "training" | "waiting" | "degraded" | "unknown"

export function normalizeNlmTrainingState(latest: NlmTrainingLatest | null): NlmTrainingState {
  if (!latest) return "unknown"
  const status = String(latest.status ?? "").trim().toLowerCase()
  const progress = typeof latest.overall_progress === "number" ? latest.overall_progress : null
  if ((progress != null && progress >= 100) || status === "completed" || status === "complete" || status === "succeeded") return "completed"
  if (status === "live" || status === "training" || (progress != null && progress > 0)) return "training"
  if (status === "waiting" || status === "queued" || status === "idle") return "waiting"
  if (status === "degraded" || status === "failed" || status === "error") return "degraded"
  return "unknown"
}

export function normalizeProviderTimestamp(value: number | string | undefined): string | null {
  if (value == null) return null
  const parsed = typeof value === "number" ? new Date(value < 10_000_000_000 ? value * 1000 : value) : new Date(value)
  return Number.isFinite(parsed.getTime()) ? parsed.toISOString() : null
}
