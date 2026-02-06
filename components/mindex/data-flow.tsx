"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { motion } from "framer-motion"
import {
  Activity,
  ArrowRight,
  CheckCircle2,
  Cloud,
  Copy,
  Database,
  Loader2,
  Network,
  Pause,
  Play,
  Radio,
  Server,
  Shield,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"

type PacketType = "telemetry" | "observation" | "command" | "integrity" | "anchor"

interface DataPacket {
  id: string
  timestamp: string
  type: PacketType
  from: "device" | "mesh" | "gateway" | "mindex" | "ledger" | "natureos"
  to: "mesh" | "gateway" | "mindex" | "ledger" | "natureos"
  bytes: number
  payload: unknown
}

interface DataFlowProps {
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

function colorForType(type: PacketType) {
  switch (type) {
    case "telemetry":
      return "from-emerald-500/60 to-emerald-200/40"
    case "observation":
      return "from-blue-500/60 to-blue-200/40"
    case "command":
      return "from-amber-500/60 to-amber-200/40"
    case "integrity":
      return "from-purple-500/60 to-purple-200/40"
    case "anchor":
      return "from-fuchsia-500/60 to-sky-400/40"
  }
}

export function DataFlow({ className, channelId = "data-flow" }: DataFlowProps) {
  const [publishKey, setPublishKey] = useState("")
  const [isPublishing, setIsPublishing] = useState(false)
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [packets, setPackets] = useState<DataPacket[]>([])
  const [selected, setSelected] = useState<DataPacket | null>(null)

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
    const onPacket = (ev: MessageEvent) => {
      try {
        const parsed = JSON.parse(ev.data) as { data?: DataPacket }
        const pkt = parsed?.data
        if (!pkt?.id) return
        setPackets((prev) => [pkt, ...prev].slice(0, 200))
      } catch {
        // ignore
      }
    }

    src.addEventListener("connected", onConnected as EventListener)
    src.addEventListener("ping", onPing as EventListener)
    src.addEventListener("data.packet", onPacket as EventListener)
    src.onerror = () => {
      setIsConnected(false)
      setError("SSE disconnected (integrations disabled or server not reachable).")
    }

    return () => {
      src.close()
      sourceRef.current = null
    }
  }, [subscribeUrl])

  async function publishPacket(pkt: DataPacket) {
    if (!publishKey.trim()) {
      setError("Set MYCORRHIZAE_PUBLISH_KEY in env and paste it here to publish demo packets.")
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
        event: "data.packet",
        data: pkt,
      }),
    })
    if (!res.ok) throw new Error(await res.text())
  }

  async function startDemo() {
    setError(null)
    setIsPublishing(true)

    const emit = () => {
      const types: PacketType[] = ["telemetry", "observation", "command", "integrity", "anchor"]
      const t = types[Math.floor(Math.random() * types.length)]
      const base: Omit<DataPacket, "from" | "to"> = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        timestamp: nowIso(),
        type: t,
        bytes: Math.floor(256 + Math.random() * 8192),
        payload:
          t === "telemetry"
            ? { temperature_c: 22.4 + Math.random() * 2, humidity_pct: 80 + Math.random() * 5, co2_ppm: 420 + Math.random() * 30 }
            : t === "observation"
              ? { taxon_id: "mindex:pleurotus-ostreatus", lat: 47.61, lng: -122.33, observed_at: nowIso() }
              : t === "command"
                ? { device_id: "mycobrain_0042", command: "fan.on", ttl_s: 10 }
                : t === "integrity"
                  ? { op: "merkle_proof", leaf: "sha256:…", root: "sha256:…" }
                  : { ledger: "hypergraph", tx: `hg:${Math.random().toString(36).slice(2, 10)}` },
      }

      // Route (simple canonical pipeline)
      const hops: Array<DataPacket["from"]> = ["device", "mesh", "gateway", "mindex", "ledger", "natureos"]
      const hop = Math.floor(Math.random() * (hops.length - 1))
      const from = hops[hop]
      const to = hops[hop + 1] as DataPacket["to"]
      const pkt: DataPacket = { ...base, from, to }

      publishPacket(pkt).catch((e) => setError(e instanceof Error ? e.message : String(e)))
    }

    // First pulse
    emit()
    intervalRef.current = window.setInterval(emit, 900)
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

  const stages = useMemo(() => {
    return [
      { id: "device", label: "Device", icon: Radio },
      { id: "mesh", label: "Mesh", icon: Network },
      { id: "gateway", label: "Gateway", icon: Server },
      { id: "mindex", label: "MINDEX", icon: Database },
      { id: "ledger", label: "Ledger", icon: Shield },
      { id: "natureos", label: "NatureOS", icon: Cloud },
    ] as const
  }, [])

  const latestAnimated = useMemo(() => packets.slice(0, 18), [packets])

  return (
    <Card className={cn("border-purple-500/20 bg-gradient-to-br from-purple-500/5 via-background to-blue-500/5", className)}>
      <CardHeader className="space-y-2">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-purple-400" />
              Live Data Flow
            </CardTitle>
            <CardDescription>Visualize streaming packets across the verified MINDEX pipeline.</CardDescription>
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
              placeholder="MYCORRHIZAE_PUBLISH_KEY (for demo packets)"
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

          <Button variant="outline" onClick={() => setPackets([])} disabled={packets.length === 0}>
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
        <div className="rounded-2xl border border-white/10 bg-black/20 p-4 relative overflow-hidden">
          <div className="grid grid-cols-6 gap-3">
            {stages.map((s) => (
              <div key={s.id} className="text-center">
                <div className="mx-auto w-fit rounded-xl border border-white/10 bg-background/40 px-3 py-2">
                  <s.icon className="h-5 w-5 text-purple-300 mx-auto" />
                  <div className="text-xs font-medium mt-1">{s.label}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Flow arrows */}
          <div className="grid grid-cols-6 gap-3 mt-3">
            {stages.slice(0, 5).map((s) => (
              <div key={s.id} className="flex items-center justify-center">
                <ArrowRight className="h-4 w-4 text-purple-500/50" />
              </div>
            ))}
            <div />
          </div>

          {/* Animated packets */}
          <div className="absolute inset-x-0 top-[84px] bottom-3 pointer-events-none">
            {latestAnimated.map((pkt, i) => {
              const fromIndex = stages.findIndex((s) => s.id === pkt.from)
              const toIndex = stages.findIndex((s) => s.id === pkt.to)
              if (fromIndex < 0 || toIndex < 0) return null

              const leftPct = (fromIndex / 6) * 100 + 4
              const rightPct = (toIndex / 6) * 100 + 4

              return (
                <motion.div
                  key={pkt.id}
                  initial={{ opacity: 0, x: `${leftPct}%`, y: 14 + (i % 10) * 18, scale: 0.9 }}
                  animate={{ opacity: [0, 1, 1, 0], x: [`${leftPct}%`, `${rightPct}%`], scale: [0.9, 1, 1, 0.95] }}
                  transition={{ duration: 1.4, delay: i * 0.04, ease: "easeInOut" }}
                  className={cn(
                    "absolute h-2 w-20 rounded-full bg-gradient-to-r blur-[0.25px]",
                    colorForType(pkt.type),
                  )}
                />
              )
            })}
          </div>
        </div>

        <Tabs defaultValue="packets" className="w-full">
          <TabsList className="w-full justify-start overflow-x-auto">
            <TabsTrigger value="packets">Packets</TabsTrigger>
            <TabsTrigger value="inspect" disabled={!selected}>
              Inspect
            </TabsTrigger>
          </TabsList>

          <TabsContent value="packets" className="mt-4">
            <ScrollArea className="h-[280px] rounded-2xl border border-white/10 bg-black/20">
              <div className="p-3 space-y-2">
                {packets.length ? (
                  packets.map((pkt) => (
                    <button
                      key={pkt.id}
                      type="button"
                      onClick={() => setSelected(pkt)}
                      className="w-full text-left rounded-xl border border-white/10 bg-black/20 p-3 hover:border-purple-500/30 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="text-xs text-muted-foreground">{new Date(pkt.timestamp).toLocaleTimeString()}</div>
                          <div className="text-sm font-medium flex items-center gap-2">
                            <span className="font-mono text-purple-200">{pkt.type}</span>
                            <span className="text-muted-foreground">•</span>
                            <span className="text-xs text-muted-foreground">
                              {pkt.from} → {pkt.to}
                            </span>
                          </div>
                        </div>
                        <div className="text-right text-xs text-muted-foreground">
                          <div className="font-mono">{pkt.bytes}B</div>
                        </div>
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="text-sm text-muted-foreground p-2">No packets yet. Start demo or publish from agents.</div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="inspect" className="mt-4">
            {selected ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-xs text-muted-foreground">
                    packet <span className="font-mono">{selected.id}</span>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copyToClipboard(JSON.stringify(selected, null, 2))}
                    title="Copy JSON"
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copy JSON
                  </Button>
                </div>
                <Separator className="bg-white/10" />
                <pre className="text-xs font-mono whitespace-pre-wrap break-words rounded-xl border border-white/10 bg-black/30 p-4 text-purple-100/90">
                  {JSON.stringify(selected, null, 2)}
                </pre>
              </div>
            ) : null}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}

