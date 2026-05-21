"use client"

import { useCallback, useEffect, useState } from "react"
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Cpu,
  Play,
  RefreshCw,
  Server,
  XCircle,
  Zap,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const SLO_MS = 100

type PingProbe = {
  id: string
  name: string
  ok: boolean
  latencyMs: number
  sloOk?: boolean
  critical?: boolean
}

type PingPayload = {
  voiceReady: boolean
  voiceStackReady?: boolean
  sloPass: boolean
  sloTargetMs: number
  totalMs: number
  slow?: { id: string; latencyMs: number }[]
  offline?: { id: string; error?: string }[]
  probes: PingProbe[]
  config?: { bridgeBase?: string; moshiHost?: string }
  timestamp?: string
}

function latencyClass(ms: number, ok: boolean): string {
  if (!ok) return "text-red-400"
  if (ms <= 50) return "text-emerald-400"
  if (ms <= SLO_MS) return "text-yellow-400"
  return "text-orange-400"
}

interface VoiceSystemAuditPanelProps {
  onLog?: (level: "info" | "success" | "error" | "warn", message: string, details?: string) => void
  onVoiceReadyChange?: (ready: boolean) => void
  /** Moshi+Bridge ports only — enables Start MYCA Voice even when MINDEX is slow */
  onVoiceStackReadyChange?: (ready: boolean) => void
  pollMs?: number
  autoStartWhenOffline?: boolean
}

