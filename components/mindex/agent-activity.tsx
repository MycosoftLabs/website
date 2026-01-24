"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import useSWR from "swr"
import { motion } from "framer-motion"
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Copy,
  Cpu,
  Loader2,
  Pause,
  Play,
  Shield,
  TerminalSquare,
  XCircle,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"

interface ApiResponse<T> {
  data: T
  meta?: { total?: number; page?: number; pageSize?: number; hasMore?: boolean }
}

type RunStatus = "pending" | "running" | "completed" | "failed" | "cancelled"

interface AgentRun {
  id: string
  agentId: string
  agentName: string
  status: RunStatus
  startedAt: string
  completedAt?: string
  input?: Record<string, unknown>
  output?: Record<string, unknown>
  error?: string
  metadata?: Record<string, unknown>
}

type AgentEventType = "ingest" | "verify" | "anchor" | "anomaly" | "insight" | "heartbeat"

interface AgentEvent {
  id: string
  timestamp: string
  agent: string
  type: AgentEventType
  severity: "info" | "warning" | "critical"
  message: string
  data?: Record<string, unknown>
}

interface AgentActivityProps {
  className?: string
  channelId?: string
}

function fetcher(url: string) {
  return fetch(url).then(async (r) => {
    if (!r.ok) throw new Error(await r.text())
    return r.json()
  })
}

function nowIso() {
  return new Date().toISOString()
}

function copyToClipboard(text: string) {
  if (!text) return
  void navigator.clipboard?.writeText(text)
}

function badgeForStatus(status: RunStatus) {
  switch (status) {
    case "running":
      return "border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
    case "completed":
      return "border-purple-500/40 bg-purple-500/10 text-purple-200"
    case "failed":
      return "border-red-500/40 bg-red-500/10 text-red-200"
    case "pending":
      return "border-white/10 bg-white/5 text-white/70"
    case "cancelled":
      return "border-yellow-500/40 bg-yellow-500/10 text-yellow-200"
  }
}

