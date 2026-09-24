"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import {
  Activity,
  Beaker,
  Brain,
  Database,
  LineChart,
  Map,
  RefreshCw,
} from "lucide-react"
import { ProductIcon } from "@/components/brand/product-icon"
import {
  fetchFormSpaceAtlas,
  fetchFormSpaceEvidence,
  fetchFormSpaceHealth,
  fetchFormSpaceMemory,
  postFormSpaceExperiment,
  postFormSpaceGraph,
  saveFormSpaceChart,
  type FormSpaceChart,
  type FormSpaceExperimentResult,
  type FormSpaceGraphResult,
} from "@/lib/formspace/client"
import { cn } from "@/lib/utils"

const WORKSPACE_TABS = [
  { id: "atlas", label: "Atlas", icon: Map },
  { id: "graphs", label: "Graphs", icon: LineChart },
  { id: "experiments", label: "Experiments", icon: Beaker },
  { id: "evidence", label: "Evidence", icon: Database },
  { id: "memory", label: "Memory", icon: Brain },
] as const

type WorkspaceTabId = (typeof WORKSPACE_TABS)[number]["id"]

interface AuthUser {
  id: string
  email?: string | null
}

function EmptyState({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="flex min-h-[12rem] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-black/15 bg-black/[0.03] px-6 py-8 text-center dark:border-white/20 dark:bg-white/[0.04]">
      <ProductIcon
        product="formspace"
        variant="current"
        className="h-8 w-8 text-black/40 dark:text-white/40"
      />
      <h3 className="text-sm font-semibold text-black dark:text-white">{title}</h3>
      <p className="max-w-md text-xs leading-relaxed text-black/60 dark:text-white/65">
        {detail}
      </p>
    </div>
  )
}

