"use client"

import { useEffect, useMemo, useRef, useState, useCallback } from "react"
import { motion } from "framer-motion"
import useSWR from "swr"
import { AlertTriangle, Activity, Copy, Gauge, Loader2, Pause, Play, Shield, Waves, MapPin, RefreshCw } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"

type Risk = "normal" | "elevated" | "high" | "critical" | "monitoring" | "warning" | "offline"

interface MWavePrediction {
  timestamp: string
  risk_level: Risk
  risk_score: number
  anomaly_count: number
  network_coverage: number
  confidence: number
  prediction_horizon_hours: number
}

interface MWaveEvent {
  id: string
  timestamp: string
  prediction: MWavePrediction
}

interface USGSEarthquake {
  id: string
  magnitude: number
  location: {
    place: string
    latitude: number
    longitude: number
    depth_km: number
  }
  timestamp: string
  alert_level: string | null
  significance: number
}

interface MWaveAPIResponse {
  status: Risk
  last_updated: string
  sensor_count: number
  active_correlations: number
  prediction_confidence: number
  earthquakes: {
    hour: USGSEarthquake[]
    count_hour: number
    count_day: number
    max_magnitude_24h: number
  }
  alerts: Array<{
    type: string
    severity: string
    message: string
    timestamp: string
  }>
  data_source: "live" | "cached" | "unavailable"
}

const fetcher = (url: string) => fetch(url).then(r => r.json())

function nowIso() {
  return new Date().toISOString()
}

function copyToClipboard(text: string) {
  if (!text) return
  void navigator.clipboard?.writeText(text)
}

function riskColor(risk: Risk) {
  if (risk === "normal") return "text-emerald-200 border-emerald-500/40 bg-emerald-500/10"
  if (risk === "elevated") return "text-yellow-200 border-yellow-500/40 bg-yellow-500/10"
  if (risk === "high") return "text-orange-200 border-orange-500/40 bg-orange-500/10"
  return "text-red-200 border-red-500/40 bg-red-500/10"
}

