export const LOCAL_REPLAY_RUN_ID: string
export const LOCAL_DATASET_ID: string
export const CARD_STEP: number
export const MAS_TASK8_PATHS: readonly string[]
export const CARD_DEFS: readonly { id: string; title: string; math: string }[]
export function cardIndexFromReplay(index: number): number
export function conformalSetLabel(predictionSet: unknown): string
export function officialInjectsStatus(supplied?: { scale_1_to_5?: number } | null): { status: string; scale_1_to_5: number | null; note?: string }
export function nlmQualification(health?: { model_loaded?: boolean } | null, checkpoints?: { count?: number; checkpoints?: unknown[] } | null, predict?: { text?: string } | string | null): {
  qualification: string
  task12_path: string
  model_loaded: boolean
  checkpoint_count: number
  missing_artifact?: string
}
export function sevenRoleQualification(task8?: { roles?: Array<{ bound?: boolean }>; source?: string } | null): {
  qualification: string
  role_count: number
  source: string
  missing_artifact?: string
}
export function normalizeMasTask8(payload: unknown, path: string): {
  source: 'mas'
  path: string
  schema: string
  roles: Array<{ id: string; label: string; verdict: string; bound: boolean; note: string }>
  options: unknown[]
  seven_role: boolean
} | null
export function buildEvidenceSummary(input: {
  context?: { runId?: string | null; datasetId?: string | null; documentId?: string | null; dataOrigin?: string }
  bootstrap?: { runs?: unknown[] }
  dataset?: Record<string, unknown> | null
  document?: Record<string, unknown> | null
  backendRun?: Record<string, unknown> | null
}): {
  ok: boolean
  status: number
  kind: string
  label: string
  detail: string
  refs: Array<Record<string, unknown>>
  data_origin: string
  synthetic: true
  live: false
}
export function buildCards(input: {
  replayIndex: number
  selected?: { id?: string; label?: string; observed_at?: string | null; p_truth?: number | null } | null
  bind?: Record<string, unknown> | null
  formspace?: Record<string, any> | null
  task8?: { source?: string; roles?: Array<{ bound?: boolean }>; options?: Array<Record<string, unknown>> } | null
}): Array<{
  id: string
  title: string
  math: string
  index: number
  active: boolean
  reached: boolean
  live: string[]
  body: string
}>
