export interface WekaWalkthroughTask {
  task: string
  status: string
  f1: number | null
  brier_independent: number | null
  abstentions: number | null
  input_sha256?: string
}

export interface WekaWalkthroughCase {
  case: string
  tasks: WekaWalkthroughTask[]
}

export interface WekaWalkthrough {
  schema: string
  source: string
  kit_version: string
  verify_status: string
  receipt_status: string
  arithmetic_status: string
  arithmetic_checks: number
  artifacts_verified: number
  weka_execution: string
  prediction_execution: string
  execution_mode: string
  run_id: string
  app_version: string
  model_sha256: string
  dataset_sha256: string
  request_sha256: string
  qualification: string
  formspace_is_not_mas: true
  java_note: string
  windows_fix: string
  limits: string[]
  cases: WekaWalkthroughCase[]
  trial_criteria_status?: string
  criteria_authority?: string
  field_readiness?: string
  failed_gates?: Array<{ id: string; observed: unknown; criterion: unknown; claim: string }>
  passed_arithmetic_gate?: boolean
  live_kit_receipt?: boolean
  error?: string
}
