"use client"

import { useCallback, useEffect, useState } from "react"
import { GlassButton } from "@/components/ui/glass-button"
import { TrailGlassSection } from "@/components/fusarium/trail-glass-dock"

interface LocalJob {
  id: string
  family: string
  scheme: string
  dataset_id: string
  honesty: string
  ran: boolean
  percent_correct: number | null
  f1_weighted: number | null
  detail: string
}

interface LocalWekaStatus {
  mode?: string
  banner?: string
  trail_score?: string
  java?: string | null
  weka_jar?: string | null
  result_dir?: string
  campaign_on_disk?: {
    results_csv?: boolean
    coverage?: { accounted?: number; required?: number; scientific_readiness_established?: boolean }
  }
  local_scores?: { written_at?: string; jobs?: LocalJob[] } | null
}

export function LocalWekaPanel({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  const [status, setStatus] = useState<LocalWekaStatus | null>(null)
  const [error, setError] = useState("")
  const [isRunning, setIsRunning] = useState(false)

  const refresh = useCallback(() => {
    void fetch("/api/fusarium/itdx/local-weka")
      .then((r) => r.json())
      .then((json) => {
        setStatus(json)
        setError("")
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "local weka status failed"))
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  async function runLocal() {
    setIsRunning(true)
    try {
      const res = await fetch("/api/fusarium/itdx/local-weka", { method: "POST" })
      const json = await res.json()
      setStatus(json)
      if (!res.ok) setError(json.error || "local WEKA run failed")
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "local WEKA run failed")
    } finally {
      setIsRunning(false)
    }
  }

  const jobs = status?.local_scores?.jobs ?? []
  const peek = `${status?.banner ?? "LOCAL WEKA"} · trail ${status?.trail_score ?? "not yet scored"} · jobs ${jobs.length}`

  return (
    <TrailGlassSection id="local-weka" title="Local WEKA scores" peek={peek} open={open} onToggle={onToggle}>
      <p className="font-mono text-[11px] text-zinc-300">
        Proper scores = real WEKA CLI stdout written to ARFF/CSV. WEKA ≠ NLM · forecast_p: null
      </p>
      <p className="font-mono text-[11px] text-zinc-400">
        Sep 14 campaign on disk: coverage {status?.campaign_on_disk?.coverage?.accounted ?? "—"}/
        {status?.campaign_on_disk?.coverage?.required ?? 149} · scientific readiness{" "}
        {String(status?.campaign_on_disk?.coverage?.scientific_readiness_established ?? false)}
      </p>
      <p className="break-all font-mono text-[10px] text-zinc-500">java {status?.java ?? "missing"}</p>
      <p className="break-all font-mono text-[10px] text-zinc-500">weka {status?.weka_jar ?? "missing"}</p>
      {jobs.length ? (
        <ul className="space-y-2 font-mono text-[10px] text-zinc-300">
          {jobs.map((job) => (
            <li key={job.id}>
              <span className="text-zinc-100">{job.honesty}</span> · {job.scheme} · {job.dataset_id}
              {job.f1_weighted != null ? ` · F1 ${job.f1_weighted.toFixed(3)}` : " · F1 n/a"}
              {job.percent_correct != null ? ` · ${job.percent_correct}%` : ""}
              <div className="text-zinc-500">{job.detail}</div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-zinc-500">No local CLI ledger yet. Sep 14 campaign files remain the compatibility receipts.</p>
      )}
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <GlassButton onClick={() => void runLocal()} disabled={isRunning}>
          {isRunning ? "Running local WEKA…" : "Run local WEKA CLI"}
        </GlassButton>
        <GlassButton onClick={refresh}>Refresh local scores</GlassButton>
        <GlassButton href="/api/fusarium/itdx/local-weka/file?name=scores.csv" external>
          Download local CSV
        </GlassButton>
      </div>
      {error ? <p className="text-red-400">{error}</p> : null}
    </TrailGlassSection>
  )
}
