"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import {
  Activity,
  Beaker,
  Bot,
  Cpu,
  Database,
  Network,
  Play,
  RefreshCw,
  Search,
  Shield,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { GlassCard } from "@/components/ui/glowing-border"

type HarnessTarget = "search" | "taxa" | "observations" | "compounds" | "devices" | "integrity"

type ProbeStatus = {
  id: string
  label: string
  path: string
  ok: boolean
  status: number
  count?: number | null
  message?: string
}

type QueryResult = {
  path: string
  status: number
  ok: boolean
  elapsedMs: number
  body: unknown
}

const TARGETS: Record<
  HarnessTarget,
  {
    label: string
    icon: typeof Search
    buildPath: (query: string) => string
  }
> = {
  search: {
    label: "Unified search",
    icon: Search,
    buildPath: (query) => `/api/natureos/mindex/search?q=${encodeURIComponent(query || "agaricus")}&limit=12`,
  },
  taxa: {
    label: "Taxonomy",
    icon: Database,
    buildPath: (query) => `/api/natureos/mindex/taxa?q=${encodeURIComponent(query)}&limit=25`,
  },
  observations: {
    label: "Observations",
    icon: Activity,
    buildPath: (query) =>
      query
        ? `/api/natureos/mindex/observations?q=${encodeURIComponent(query)}&limit=50`
        : "/api/natureos/mindex/observations?limit=50",
  },
  compounds: {
    label: "Chemistry",
    icon: Beaker,
    buildPath: (query) =>
      query
        ? `/api/mindex/compounds?q=${encodeURIComponent(query)}&limit=25&offset=0`
        : "/api/mindex/compounds?limit=25&offset=0",
  },
  devices: {
    label: "Devices",
    icon: Cpu,
    buildPath: () => "/api/earth-simulator/devices",
  },
  integrity: {
    label: "Integrity",
    icon: Shield,
    buildPath: () => "/api/mindex/integrity/summary",
  },
}

const STATUS_PROBES: Array<Omit<ProbeStatus, "ok" | "status">> = [
  { id: "console", label: "Console", path: "/api/natureos/mindex/console" },
  { id: "taxa", label: "All-life taxa", path: "/api/natureos/mindex/taxa?limit=5" },
  { id: "search", label: "Search", path: "/api/natureos/mindex/search?q=agaricus&limit=5" },
  { id: "observations", label: "Observations", path: "/api/natureos/mindex/observations?limit=5" },
  { id: "compounds", label: "Compounds", path: "/api/mindex/compounds?limit=5&offset=0" },
  { id: "devices", label: "Field devices", path: "/api/earth-simulator/devices" },
  { id: "mindex-devices", label: "MINDEX devices", path: "/api/mindex/registry/devices?limit=5" },
  { id: "integrity", label: "Integrity", path: "/api/mindex/integrity/summary" },
]

function countFromBody(body: unknown): number | null {
  if (!body || typeof body !== "object") return null
  const record = body as Record<string, any>
  if (typeof record.count === "number") return record.count
  if (typeof record.total === "number") return record.total
  if (Array.isArray(record.data)) return record.data.length
  if (Array.isArray(record.devices)) return record.devices.length
  if (Array.isArray(record.observations)) return record.observations.length
  if (record.results && typeof record.results === "object") {
    return Object.values(record.results as Record<string, unknown>).reduce<number>((sum, value) => {
      return sum + (Array.isArray(value) ? value.length : 0)
    }, 0)
  }
  return null
}

async function fetchJson(path: string): Promise<QueryResult> {
  const started = performance.now()
  const res = await fetch(path, { cache: "no-store" })
  const text = await res.text()
  let body: unknown = text
  try {
    body = JSON.parse(text)
  } catch {
    body = text
  }
  return {
    path,
    status: res.status,
    ok: res.ok,
    elapsedMs: Math.round(performance.now() - started),
    body,
  }
}

function statusMessage(body: unknown): string | undefined {
  if (!body || typeof body !== "object") return undefined
  const record = body as Record<string, unknown>
  const raw = record.message || record.error || record.warning || record.detail
  return typeof raw === "string" ? raw : undefined
}

function StatusPill({ ok, status }: { ok: boolean; status: number }) {
  return (
    <Badge
      variant="outline"
      className={ok ? "border-green-500/40 text-green-200" : "border-amber-500/40 text-amber-200"}
    >
      {status || "--"}
    </Badge>
  )
}

