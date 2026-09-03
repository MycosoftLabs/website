/**
 * Source-only Nature Learning Model evidence contract.
 * NLM output is advice, not an autonomous threat decision.
 */

export const NLM_EVIDENCE_SCHEMA = "fusarium-nlm-evidence/v1"

export type NlmHumanReviewState =
  | "not_reviewed"
  | "pending"
  | "accepted"
  | "rejected"
  | "deferred"

export type NlmMode = "live" | "replay" | "forecast" | "simulated"

export interface NlmEvidenceRecord {
  modelName: string | null
  modelVersion: string | null
  modelOwner: string | null
  inputRecordIds: string[]
  evidenceRefs: string[]
  inferenceAt: string | null
  observationAt: string | null
  outputSchemaVersion: string
  confidence: number | null
  uncertainty: string
  calibrationBasis: string | null
  thresholds: string[]
  explanation: string | null
  trainingProvenanceRef: string | null
  validationStatus: "not_validated" | "validated" | "limited" | "unknown"
  knownLimitations: string[]
  classification: "UNCLASSIFIED"
  mode: NlmMode
  humanReviewState: NlmHumanReviewState
  expiresAt: string | null
  freshness: "fresh" | "stale" | "unknown" | "unavailable"
  auditId: string | null
  correlationId: string | null
  autonomousDecision: false
}

export const EMPTY_NLM_EVIDENCE: NlmEvidenceRecord = {
  modelName: null,
  modelVersion: null,
  modelOwner: null,
  inputRecordIds: [],
  evidenceRefs: [],
  inferenceAt: null,
  observationAt: null,
  outputSchemaVersion: NLM_EVIDENCE_SCHEMA,
  confidence: null,
  uncertainty: "No deployed model; uncertainty is total.",
  calibrationBasis: null,
  thresholds: [],
  explanation: null,
  trainingProvenanceRef: null,
  validationStatus: "not_validated",
  knownLimitations: ["Bridge may be present while the model is absent.", "No inference endpoint was called."],
  classification: "UNCLASSIFIED",
  mode: "live",
  humanReviewState: "not_reviewed",
  expiresAt: null,
  freshness: "unavailable",
  auditId: null,
  correlationId: null,
  autonomousDecision: false,
}

export const NLM_SA_CONSUMER = {
  surface: "situational-awareness",
  schema: "fusarium-situational-awareness/v1",
  behavior: "May display NLM-derived observations only with explicit provenance and uncertainty. Empty when unbound.",
}

export const NLM_TA_CONSUMER = {
  surface: "threat-assessment",
  schema: "fusarium-threat-assessment/v1",
  behavior: "Treat NLM output as a reviewable analytic input. Never an automatic release, command, targeting, or actuation decision.",
}

export function nlmMayActuate(record: NlmEvidenceRecord): boolean {
  return record.autonomousDecision
}
