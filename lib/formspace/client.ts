/**
 * Client-side FormSpace types and fetch helpers.
 * All data from /api/formspace/* BFF — no mock series.
 */

export interface FormSpaceChart {
  chart_id: string
  name: string
  version?: string
  modalities?: string[]
  axes?: string[]
  nlm_model_ids?: string[]
  scope?: string
  provenance?: string
  label?: string
  has_fixture?: boolean
  live?: boolean
  owner_user_id?: string
  form_state?: Record<string, unknown>
}

export interface FormSpaceGraphPoint {
  t: number
  input: number
  state: number
}

export interface FormSpaceGraphResult {
  ok: boolean
  status?: string
  chart_id?: string
  points?: FormSpaceGraphPoint[]
  final_state?: number | null
  origin?: string
  source?: string
  label?: string
  message?: string
  p?: null
  live?: boolean
  note?: string
}

export interface FormSpaceExperimentResult {
  ok: boolean
  status?: string
  experiment_id?: string
  chart_id?: string
  recovered?: boolean
  recovery_step?: number | null
  baseline_trajectory?: number[]
  perturbed_trajectory?: number[]
  residuals_after_perturbation?: number[]
  message?: string
  p?: null
  note?: string
  label?: string
}

async function fsFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: {
      Accept: "application/json",
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...(init?.headers || {}),
    },
    cache: "no-store",
  })
  const data = (await res.json().catch(() => ({}))) as T & {
    error?: string
    message?: string
    detail?: string
  }
  if (!res.ok) {
    throw new Error(
      data.message || data.error || data.detail || `FormSpace request failed (${res.status})`,
    )
  }
  return data
}

export function fetchFormSpaceDemo() {
  return fsFetch<{
    charts: FormSpaceChart[]
    label?: string
    note?: string
    auth?: { logged_in: boolean; user_id?: string | null }
  }>("/api/formspace/demo")
}

export function fetchFormSpaceAtlas() {
  return fsFetch<{
    charts: FormSpaceChart[]
    chart_count: number
    auth: string
    note?: string
    user?: { id: string; email?: string | null } | null
  }>("/api/formspace/atlas")
}

export function postFormSpaceGraph(body: {
  chart_id: string
  use_demo_fixture?: boolean
  series?: number[]
}) {
  return fsFetch<FormSpaceGraphResult>("/api/formspace/graph", {
    method: "POST",
    body: JSON.stringify(body),
  })
}

export function postFormSpaceExperiment(body: {
  chart_id: string
  kind?: string
  use_demo_fixture?: boolean
  series?: number[]
  perturbation_index?: number
  perturbation_delta?: number
}) {
  return fsFetch<FormSpaceExperimentResult>("/api/formspace/experiment", {
    method: "POST",
    body: JSON.stringify(body),
  })
}

export function fetchFormSpaceEvidence() {
  return fsFetch<{
    items: Array<Record<string, unknown>>
    count: number
    note?: string
  }>("/api/formspace/evidence")
}

export function fetchFormSpaceMemory() {
  return fsFetch<{
    ok: boolean
    auth_required?: boolean
    items?: Array<Record<string, unknown>>
    saved_charts?: FormSpaceChart[]
    message?: string
    user?: { id: string; email?: string | null } | null
  }>("/api/formspace/memory")
}

export function saveFormSpaceChart(body: {
  name: string
  modalities?: string[]
  axes?: string[]
  nlm_model_ids?: string[]
}) {
  return fsFetch<{ ok: boolean; chart?: FormSpaceChart; message?: string }>(
    "/api/formspace/atlas",
    {
      method: "POST",
      body: JSON.stringify(body),
    },
  )
}

export function fetchFormSpaceHealth() {
  return fsFetch<{
    status: string
    demo_chart_count?: number
    nlm_weights_loaded?: boolean
    bound_to_ollama?: boolean
    note?: string
    mas_reachable?: boolean
  }>("/api/formspace/health")
}
