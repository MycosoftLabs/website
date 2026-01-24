"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { motion } from "framer-motion"
import { Activity, AlertTriangle, CheckCircle2, Copy, KeyRound, Loader2, Pause, Play, Shield, Zap } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"

type CryptoOpType = "sha256" | "aes-256-gcm" | "ed25519" | "schnorr" | "ecdsa"

interface CryptoOpEvent {
  id: string
  timestamp: string
  event: string
  channel: string
  data: {
    op: CryptoOpType
    stage: "start" | "done" | "error"
    duration_ms?: number
    bytes?: number
    note?: string
    sample?: { input?: string; output?: string }
  }
}

interface CryptoMonitorProps {
  className?: string
  /**
   * Optional channel id (mapped to `type=computed&id=...` on the SSE endpoint)
   */
  channelId?: string
}

function nowIso(): string {
  return new Date().toISOString()
}

function shortText(value: string | undefined, max = 36) {
  if (!value) return "—"
  return value.length > max ? `${value.slice(0, max)}…` : value
}

function copyToClipboard(text: string) {
  if (!text) return
  void navigator.clipboard?.writeText(text)
}

export function CryptoMonitor({ className, channelId = "crypto-ops" }: CryptoMonitorProps) {
  const [publishKey, setPublishKey] = useState("")
  const [isConnected, setIsConnected] = useState(false)
  const [isPublishing, setIsPublishing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [events, setEvents] = useState<CryptoOpEvent[]>([])

  const intervalRef = useRef<number | null>(null)
  const sourceRef = useRef<EventSource | null>(null)

  const channel = useMemo(() => ({ type: "computed" as const, id: channelId }), [channelId])
  const subscribeUrl = useMemo(() => {
    const qs = new URLSearchParams()
    qs.set("type", channel.type)
    qs.set("id", channel.id)
    return `/api/mindex/stream/subscribe?${qs.toString()}`
  }, [channel])

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
    const onAny = (ev: MessageEvent) => {
      try {
        const parsed = JSON.parse(ev.data) as CryptoOpEvent
        if (!parsed?.data?.op) return
        setEvents((prev) => [parsed, ...prev].slice(0, 200))
      } catch {
        // ignore
      }
    }

    src.addEventListener("connected", onConnected as EventListener)
    src.addEventListener("ping", onPing as EventListener)
    src.addEventListener("crypto.op", onAny as EventListener)
    src.onerror = () => {
      setIsConnected(false)
      setError("SSE disconnected (integrations disabled or server not reachable).")
    }

    return () => {
      src.close()
      sourceRef.current = null
    }
  }, [subscribeUrl])

  async function publishOnce(op: CryptoOpType) {
    if (!publishKey.trim()) {
      setError("Set MYCORRHIZAE_PUBLISH_KEY in env and paste it here to publish demo events.")
      return
    }

    const start = performance.now()
    const bytes = Math.floor(256 + Math.random() * 4096)
    const payload: CryptoOpEvent = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      timestamp: nowIso(),
      event: "crypto.op",
      channel: channel.id,
      data: {
        op,
        stage: "done",
        duration_ms: Math.round(performance.now() - start + Math.random() * 5),
        bytes,
        note:
          op === "sha256"
            ? "Hash payload → append to chain"
            : op === "ed25519"
              ? "Sign link_hash at source"
              : op === "aes-256-gcm"
                ? "Encrypt packet for transport"
                : op === "schnorr"
                  ? "Taproot anchor signature"
                  : "Legacy chain signature",
        sample: {
          input: `bytes:${bytes}`,
          output: op === "sha256" ? `sha256:${Math.random().toString(16).slice(2, 10)}…` : undefined,
        },
      },
    }

    const res = await fetch("/api/mindex/stream/publish", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-mycorrhizae-key": publishKey.trim(),
      },
      body: JSON.stringify({
        channel: `computed:${channel.id}`,
        event: "crypto.op",
        data: payload.data,
      }),
    })

    if (!res.ok) throw new Error(await res.text())
  }

  async function startPublishing() {
    setError(null)
    setIsPublishing(true)
    const ops: CryptoOpType[] = ["sha256", "ed25519", "aes-256-gcm", "schnorr", "ecdsa"]

    // Publish immediately and then continue.
    try {
      await publishOnce(ops[Math.floor(Math.random() * ops.length)])
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      setIsPublishing(false)
      return
    }

    intervalRef.current = window.setInterval(() => {
      const op = ops[Math.floor(Math.random() * ops.length)]
      publishOnce(op).catch((e) => setError(e instanceof Error ? e.message : String(e)))
    }, 1200)
  }

  function stopPublishing() {
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

  const byOp = useMemo(() => {
    const map = new Map<CryptoOpType, CryptoOpEvent[]>()
    for (const ev of events) {
      const list = map.get(ev.data.op) ?? []
      list.push(ev)
      map.set(ev.data.op, list)
    }
    return map
  }, [events])

  const status = isConnected ? "connected" : error ? "error" : "connecting"

  return (
    <Card className={cn("border-purple-500/20 bg-gradient-to-br from-purple-500/5 via-background to-blue-500/5", className)}>
      <CardHeader className="space-y-2">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-purple-400" />
              Cryptography Operations Monitor
            </CardTitle>
            <CardDescription>Live stream of cryptographic operations over the Mycorrhizae Protocol (SSE).</CardDescription>
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
            {status === "connected" ? (
              <>
                Connected <CheckCircle2 className="h-3.5 w-3.5" />
              </>
            ) : status === "connecting" ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Connecting…
              </>
            ) : (
              <>
                <AlertTriangle className="h-3.5 w-3.5" /> Offline
              </>
            )}
          </div>
        </div>

        <div className="grid gap-2 md:grid-cols-[1fr_auto_auto]">
          <div className="relative">
            <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={publishKey}
              onChange={(e) => setPublishKey(e.target.value)}
              placeholder="MYCORRHIZAE_PUBLISH_KEY (for demo publishing)"
              className="pl-10 font-mono"
            />
          </div>

          {!isPublishing ? (
            <Button onClick={startPublishing} className="bg-purple-600 hover:bg-purple-700">
              <Play className="h-4 w-4 mr-2" />
              Start demo feed
            </Button>
          ) : (
            <Button onClick={stopPublishing} variant="outline">
              <Pause className="h-4 w-4 mr-2" />
              Stop
            </Button>
          )}

          <Button
            variant="outline"
            onClick={() => setEvents([])}
            disabled={events.length === 0}
            title="Clear events"
          >
            Clear
          </Button>
        </div>

        {error ? (
          <div className="text-xs text-yellow-200/80 border border-yellow-500/20 bg-yellow-500/10 rounded-md px-3 py-2">
            {error}
          </div>
        ) : null}
      </CardHeader>

      <CardContent className="space-y-3">
        <Tabs defaultValue="sha256" className="w-full">
          <TabsList className="w-full justify-start overflow-x-auto">
            <TabsTrigger value="sha256">SHA-256</TabsTrigger>
            <TabsTrigger value="aes-256-gcm">AES-256-GCM</TabsTrigger>
            <TabsTrigger value="ed25519">Ed25519</TabsTrigger>
            <TabsTrigger value="schnorr">Schnorr</TabsTrigger>
            <TabsTrigger value="ecdsa">ECDSA</TabsTrigger>
            <TabsTrigger value="all">All</TabsTrigger>
          </TabsList>

          {(["sha256", "aes-256-gcm", "ed25519", "schnorr", "ecdsa"] as CryptoOpType[]).map((op) => (
            <TabsContent key={op} value={op} className="mt-4">
              <OpsList ops={byOp.get(op) ?? []} />
            </TabsContent>
          ))}

          <TabsContent value="all" className="mt-4">
            <OpsList ops={events} />
          </TabsContent>
        </Tabs>

        <Separator className="bg-white/10" />

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <Zap className="h-3.5 w-3.5 text-purple-300" />
            Channel: <span className="font-mono">{`computed:${channel.id}`}</span>
          </div>
          <Button size="sm" variant="ghost" onClick={() => copyToClipboard(subscribeUrl)} title="Copy subscribe URL">
            <Copy className="h-4 w-4 mr-2" />
            Copy SSE URL
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function OpsList({ ops }: { ops: CryptoOpEvent[] }) {
  if (!ops.length) {
    return <div className="text-sm text-muted-foreground">No events yet. Start the demo feed or publish from agents.</div>
  }

  return (
    <ScrollArea className="h-[320px] rounded-2xl border border-white/10 bg-black/20">
      <div className="p-3 space-y-2">
        {ops.map((ev, idx) => (
          <motion.div
            key={`${ev.id}-${idx}`}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(idx * 0.01, 0.25) }}
            className="rounded-xl border border-white/10 bg-black/20 p-3"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="text-xs text-muted-foreground">{new Date(ev.timestamp).toLocaleTimeString()}</div>
                <div className="text-sm font-medium flex items-center gap-2">
                  <span className="font-mono text-purple-200">{ev.data.op}</span>
                  <span className="text-muted-foreground">•</span>
                  <span className="font-mono text-xs">{ev.data.stage}</span>
                </div>
              </div>
              <div className="text-right text-xs text-muted-foreground">
                {typeof ev.data.duration_ms === "number" ? (
                  <div className="font-mono">{ev.data.duration_ms}ms</div>
                ) : null}
                {typeof ev.data.bytes === "number" ? <div className="font-mono">{ev.data.bytes}B</div> : null}
              </div>
            </div>

            {ev.data.note ? <div className="text-sm text-muted-foreground mt-2">{ev.data.note}</div> : null}

            {ev.data.sample?.input || ev.data.sample?.output ? (
              <>
                <Separator className="bg-white/10 my-2" />
                <div className="grid gap-2 md:grid-cols-2 text-xs">
                  <div>
                    <div className="text-muted-foreground">input</div>
                    <div className="font-mono">{shortText(ev.data.sample?.input)}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">output</div>
                    <div className="font-mono">{shortText(ev.data.sample?.output)}</div>
                  </div>
                </div>
              </>
            ) : null}
          </motion.div>
        ))}
      </div>
    </ScrollArea>
  )
}

