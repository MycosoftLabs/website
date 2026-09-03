export type AlphaEvidenceState = "measured" | "configured" | "unavailable" | "synthetic"

export interface AlphaMetric {
  id: string
  label: string
  value: number | null
  unit: string
  state: AlphaEvidenceState
  observedAt: string | null
  source: string
  detail: string
}
export interface AlphaServiceProbe {
  id: "mindex" | "mas" | "mqtt"
  label: string
  state: AlphaEvidenceState
  latencyMs: number | null
  observedAt: string
  source: string
  detail: string
}

export interface AlphaObservabilitySnapshot {
  schemaVersion: "fusarium.alpha-observability.v1"
  generatedAt: string
  windowHours: number
  metrics: AlphaMetric[]
  services: AlphaServiceProbe[]
  warnings: string[]
}
