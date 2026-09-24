/**
 * FormSpace local engine — runs in Next.js BFF.
 * Ports MAS `nlm/formspace` dynamics/graphing so tools work when
 * `/api/formspace` is not yet live on MAS 188.
 *
 * Fixture series are published catalog fixtures (provenance-labeled),
 * not fabricated live sensor streams or random metrics.
 */

import {
  accessSync,
  constants as fsConstants,
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from "node:fs"
import os from "node:os"
import path from "node:path"
import { FORMSPACE_DEMO_CATALOG } from "@/lib/formspace/demo-catalog"
import { nativeScan } from "@/lib/formspace/native-ssm"

/** Deterministic catalog fixtures aligned with MAS `atlas.DEMO_CHARTS`. */
const FIXTURE_SERIES: Record<string, number[]> = {
  "fs-spectral-demo-v1": [0.12, 0.18, 0.22, 0.19, 0.25, 0.31, 0.28, 0.33],
  "fs-acoustic-air-demo-v1": [0.05, 0.08, 0.4, 0.55, 0.2, 0.12, 0.1, 0.09],
  "fs-acoustic-hydro-demo-v1": [0.02, 0.03, 0.15, 0.45, 0.5, 0.3, 0.12, 0.06],
  "fs-fci-demo-v1": [0.4, 0.42, 0.41, 0.55, 0.62, 0.58, 0.5, 0.48],
  "fs-thermal-demo-v1": [0.2, 0.22, 0.28, 0.35, 0.5, 0.7, 0.65, 0.4],
  "fs-voc-demo-v1": [0.1, 0.15, 0.2, 0.35, 0.4, 0.32, 0.25, 0.18],
  "fs-mech-demo-v1": [0.08, 0.1, 0.6, 0.7, 0.2, 0.15, 0.12, 0.1],
  "fs-soil-demo-v1": [0.3, 0.32, 0.35, 0.33, 0.31, 0.29, 0.28, 0.3],
  "fs-weather-demo-v1": [0.25, 0.26, 0.27, 0.28, 0.3, 0.29, 0.27, 0.26],
  "fs-fusion-demo-v1": [0.2, 0.25, 0.3, 0.35, 0.4, 0.38, 0.36, 0.34],
  "fs-mycelium-demo-v1": [0.1, 0.15, 0.22, 0.3, 0.38, 0.45, 0.5, 0.52],
  "fs-fire-demo-v1": [0.15, 0.2, 0.35, 0.55, 0.75, 0.8, 0.6, 0.4],
}

export interface FormSpaceEngineEvidence {
  evidence_id: string
  recorded_at: string
  kind: string
  chart_id?: string
  graph_id?: string
  experiment_id?: string
  origin?: string
  user_id?: string | null
  [key: string]: unknown
}

export type FormSpaceStorageMode = "disk" | "tmp" | "memory"

interface FormSpaceStorage {
  mode: FormSpaceStorageMode
  dir: string | null
  error?: string
}

let resolvedStorage: FormSpaceStorage | null = null

function isWritableDir(dir: string): boolean {
  try {
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
    accessSync(dir, fsConstants.W_OK)
    return true
  } catch {
    return false
  }
}

/**
 * The production container runs as uid 1001 with a root-owned /app, so the
 * repo-relative `.data` path is not always writable. Resolve the first writable
 * location once; if none is writable, the engine keeps state in-process only.
 */
function storage(): FormSpaceStorage {
  if (resolvedStorage) return resolvedStorage
  const candidates: Array<{ dir: string; mode: FormSpaceStorageMode }> = []
  if (process.env.FORMSPACE_DATA_DIR) {
    candidates.push({ dir: process.env.FORMSPACE_DATA_DIR, mode: "disk" })
  }
  candidates.push({ dir: path.join(process.cwd(), ".data", "formspace"), mode: "disk" })
  candidates.push({ dir: path.join(os.tmpdir(), "mycosoft-formspace"), mode: "tmp" })
  for (const candidate of candidates) {
    if (isWritableDir(candidate.dir)) {
      resolvedStorage = { mode: candidate.mode, dir: candidate.dir }
      return resolvedStorage
    }
  }
  resolvedStorage = {
    mode: "memory",
    dir: null,
    error: "No writable FormSpace data directory; evidence is kept in-process only.",
  }
  return resolvedStorage
}

export function formspaceStorageInfo(): FormSpaceStorage {
  return { ...storage() }
}

function storagePath(fileName: string): string | null {
  const dir = storage().dir
  return dir ? path.join(dir, fileName) : null
}

function readJsonArray<T>(filePath: string | null): T[] | null {
  if (!filePath) return null
  try {
    if (!existsSync(filePath)) return []
    const raw = JSON.parse(readFileSync(filePath, "utf8"))
    return Array.isArray(raw) ? raw : []
  } catch {
    return null
  }
}

function writeJsonArray(filePath: string | null, items: unknown[]): boolean {
  if (!filePath) return false
  try {
    const tmp = `${filePath}.${process.pid}.tmp`
    writeFileSync(tmp, JSON.stringify(items, null, 2), "utf8")
    renameSync(tmp, filePath)
    return true
  } catch {
    return false
  }
}

function evidencePath(): string | null {
  return storagePath("evidence.json")
}

function memoryFile(userId: string): string | null {
  const safe = userId.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 64)
  return storagePath(`memory-${safe}.json`)
}