export function AgentActivity({ className, channelId = "agent-activity" }: AgentActivityProps) {
  const runs = useSWR<ApiResponse<AgentRun[]>>("/api/myca/runs?page=1&pageSize=12", fetcher, { refreshInterval: 15_000 })

  const [publishKey, setPublishKey] = useState("")
  const [isPublishing, setIsPublishing] = useState(false)
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [events, setEvents] = useState<AgentEvent[]>([])
  const [selected, setSelected] = useState<AgentRun | null>(null)

  const intervalRef = useRef<number | null>(null)
  const sourceRef = useRef<EventSource | null>(null)

  const subscribeUrl = useMemo(() => {
    const qs = new URLSearchParams()
    qs.set("type", "computed")
    qs.set("id", channelId)
    return `/api/mindex/stream/subscribe?${qs.toString()}`
  }, [channelId])

  useEffect(() => {
    try {
      const stored = localStorage.getItem("mindex:publishKey")
      if (stored) setPublishKey(stored)
    } catch {
      // ignore
    }
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem("mindex:publishKey", publishKey)
    } catch {
      // ignore
    }
  }, [publishKey])

  useEffect(() => {
    setError(null)
    setIsConnected(false)

    const src = new EventSource(subscribeUrl)
    sourceRef.current = src

    const onConnected = () => setIsConnected(true)
    const onPing = () => setIsConnected(true)
    const onEvent = (ev: MessageEvent) => {
      try {
        const parsed = JSON.parse(ev.data) as { data?: AgentEvent }
        const e = parsed?.data
        if (!e?.id) return
        setEvents((prev) => [e, ...prev].slice(0, 200))
      } catch {
        // ignore
      }
    }

    src.addEventListener("connected", onConnected as EventListener)
    src.addEventListener("ping", onPing as EventListener)
    src.addEventListener("agent.event", onEvent as EventListener)
    src.onerror = () => {
      setIsConnected(false)
      setError("SSE disconnected (integrations disabled or server not reachable).")
    }

    return () => {
      src.close()
      sourceRef.current = null
    }
  }, [subscribeUrl])

  async function publishEvent(e: AgentEvent) {
    if (!publishKey.trim()) {
      setError("Set MYCORRHIZAE_PUBLISH_KEY in env and paste it here to publish demo agent events.")
      return
    }

    const res = await fetch("/api/mindex/stream/publish", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-mycorrhizae-key": publishKey.trim(),
      },
      body: JSON.stringify({
        channel: `computed:${channelId}`,
        event: "agent.event",
        data: e,
      }),
    })
    if (!res.ok) throw new Error(await res.text())
  }

  async function startDemo() {
    setError(null)
    setIsPublishing(true)

    const emit = () => {
      const types: AgentEventType[] = ["heartbeat", "ingest", "verify", "anchor", "anomaly", "insight"]
      const type = types[Math.floor(Math.random() * types.length)]
      const severity = type === "anomaly" ? (Math.random() > 0.7 ? "critical" : "warning") : "info"
      const agent = Math.random() > 0.5 ? "myca.integrity-agent" : "myca.pipeline-agent"

      const message =
        type === "heartbeat"
          ? "Agent heartbeat OK"
          : type === "ingest"
            ? "Ingested telemetry packet"
            : type === "verify"
              ? "Verified record signature + merkle proof"
              : type === "anchor"
                ? "Anchored batch to ledger"
                : type === "anomaly"
                  ? "Anomaly detected in sensor stream"
                  : "Published insight to dashboard"

      const e: AgentEvent = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        timestamp: nowIso(),
        agent,
        type,
        severity,
        message,
        data:
          type === "anchor"
            ? { ledger: "hypergraph", tx: `hg:${Math.random().toString(36).slice(2, 10)}` }
            : type === "verify"
              ? { record_id: `rec_${Math.random().toString(36).slice(2, 8)}`, ok: true }
              : type === "ingest"
                ? { device_id: "mycobrain_0042", bytes: Math.floor(200 + Math.random() * 7000) }
                : type === "anomaly"
                  ? { metric: "co2_ppm", z: 3.1 + Math.random() * 1.2 }
                  : undefined,
      }

      publishEvent(e).catch((err) => setError(err instanceof Error ? err.message : String(err)))
    }

    emit()
    intervalRef.current = window.setInterval(emit, 950)
  }

  function stopDemo() {
    setIsPublishing(false)
    if (intervalRef.current) window.clearInterval(intervalRef.current)
    intervalRef.current = null
  }

  useEffect(() => {
    return () => {
      if (intervalRef.current) window.clearInterval(intervalRef.current)
      intervalRef.current = null
      sourceRef.current?.close()
      sourceRef.current = null
    }
  }, [])

  const summary = useMemo(() => {
    const list = runs.data?.data ?? []
    const running = list.filter((r) => r.status === "running").length
    const failed = list.filter((r) => r.status === "failed").length
    const completed = list.filter((r) => r.status === "completed").length
    return { running, failed, completed, total: list.length }
  }, [runs.data])

  return (
    <Card className={cn("border-purple-500/20 bg-gradient-to-br from-purple-500/5 via-background to-blue-500/5", className)}>
      <CardHeader className="space-y-2">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2">
              <Cpu className="h-5 w-5 text-purple-400" />
              Agent Activity
            </CardTitle>
            <CardDescription>Live view of MAS agent runs + streaming operational events (ingestion, verify, anchor, insights).</CardDescription>
          </div>

          <div
            className={cn(
              "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium",
              isConnected && "border-emerald-500/40 bg-emerald-500/10 text-emerald-200",
              !isConnected && "border-white/10 bg-white/5 text-white/70",
            )}
          >
            <Shield className="h-3.5 w-3.5" />
            {isConnected ? "SSE connected" : "Connecting…"}
            {isConnected ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          </div>
        </div>

        <div className="grid gap-2 md:grid-cols-[1fr_auto_auto]">
          <div className="relative">
            <Shield className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={publishKey}
              onChange={(e) => setPublishKey(e.target.value)}
              placeholder="MYCORRHIZAE_PUBLISH_KEY (for demo agent events)"
              className="pl-10 font-mono"
            />
          </div>

          {!isPublishing ? (
            <Button onClick={startDemo} className="bg-purple-600 hover:bg-purple-700">
              <Play className="h-4 w-4 mr-2" />
              Start demo
            </Button>
          ) : (
            <Button onClick={stopDemo} variant="outline">
              <Pause className="h-4 w-4 mr-2" />
              Stop
            </Button>
          )}

          <Button variant="outline" onClick={() => setEvents([])} disabled={events.length === 0}>
            Clear
          </Button>
        </div>

        {error ? (
          <div className="text-xs text-yellow-200/80 border border-yellow-500/20 bg-yellow-500/10 rounded-md px-3 py-2">
            {error}
          </div>
        ) : null}
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-3">
          <Card className="border-white/10 bg-black/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs text-muted-foreground">Running</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-200">{summary.running}</div>
            </CardContent>
          </Card>
          <Card className="border-white/10 bg-black/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs text-muted-foreground">Completed</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-200">{summary.completed}</div>
            </CardContent>
          </Card>
          <Card className="border-white/10 bg-black/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs text-muted-foreground">Failed</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-200">{summary.failed}</div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="runs" className="w-full">
          <TabsList className="w-full justify-start overflow-x-auto">
            <TabsTrigger value="runs">Runs</TabsTrigger>
            <TabsTrigger value="events">Live events</TabsTrigger>
            <TabsTrigger value="inspect" disabled={!selected}>
              Inspect
            </TabsTrigger>
          </TabsList>

          <TabsContent value="runs" className="mt-4">
            <ScrollArea className="h-[320px] rounded-2xl border border-white/10 bg-black/20">
              <div className="p-3 space-y-2">
                {runs.isLoading ? (
                  <div className="text-sm text-muted-foreground p-2 flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading runs…
                  </div>
                ) : runs.error ? (
                  <div className="text-sm text-muted-foreground p-2">
                    Runs unavailable (requires MYCA MAS integration).
                  </div>
                ) : (runs.data?.data?.length ?? 0) > 0 ? (
                  runs.data!.data.map((r, idx) => (
                    <motion.button
                      key={r.id}
                      type="button"
                      onClick={() => setSelected(r)}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: Math.min(idx * 0.01, 0.25) }}
                      className={cn(
                        "w-full text-left rounded-xl border p-3 transition-colors",
                        selected?.id === r.id ? "border-purple-500/40 bg-black/30" : "border-white/10 bg-black/20 hover:border-purple-500/25",
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="text-sm font-medium flex items-center gap-2">
                            <span className="font-mono text-purple-200">{r.agentName}</span>
                            <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium", badgeForStatus(r.status))}>
                              {r.status}
                            </span>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            started {new Date(r.startedAt).toLocaleString()}
                            {r.completedAt ? ` • completed ${new Date(r.completedAt).toLocaleString()}` : ""}
                          </div>
                          {r.error ? <div className="text-xs text-red-200/90">{r.error}</div> : null}
                        </div>
                        <div className="text-right text-xs text-muted-foreground font-mono">{r.id.slice(0, 8)}…</div>
                      </div>
                    </motion.button>
                  ))
                ) : (
                  <div className="text-sm text-muted-foreground p-2">No runs.</div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="events" className="mt-4">
            <ScrollArea className="h-[320px] rounded-2xl border border-white/10 bg-black/20">
              <div className="p-3 space-y-2">
                {events.length ? (
                  events.map((e, idx) => (
                    <motion.div
                      key={`${e.id}-${idx}`}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: Math.min(idx * 0.01, 0.25) }}
                      className={cn(
                        "rounded-xl border bg-black/20 p-3",
                        e.severity === "critical"
                          ? "border-red-500/20"
                          : e.severity === "warning"
                            ? "border-yellow-500/20"
                            : "border-white/10",
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="text-xs text-muted-foreground">{new Date(e.timestamp).toLocaleTimeString()}</div>
                          <div className="text-sm font-medium flex items-center gap-2">
                            <span className="font-mono text-purple-200">{e.agent}</span>
                            <span className="text-muted-foreground">•</span>
                            <span className="font-mono text-xs">{e.type}</span>
                          </div>
                          <div className="text-sm text-muted-foreground">{e.message}</div>
                        </div>
                        <div className="text-right text-xs text-muted-foreground">
                          {e.severity === "critical" ? <XCircle className="h-4 w-4 text-red-300 inline" /> : null}
                          {e.severity === "warning" ? <AlertTriangle className="h-4 w-4 text-yellow-300 inline" /> : null}
                          {e.severity === "info" ? <Activity className="h-4 w-4 text-emerald-300 inline" /> : null}
                        </div>
                      </div>
                      {e.data ? (
                        <>
                          <Separator className="bg-white/10 my-2" />
                          <pre className="text-xs font-mono whitespace-pre-wrap break-words text-purple-100/90">
                            {JSON.stringify(e.data, null, 2)}
                          </pre>
                        </>
                      ) : null}
                    </motion.div>
                  ))
                ) : (
                  <div className="text-sm text-muted-foreground p-2">
                    No events yet. Start demo or publish events from agents to <span className="font-mono">agent.event</span>.
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="inspect" className="mt-4">
            {selected ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-xs text-muted-foreground">
                    run <span className="font-mono">{selected.id}</span>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => copyToClipboard(JSON.stringify(selected, null, 2))}>
                    <Copy className="h-4 w-4 mr-2" />
                    Copy JSON
                  </Button>
                </div>
                <Separator className="bg-white/10" />
                <Card className="border-white/10 bg-black/20">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <TerminalSquare className="h-4 w-4 text-purple-300" />
                      Run detail
                    </CardTitle>
                    <CardDescription>
                      This is pulled from <span className="font-mono">/api/myca/runs</span>.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <pre className="text-xs font-mono whitespace-pre-wrap break-words rounded-xl border border-white/10 bg-black/30 p-4 text-purple-100/90">
                      {JSON.stringify(selected, null, 2)}
                    </pre>
                  </CardContent>
                </Card>
              </div>
            ) : null}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}

