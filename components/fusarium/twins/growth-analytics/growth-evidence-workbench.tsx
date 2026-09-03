"use client"

import { useEffect, useState } from "react"
import { Activity, Database, FileJson, FlaskConical, RefreshCw, TrendingUp } from "lucide-react"
import { normalizeGrowthSourceResult } from "@/lib/fusarium/twins/growth-analytics/analysis.mjs"

type SourceState = { sourceId: string; state: string; detail: string; taxa?: number | null; observations?: number | null }
type Analysis = Record<string, any>

const EMPTY_IMPORT = `{
  "source": "lab-export-name",
  "metric": "biomass",
  "unit": "g",
  "freshnessThresholdHours": 24,
  "projectionHorizonHours": 2,
  "records": [
    { "observedAt": "2026-09-01T08:00:00Z", "value": 1.0 },
    { "observedAt": "2026-09-01T10:00:00Z", "value": 1.2 }
  ]
}`

const stateClass: Record<string, string> = {
  available: "border-emerald-500/40 bg-emerald-500/10 text-emerald-200",
  empty: "border-zinc-500/40 bg-zinc-500/10 text-zinc-300",
  stale: "border-amber-500/40 bg-amber-500/10 text-amber-200",
  unavailable: "border-rose-500/40 bg-rose-500/10 text-rose-200",
}

export function GrowthEvidenceWorkbench() {
  const [sources, setSources] = useState<SourceState[]>([])
  const [loading, setLoading] = useState(true)
  const [input, setInput] = useState(EMPTY_IMPORT)
  const [analysis, setAnalysis] = useState<Analysis | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function refreshSources() {
    setLoading(true)
    const definitions = [
      ["growth-model", "/api/growth/predict"],
      ["mindex-stats", "/api/natureos/mindex/stats"],
      ["mas-instrument", "/api/natureos/lab/growth/instrument-summary?limit=40"],
    ] as const
    const next = await Promise.all(definitions.map(async ([id, endpoint]) => {
      try {
        const response = await fetch(endpoint, { cache: "no-store" })
        const payload = await response.json().catch(() => ({}))
        return normalizeGrowthSourceResult(id, response.ok, payload) as SourceState
      } catch {
        return { sourceId: id, state: "unavailable", detail: "The local source request failed." }
      }
    }))
    setSources(next)
    setLoading(false)
  }

  useEffect(() => { void refreshSources() }, [])

  async function analyze() {
    setError(null)
    setAnalysis(null)
    let body: unknown
    try { body = JSON.parse(input) } catch { setError("Import is not valid JSON."); return }
    const response = await fetch("/api/fusarium/growth-analytics/analyze", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    })
    const payload = await response.json()
    if (!response.ok) { setError(Array.isArray(payload.errors) ? payload.errors.join(" ") : "Analysis failed."); return }
    setAnalysis(payload)
  }

  const descriptive = analysis?.descriptive
  return (
    <section className="mx-4 mt-4 rounded-2xl border border-emerald-500/25 bg-black/80 p-4 text-zinc-100 shadow-2xl backdrop-blur-xl md:mx-6" data-growth-evidence-workbench>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300"><Activity className="h-4 w-4" /> Fusarium evidence layer</div>
          <h2 className="mt-1 text-xl font-semibold">Observed growth analysis</h2>
          <p className="mt-1 max-w-3xl text-sm text-zinc-400">The preserved NatureOS forecast remains below. This layer analyzes only bounded imported observations and never presents a literature model as measured growth.</p>
        </div>
        <button onClick={() => void refreshSources()} className="flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm hover:border-emerald-500/60"><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh sources</button>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        {sources.map((source) => (
          <div key={source.sourceId} className={`rounded-xl border p-3 ${stateClass[source.state] ?? stateClass.unavailable}`}>
            <div className="flex items-center justify-between gap-2"><span className="font-medium">{source.sourceId}</span><span className="text-[10px] font-bold uppercase tracking-wider">{source.state}</span></div>
            <p className="mt-2 text-xs opacity-80">{source.detail}</p>
            {source.taxa != null || source.observations != null ? <p className="mt-2 text-xs tabular-nums">{source.taxa?.toLocaleString() ?? "Unknown"} taxa · {source.observations?.toLocaleString() ?? "Unknown"} observations</p> : null}
          </div>
        ))}
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <div className="rounded-xl border border-zinc-800 bg-zinc-950/80 p-3">
          <div className="mb-2 flex items-center gap-2 text-sm font-medium"><FileJson className="h-4 w-4 text-emerald-300" /> Import bounded JSON observations</div>
          <textarea aria-label="Growth observation JSON" value={input} onChange={(event) => setInput(event.target.value)} className="min-h-56 w-full resize-y rounded-lg border border-zinc-800 bg-black p-3 font-mono text-xs text-zinc-200 outline-none focus:border-emerald-500/70" />
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2"><p className="text-xs text-zinc-500">Maximum 500 observations / 256 KiB. Nothing is persisted.</p><button onClick={() => void analyze()} className="flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-black hover:bg-emerald-400"><FlaskConical className="h-4 w-4" /> Analyze import</button></div>
          {error ? <p className="mt-3 rounded-lg border border-rose-500/30 bg-rose-500/10 p-2 text-sm text-rose-200">{error}</p> : null}
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-950/80 p-3">
          <div className="mb-3 flex items-center gap-2 text-sm font-medium"><TrendingUp className="h-4 w-4 text-emerald-300" /> Deterministic result</div>
          {!analysis ? <div className="flex min-h-56 items-center justify-center text-center text-sm text-zinc-500"><div><Database className="mx-auto mb-2 h-8 w-8" />No imported analysis yet.</div></div> : (
            <div className="space-y-3">
              <div className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold uppercase ${stateClass[analysis.state] ?? stateClass.unavailable}`}>{analysis.state}</div>
              <p className="text-sm text-zinc-300">{analysis.provenance.metric} · {analysis.provenance.unit} · {analysis.provenance.source}</p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {[['Count', descriptive.count], ['First', descriptive.first], ['Last', descriptive.last], ['Change', descriptive.change], ['Mean', descriptive.mean], ['Slope / hour', descriptive.slopePerHour]].map(([label, value]) => <div key={String(label)} className="rounded-lg border border-zinc-800 bg-black/50 p-2"><div className="text-[10px] uppercase tracking-wider text-zinc-500">{label}</div><div className="mt-1 truncate font-mono text-sm">{typeof value === "number" ? Number(value.toFixed(4)) : "Unavailable"}</div></div>)}
              </div>
              <div className="rounded-lg border border-zinc-800 p-3 text-xs text-zinc-400"><strong className="text-zinc-200">Projection gate:</strong> {analysis.projectionGate.reason}</div>
              {analysis.projection ? <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-100"><strong>{Number(analysis.projection.projectedValue.toFixed(4))} {analysis.provenance.unit}</strong> at +{analysis.projection.horizonHours}h. {analysis.projection.label}</div> : null}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
