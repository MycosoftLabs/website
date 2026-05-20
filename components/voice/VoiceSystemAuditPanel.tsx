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
  sloPass: boolean
  sloTargetMs: number
  totalMs: number
  slow?: { id: string; latencyMs: number }[]
  probes: PingProbe[]
  timestamp?: string
}

type StackStatus = {
  readyForVoice?: boolean
  moshiAvailable?: boolean
  ports?: {
    moshi8998?: { open: boolean; host: string }
    bridge8999?: { open: boolean; host: string }
  }
  cuda?: {
    handshakeTimeoutSec?: number
    expectedCompileSec?: string
    noCudaGraphEnv?: string
  }
}

function latencyClass(ms: number, ok: boolean): string {
  if (!ok) return "text-red-400"
  if (ms <= 50) return "text-emerald-400"
  if (ms <= SLO_MS) return "text-yellow-400"
  return "text-orange-400"
}

interface VoiceSystemAuditPanelProps {
  onLog?: (level: "info" | "success" | "error" | "warn", message: string, details?: string) => void
  pollMs?: number
  autoStartWhenOffline?: boolean
}

export function VoiceSystemAuditPanel({
  onLog,
  pollMs = 10000,
  autoStartWhenOffline = true,
}: VoiceSystemAuditPanelProps) {
  const [ping, setPing] = useState<PingPayload | null>(null)
  const [stack, setStack] = useState<StackStatus | null>(null)
  const [loading, setLoading] = useState(false)
  const [starting, setStarting] = useState(false)
  const [autoStartDone, setAutoStartDone] = useState(false)
  const [lastError, setLastError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setLastError(null)
    try {
      const [pingRes, stackRes] = await Promise.all([
        fetch("/api/test-voice/ping?optional=1", { cache: "no-store", signal: AbortSignal.timeout(4000) }),
        fetch("/api/test-voice/voice-stack/status", { cache: "no-store", signal: AbortSignal.timeout(3000) }),
      ])
      if (pingRes.ok) setPing((await pingRes.json()) as PingPayload)
      else setLastError(`Ping HTTP ${pingRes.status}`)
      if (stackRes.ok) setStack((await stackRes.json()) as StackStatus)
    } catch (e) {
      setLastError(String(e))
    } finally {
      setLoading(false)
    }
  }, [])

  const startVoiceStack = useCallback(async () => {
    setStarting(true)
    onLog?.("info", "Starting voice stack via START_VOICE_SYSTEM.py...")
    try {
      const res = await fetch("/api/test-voice/voice-stack/start", { method: "POST" })
      const data = (await res.json()) as {
        ok?: boolean
        error?: string
        pid?: number
        logFile?: string
        message?: string
      }
      if (data.ok) {
        onLog?.("success", data.message || `Voice stack PID ${data.pid}`, data.logFile)
      } else {
        onLog?.("error", data.error || "Voice stack start failed")
      }
    } catch (e) {
      onLog?.("error", "Voice stack start failed", String(e))
    } finally {
      setStarting(false)
      setTimeout(refresh, 3000)
    }
  }, [onLog, refresh])

  useEffect(() => {
    refresh()
    const id = setInterval(refresh, pollMs)
    return () => clearInterval(id)
  }, [refresh, pollMs])

  useEffect(() => {
    if (!autoStartWhenOffline || autoStartDone || !stack) return
    const bridgeDown = !stack.ports?.bridge8999?.open
    const moshiDown = !stack.ports?.moshi8998?.open
    if (bridgeDown || moshiDown) {
      setAutoStartDone(true)
      startVoiceStack()
    }
  }, [stack, autoStartWhenOffline, autoStartDone, startVoiceStack])

  const criticalProbes = ping?.probes.filter((p) => p.critical !== false) ?? []
  const criticalPass = criticalProbes.filter((p) => p.ok).length
  const voiceReady = ping?.voiceReady ?? false
  const sloPass = ping?.sloPass ?? false

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
            onClick={startVoiceStack}
            disabled={starting}
          >
            <Play className={cn("w-3 h-3 mr-1", starting && "animate-pulse")} />
            {starting ? "Starting…" : "Start Stack"}
          </Button>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={refresh} disabled={loading}>
            <RefreshCw className={cn("w-3 h-3", loading && "animate-spin")} />
          </Button>
        </div>
      </div>

      <div className="p-3 space-y-3">
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
                  ? `All services online — under ${SLO_MS}ms SLO`
                  : `Online but slow — target ≤${SLO_MS}ms per probe`
                : "Voice suite not ready"}
            </div>
            <div className="text-[10px] opacity-80 truncate">
              Batch {ping?.totalMs ?? "—"}ms • {criticalPass}/{criticalProbes.length} critical • Moshika/NATF2
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
              <Server className="w-3 h-3" /> Ports
            </div>
            <PortLine label="Moshi :8998" ok={stack?.ports?.moshi8998?.open} host={stack?.ports?.moshi8998?.host} />
            <PortLine label="Bridge :8999" ok={stack?.ports?.bridge8999?.open} host={stack?.ports?.bridge8999?.host} />
          </div>
          <div className="bg-zinc-950 rounded-lg p-2 border border-zinc-800">
            <div className="flex items-center gap-1 text-zinc-400 mb-1">
              <Cpu className="w-3 h-3" /> LAN SLO
            </div>
            <p className="text-zinc-300">≤{SLO_MS}ms per health probe (Cat8 LAN)</p>
            <p className="text-zinc-500 mt-0.5">
              CUDA inference ~30ms/step • one-time compile 60–180s
            </p>
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
          <span>
            {sloPass ? "SLO pass" : ping?.slow?.length ? `${ping.slow.length} slow` : "warming…"}
          </span>
          <span>{ping?.timestamp ? new Date(ping.timestamp).toLocaleTimeString() : "—"}</span>
        </div>
      </div>
    </div>
  )
}

function PortLine({ label, ok, host }: { label: string; ok?: boolean; host?: string }) {
  return (
    <div className="flex items-center justify-between py-0.5">
      <span className="text-zinc-300">{label}</span>
      <span className={ok ? "text-green-400" : "text-red-400"}>
        {ok ? "OPEN" : "CLOSED"}
        {host ? ` (${host})` : ""}
      </span>
    </div>
  )
}
