"use client"

import { useMemo, useState } from "react"
import { Download, FileJson, Play, RefreshCcw, Search, Terminal } from "lucide-react"
import { Button } from "@/components/ui/button"
import type {
  SearchQaReport,
  SearchQaScenario,
} from "@/lib/search/search-qa-artifact"

interface ArtifactPayload {
  generatedAt: string
  version: string
  scenarioCount: number
  wordBank: Record<string, readonly string[]>
  templates: string[]
  scenarios: SearchQaScenario[]
  agentPrompt: string
}

const EMPTY_PAYLOAD: ArtifactPayload = {
  generatedAt: "",
  version: "",
  scenarioCount: 0,
  wordBank: {},
  templates: [],
  scenarios: [],
  agentPrompt: "",
}

export function SearchQaArtifactApp({ initialPayload = EMPTY_PAYLOAD }: { initialPayload?: ArtifactPayload }) {
  const [limit, setLimit] = useState(2500)
  const [payload, setPayload] = useState<ArtifactPayload>(initialPayload)
  const [report, setReport] = useState<SearchQaReport | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isRunning, setIsRunning] = useState(false)
  const [runCount, setRunCount] = useState(25)
  const [status, setStatus] = useState(
    initialPayload.scenarioCount
      ? `Ready with ${initialPayload.scenarioCount.toLocaleString()} generated scenarios.`
      : "Generate the scenario artifact to begin.",
  )

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const scenario of payload.scenarios) counts[scenario.category] = (counts[scenario.category] ?? 0) + 1
    return Object.entries(counts).sort((a, b) => b[1] - a[1])
  }, [payload.scenarios])

  async function generateArtifact() {
    setIsLoading(true)
    setStatus("Generating SearchPlan scenarios...")
    try {
      const res = await fetch(`/api/search/qa/artifact?limit=${limit}`, { cache: "no-store" })
      const json = await res.json()
      setPayload(json)
      setReport(null)
      setStatus(`Generated ${json.scenarioCount.toLocaleString()} scenarios.`)
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Failed to generate artifact.")
    } finally {
      setIsLoading(false)
    }
  }

  async function runPlanOnlyAudit() {
    setIsRunning(true)
    setStatus("Running plan-only audit against generated scenarios...")
    try {
      const res = await fetch("/api/search/qa/artifact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planOnly: true, limit: Math.max(1, runCount) }),
      })
      const json = await res.json()
      setReport(json)
      if (!payload.scenarios.length) {
        const generated = await fetch(`/api/search/qa/artifact?limit=${limit}`).then((r) => r.json())
        setPayload(generated)
      }
      setStatus(`Plan-only audit finished: ${json.findingCount} findings across ${json.observationCount} observations.`)
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Plan-only audit failed.")
    } finally {
      setIsRunning(false)
    }
  }

  function exportJson() {
    const blob = new Blob([JSON.stringify({ payload, report }, null, 2)], { type: "application/json" })
    downloadBlob(blob, `search-qa-artifact-${Date.now()}.json`)
  }

  function exportPrompt() {
    const prompt = report?.agentPrompt || payload.agentPrompt
    const blob = new Blob([prompt], { type: "text/markdown" })
    downloadBlob(blob, `search-qa-fix-prompt-${Date.now()}.md`)
  }

  const topScenarios = payload.scenarios.slice(0, 16)
  const topFindings = report?.findings.slice(0, 10) ?? []

  return (
    <main className="min-h-dvh bg-slate-950 px-4 py-8 text-slate-100">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <section className="rounded-2xl border border-white/12 bg-white/[0.06] p-5 shadow-2xl shadow-black/40 backdrop-blur-xl">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="flex items-center gap-3 text-cyan-200">
                <Search className="h-6 w-6" />
                <p className="text-sm uppercase tracking-[0.3em]">Search QA Artifact</p>
              </div>
              <h1 className="mt-3 text-3xl font-semibold text-white md:text-5xl">MYCOSOFT Search Intelligence QA</h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">
                Generates thousands of search scenarios, expected widget priorities, Earth filters, MYCA coordination rules,
                ETL expectations, latency budgets, and an agent-ready fix prompt from observed failures.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <label className="flex items-center gap-2 rounded-full border border-white/10 bg-black/30 px-4 py-2 text-sm">
                <span className="text-slate-400">Scenarios</span>
                <input
                  className="w-24 bg-transparent text-right text-white outline-none"
                  type="number"
                  min={1}
                  max={10000}
                  value={limit}
                  onChange={(event) => setLimit(Number(event.target.value))}
                />
              </label>
              <Button onClick={generateArtifact} disabled={isLoading}>
                <RefreshCcw className="mr-2 h-4 w-4" />
                Generate
              </Button>
              <Button onClick={runPlanOnlyAudit} disabled={isRunning}>
                <Play className="mr-2 h-4 w-4" />
                Plan Audit
              </Button>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-4">
          <Metric label="Scenarios" value={payload.scenarioCount || payload.scenarios.length} />
          <Metric label="Observed" value={report?.observationCount ?? 0} />
          <Metric label="Findings" value={report?.findingCount ?? 0} />
          <Metric label="Critical" value={report?.criticalCount ?? 0} tone={report?.criticalCount ? "danger" : "ok"} />
        </section>

        <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-5 backdrop-blur-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold">Scenario Coverage</h2>
              <div className="flex gap-2">
                <Button variant="outline" onClick={exportJson} disabled={!payload.scenarios.length}>
                  <FileJson className="mr-2 h-4 w-4" />
                  JSON
                </Button>
                <Button variant="outline" onClick={exportPrompt} disabled={!payload.scenarios.length && !report}>
                  <Download className="mr-2 h-4 w-4" />
                  Prompt
                </Button>
              </div>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {categoryCounts.map(([category, count]) => (
                <div key={category} className="rounded-xl border border-white/10 bg-black/25 px-4 py-3">
                  <div className="text-sm text-slate-400">{category}</div>
                  <div className="text-2xl font-semibold">{count.toLocaleString()}</div>
                </div>
              ))}
            </div>
            <div className="mt-5 overflow-hidden rounded-xl border border-white/10">
              <table className="w-full text-left text-sm">
                <thead className="bg-white/10 text-slate-300">
                  <tr>
                    <th className="px-3 py-2">Query</th>
                    <th className="px-3 py-2">Primary</th>
                    <th className="px-3 py-2">Widgets</th>
                    <th className="px-3 py-2">Earth Layers</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {topScenarios.map((scenario) => (
                    <tr key={scenario.id} className="align-top">
                      <td className="px-3 py-3 font-medium text-white">{scenario.query}</td>
                      <td className="px-3 py-3 text-cyan-200">{scenario.expectedPrimaryWidget ?? "none"}</td>
                      <td className="px-3 py-3 text-slate-300">{scenario.expectedWidgets.slice(0, 7).join(", ")}</td>
                      <td className="px-3 py-3 text-slate-400">{scenario.expectedEarthLayers.slice(0, 6).join(", ")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-5 backdrop-blur-xl">
            <h2 className="mb-4 flex items-center gap-2 text-xl font-semibold">
              <Terminal className="h-5 w-5 text-emerald-300" />
              Agent Fix Prompt
            </h2>
            <pre className="max-h-[520px] overflow-auto whitespace-pre-wrap rounded-xl border border-white/10 bg-black/40 p-4 text-xs leading-5 text-slate-300">
              {report?.agentPrompt || payload.agentPrompt || "Generate the artifact to create the prompt."}
            </pre>
          </div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-white/[0.05] p-5 backdrop-blur-xl">
          <h2 className="mb-4 text-xl font-semibold">Findings</h2>
          <p className="mb-4 text-sm text-slate-400">{status}</p>
          <div className="grid gap-3">
            {topFindings.length ? topFindings.map((finding) => (
              <div key={`${finding.scenarioId}-${finding.code}-${finding.message}`} className="rounded-xl border border-red-300/20 bg-red-500/10 p-4">
                <div className="text-sm uppercase tracking-[0.2em] text-red-200">{finding.severity} / {finding.code}</div>
                <div className="mt-1 font-semibold text-white">{finding.query}</div>
                <div className="mt-2 text-sm text-slate-300">{finding.message}</div>
                <div className="mt-2 text-xs text-slate-400">{finding.recommendedFix}</div>
              </div>
            )) : report ? (
              <div className="rounded-xl border border-emerald-300/20 bg-emerald-500/10 p-4 text-sm text-emerald-100">
                Plan audit passed for {report.observationCount.toLocaleString()} generated observations. Run the
                Playwright artifact for live home-to-search hydration, latency, click-through, and widget data checks.
              </div>
            ) : (
              <div className="rounded-xl border border-white/10 bg-black/25 p-4 text-sm text-slate-400">
                No findings loaded yet. Run a plan audit here, or run the Playwright artifact for live home-to-search QA.
              </div>
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-black/30 p-5 text-sm text-slate-300">
          <h2 className="mb-2 text-lg font-semibold text-white">Live Runner</h2>
          <p>
            Full UI navigation, latency, widget hydration, link checks, and JSON/prompt export are handled by
            <code className="mx-2 rounded bg-white/10 px-2 py-1">node scripts/search-qa-artifact.mjs --base http://localhost:3010 --limit 2500</code>
            or the same command against production. The runner starts on the home page, submits each query, follows through to the search page,
            reads <code className="mx-2 rounded bg-white/10 px-2 py-1">window.__MYCOSOFT_SEARCH_QA__</code>, exports JSON, and writes an agent prompt.
          </p>
        </section>
      </div>
    </main>
  )
}

function Metric({ label, value, tone }: { label: string; value: number; tone?: "ok" | "danger" }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-5 backdrop-blur-xl">
      <div className="text-sm text-slate-400">{label}</div>
      <div className={tone === "danger" ? "mt-2 text-3xl font-semibold text-red-300" : tone === "ok" ? "mt-2 text-3xl font-semibold text-emerald-300" : "mt-2 text-3xl font-semibold text-white"}>
        {value.toLocaleString()}
      </div>
    </div>
  )
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}
