"use client"

import { useCallback, useEffect, useState } from "react"
import { Globe, RefreshCw, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Progress } from "@/components/ui/progress"
import { GlassCard, TravelingBorder } from "@/components/ui/glowing-border"
import { TransactionBlockStrip } from "@/components/ui/data-block-viz"
import { DataFlow } from "@/components/mindex/data-flow"
import { QueryMonitor } from "@/components/mindex/query-monitor"
import { AgentActivity } from "@/components/mindex/agent-activity"

import type { ETLStatus, MINDEXStats } from "./mindex-dashboard-types"

export function DataPipelineSection({
  stats,
  etlStatus,
  isSyncing,
  triggerSync,
}: {
  stats: MINDEXStats | null
  etlStatus: ETLStatus | null
  isSyncing: boolean
  triggerSync: (sources?: string[]) => void
}) {
  const [etlModules, setEtlModules] = useState<string[]>([])
  const [etlScanPath, setEtlScanPath] = useState<string | null>(null)
  const [etlModulesError, setEtlModulesError] = useState<string | null>(null)

  const loadEtlModules = useCallback(async () => {
    setEtlModulesError(null)
    try {
      const res = await fetch("/api/mindex/etl/sources", { cache: "no-store" })
      if (!res.ok) {
        setEtlModules([])
        setEtlScanPath(null)
        setEtlModulesError(`HTTP ${res.status}`)
        return
      }
      const body = (await res.json()) as { items?: string[]; scanned_path?: string }
      setEtlModules(Array.isArray(body.items) ? body.items : [])
      setEtlScanPath(typeof body.scanned_path === "string" ? body.scanned_path : null)
    } catch (e) {
      setEtlModules([])
      setEtlScanPath(null)
      setEtlModulesError(e instanceof Error ? e.message : "fetch_failed")
    }
  }, [])

  useEffect(() => {
    void loadEtlModules()
  }, [loadEtlModules])

  const [pipelineSse, setPipelineSse] = useState<string | null>(null)
  const [pipelineSseError, setPipelineSseError] = useState<string | null>(null)

  useEffect(() => {
    setPipelineSseError(null)
    const es = new EventSource("/api/mindex/pipeline/stream")
    es.onmessage = (ev) => {
      try {
        const parsed = JSON.parse(ev.data as string) as unknown
        setPipelineSse(JSON.stringify(parsed, null, 2).slice(0, 4000))
      } catch {
        setPipelineSse(String(ev.data ?? "").slice(0, 4000))
      }
    }
    es.onerror = () => {
      setPipelineSseError("SSE disconnected or blocked (check MINDEX /pipeline/stream and BFF).")
      es.close()
    }
    return () => es.close()
  }, [])

  return (
    <div className="space-y-6">
      <TravelingBorder color="green">
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <Zap className="h-5 w-5 text-green-400" />
                Data Sync Control
              </h3>
              <p className="text-sm text-gray-400">Trigger manual sync from external databases</p>
            </div>
            <Button onClick={() => triggerSync()} disabled={isSyncing} className="bg-green-600 hover:bg-green-700">
              {isSyncing ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Syncing...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Sync All
                </>
              )}
            </Button>
          </div>

          <div className="flex flex-wrap gap-2">
            {etlStatus?.available_sources?.map((source) => (
              <Button
                key={source}
                variant="outline"
                size="sm"
                onClick={() => triggerSync([source])}
                disabled={isSyncing}
                className="border-green-500/30 text-green-300 hover:bg-green-500/20"
              >
                <Globe className="h-3 w-3 mr-1" />
                {source}
              </Button>
            ))}
          </div>
        </div>
      </TravelingBorder>

      <GlassCard color="cyan">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-3">
          <div>
            <h3 className="text-lg font-semibold text-white">ETL job modules (repo scan)</h3>
            <p className="text-sm text-gray-400">
              From MINDEX <span className="font-mono text-gray-300">GET /api/mindex/etl/sources</span>. Empty list means the API
              image has no <span className="font-mono">mindex_etl/jobs</span> tree.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void loadEtlModules()}
            className="min-h-[44px] border-cyan-500/40 text-cyan-200"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Rescan
          </Button>
        </div>
        {etlModulesError ? (
          <p className="text-sm text-amber-300 mb-2">Could not load job list: {etlModulesError}</p>
        ) : null}
        {etlScanPath ? <p className="text-xs text-gray-500 mb-2 font-mono break-all">{etlScanPath}</p> : null}
        <ScrollArea className="h-40 rounded-md border border-white/10">
          <ul className="text-sm text-gray-300 font-mono px-3 py-2 space-y-1">
            {etlModules.length === 0 && !etlModulesError ? (
              <li className="text-gray-500">No modules discovered.</li>
            ) : null}
            {etlModules.map((m) => (
              <li key={m}>{m}</li>
            ))}
          </ul>
        </ScrollArea>
      </GlassCard>

      <GlassCard color="purple">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-2">
          <div>
            <h3 className="text-lg font-semibold text-white">Pipeline SSE</h3>
            <p className="text-sm text-gray-400">
              Live tail from <span className="font-mono">GET /api/mindex/pipeline/stream</span> (via BFF). Shows last payload
              snapshot (~8s cadence).
            </p>
          </div>
        </div>
        {pipelineSseError ? <p className="text-sm text-amber-300 mb-2">{pipelineSseError}</p> : null}
        <ScrollArea className="h-48 rounded-md border border-white/10 bg-black/30">
          <pre className="text-xs font-mono text-gray-300 p-3 whitespace-pre-wrap break-all">
            {pipelineSse || "Waiting for first SSE frame…"}
          </pre>
        </ScrollArea>
      </GlassCard>

      <div className="grid gap-4 lg:grid-cols-2">
        <GlassCard color="green">
          <h3 className="text-lg font-semibold text-white mb-4">Transaction Blocks</h3>
          <p className="text-xs text-gray-500 mb-2">
            Pending anchor queue visualization is not wired — strip shows no synthetic blocks until ledger queue API is
            connected.
          </p>
          <TransactionBlockStrip height={80} blocks={[]} />
          <div className="mt-4 flex justify-between text-xs text-gray-500">
            <span>Low fee</span>
            <span>Medium fee</span>
            <span>High fee</span>
          </div>
        </GlassCard>

        <GlassCard color="cyan">
          <h3 className="text-lg font-semibold text-white mb-4">Data Quality</h3>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-400">Location Data</span>
                <span className="text-cyan-300">
                  {stats && stats.total_observations > 0
                    ? Math.round((stats.observations_with_location / stats.total_observations) * 100)
                    : 0}
                  %
                </span>
              </div>
              <Progress
                value={
                  stats && stats.total_observations > 0
                    ? (stats.observations_with_location / stats.total_observations) * 100
                    : 0
                }
                className="h-2 bg-gray-800"
              />
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-400">Image Enrichment</span>
                <span className="text-cyan-300">
                  {stats && stats.total_observations > 0
                    ? Math.round((stats.observations_with_images / stats.total_observations) * 100)
                    : 0}
                  %
                </span>
              </div>
              <Progress
                value={
                  stats && stats.total_observations > 0
                    ? (stats.observations_with_images / stats.total_observations) * 100
                    : 0
                }
                className="h-2 bg-gray-800"
              />
            </div>
          </div>
        </GlassCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <DataFlow />
        <QueryMonitor />
      </div>
      <AgentActivity />
    </div>
  )
}