function loadEvidence(): FormSpaceEngineEvidence[] {
  return readJsonArray<FormSpaceEngineEvidence>(evidencePath()) ?? []
}

function saveEvidence(items: FormSpaceEngineEvidence[]) {
  writeJsonArray(evidencePath(), items.slice(-500))
}

const evidenceLog: FormSpaceEngineEvidence[] = []
const memoryByUser = new Map<string, Array<Record<string, unknown>>>()

function nowIso(): string {
  return new Date().toISOString()
}

function id(prefix: string): string {
  return `${prefix}-${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`
}

type EvidenceRow = { kind: string } & Record<string, unknown>

function appendEvidence(row: EvidenceRow) {
  const item: FormSpaceEngineEvidence = {
    evidence_id: id("ev"),
    recorded_at: nowIso(),
    storage: storage().mode,
    ...row,
  }
  evidenceLog.push(item)
  if (evidenceLog.length > 500) evidenceLog.splice(0, evidenceLog.length - 500)
  if (storage().dir) {
    const disk = loadEvidence()
    disk.push(item)
    saveEvidence(disk)
  }
  return item
}

/** Mirror a MAS-computed graph/experiment into the durable website evidence log. */
export function recordEvidence(row: EvidenceRow) {
  try {
    return appendEvidence(row)
  } catch {
    return null
  }
}

export function resolveSeries(options: {
  chart_id: string
  series?: number[] | null
  use_demo_fixture?: boolean
}): {
  series: number[]
  origin: string
  source: string
  label?: string
  provenance?: string
  message?: string
} {
  if (options.series && options.series.length > 0) {
    return {
      series: options.series.map(Number),
      origin: "MEASURED_OR_PROVIDED",
      source: "request",
    }
  }
  if (options.use_demo_fixture) {
    const fixture = FIXTURE_SERIES[options.chart_id]
    const meta = FORMSPACE_DEMO_CATALOG.find((c) => c.chart_id === options.chart_id)
    if (fixture?.length) {
      return {
        series: [...fixture],
        origin: "CATALOG_FIXTURE",
        source: "demo_catalog",
        label: "Demo / catalog",
        provenance: meta?.provenance,
      }
    }
  }
  return {
    series: [],
    origin: "NONE",
    source: "empty",
    message: "No observation series and no catalog fixture for this chart.",
  }
}

export function computeGraph(body: {
  chart_id: string
  series?: number[] | null
  use_demo_fixture?: boolean
  graph_kind?: string
  dt?: number
  a?: number
  b?: number
}) {
  const resolved = resolveSeries(body)
  if (!resolved.series.length) {
    return {
      ok: false,
      status: "no_data",
      graph_id: id("graph"),
      chart_id: body.chart_id,
      kind: body.graph_kind || "trajectory",
      points: [] as Array<{ t: number; input: number; state: number }>,
      message: resolved.message,
      p: null,
      live: false,
      engine: "website-formspace-local",
      ssm: "native_tied_A_rank1",
    }
  }

  const dt = body.dt ?? 0.1
  const a = body.a ?? -0.5
  const b = body.b ?? 1.0
  const { trajectory, finalState } = nativeScan(resolved.series, dt, a, b)
  const points = resolved.series.map((input, t) => ({
    t,
    input,
    state: trajectory[t],
  }))
  const graph_id = id("graph")
  appendEvidence({
    kind: "graph",
    graph_id,
    chart_id: body.chart_id,
    origin: resolved.origin,
  })

  return {
    ok: true,
    status: "computed",
    graph_id,
    chart_id: body.chart_id,
    kind: body.graph_kind || "trajectory",
    origin: resolved.origin,
    source: resolved.source,
    label: resolved.label,
    provenance: resolved.provenance,
    points,
    final_state: finalState,
    params: { dt, a, b, h0: 0 },
    p: null,
    live: resolved.origin === "MEASURED_OR_PROVIDED",
    computed_at: nowIso(),
    engine: "website-formspace-local",
    ssm: "native_tied_A_rank1",
    architecture_ref: "MAS/NLM nlm.model.ssm_blocks + formspace.native_ssm",
    note: "FormSpace native SSM scan (tied-A rank-1) on NLM signal-state dynamics. Catalog fixtures are provenance-labeled.",
  }
}

