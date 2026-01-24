"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Prism from "prismjs"
import "prismjs/components/prism-sql"
import "prismjs/components/prism-json"
import { motion } from "framer-motion"
import { Braces, Copy, DatabaseZap, FileJson, Loader2, Pause, Play, Shield, TerminalSquare } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"

type DbOp = "select" | "insert" | "update" | "delete" | "ddl" | "rpc" | "unknown"

interface DbEvent {
  id: string
  timestamp: string
  source: "mindex" | "supabase" | "hypergraph" | "agent"
  op: DbOp
  table?: string
  sql?: string
  params?: unknown
  payload?: unknown
  rows_affected?: number
  latency_ms?: number
}

interface QueryMonitorProps {
  className?: string
  channelId?: string
}

function nowIso() {
  return new Date().toISOString()
}

function copyToClipboard(text: string) {
  if (!text) return
  void navigator.clipboard?.writeText(text)
}

function highlight(code: string, lang: "sql" | "json"): string {
  const grammar = Prism.languages[lang]
  if (!grammar) return code
  return Prism.highlight(code, grammar, lang)
}

export function QueryMonitor({ className, channelId = "query-monitor" }: QueryMonitorProps) {
  const [publishKey, setPublishKey] = useState("")
  const [isPublishing, setIsPublishing] = useState(false)
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [events, setEvents] = useState<DbEvent[]>([])
  const [selected, setSelected] = useState<DbEvent | null>(null)

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
    const onDb = (ev: MessageEvent) => {
      try {
        const parsed = JSON.parse(ev.data) as { data?: DbEvent }
        const e = parsed?.data
        if (!e?.id) return
        setEvents((prev) => [e, ...prev].slice(0, 250))
      } catch {
        // ignore
      }
    }

    src.addEventListener("connected", onConnected as EventListener)
    src.addEventListener("ping", onPing as EventListener)
    src.addEventListener("db.query", onDb as EventListener)
    src.onerror = () => {
      setIsConnected(false)
      setError("SSE disconnected (integrations disabled or server not reachable).")
    }

    return () => {
      src.close()
      sourceRef.current = null
    }
  }, [subscribeUrl])

  async function publishEvent(e: DbEvent) {
    if (!publishKey.trim()) {
      setError("Set MYCORRHIZAE_PUBLISH_KEY in env and paste it here to publish demo DB events.")
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
        event: "db.query",
        data: e,
      }),
    })
    if (!res.ok) throw new Error(await res.text())
  }

  async function startDemo() {
    setError(null)
    setIsPublishing(true)

    const emit = () => {
      const ops: DbOp[] = ["select", "insert", "update", "delete", "rpc"]
      const op = ops[Math.floor(Math.random() * ops.length)]
      const table = ["taxa", "observations", "telemetry", "integrity_records", "anchors"][Math.floor(Math.random() * 5)]
      const latency = Math.round(3 + Math.random() * 30)

      const sql =
        op === "select"
          ? `select * from ${table} where id = $1 limit 1;`
          : op === "insert"
            ? `insert into ${table} (id, payload, created_at) values ($1, $2, now());`
            : op === "update"
              ? `update ${table} set updated_at = now() where id = $1;`
              : op === "delete"
                ? `delete from ${table} where id = $1;`
                : `select mindex_${table}_refresh($1);`

      const event: DbEvent = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        timestamp: nowIso(),
        source: Math.random() > 0.6 ? "agent" : Math.random() > 0.5 ? "supabase" : "mindex",
        op,
        table,
        sql,
        params: ["…", { id: "demo" }],
        payload: op === "select" ? undefined : { change: op, table, tx: `tx_${Math.random().toString(36).slice(2, 10)}` },
        rows_affected: op === "select" ? 1 : Math.floor(Math.random() * 3),
        latency_ms: latency,
      }

      publishEvent(event).catch((err) => setError(err instanceof Error ? err.message : String(err)))
    }

    emit()
    intervalRef.current = window.setInterval(emit, 1100)
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

  const status = isConnected ? "connected" : error ? "error" : "connecting"

  const selectedSqlHtml = useMemo(() => {
    if (!selected?.sql) return null
    return highlight(selected.sql, "sql")
  }, [selected?.sql])

  const selectedJsonHtml = useMemo(() => {
    const json = selected?.payload ?? selected?.params ?? null
    if (!json) return null
    return highlight(JSON.stringify(json, null, 2), "json")
  }, [selected?.payload, selected?.params])

  return (
    <Card className={cn("border-purple-500/20 bg-gradient-to-br from-purple-500/5 via-background to-blue-500/5", className)}>
      <CardHeader className="space-y-2">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2">
              <DatabaseZap className="h-5 w-5 text-purple-400" />
              Live SQL / JSON Monitor
            </CardTitle>
            <CardDescription>Watch database queries + payloads stream in, and inspect the exact data being modified.</CardDescription>
          </div>

          <div
            className={cn(
              "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium",
              status === "connected" && "border-emerald-500/40 bg-emerald-500/10 text-emerald-200",
              status === "connecting" && "border-white/10 bg-white/5 text-white/70",
              status === "error" && "border-yellow-500/40 bg-yellow-500/10 text-yellow-200",
            )}
          >
            <Shield className="h-3.5 w-3.5" />
            {status === "connected" ? "Connected" : status === "connecting" ? "Connecting…" : "Offline"}
            {status === "connecting" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
          </div>
        </div>

        <div className="grid gap-2 md:grid-cols-[1fr_auto_auto]">
          <div className="relative">
            <Shield className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={publishKey}
              onChange={(e) => setPublishKey(e.target.value)}
              placeholder="MYCORRHIZAE_PUBLISH_KEY (for demo DB events)"
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

          <Button variant="outline" onClick={() => { setEvents([]); setSelected(null) }} disabled={events.length === 0}>
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
        <div className="grid gap-3 lg:grid-cols-[1fr_1fr]">
          <ScrollArea className="h-[320px] rounded-2xl border border-white/10 bg-black/20">
            <div className="p-3 space-y-2">
              {events.length ? (
                events.map((e, idx) => (
                  <motion.button
                    key={`${e.id}-${idx}`}
                    type="button"
                    onClick={() => setSelected(e)}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(idx * 0.01, 0.25) }}
                    className={cn(
                      "w-full text-left rounded-xl border bg-black/20 p-3 transition-colors",
                      selected?.id === e.id ? "border-purple-500/40" : "border-white/10 hover:border-purple-500/25",
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="text-xs text-muted-foreground">{new Date(e.timestamp).toLocaleTimeString()}</div>
                        <div className="text-sm font-medium flex items-center gap-2">
                          <span className="font-mono text-purple-200">{e.op}</span>
                          <span className="text-muted-foreground">•</span>
                          <span className="font-mono text-xs">{e.source}</span>
                          {e.table ? (
                            <>
                              <span className="text-muted-foreground">•</span>
                              <span className="font-mono text-xs">{e.table}</span>
                            </>
                          ) : null}
                        </div>
                        {e.sql ? <div className="text-xs text-muted-foreground font-mono">{e.sql}</div> : null}
                      </div>
                      <div className="text-right text-xs text-muted-foreground">
                        {typeof e.latency_ms === "number" ? <div className="font-mono">{e.latency_ms}ms</div> : null}
                        {typeof e.rows_affected === "number" ? <div className="font-mono">{e.rows_affected} rows</div> : null}
                      </div>
                    </div>
                  </motion.button>
                ))
              ) : (
                <div className="text-sm text-muted-foreground p-2">No events yet. Start demo or publish from agents.</div>
              )}
            </div>
          </ScrollArea>

          <Card className="border-white/10 bg-black/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <TerminalSquare className="h-4 w-4 text-purple-300" />
                Inspector
              </CardTitle>
              <CardDescription>Select an event to view highlighted SQL + JSON.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {selected ? (
                <Tabs defaultValue="sql">
                  <TabsList className="w-full justify-start overflow-x-auto">
                    <TabsTrigger value="sql">SQL</TabsTrigger>
                    <TabsTrigger value="json">JSON</TabsTrigger>
                    <TabsTrigger value="raw">Raw</TabsTrigger>
                  </TabsList>

                  <TabsContent value="sql" className="mt-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-xs text-muted-foreground">{selected.table ? `table ${selected.table}` : "query"}</div>
                      <Button size="sm" variant="outline" onClick={() => copyToClipboard(selected.sql ?? "")} disabled={!selected.sql}>
                        <Copy className="h-4 w-4 mr-2" />
                        Copy
                      </Button>
                    </div>
                    <pre className="text-xs rounded-xl border border-white/10 bg-black/30 p-3 overflow-x-auto">
                      <code
                        className="language-sql"
                        dangerouslySetInnerHTML={{ __html: selectedSqlHtml ?? "—" }}
                      />
                    </pre>
                  </TabsContent>

                  <TabsContent value="json" className="mt-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-xs text-muted-foreground flex items-center gap-2">
                        <FileJson className="h-3.5 w-3.5" />
                        payload/params
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copyToClipboard(JSON.stringify(selected.payload ?? selected.params ?? null, null, 2))}
                      >
                        <Copy className="h-4 w-4 mr-2" />
                        Copy
                      </Button>
                    </div>
                    <pre className="text-xs rounded-xl border border-white/10 bg-black/30 p-3 overflow-x-auto">
                      <code
                        className="language-json"
                        dangerouslySetInnerHTML={{ __html: selectedJsonHtml ?? "—" }}
                      />
                    </pre>
                  </TabsContent>

                  <TabsContent value="raw" className="mt-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-xs text-muted-foreground flex items-center gap-2">
                        <Braces className="h-3.5 w-3.5" />
                        event JSON
                      </div>
                      <Button size="sm" variant="outline" onClick={() => copyToClipboard(JSON.stringify(selected, null, 2))}>
                        <Copy className="h-4 w-4 mr-2" />
                        Copy
                      </Button>
                    </div>
                    <pre className="text-xs rounded-xl border border-white/10 bg-black/30 p-3 overflow-x-auto">
                      <code className="language-json">{JSON.stringify(selected, null, 2)}</code>
                    </pre>
                  </TabsContent>
                </Tabs>
              ) : (
                <div className="text-sm text-muted-foreground">No selection.</div>
              )}
            </CardContent>
          </Card>
        </div>

        <Separator className="bg-white/10" />
        <div className="text-xs text-muted-foreground">
          Channel: <span className="font-mono">{`computed:${channelId}`}</span> • Event: <span className="font-mono">db.query</span>
        </div>
      </CardContent>
    </Card>
  )
}