export function VoiceSystemAuditPanel({
  onLog,
  onVoiceReadyChange,
  onVoiceStackReadyChange,
  pollMs = 45000,
  autoStartWhenOffline = true,
}: VoiceSystemAuditPanelProps) {
  const [ping, setPing] = useState<PingPayload | null>(null)
  const [loading, setLoading] = useState(false)
  const [starting, setStarting] = useState(false)
  const [startMessage, setStartMessage] = useState<string | null>(null)
  const [autoStartDone, setAutoStartDone] = useState(false)
  const [lastError, setLastError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setLastError(null)
    try {
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          const pingRes = await fetch("/api/test-voice/ping?optional=1", {
            cache: "no-store",
            signal: AbortSignal.timeout(attempt === 1 ? 12000 : 20000),
          })
          if (!pingRes.ok) {
            setLastError(`Ping HTTP ${pingRes.status}`)
            if (attempt < 3) {
              await new Promise((r) => setTimeout(r, 1500))
              continue
            }
            return
          }
          setPing((await pingRes.json()) as PingPayload)
          setLastError(null)
          return
        } catch (e) {
          const msg = String(e)
          setLastError(
            msg.includes("TimeoutError") || msg.includes("timeout")
              ? "Probe timed out — Next.js may be compiling; retrying…"
              : msg
          )
          if (attempt < 3) {
            await new Promise((r) => setTimeout(r, 1500))
            continue
          }
        }
      }
    } finally {
      setLoading(false)
    }
  }, [])

  const startVoiceStack = useCallback(async () => {
    setStarting(true)
    setStartMessage("Launching START_VOICE_SYSTEM.py…")
    onLog?.("info", "Starting voice stack via START_VOICE_SYSTEM.py...")
    try {
      const res = await fetch("/api/test-voice/voice-stack/start", {
        method: "POST",
        signal: AbortSignal.timeout(15000),
      })
      const data = (await res.json()) as {
        ok?: boolean
        error?: string
        pid?: number
        logFile?: string
        message?: string
        alreadyRunning?: boolean
      }
      if (data.ok) {
        const msg = data.alreadyRunning
          ? "Voice stack already running on ports 8998/8999"
          : data.message || `Voice stack PID ${data.pid}`
        setStartMessage(msg)
        onLog?.("success", msg, data.logFile)
      } else {
        const err = data.error || `Start failed (HTTP ${res.status})`
        setStartMessage(err)
        onLog?.("error", err)
      }
    } catch (e) {
      const err = `Voice stack start failed: ${e}`
      setStartMessage(err)
      onLog?.("error", err)
    } finally {
      setStarting(false)
      setTimeout(refresh, 2000)
    }
  }, [onLog, refresh])

  useEffect(() => {
    refresh()
    const id = setInterval(refresh, pollMs)
    return () => clearInterval(id)
  }, [refresh, pollMs])

  const moshiTcp = ping?.probes.find((p) => p.id === "moshi_tcp")
  const bridgeTcp = ping?.probes.find((p) => p.id === "bridge_tcp")
  const portsOpen = Boolean(moshiTcp?.ok && bridgeTcp?.ok)

  useEffect(() => {
    if (!autoStartWhenOffline || autoStartDone || !ping) return
    if (!portsOpen) {
      setAutoStartDone(true)
      startVoiceStack()
    }
  }, [ping, portsOpen, autoStartWhenOffline, autoStartDone, startVoiceStack])

  const criticalProbes = ping?.probes.filter((p) => p.critical !== false && !p.id.endsWith("_tcp")) ?? []
  const voiceReady = ping?.voiceReady ?? false
  const sloPass = ping?.sloPass ?? false

  useEffect(() => {
    if (!ping) return
    onVoiceReadyChange?.(ping.voiceReady)
    onVoiceStackReadyChange?.(Boolean(ping.voiceStackReady ?? (moshiTcp?.ok && bridgeTcp?.ok)))
  }, [ping, onVoiceReadyChange, onVoiceStackReadyChange, moshiTcp?.ok, bridgeTcp?.ok])

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-800 bg-zinc-950/60">
        <h2 className="font-semibold text-sm flex items-center gap-2">
          <Activity className="w-4 h-4 text-cyan-400" />
          Live Voice Probes
        </h2>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs"
            onClick={() => void startVoiceStack()}
            disabled={starting}
          >
            <Play className={cn("w-3 h-3 mr-1", starting && "animate-pulse")} />
            {starting ? "Starting…" : portsOpen ? "Restart Stack" : "Start Stack"}
          </Button>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => void refresh()} disabled={loading}>
            <RefreshCw className={cn("w-3 h-3", loading && "animate-spin")} />
          </Button>
        </div>
      </div>

      <div className="p-3 space-y-3">
        {startMessage && (
          <div className="text-[10px] text-cyan-300 bg-cyan-950/30 border border-cyan-800/40 rounded px-2 py-1">
            {startMessage}
          </div>
        )}

        <div
          className={cn(
            "rounded-lg px-3 py-2 flex items-center gap-2 text-xs",
            voiceReady && sloPass
              ? "bg-emerald-950/50 border border-emerald-800/50 text-emerald-200"
              : voiceReady
                ? "bg-yellow-950/40 border border-yellow-800/50 text-yellow-200"
                : "bg-amber-950/40 border border-amber-800/50 text-amber-200"
          )}
        >
          {voiceReady && sloPass ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
          )}
          <div className="min-w-0">
            <div className="font-medium">
              {voiceReady
                ? sloPass
                  ? `Voice suite ready — click Start MYCA Voice`
                  : `Online — some probes over ${SLO_MS}ms`
                : "Voice suite not ready"}
            </div>
            <div className="text-[10px] opacity-80 truncate">
              Batch {ping?.totalMs ?? "—"}ms • Moshika/NATF2 via PersonaPlex
            </div>
          </div>
        </div>

        {lastError && (
          <div className="text-[10px] text-red-400 bg-red-950/30 border border-red-900/40 rounded px-2 py-1">
            {lastError}
          </div>
        )}

        <div className="grid grid-cols-2 gap-2 text-[10px]">
          <div className="bg-zinc-950 rounded-lg p-2 border border-zinc-800">
            <div className="flex items-center gap-1 text-zinc-400 mb-1">
              <Server className="w-3 h-3" /> Ports (127.0.0.1)
            </div>
            <PortLine label="Moshi :8998" ok={moshiTcp?.ok} ms={moshiTcp?.latencyMs} />
            <PortLine label="Bridge :8999" ok={bridgeTcp?.ok} ms={bridgeTcp?.latencyMs} />
          </div>
          <div className="bg-zinc-950 rounded-lg p-2 border border-zinc-800">
            <div className="flex items-center gap-1 text-zinc-400 mb-1">
              <Cpu className="w-3 h-3" /> CUDA
            </div>
            <p className="text-zinc-300">NO_CUDA_GRAPH=0</p>
            <p className="text-zinc-500 mt-0.5">First connect: 60–180s compile</p>
          </div>
        </div>

        <div className="space-y-1 max-h-52 overflow-y-auto">
          {criticalProbes.map((probe) => (
            <div
              key={probe.id}
              className="flex items-center justify-between py-1 px-2 rounded text-[11px] hover:bg-zinc-800/40"
            >
              <div className="flex items-center gap-2 min-w-0">
                {probe.ok ? (
                  <CheckCircle2 className="w-3 h-3 text-green-500 shrink-0" />
                ) : (
                  <XCircle className="w-3 h-3 text-red-500 shrink-0" />
                )}
                <span className="truncate">{probe.name}</span>
              </div>
              <span className={cn("shrink-0 ml-2 font-mono", latencyClass(probe.latencyMs, probe.ok))}>
                {probe.latencyMs}ms
              </span>
            </div>
          ))}
        </div>

        {(ping?.probes.filter((p) => p.critical === false) ?? []).length > 0 && (
          <details className="text-[10px] text-zinc-500">
            <summary className="cursor-pointer flex items-center gap-1">
              <Zap className="w-3 h-3" /> Optional
            </summary>
            <div className="mt-1 space-y-0.5 pl-2">
              {ping?.probes
                .filter((p) => p.critical === false)
                .map((p) => (
                  <div key={p.id} className="flex items-center justify-between gap-2">
                    <span>{p.name}</span>
                    <span className={latencyClass(p.latencyMs, p.ok)}>{p.latencyMs}ms</span>
                  </div>
                ))}
            </div>
          </details>
        )}

        <div className="text-[10px] text-zinc-600 flex justify-between pt-1 border-t border-zinc-800">
          <span>{portsOpen ? "Ports open" : "Ports closed — use Start Stack"}</span>
          <span>{ping?.timestamp ? new Date(ping.timestamp).toLocaleTimeString() : "—"}</span>
        </div>
      </div>
    </div>
  )
}

function PortLine({ label, ok, ms }: { label: string; ok?: boolean; ms?: number }) {
  return (
    <div className="flex items-center justify-between py-0.5">
      <span className="text-zinc-300">{label}</span>
      <span className={ok ? "text-green-400" : "text-red-400"}>
        {ok ? `OPEN${ms != null ? ` ${ms}ms` : ""}` : "CLOSED"}
      </span>
    </div>
  )
}