export function computeExperiment(body: {
  chart_id: string
  kind?: string
  series?: number[] | null
  use_demo_fixture?: boolean
  perturbation_index?: number
  perturbation_delta?: number
  user_id?: string | null
}) {
  const resolved = resolveSeries(body)
  if (!resolved.series.length) {
    return {
      ok: false,
      status: "no_data",
      chart_id: body.chart_id,
      message: resolved.message,
      p: null,
      engine: "website-formspace-local",
    }
  }

  const dt = 0.1
  const a = -0.5
  const b = 1.0
  const baseline = resolved.series
  const idx = Math.max(0, Math.min(body.perturbation_index ?? 3, baseline.length - 1))
  const delta = body.perturbation_delta ?? 0.3
  const perturbed = [...baseline]
  perturbed[idx] = perturbed[idx] + delta

  const base = nativeScan(baseline, dt, a, b)
  const pert = nativeScan(perturbed, dt, a, b)
  const residuals: number[] = []
  for (let i = idx; i < base.trajectory.length; i++) {
    residuals.push(Math.abs(pert.trajectory[i] - base.trajectory[i]))
  }
  const threshold = 0.05
  let recovered = false
  let recovery_step: number | null = null
  for (let offset = 0; offset < residuals.length; offset++) {
    if (residuals[offset] <= threshold) {
      recovered = true
      recovery_step = idx + offset
      break
    }
  }

  const experiment_id = id("exp")
  appendEvidence({
    kind: "experiment",
    experiment_id,
    chart_id: body.chart_id,
    origin: resolved.origin,
    user_id: body.user_id,
    recovered,
  })

  if (body.user_id) {
    appendMemory(body.user_id, {
      type: "experiment",
      experiment_id,
      chart_id: body.chart_id,
      summary: { recovered, recovery_step, status: "computed" },
    })
  }

  return {
    ok: true,
    status: "computed",
    experiment_id,
    chart_id: body.chart_id,
    kind: body.kind || "recovery",
    perturbation: { index: idx, delta },
    baseline_trajectory: base.trajectory,
    perturbed_trajectory: pert.trajectory,
    residuals_after_perturbation: residuals,
    recovered,
    recovery_step,
    threshold,
    p: null,
    origin: resolved.origin,
    source: resolved.source,
    label: resolved.label,
    computed_at: nowIso(),
    engine: "website-formspace-local",
    ssm: "native_tied_A_rank1",
    note: "Deterministic recovery trial via FormSpace native scan (NLM signal-state dynamics).",
  }
}

export function listEvidence(limit = 50) {
  const fromDisk = storage().dir ? loadEvidence() : []
  const merged = fromDisk.length ? fromDisk : evidenceLog
  const items = merged.slice(-limit).reverse()
  const info = storage()
  return {
    schema: "formspace.evidence/v1",
    count: items.length,
    items,
    engine: "website-formspace-local",
    storage: info.mode,
    note:
      info.mode === "memory"
        ? "FormSpace evidence is held in-process (no writable data directory). It resets when the site restarts."
        : "FormSpace evidence log (disk-backed). MINDEX Merkle roots appear when persisted.",
  }
}

export function appendMemory(userId: string, entry: Record<string, unknown>) {
  const list: Array<Record<string, unknown>> =
    readJsonArray<Record<string, unknown>>(memoryFile(userId)) ?? memoryByUser.get(userId) ?? []
  const item = {
    id: id("mem"),
    created_at: nowIso(),
    ...entry,
  }
  list.push(item)
  const trimmed = list.slice(-200)
  memoryByUser.set(userId, trimmed)
  writeJsonArray(memoryFile(userId), trimmed)
  return { ok: true, item, storage: storage().mode }
}

export function listMemory(userId: string | null) {
  if (!userId) {
    return {
      ok: false,
      auth_required: true,
      items: [] as Array<Record<string, unknown>>,
      saved_charts: [] as unknown[],
      message: "Sign in to load FormSpace memory.",
    }
  }
  const fromDisk = readJsonArray<Record<string, unknown>>(memoryFile(userId))
  const items: Array<Record<string, unknown>> =
    fromDisk && fromDisk.length ? fromDisk : memoryByUser.get(userId) || []
  return {
    ok: true,
    user_id: userId,
    items: [...items].reverse(),
    saved_charts: [] as unknown[],
    count: items.length,
    engine: "website-formspace-local",
  }
}

export function localEngineHealth() {
  return {
    status: "healthy",
    engine: "website-formspace-local",
    schema: "formspace.engine/v1",
    bound_to_ollama: false,
    model_kind: "nature_learning_model",
    ssm: "native_tied_A_rank1",
    demo_chart_count: FORMSPACE_DEMO_CATALOG.length,
    fixture_chart_count: Object.keys(FIXTURE_SERIES).length,
    evidence_count: (storage().dir ? loadEvidence().length : 0) || evidenceLog.length,
    storage: storage().mode,
    note: "Local FormSpace engine mirrors MAS native_ssm. MAS /api/formspace is preferred when reachable.",
  }
}
