export type SourceClass =
  | "survey"
  | "telemetry"
  | "inferred"
  | "not_measured"
  | "in_boundary_cui"

export type EvidenceDisplay = "Not measured" | "Insufficient n" | "Survey" | "Inferred" | "Not available on this commercial surface"

export interface PersonnelRole {
  role_id: string
  persona_id: string
  service: string
  component_scope?: string | null
  personnel_type?: string | null
  specialty_code: string
  role_title: string
  workflow_id: string
  proposed_priority?: string | null
  typical_grade_range?: string | null
  example_pay_grade?: string | null
  example_longevity_or_step?: string | null
  example_annual_base_usd?: number | null
  pay_basis?: string | null
  applications?: string | null
  candidate_automation?: string | null
  retained_human_responsibility?: string | null
  proposed_training_id?: string | null
  staffing_disposition?: string | null
  specialty_verification?: string | null
  evidence_status?: string | null
  source_id?: string | null
  source_url?: string | null
  baseline_authorized_headcount: null
  baseline_assigned_headcount: null
  measured_headcount_change: null
  approved_billet_reduction: null
}

export interface PersonaEntitlements {
  defaultItdxView: string
  defaultEarthSimLayers: string[]
  defaultAerosolFocus: string
  defaultSaPanel: string
  primaryRoutes: string[]
  primaryTools: string[]
  uxEmphasis: {
    earthSim: boolean
    itdxLab: boolean
    personnelOutcomes: boolean
    mindex: boolean
    firmsAq: boolean
    movement: boolean
    restrictedCase: boolean
    healthWorkspace: boolean
    releaseQueue: boolean
    aerosol: boolean
    devices: boolean
    briefingSynthetic: boolean
  }
}

export interface PersonaProfile {
  persona_id: string
  title: string
  function_cluster: string
  description: string
  workflow_ids: string[]
  entitlements: PersonaEntitlements
}

export interface NasaTlxScores {
  mental: number
  physical: number
  temporal: number
  performance: number
  effort: number
  frustration: number
  weighted: boolean
}

export interface SurveyRecord {
  id: string
  submitted_at: string
  role_id: string
  persona_id: string
  instrument: "NASA-TLX" | "NIOSH-WellBQ-SCORES" | "REST_ERROR_INCIDENT"
  instrument_version: string
  source_class: "survey"
  scores: Record<string, number | null>
  comments?: string | null
  rest_hours_observed?: number | null
  error_events?: number | null
  error_opportunities?: number | null
  near_miss_events?: number | null
  injury_events?: number | null
}

export interface TelemetryRecord {
  id: string
  recorded_at: string
  role_id: string
  persona_id: string
  source_class: "telemetry"
  surface: string
  tool?: string | null
  tab?: string | null
  layer?: string | null
  seconds?: number | null
  comment?: string | null
}

export interface InferenceRecord {
  id: string
  created_at: string
  role_id: string
  persona_id: string
  source_class: "inferred"
  hypothesis: string
  uncertainty: string
  confidence: "low" | "medium"
  related_survey_ids: string[]
  fatality_reduction_claimed: false
}

export function evidenceLabel(source: SourceClass, n = 0): EvidenceDisplay {
  if (source === "in_boundary_cui") return "Not available on this commercial surface"
  if (source === "not_measured" || n === 0) return "Not measured"
  if (source === "inferred") return "Inferred"
  if (source === "survey") return n < 2 ? "Insufficient n" : "Survey"
  if (source === "telemetry") return "Survey"
  return "Not measured"
}

export function displayMeasuredNumber(value: number | null | undefined, n: number): string {
  if (value === null || value === undefined || n === 0) return "Not measured"
  return String(value)
}