export function MWaveDashboard({ className, channelId = "mwave-analysis" }: { className?: string; channelId?: string }) {
  const [publishKey, setPublishKey] = useState("")
  const [isPublishing, setIsPublishing] = useState(false)
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [events, setEvents] = useState<MWaveEvent[]>([])

  const intervalRef = useRef<number | null>(null)
  const sourceRef = useRef<EventSource | null>(null)

  // Fetch real USGS earthquake data
  const { data: mwaveData, error: mwaveError, isLoading, mutate } = useSWR<MWaveAPIResponse>(
    "/api/natureos/mindex/mwave",
    fetcher,
    { refreshInterval: 60000 } // Refresh every minute
  )

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
    const onPrediction = (ev: MessageEvent) => {
      try {
        const parsed = JSON.parse(ev.data) as { data?: MWaveEvent }
        const e = parsed?.data
        if (!e?.id) return
        setEvents((prev) => [e, ...prev].slice(0, 120))
      } catch {
        // ignore
      }
    }

    src.addEventListener("connected", onConnected as EventListener)
    src.addEventListener("ping", onPing as EventListener)
    src.addEventListener("mwave.prediction", onPrediction as EventListener)
    src.onerror = () => {
      setIsConnected(false)
      setError("SSE disconnected (integrations disabled or server not reachable).")
    }

    return () => {
      src.close()
      sourceRef.current = null
    }
  }, [subscribeUrl])

  async function publishPrediction(e: MWaveEvent) {
    if (!publishKey.trim()) {
      setError("Set MYCORRHIZAE_PUBLISH_KEY in env and paste it here to publish demo M-Wave predictions.")
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
        event: "mwave.prediction",
        data: e,
      }),
    })
    if (!res.ok) throw new Error(await res.text())
  }

  async function startDemo() {
    setError(null)
    setIsPublishing(true)

    const emit = () => {
      const score = Math.round(Math.random() * 100)
      const risk: Risk = score >= 80 ? "critical" : score >= 50 ? "high" : score >= 20 ? "elevated" : "normal"
      const prediction: MWavePrediction = {
        timestamp: nowIso(),
        risk_level: risk,
        risk_score: score,
        anomaly_count: Math.floor(score / 10),
        network_coverage: 12,
        confidence: 0.85,
        prediction_horizon_hours: 6,
      }
      const ev: MWaveEvent = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        timestamp: nowIso(),
        prediction,
      }
      publishPrediction(ev).catch((err) => setError(err instanceof Error ? err.message : String(err)))
    }

    emit()
    intervalRef.current = window.setInterval(emit, 1700)
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

  const latest = events[0]?.prediction ?? null

  return (
    <Card className={cn("border-purple-500/20 bg-gradient-to-br from-purple-500/5 via-background to-blue-500/5", className)}>
      <CardHeader className="space-y-2">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2">
              <Waves className="h-5 w-5 text-purple-400" />
              M-Wave Seismic Lens
            </CardTitle>
            <CardDescription>Stream distributed mycelium-network anomaly predictions and visualize risk in real time.</CardDescription>
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
            {isConnected ? <Activity className="h-3.5 w-3.5" /> : <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          </div>
        </div>

        <div className="grid gap-2 md:grid-cols-[1fr_auto]">
          <Input
            value={publishKey}
            onChange={(e) => setPublishKey(e.target.value)}
            placeholder="MYCORRHIZAE_PUBLISH_KEY (for demo predictions)"
            className="font-mono"
          />

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
        </div>

        {error ? (
          <div className="text-xs text-yellow-200/80 border border-yellow-500/20 bg-yellow-500/10 rounded-md px-3 py-2 flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 mt-0.5" />
            <div>{error}</div>
          </div>
        ) : null}
      </CardHeader>

      <CardContent className="space-y-4">
        {/* USGS Earthquake Stats */}
        <div className="grid gap-3 md:grid-cols-4">
          <Card className="border-white/10 bg-black/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs text-muted-foreground">Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={cn("inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium", 
                mwaveData ? riskColor(mwaveData.status as Risk) : "border-white/10 bg-white/5 text-white/70")}>
                {isLoading ? "Loading..." : mwaveData?.status || "—"}
              </div>
            </CardContent>
          </Card>
          <Card className="border-white/10 bg-black/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs text-muted-foreground">Earthquakes (24h)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-200 flex items-center gap-2">
                <Activity className="h-5 w-5" />
                {mwaveData?.earthquakes?.count_day || 0}
              </div>
            </CardContent>
          </Card>
          <Card className="border-white/10 bg-black/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs text-muted-foreground">Max Magnitude</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-200 flex items-center gap-2">
                <Gauge className="h-5 w-5" />
                M{mwaveData?.earthquakes?.max_magnitude_24h?.toFixed(1) || "—"}
              </div>
            </CardContent>
          </Card>
          <Card className="border-white/10 bg-black/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs text-muted-foreground">Sensors Online</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-cyan-200">{mwaveData?.sensor_count || 0}</div>
            </CardContent>
          </Card>
        </div>

        {/* Alerts */}
        {mwaveData?.alerts && mwaveData.alerts.length > 0 && (
          <div className="space-y-2">
            {mwaveData.alerts.map((alert, i) => (
              <div key={i} className={cn(
                "rounded-lg border px-3 py-2 text-sm flex items-start gap-2",
                alert.severity === "critical" ? "border-red-500/40 bg-red-500/10 text-red-200" :
                alert.severity === "warning" ? "border-orange-500/40 bg-orange-500/10 text-orange-200" :
                "border-yellow-500/40 bg-yellow-500/10 text-yellow-200"
              )}>
                <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>{alert.message}</span>
              </div>
            ))}
          </div>
        )}

        <Separator className="bg-white/10" />

        {/* Real USGS Earthquakes */}
        <div className="flex items-center justify-between gap-2">
          <div className="text-sm font-medium">Recent Earthquakes (USGS Live)</div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {mwaveData?.data_source === "live" ? "LIVE" : mwaveData?.data_source || "—"}
            </Badge>
            <Button size="sm" variant="outline" onClick={() => mutate()} disabled={isLoading}>
              <RefreshCw className={cn("h-4 w-4 mr-2", isLoading && "animate-spin")} />
              Refresh
            </Button>
          </div>
        </div>

        <ScrollArea className="h-[200px] rounded-2xl border border-white/10 bg-black/20">
          <div className="p-3 space-y-2">
            {mwaveData?.earthquakes?.hour?.length ? (
              mwaveData.earthquakes.hour.slice(0, 20).map((eq, idx) => (
                <motion.div
                  key={eq.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(idx * 0.02, 0.3) }}
                  className="rounded-xl border border-white/10 bg-black/20 p-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1 flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Badge className={cn(
                          "text-xs font-mono",
                          eq.magnitude >= 5 ? "bg-red-500/20 text-red-300" :
                          eq.magnitude >= 3 ? "bg-orange-500/20 text-orange-300" :
                          "bg-green-500/20 text-green-300"
                        )}>
                          M{eq.magnitude?.toFixed(1)}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {new Date(eq.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <div className="text-sm text-white/80 truncate flex items-center gap-1">
                        <MapPin className="h-3 w-3 flex-shrink-0" />
                        {eq.location?.place || "Unknown location"}
                      </div>
                    </div>
                    <div className="text-right text-xs text-muted-foreground font-mono">
                      {eq.location?.depth_km?.toFixed(1) || "?"} km
                    </div>
                  </div>
                </motion.div>
              ))
            ) : isLoading ? (
              <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Loading earthquake data...
              </div>
            ) : mwaveError ? (
              <div className="text-sm text-yellow-200/80 p-2">Failed to load USGS data</div>
            ) : (
              <div className="text-sm text-muted-foreground p-2">No recent earthquakes in the last hour.</div>
            )}
          </div>
        </ScrollArea>

        <Separator className="bg-white/10" />

        {/* SSE Prediction Stream (Original) */}
        <div className="flex items-center justify-between gap-2">
          <div className="text-sm font-medium">M-Wave Predictions (SSE Stream)</div>
          <Button size="sm" variant="outline" onClick={() => copyToClipboard(JSON.stringify(events[0] ?? null, null, 2))} disabled={!events.length}>
            <Copy className="h-4 w-4 mr-2" />
            Copy latest
          </Button>
        </div>

        <ScrollArea className="h-[140px] rounded-2xl border border-white/10 bg-black/20">
          <div className="p-3 space-y-2">
            {events.length ? (
              events.slice(0, 10).map((e, idx) => (
                <motion.div
                  key={`${e.id}-${idx}`}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(idx * 0.01, 0.25) }}
                  className="rounded-xl border border-white/10 bg-black/20 p-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="text-xs text-muted-foreground">{new Date(e.timestamp).toLocaleTimeString()}</div>
                      <div className="text-sm font-medium flex items-center gap-2">
                        <span className="font-mono text-purple-200">{e.prediction.risk_level}</span>
                        <span className="text-muted-foreground">•</span>
                        <span className="font-mono text-xs">{e.prediction.risk_score}</span>
                      </div>
                    </div>
                    <div className="text-right text-xs text-muted-foreground font-mono">
                      {e.prediction.network_coverage} nodes
                    </div>
                  </div>
                </motion.div>
              ))
            ) : (
              <div className="text-sm text-muted-foreground p-2">Start demo to see predictions, or wait for real data from MycoBrain sensors.</div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}

