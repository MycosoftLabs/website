"use client"

import { useCallback, useEffect, useState } from "react"
import { GlassButton } from "@/components/ui/glass-button"
import { TrailGlassSection } from "@/components/fusarium/trail-glass-dock"

interface CampaignStatus {
  state?: string
  phase?: string
  forecast_p?: null
  mode?: string
  banner?: string
  arffs_found?: number
  arffs_executed?: number
  result_dir?: string
  correlation?: {
    ran?: number
    failed_or_timeout?: number
    blocked_or_inapplicable?: number
    jobs_total?: number
    accounted_entries?: number
    required_entries?: number
    schemes_executed?: Record<string, string[]>
    improvement_loop?: string[]
    honesty?: { trail_score?: string }
  }
  downloads?: Record<string, string>
}

export function WekaCampaignPanel({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  const [status, setStatus] = useState<CampaignStatus | null>(null)
  const [error, setError] = useState("")

  const refresh = useCallback(() => {
    void fetch("/api/fusarium/bluesight-trail/weka-campaign")
      .then((r) => r.json())
      .then((j) => {
        setStatus(j)
        setError("")
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "status failed"))
  }, [])

  useEffect(() => {
    refresh()
    const id = window.setInterval(refresh, 8000)
    return () => window.clearInterval(id)
  }, [refresh])

  async function startRun() {
    await fetch("/api/fusarium/bluesight-trail/weka-campaign", { method: "POST" })
    refresh()
  }

  const corr = status?.correlation
  const peek = `${status?.banner ?? status?.mode ?? "LOCAL"} · ${status?.state ?? "NOT_STARTED"} · trail ${corr?.honesty?.trail_score ?? "not yet scored"}`

  return (
    <TrailGlassSection id="weka-campaign" title="WEKA campaign" peek={peek} open={open} onToggle={onToggle}>
      <p className="font-mono text-[11px] text-zinc-300">
        {status?.banner ?? "LOCAL"} · WEKA ≠ NLM · live: false · forecast_p: null · fixture F1=1.000 is synthetic only
      </p>
      <p className="font-mono text-[11px] text-zinc-400">
        state {status?.state ?? "—"} · phase {status?.phase ?? "—"} · ARFFs found {status?.arffs_found ?? "—"} executed{" "}
        {status?.arffs_executed ?? "—"}
      </p>
      <p className="font-mono text-[11px] text-zinc-400">
        jobs {corr?.jobs_total ?? "—"} · ran {corr?.ran ?? "—"} · failed {corr?.failed_or_timeout ?? "—"} · blocked{" "}
        {corr?.blocked_or_inapplicable ?? "—"} · accounted {corr?.accounted_entries ?? "—"}/{corr?.required_entries ?? 149}
      </p>
      {corr?.schemes_executed ? (
        <ul className="font-mono text-[10px] text-zinc-400">
          <li>classify: {(corr.schemes_executed.classifier ?? []).length} schemes</li>
          <li>filter: {(corr.schemes_executed.filter ?? []).length} schemes</li>
          <li>cluster: {(corr.schemes_executed.clusterer ?? []).length} schemes</li>
        </ul>
      ) : null}
      {corr?.improvement_loop?.length ? (
        <div>
          <p className="text-zinc-500">Honest next steps (no fake lift)</p>
          <ul className="list-disc pl-4">
            {corr.improvement_loop.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ul>
        </div>
      ) : null}
      <p className="break-all font-mono text-[10px] text-zinc-500">{status?.result_dir}</p>
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <GlassButton onClick={() => void startRun()}>Run / resume campaign</GlassButton>
        <GlassButton onClick={refresh}>Refresh status</GlassButton>
        <GlassButton href="/api/fusarium/bluesight-trail/weka-campaign/file?name=results.jsonl" external>
          Download results.jsonl
        </GlassButton>
        <GlassButton href="/api/fusarium/bluesight-trail/weka-campaign/file?name=results.csv" external>
          Download CSV
        </GlassButton>
        <GlassButton href="/api/fusarium/bluesight-trail/weka-campaign/file?name=correlation.json" external>
          Download correlation
        </GlassButton>
      </div>
      {error ? <p className="text-red-400">{error}</p> : null}
    </TrailGlassSection>
  )
}