export function AgentsSection() {
  const [query, setQuery] = useState("agaricus")
  const [target, setTarget] = useState<HarnessTarget>("search")
  const [running, setRunning] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [result, setResult] = useState<QueryResult | null>(null)
  const [probes, setProbes] = useState<ProbeStatus[]>([])

  const selectedTarget = TARGETS[target]
  const TargetIcon = selectedTarget.icon

  const refreshProbes = useCallback(async () => {
    setRefreshing(true)
    try {
      const next = await Promise.all(
        STATUS_PROBES.map(async (probe) => {
          try {
            const response = await fetchJson(probe.path)
            return {
              ...probe,
              ok: response.ok,
              status: response.status,
              count: countFromBody(response.body),
              message: statusMessage(response.body),
            }
          } catch (error) {
            return {
              ...probe,
              ok: false,
              status: 0,
              count: null,
              message: error instanceof Error ? error.message : "request failed",
            }
          }
        }),
      )
      setProbes(next)
    } finally {
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    void refreshProbes()
    const interval = window.setInterval(() => void refreshProbes(), 30_000)
    return () => window.clearInterval(interval)
  }, [refreshProbes])

  const runQuery = useCallback(async () => {
    setRunning(true)
    try {
      const path = selectedTarget.buildPath(query.trim())
      setResult(await fetchJson(path))
    } catch (error) {
      setResult({
        path: selectedTarget.buildPath(query.trim()),
        ok: false,
        status: 0,
        elapsedMs: 0,
        body: { error: error instanceof Error ? error.message : "request failed" },
      })
    } finally {
      setRunning(false)
    }
  }, [query, selectedTarget])

  const healthyCount = useMemo(() => probes.filter((probe) => probe.ok).length, [probes])
  const failingCount = probes.length - healthyCount

  return (
    <div className="space-y-6">
      <GlassCard color="purple">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-3xl">
            <h3 className="flex items-center gap-2 text-lg font-semibold text-white">
              <Bot className="h-5 w-5 text-purple-300" />
              MINDEX database agent harness
            </h3>
            <p className="mt-1 text-sm text-gray-400">
              Operator-facing agents for querying MINDEX data surfaces directly. Topology, chat mesh, and generic MAS controls are removed from this tab.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
            <div className="rounded-md bg-white/5 px-3 py-2">
              <p className="text-xs text-gray-500">Healthy</p>
              <p className="font-mono text-xl text-green-200">{healthyCount}</p>
            </div>
            <div className="rounded-md bg-white/5 px-3 py-2">
              <p className="text-xs text-gray-500">Blocked</p>
              <p className="font-mono text-xl text-amber-200">{failingCount}</p>
            </div>
            <div className="rounded-md bg-white/5 px-3 py-2">
              <p className="text-xs text-gray-500">Surfaces</p>
              <p className="font-mono text-xl text-cyan-200">{probes.length || STATUS_PROBES.length}</p>
            </div>
          </div>
        </div>
      </GlassCard>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(360px,0.9fr)]">
        <GlassCard color="cyan">
          <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-end">
            <div className="flex-1">
              <label className="mb-2 block text-xs text-gray-500">Query</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                <Input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="taxon, compound, device, observation, or record id"
                  className="min-h-[44px] border-cyan-500/30 bg-black/40 pl-10 text-base text-white"
                />
              </div>
            </div>
            <div className="w-full lg:w-56">
              <label className="mb-2 block text-xs text-gray-500">Agent</label>
              <select
                value={target}
                onChange={(event) => setTarget(event.target.value as HarnessTarget)}
                className="min-h-[44px] w-full rounded-md border border-cyan-500/30 bg-black/40 px-3 text-white outline-none focus:border-cyan-400"
              >
                {Object.entries(TARGETS).map(([id, item]) => (
                  <option key={id} value={id} className="bg-black text-white">
                    {item.label}
                  </option>
                ))}
              </select>
            </div>
            <Button type="button" className="min-h-[44px] bg-cyan-700 hover:bg-cyan-600" onClick={() => void runQuery()} disabled={running}>
              {running ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
              Run
            </Button>
          </div>

          <div className="mb-3 rounded-md border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-gray-400">
            <TargetIcon className="mr-2 inline h-4 w-4 text-cyan-300" />
            {selectedTarget.label}: <span className="font-mono text-gray-300">{selectedTarget.buildPath(query.trim())}</span>
          </div>

          <div className="h-[min(58vh,560px)] overflow-auto rounded-md border border-white/10 bg-black/30">
            <pre className="whitespace-pre-wrap break-all p-3 text-xs font-mono text-gray-300">
              {result ? JSON.stringify(result, null, 2) : "Run an agent query to inspect the live MINDEX response."}
            </pre>
          </div>
        </GlassCard>

        <GlassCard color="green">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div>
              <h3 className="flex items-center gap-2 text-lg font-semibold text-white">
                <Network className="h-5 w-5 text-green-300" />
                Surface health
              </h3>
              <p className="text-sm text-gray-400">Live BFF and MINDEX route probes.</p>
            </div>
            <Button
              type="button"
              variant="outline"
              className="min-h-[44px] border-green-500/40 text-green-200"
              onClick={() => void refreshProbes()}
              disabled={refreshing}
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
          <div className="h-[min(58vh,560px)] overflow-auto pr-1">
            <div className="space-y-2">
              {probes.map((probe) => (
                <div key={probe.id} className="rounded-md border border-white/10 bg-white/[0.03] px-3 py-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium text-white">{probe.label}</p>
                      <p className="truncate text-xs font-mono text-gray-500">{probe.path}</p>
                    </div>
                    <StatusPill ok={probe.ok} status={probe.status} />
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2 text-xs">
                    {probe.count != null ? (
                      <Badge variant="outline" className="border-cyan-500/30 text-cyan-200">
                        count {probe.count.toLocaleString()}
                      </Badge>
                    ) : null}
                    {probe.message ? (
                      <Badge variant="outline" className="max-w-full border-amber-500/30 text-amber-200">
                        <span className="truncate">{probe.message}</span>
                      </Badge>
                    ) : null}
                  </div>
                </div>
              ))}
              {probes.length === 0 ? <p className="text-sm text-gray-500">Loading route probes...</p> : null}
            </div>
          </div>
        </GlassCard>
      </div>
    </div>
  )
}
