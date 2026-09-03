import type { ScalarSample, VisualProvenance } from "@/lib/fusarium/sensing-visuals/contracts"

export const SINE_REPLAY_SCHEMA = "mycosoft.sine.replay.v1" as const
export const SINE_REPLAY_MAX_SAMPLES = 16_384

export interface SineReplayEvidence {
  schema: typeof SINE_REPLAY_SCHEMA
  evidenceId: string
  observedAt: string
  deviceId: string | null
  sensorId: string
  sampleRateHz: number
  unit: string
  samples: number[]
  provenance: {
    sourceId: string
    notes: string | null
  }
}

export type SineReplayValidation =
  | { ok: true; value: SineReplayEvidence; issues: [] }
  | { ok: false; value: null; issues: string[] }

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function nonEmpty(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null
}

export function validateSineReplayEvidence(input: unknown): SineReplayValidation {
  const issues: string[] = []
  if (!record(input)) return { ok: false, value: null, issues: ["Replay evidence must be a JSON object."] }
  if (input.schema !== SINE_REPLAY_SCHEMA) issues.push(`schema must equal ${SINE_REPLAY_SCHEMA}.`)
  const evidenceId = nonEmpty(input.evidenceId)
  const observedAt = nonEmpty(input.observedAt)
  const sensorId = nonEmpty(input.sensorId)
  const unit = nonEmpty(input.unit)
  const deviceId = input.deviceId === null || input.deviceId === undefined ? null : nonEmpty(input.deviceId)
  const provenance = record(input.provenance) ? input.provenance : null
  const sourceId = provenance ? nonEmpty(provenance.sourceId) : null
  const notes = provenance?.notes === null || provenance?.notes === undefined ? null : nonEmpty(provenance.notes)
  const sampleRateHz = typeof input.sampleRateHz === "number" && Number.isFinite(input.sampleRateHz) ? input.sampleRateHz : null

  if (!evidenceId) issues.push("evidenceId is required.")
  if (!observedAt || Number.isNaN(Date.parse(observedAt))) issues.push("observedAt must be an ISO-compatible timestamp.")
  if (input.deviceId !== null && input.deviceId !== undefined && !deviceId) issues.push("deviceId must be non-empty or null.")
  if (!sensorId) issues.push("sensorId is required.")
  if (!unit) issues.push("unit is required.")
  if (!sourceId) issues.push("provenance.sourceId is required.")
  if (sampleRateHz === null || sampleRateHz <= 0 || sampleRateHz > 384_000) issues.push("sampleRateHz must be greater than zero and at most 384000.")
  if (!Array.isArray(input.samples)) issues.push("samples must be an array.")
  const samples = Array.isArray(input.samples) ? input.samples : []
  if (samples.length < 2) issues.push("samples must contain at least two values.")
  if (samples.length > SINE_REPLAY_MAX_SAMPLES) issues.push(`samples exceeds the ${SINE_REPLAY_MAX_SAMPLES} value limit.`)
  if (samples.some((value) => typeof value !== "number" || !Number.isFinite(value))) issues.push("samples must contain only finite numbers.")

  if (issues.length || !evidenceId || !observedAt || !sensorId || !unit || !sourceId || sampleRateHz === null) {
    return { ok: false, value: null, issues }
  }
  return {
    ok: true,
    value: {
      schema: SINE_REPLAY_SCHEMA,
      evidenceId,
      observedAt,
      deviceId,
      sensorId,
      sampleRateHz,
      unit,
      samples: samples as number[],
      provenance: { sourceId, notes },
    },
    issues: [],
  }
}

export function sineReplaySamples(evidence: SineReplayEvidence): ScalarSample[] {
  const start = Date.parse(evidence.observedAt)
  return evidence.samples.map((value, index) => ({ timestamp: start + (index / evidence.sampleRateHz) * 1000, value }))
}

export function sineReplayProvenance(evidence: SineReplayEvidence): VisualProvenance {
  return {
    sourceId: evidence.provenance.sourceId,
    observedAt: evidence.observedAt,
    evidenceId: evidence.evidenceId,
    mode: "REPLAY",
  }
}