function Sparkline({
  values,
  className,
}: {
  values: number[]
  className?: string
}) {
  const path = useMemo(() => {
    if (!values.length) return ""
    const w = 280
    const h = 72
    const min = Math.min(...values)
    const max = Math.max(...values)
    const span = max - min || 1
    return values
      .map((v, i) => {
        const x = (i / Math.max(values.length - 1, 1)) * w
        const y = h - ((v - min) / span) * (h - 8) - 4
        return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`
      })
      .join(" ")
  }, [values])

  if (!values.length) return null
  return (
    <svg
      viewBox="0 0 280 72"
      className={cn("h-20 w-full text-black dark:text-white", className)}
      role="img"
      aria-label="FormSpace trajectory"
    >
      <path d={path} fill="none" stroke="currentColor" strokeWidth="2" />
    </svg>
  )
}

/**
 * FormSpace application workspace — Atlas / Graphs / Experiments / Evidence / Memory.
 * Wired to real FormSpace engine via /api/formspace/* (no mock metrics).
 */
export function FormSpaceWorkspace() {
  const [activeTab, setActiveTab] = useState<WorkspaceTabId>("atlas")
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [charts, setCharts] = useState<FormSpaceChart[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [user, setUser] = useState<AuthUser | null>(null)
  const [authMode, setAuthMode] = useState<"logged_out" | "logged_in">("logged_out")
  const [healthNote, setHealthNote] = useState<string>("")
  const [graph, setGraph] = useState<FormSpaceGraphResult | null>(null)
  const [experiment, setExperiment] = useState<FormSpaceExperimentResult | null>(null)
  const [evidence, setEvidence] = useState<Array<Record<string, unknown>>>([])
  const [memoryItems, setMemoryItems] = useState<Array<Record<string, unknown>>>([])
  const [savedCharts, setSavedCharts] = useState<FormSpaceChart[]>([])
  const [memoryMessage, setMemoryMessage] = useState<string | null>(null)
  const [isBusy, setIsBusy] = useState(false)
  const [saveName, setSaveName] = useState("")

  const selected = charts.find((c) => c.chart_id === selectedId) || charts[0] || null

  const loadCore = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const [atlas, health] = await Promise.all([
        fetchFormSpaceAtlas(),
        fetchFormSpaceHealth().catch(() => null),
      ])
      setCharts(atlas.charts || [])
      setAuthMode(atlas.auth === "logged_in" ? "logged_in" : "logged_out")
      setUser(atlas.user || null)
      setSelectedId((prev) => prev || atlas.charts?.[0]?.chart_id || null)
      if (health) {
        const parts = [
          health.mas_reachable === false ? "engine offline" : "engine online",
          health.nlm_weights_loaded ? "NLM weights loaded" : "NLM weights unloaded",
          health.bound_to_ollama ? "OLLAMA BOUND (invalid)" : "not Ollama",
        ]
        setHealthNote(parts.join(" · "))
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load FormSpace atlas")
      setCharts([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadCore()
  }, [loadCore])

  useEffect(() => {
    if (activeTab !== "evidence") return
    void fetchFormSpaceEvidence()
      .then((data) => setEvidence(data.items || []))
      .catch(() => setEvidence([]))
  }, [activeTab])

  useEffect(() => {
    if (activeTab !== "memory") return
    void fetchFormSpaceMemory()
      .then((data) => {
        setMemoryItems(data.items || [])
        setSavedCharts(data.saved_charts || [])
        setMemoryMessage(data.message || null)
        if (data.user) setUser(data.user)
      })
      .catch(() => {
        setMemoryItems([])
        setSavedCharts([])
      })
  }, [activeTab])

  async function runGraph() {
    if (!selected) return
    setIsBusy(true)
    setGraph(null)
    try {
      const result = await postFormSpaceGraph({
        chart_id: selected.chart_id,
        use_demo_fixture: true,
      })
      setGraph(result)
    } catch (err) {
      setGraph({
        ok: false,
        message: err instanceof Error ? err.message : "Graph failed",
        points: [],
      })
    } finally {
      setIsBusy(false)
    }
  }

  async function runExperiment() {
    if (!selected) return
    setIsBusy(true)
    setExperiment(null)
    try {
      const result = await postFormSpaceExperiment({
        chart_id: selected.chart_id,
        kind: "recovery",
        use_demo_fixture: true,
        perturbation_index: 3,
        perturbation_delta: 0.35,
      })
      setExperiment(result)
    } catch (err) {
      setExperiment({
        ok: false,
        message: err instanceof Error ? err.message : "Experiment failed",
      })
    } finally {
      setIsBusy(false)
    }
  }

  async function saveChart() {
    if (!saveName.trim()) return
    setIsBusy(true)
    try {
      await saveFormSpaceChart({
        name: saveName.trim(),
        modalities: selected?.modalities || [],
        axes: selected?.axes || [],
        nlm_model_ids: selected?.nlm_model_ids || [],
      })
      setSaveName("")
      await loadCore()
      setActiveTab("memory")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed")
    } finally {
      setIsBusy(false)
    }
  }

  return (
    <section
      aria-label="FormSpace application workspace"
      className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-black/10 bg-white/35 shadow-[inset_0_1px_0_rgba(255,255,255,0.55)] backdrop-blur-xl dark:border-white/15 dark:bg-black/30 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]"
    >
      <header className="flex flex-col gap-3 border-b border-black/10 px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-4 dark:border-white/10">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-black text-white dark:bg-white dark:text-black">
            <ProductIcon product="formspace" variant="current" className="h-5 w-5" title="FormSpace" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold tracking-tight text-black dark:text-white">FormSpace</p>
            <p className="truncate font-mono text-[10px] uppercase tracking-widest text-black/50 dark:text-white/50">
              {authMode === "logged_in" ? `Workspace · ${user?.email || user?.id}` : "Demo / catalog"}
              {healthNote ? ` · ${healthNote}` : ""}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void loadCore()}
            className="inline-flex min-h-[44px] min-w-[44px] touch-manipulation items-center justify-center rounded-lg border border-black/10 bg-white/40 px-3 text-xs dark:border-white/20 dark:bg-white/10"
            aria-label="Refresh FormSpace"
          >
            <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
          </button>
          <nav
            aria-label="FormSpace workspace sections"
            className="flex w-full max-w-full items-center gap-1 overflow-x-auto rounded-xl border border-black/10 bg-black/[0.03] p-1 dark:border-white/15 dark:bg-white/[0.04] md:w-fit"
          >
            {WORKSPACE_TABS.map((tab) => {
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  type="button"
                  aria-label={tab.label}
                  aria-pressed={isActive}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "flex min-h-[44px] flex-shrink-0 touch-manipulation items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition-all",
                    isActive
                      ? "bg-black text-white shadow-sm dark:bg-white dark:text-black"
                      : "text-black/50 hover:bg-black/5 hover:text-black/80 dark:text-white/55 dark:hover:bg-white/10 dark:hover:text-white",
                  )}
                >
                  <tab.icon className="h-3.5 w-3.5 shrink-0" />
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              )
            })}
          </nav>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5 md:p-6">
        {error && (
          <p className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-300">
            {error}
          </p>
        )}

        {isLoading ? (
          <div className="animate-pulse space-y-3">
            <div className="h-8 rounded-lg bg-black/10 dark:bg-white/10" />
            <div className="h-40 rounded-lg bg-black/10 dark:bg-white/10" />
          </div>
        ) : null}

        {!isLoading && activeTab === "atlas" && (
          <div className="space-y-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-base font-semibold text-black dark:text-white">Typed atlas</h2>
                <p className="text-sm text-black/60 dark:text-white/65">
                  Catalog charts linked to NLM modality/scenario models. Labeled Demo / catalog —
                  not live sensor streams.
                </p>
              </div>
              <p className="font-mono text-[10px] uppercase tracking-wider text-black/45 dark:text-white/45">
                {charts.length} charts
              </p>
            </div>

            {!charts.length ? (
              <EmptyState
                title="FormSpace atlas unavailable"
                detail="No catalog charts returned from the FormSpace engine. Check MAS /api/formspace/health."
              />
            ) : (
              <ul className="grid gap-3 sm:grid-cols-2">
                {charts.map((chart) => {
                  const isSelected = selected?.chart_id === chart.chart_id
                  return (
                    <li key={chart.chart_id}>
                      <button
                        type="button"
                        onClick={() => setSelectedId(chart.chart_id)}
                        className={cn(
                          "flex min-h-[44px] w-full flex-col items-start gap-1 rounded-xl border px-4 py-3 text-left touch-manipulation transition",
                          isSelected
                            ? "border-black bg-black text-white dark:border-white dark:bg-white dark:text-black"
                            : "border-black/10 bg-white/50 hover:border-black/25 dark:border-white/15 dark:bg-white/5",
                        )}
                      >
                        <span className="text-sm font-semibold">{chart.name}</span>
                        <span className="font-mono text-[10px] opacity-70">{chart.chart_id}</span>
                        <span className="text-xs opacity-80">
                          {(chart.modalities || []).slice(0, 4).join(" · ") || "axes pending"}
                        </span>
                        <span className="text-[10px] uppercase tracking-wider opacity-60">
                          {chart.label || chart.scope || "catalog"}
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}

            {selected && (
              <div className="rounded-xl border border-black/10 bg-white/40 p-4 dark:border-white/15 dark:bg-black/20">
                <h3 className="text-sm font-semibold text-black dark:text-white">{selected.name}</h3>
                <dl className="mt-2 grid gap-2 text-xs sm:grid-cols-2">
                  <div>
                    <dt className="uppercase tracking-wider text-black/45 dark:text-white/45">Axes</dt>
                    <dd>{(selected.axes || []).join(", ") || "—"}</dd>
                  </div>
                  <div>
                    <dt className="uppercase tracking-wider text-black/45 dark:text-white/45">NLM models</dt>
                    <dd className="font-mono">{(selected.nlm_model_ids || []).join(", ") || "—"}</dd>
                  </div>
                  <div className="sm:col-span-2">
                    <dt className="uppercase tracking-wider text-black/45 dark:text-white/45">Provenance</dt>
                    <dd>{selected.provenance || "—"}</dd>
                  </div>
                </dl>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab("graphs")
                      void runGraph()
                    }}
                    className="inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-black px-4 text-xs font-semibold text-white dark:bg-white dark:text-black"
                  >
                    <Activity className="h-3.5 w-3.5" />
                    Replay fixture graph
                  </button>
                  <Link
                    href="/myca/nlm"
                    className="inline-flex min-h-[44px] items-center rounded-lg border border-black/15 px-4 text-xs dark:border-white/25"
                  >
                    Open NLM training
                  </Link>
                </div>
              </div>
            )}
          </div>
        )}

        {!isLoading && activeTab === "graphs" && (
          <div className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-base font-semibold">Graphs</h2>
                <p className="text-sm text-black/60 dark:text-white/65">
                  Real series from FormSpace native SSM scan. Demo fixture replay is
                  provenance-labeled — not fabricated live metrics.
                </p>
              </div>
              <button
                type="button"
                disabled={!selected || isBusy}
                onClick={() => void runGraph()}
                className="inline-flex min-h-[44px] items-center justify-center rounded-lg bg-black px-4 text-xs font-semibold text-white disabled:opacity-40 dark:bg-white dark:text-black"
              >
                {isBusy ? "Computing…" : "Compute graph"}
              </button>
            </div>
            {!selected ? (
              <EmptyState title="Select a chart" detail="Pick a chart from Atlas first." />
            ) : !graph ? (
              <EmptyState
                title="No graph yet"
                detail={`Run compute for ${selected.chart_id} to project the catalog fixture through the FormSpace engine.`}
              />
            ) : !graph.ok || !(graph.points || []).length ? (
              <EmptyState
                title="No series available"
                detail={graph.message || "Engine returned no points."}
              />
            ) : (
              <div className="rounded-xl border border-black/10 bg-white/40 p-4 dark:border-white/15 dark:bg-black/20">
                    <p className="font-mono text-[10px] uppercase tracking-wider text-black/50 dark:text-white/50">
                  {graph.origin} · {graph.label || graph.source} · ssm=
                  {String((graph as { ssm?: string }).ssm || "native")} · final=
                  {String(graph.final_state)}
                  {(graph as { mas_source?: boolean }).mas_source === false
                    ? " · local engine"
                    : ""}
                </p>
                <Sparkline values={(graph.points || []).map((p) => p.state)} />
                <p className="mt-2 text-xs text-black/55 dark:text-white/60">{graph.note}</p>
              </div>
            )}
          </div>
        )}

        {!isLoading && activeTab === "experiments" && (
          <div className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-base font-semibold">Experiments</h2>
                <p className="text-sm text-black/60 dark:text-white/65">
                  Perturbation → recovery trial via FormSpace dynamics. Does not invent attractor
                  claims without measured evidence.
                </p>
              </div>
              <button
                type="button"
                disabled={!selected || isBusy}
                onClick={() => void runExperiment()}
                className="inline-flex min-h-[44px] items-center justify-center rounded-lg bg-black px-4 text-xs font-semibold text-white disabled:opacity-40 dark:bg-white dark:text-black"
              >
                {isBusy ? "Running…" : "Run recovery trial"}
              </button>
            </div>
            {!experiment ? (
              <EmptyState
                title="No experiment yet"
                detail="Run a recovery trial against the selected catalog chart fixture."
              />
            ) : !experiment.ok ? (
              <EmptyState title="Experiment unavailable" detail={experiment.message || "Failed"} />
            ) : (
              <div className="space-y-3 rounded-xl border border-black/10 bg-white/40 p-4 dark:border-white/15 dark:bg-black/20">
                <p className="text-sm font-semibold">
                  Recovered: {experiment.recovered ? "yes" : "not within threshold"}
                  {experiment.recovery_step != null ? ` @ step ${experiment.recovery_step}` : ""}
                </p>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-black/45">Baseline</p>
                  <Sparkline values={experiment.baseline_trajectory || []} />
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-black/45">Perturbed</p>
                  <Sparkline values={experiment.perturbed_trajectory || []} />
                </div>
                <p className="text-xs text-black/55 dark:text-white/60">{experiment.note}</p>
              </div>
            )}
          </div>
        )}

        {!isLoading && activeTab === "evidence" && (
          <div className="space-y-4">
            <h2 className="text-base font-semibold">Evidence</h2>
            <p className="text-sm text-black/60 dark:text-white/65">
              Engine evidence log for charts, graphs, and experiments. Merkle roots appear when
              persisted to MINDEX — empty when none.
            </p>
            {!evidence.length ? (
              <EmptyState
                title="No evidence yet"
                detail="Run a graph or experiment to append evidence. Nothing is fabricated here."
              />
            ) : (
              <ul className="space-y-2">
                {evidence.map((item) => (
                  <li
                    key={String(item.evidence_id || item.recorded_at)}
                    className="rounded-lg border border-black/10 bg-white/40 px-3 py-2 text-xs dark:border-white/15 dark:bg-black/20"
                  >
                    <p className="font-semibold">{String(item.kind)}</p>
                    <p className="font-mono text-[10px] opacity-70">
                      {String(item.evidence_id)} · {String(item.recorded_at || "")}
                    </p>
                    <p className="mt-1 opacity-80">
                      {item.chart_id ? `chart=${String(item.chart_id)}` : null}
                      {item.graph_id ? ` graph=${String(item.graph_id)}` : null}
                      {item.experiment_id ? ` exp=${String(item.experiment_id)}` : null}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {!isLoading && activeTab === "memory" && (
          <div className="space-y-4">
            <h2 className="text-base font-semibold">Memory</h2>
            {authMode !== "logged_in" ? (
              <EmptyState
                title="Sign in for FormSpace memory"
                detail="Logged-out visitors get the demo catalog. Saved charts, experiment memory, and NLM model links require auth."
              />
            ) : (
              <>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <input
                    type="text"
                    value={saveName}
                    onChange={(e) => setSaveName(e.target.value)}
                    placeholder="Name a chart to save"
                    className="h-12 w-full rounded-lg border border-black/15 bg-white/60 px-3 text-base dark:border-white/20 dark:bg-black/30"
                  />
                  <button
                    type="button"
                    disabled={isBusy || !saveName.trim()}
                    onClick={() => void saveChart()}
                    className="inline-flex min-h-[44px] items-center justify-center rounded-lg bg-black px-4 text-xs font-semibold text-white disabled:opacity-40 dark:bg-white dark:text-black"
                  >
                    Save chart
                  </button>
                </div>
                {memoryMessage && (
                  <p className="text-xs text-black/55 dark:text-white/60">{memoryMessage}</p>
                )}
                <div>
                  <h3 className="text-sm font-semibold">Saved charts</h3>
                  {!savedCharts.length ? (
                    <p className="mt-2 text-xs text-black/50">No saved charts yet.</p>
                  ) : (
                    <ul className="mt-2 space-y-1 text-xs">
                      {savedCharts.map((c) => (
                        <li key={c.chart_id} className="font-mono">
                          {c.chart_id} — {c.name}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div>
                  <h3 className="text-sm font-semibold">Experiment memory</h3>
                  {!memoryItems.length ? (
                    <p className="mt-2 text-xs text-black/50">
                      Run a logged-in experiment to store memory entries.
                    </p>
                  ) : (
                    <ul className="mt-2 space-y-2">
                      {memoryItems.map((item) => (
                        <li
                          key={String(item.id)}
                          className="rounded-lg border border-black/10 px-3 py-2 text-xs dark:border-white/15"
                        >
                          <p className="font-semibold">{String(item.type)}</p>
                          <p className="font-mono text-[10px] opacity-70">
                            {String(item.id)} · {String(item.created_at || "")}
                          </p>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <Link href="/login" className="text-xs underline opacity-70">
                  Account / session
                </Link>
              </>
            )}
            {authMode !== "logged_in" && (
              <Link
                href="/login"
                className="inline-flex min-h-[44px] items-center justify-center rounded-lg border border-black/15 px-4 text-sm dark:border-white/25"
              >
                Sign in
              </Link>
            )}
          </div>
        )}
      </div>
    </section>
  )
}
