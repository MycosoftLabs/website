"use client"

import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Activity, ArrowLeft, Brain, Grid3X3, Maximize2, Minimize2, Radio, Upload, X } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  ConnectionStatus,
  DeviceSelector,
  GlassPanel,
  Oscilloscope,
  SpectrumAnalyzer,
} from "@/components/fungi-compute"
import { SpikeTrainAnalyzer } from "@/components/fungi-compute/spike-train-analyzer"
import { STFTSpectrogram } from "@/components/fungi-compute/stft-spectrogram"
import {
  useFCIDevices,
  useSignalStream,
} from "@/lib/fungi-compute"
import type { FCIEvent, SignalBuffer } from "@/lib/fungi-compute"
import {
  canClaimNlmLive,
  isNlmAnalysisContractBound,
  resolveRequestedFungiDevice,
  resolveFungiEvidenceMode,
  validateFungiLiveEvidence,
} from "@/lib/fusarium/twins/fungi-compute/evidence-mode.mjs"
import { parseFciEvidenceImport } from "@/lib/fusarium/twins/fungi-compute/evidence-import.mjs"
import { NlmEngineStatus } from "@/components/fusarium/fci/nlm-engine-status"

type EvidenceMode = "live" | "demo" | "imported" | "stale" | "unavailable"

function EvidenceBadge({ mode }: { mode: EvidenceMode }) {
  const label = mode === "live" ? "LIVE / VERIFIED" : mode === "demo" ? "DEMO / SIMULATED" : mode === "imported" ? "IMPORTED / REPLAY" : mode === "stale" ? "STALE / WITHHELD" : "UNAVAILABLE"
  const color =
    mode === "live"
      ? "border-emerald-500/40 text-emerald-300 bg-emerald-500/10"
      : mode === "demo" || mode === "imported" || mode === "stale"
        ? "border-amber-500/40 text-amber-300 bg-amber-500/10"
        : "border-slate-500/40 text-slate-300 bg-slate-500/10"
  return <Badge className={`${color} text-[9px] font-mono`}>{label}</Badge>
}

type ImportedEvidence = ReturnType<typeof parseFciEvidenceImport>

function TruthState({ mode, children }: { mode: EvidenceMode; children?: string }) {
  const message =
    children ??
    (mode === "demo"
      ? "Explicit simulation mode. No values in this panel are live evidence."
      : "No verified device stream is bound. This panel is intentionally empty.")
  return (
    <div className="flex h-full min-h-20 flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-slate-600/50 bg-black/30 p-3 text-center">
      <EvidenceBadge mode={mode} />
      <p className="max-w-xs text-[10px] leading-relaxed text-slate-400">{message}</p>
    </div>
  )
}

function VerifiedEventLog({ events, mode = "live" }: { events: FCIEvent[]; mode?: EvidenceMode }) {
  if (events.length === 0) {
    return <TruthState mode={mode}>{mode === "imported" ? "The imported evidence contains no valid events." : "Verified stream connected; no device events have been received."}</TruthState>
  }
  return (
    <div className="h-full overflow-auto space-y-1" data-fusarium-event-source="verified-stream">
      <div className="sticky top-0 flex justify-end bg-[#050810]/90 pb-1"><EvidenceBadge mode={mode} /></div>
      {events.slice(0, 30).map((event, index) => (
        <div key={event.id || `${event.timestamp}-${index}`} className="rounded border border-cyan-500/20 bg-black/40 px-2 py-1">
          <div className="flex items-center justify-between gap-2 text-[9px]">
            <span className="font-mono text-cyan-300">{event.type}</span>
            <time className="text-slate-500">{new Date(event.timestamp).toLocaleTimeString()}</time>
          </div>
          <div className="mt-0.5 text-[8px] text-slate-400">
            Confidence {Number.isFinite(event.confidence) ? `${Math.round(event.confidence * 100)}%` : "not supplied"}
          </div>
        </div>
      ))}
    </div>
  )
}

type NlmEvidence = {
  status: "idle" | "checking" | "live" | "unavailable"
  record: Record<string, unknown> | null
}

function NlmEvidencePanel({ deviceId, mode }: { deviceId: string | null; mode: EvidenceMode }) {
  const [state, setState] = useState<NlmEvidence>({ status: "idle", record: null })

  useEffect(() => {
    if (!deviceId || mode !== "live") {
      setState({ status: "idle", record: null })
      return
    }

    const controller = new AbortController()
    setState({ status: "checking", record: null })
    void (async () => {
      try {
        const [healthResponse, analysisResponse] = await Promise.all([
          fetch("/api/mas/health", { cache: "no-store", signal: controller.signal }),
          fetch(`/api/fci/nlm/${encodeURIComponent(deviceId)}`, { cache: "no-store", signal: controller.signal }),
        ])
        const health = await healthResponse.json().catch(() => null)
        const payload = await analysisResponse.json().catch(() => null)
        const masReachable =
          healthResponse.ok &&
          health?.reachable === true &&
          health?.status !== "offline" &&
          health?.status !== "degraded"
        const analysisBound = analysisResponse.ok && isNlmAnalysisContractBound(payload, deviceId)
        if (canClaimNlmLive({ mode, masReachable, analysisBound })) {
          const record = (payload.analysis && typeof payload.analysis === "object" ? payload.analysis : payload) as Record<string, unknown>
          setState({ status: "live", record })
        } else {
          setState({ status: "unavailable", record: null })
        }
      } catch {
        if (!controller.signal.aborted) setState({ status: "unavailable", record: null })
      }
    })()
    return () => controller.abort()
  }, [deviceId, mode])

  if (mode === "demo") return <TruthState mode="demo">NLM simulation is disabled in Fusarium; demo results are not presented as live analysis.</TruthState>
  if (mode !== "live") return <TruthState mode="unavailable">NLM requires a verified FCI stream, reachable MAS health, and a device-bound analysis record.</TruthState>
  if (state.status === "checking") return <TruthState mode="unavailable">Checking MAS health and the device-bound NLM analysis contract…</TruthState>
  if (state.status !== "live" || !state.record) return <TruthState mode="unavailable">NLM is unavailable because health and analysis contracts were not both verified.</TruthState>

  const growthPhase = String(state.record.growthPhase ?? state.record.growth_phase ?? "Unknown")
  const recommendations = Array.isArray(state.record.recommendations) ? state.record.recommendations : []
  return (
    <div className="h-full overflow-auto rounded-lg border border-purple-500/25 bg-black/35 p-2 text-[9px]" data-fusarium-nlm-source="verified-contract">
      <div className="mb-2 flex justify-end"><EvidenceBadge mode="live" /></div>
      <p className="text-slate-400">Growth phase</p>
      <p className="font-mono text-purple-300">{growthPhase}</p>
      <p className="mt-2 text-slate-400">Recommendations</p>
      {recommendations.length > 0 ? (
        <ul className="mt-1 list-disc space-y-1 pl-4 text-slate-300">
          {recommendations.slice(0, 3).map((item, index) => <li key={index}>{String(item)}</li>)}
        </ul>
      ) : <p className="mt-1 text-slate-500">None supplied.</p>}
    </div>
  )
}

export function FusariumFungiComputeDashboard() {
  const searchParams = useSearchParams()
  const requestedDeviceId = searchParams.get("deviceId")
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null)
  const [selectionStartedAt, setSelectionStartedAt] = useState<string | null>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const { devices, loading: devicesLoading } = useFCIDevices()
  const importInputRef = useRef<HTMLInputElement | null>(null)
  const [importedEvidence, setImportedEvidence] = useState<ImportedEvidence | null>(null)
  const [importError, setImportError] = useState<string | null>(null)
  const [evaluatedAt, setEvaluatedAt] = useState(() => new Date().toISOString())

  const {
    status: connectionStatus,
    isConnected,
    isDemoMode,
    signalBuffer,
  } = useSignalStream({
    deviceId: selectedDeviceId,
    enabled: !!selectedDeviceId && !selectedDeviceId.startsWith("demo-") && !importedEvidence,
    demoMode: false,
  })

  const requestedDevice = useMemo(
    () => resolveRequestedFungiDevice(requestedDeviceId, devices),
    [requestedDeviceId, devices],
  )
  const liveEvidence = useMemo(
    () => validateFungiLiveEvidence({
      selectedDeviceId,
      selectionStartedAt,
      registeredDeviceIds: devices.map((device) => device.id),
      transportConnected: isConnected,
      buffers: signalBuffer,
      evaluatedAt,
    }),
    [selectedDeviceId, selectionStartedAt, devices, isConnected, signalBuffer, evaluatedAt],
  )
  const streamEvidenceMode = resolveFungiEvidenceMode({
    deviceId: selectedDeviceId,
    liveEvidenceState: liveEvidence.state,
    isDemoMode,
  }) as EvidenceMode
  const evidenceMode: EvidenceMode = importedEvidence ? "imported" : streamEvidenceMode
  const activeSignalBuffer = (importedEvidence?.buffers ?? (liveEvidence.state === "verified" ? liveEvidence.buffers : [])) as SignalBuffer[]
  const activeEvents = importedEvidence?.events ?? []
  const signalContractBound = (evidenceMode === "live" || evidenceMode === "imported") && activeSignalBuffer.length > 0

  useEffect(() => {
    if (devicesLoading) return
    const selectedAt = new Date().toISOString()
    setSelectedDeviceId(requestedDevice.deviceId)
    setSelectionStartedAt(requestedDevice.deviceId ? selectedAt : null)
    setEvaluatedAt(selectedAt)
  }, [devicesLoading, requestedDeviceId, requestedDevice.deviceId])

  useEffect(() => {
    if (!selectedDeviceId || importedEvidence) return
    const interval = window.setInterval(() => setEvaluatedAt(new Date().toISOString()), 2_000)
    return () => window.clearInterval(interval)
  }, [selectedDeviceId, importedEvidence])

  const selectRegisteredDevice = useCallback((deviceId: string) => {
    const match = resolveRequestedFungiDevice(deviceId, devices)
    const selectedAt = new Date().toISOString()
    setSelectedDeviceId(match.deviceId)
    setSelectionStartedAt(match.deviceId ? selectedAt : null)
    setEvaluatedAt(selectedAt)
  }, [devices])

  const importEvidence = useCallback(async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ""
    if (!file) return
    try {
      setImportedEvidence(parseFciEvidenceImport(JSON.parse(await file.text())))
      setImportError(null)
    } catch (error) {
      setImportedEvidence(null)
      setImportError(error instanceof Error ? error.message : "Evidence import failed.")
    }
  }, [])

  const selectedDevice = devices.find((device) => device.id === selectedDeviceId)
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) void document.documentElement.requestFullscreen()
    else void document.exitFullscreen()
  }, [])
  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener("fullscreenchange", handler)
    return () => document.removeEventListener("fullscreenchange", handler)
  }, [])

  const signalFallback = (
    <TruthState mode={evidenceMode}>
      {evidenceMode === "stale"
        ? liveEvidence.reasons[0] ?? "The last validated sample is stale and has been withheld."
        : isConnected
          ? liveEvidence.reasons[0] ?? "Transport is open, but no complete provider-authored sample envelope is verified."
          : requestedDeviceId && requestedDevice.state === "missing"
            ? `Requested device ${requestedDeviceId} is not an exact registry match.`
            : undefined}
    </TruthState>
  )

  return (
    <div
      className="relative w-full h-full overflow-hidden"
      data-fusarium-fungi-evidence-mode={evidenceMode}
      data-fusarium-fungi-evidence-state={liveEvidence.state}
      data-fusarium-fungi-transport-state={connectionStatus}
      data-fusarium-fungi-selected-device={selectedDeviceId ?? "unbound"}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-[#0a0e1a] via-[#0d1321] to-[#08090d]" />
      <div className="absolute inset-0 overflow-hidden opacity-40 pointer-events-none">
        <div className="absolute top-1/4 -left-24 w-96 h-96 bg-cyan-500/30 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-1/3 right-0 w-80 h-80 bg-emerald-500/25 rounded-full blur-[100px] animate-pulse" />
      </div>
      <div className="relative h-full flex flex-col p-2 gap-2 overflow-hidden">
        <header className="flex-none flex items-center justify-between px-4 py-2 rounded-2xl backdrop-blur-2xl bg-black/40 border border-cyan-500/20 shadow-[0_8px_32px_0_rgba(6,182,212,0.15),inset_0_1px_0_0_rgba(255,255,255,0.05)]">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-cyan-500 to-emerald-500 flex items-center justify-center"><Brain className="h-5 w-5 text-white" /></div>
            <div><h1 className="text-lg font-bold text-cyan-300 leading-none">FUNGI COMPUTE</h1><p className="text-[10px] text-cyan-400/50 font-mono mt-0.5">Bio-Electric Interface v1.0</p></div>
          </div>
          <div className="flex items-center gap-2">
            <Badge className="border border-slate-500/40 bg-slate-500/10 text-[9px] font-mono text-slate-300">READ ONLY</Badge>
            <EvidenceBadge mode={evidenceMode} />
            <input ref={importInputRef} type="file" accept="application/json,.json" className="hidden" onChange={(event) => void importEvidence(event)} />
            <Button variant="ghost" size="sm" className="h-8 px-2 text-amber-300" onClick={() => importInputRef.current?.click()}><Upload className="mr-1 h-4 w-4" />Import evidence</Button>
            {importedEvidence ? <Button variant="ghost" size="sm" className="h-8 px-2 text-slate-400" onClick={() => setImportedEvidence(null)}><X className="mr-1 h-4 w-4" />End replay</Button> : null}
            <Link href="/fusarium"><Button variant="ghost" size="sm" className="h-8 px-2 text-cyan-400"><ArrowLeft className="h-4 w-4 mr-1" />Fusarium</Button></Link>
            <div className="flex items-center gap-1" aria-label={`Transport ${connectionStatus}`}><span className="text-[9px] uppercase tracking-wide text-slate-500">Transport</span><ConnectionStatus status={connectionStatus} /></div>
            {selectedDevice && <Badge variant="outline" className="border-cyan-500/30 text-cyan-400 text-xs"><Activity className="h-3 w-3 mr-1" />Declared {String(selectedDevice.sampleRate)} Hz</Badge>}
            <DeviceSelector devices={devices} selectedId={selectedDeviceId} onSelect={selectRegisteredDevice} loading={devicesLoading} />
            <Button variant="ghost" size="icon" className="h-8 w-8 text-cyan-400" onClick={toggleFullscreen} aria-label="Toggle full screen">
              {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </Button>
          </div>
        </header>

        <div className="flex-1 grid grid-cols-12 gap-2 min-h-0 overflow-hidden">
          <div className="col-span-5 flex flex-col gap-2 min-h-0 overflow-hidden">
            <GlassPanel title="Oscilloscope (µV Scale)" icon={Activity} className="flex-[2] min-h-0">{signalContractBound ? <Oscilloscope signalBuffer={activeSignalBuffer} /> : signalFallback}</GlassPanel>
            <GlassPanel title="STFT Spectrogram (Buffi 2025)" icon={Grid3X3} className="flex-[2] min-h-0">{signalContractBound ? <STFTSpectrogram signalBuffer={activeSignalBuffer} /> : signalFallback}</GlassPanel>
          </div>
          <div className="col-span-4 flex flex-col gap-2 min-h-0 overflow-hidden">
            <GlassPanel title="Spectrum Analyzer" icon={Grid3X3} className="flex-1 min-h-0">{signalContractBound ? <SpectrumAnalyzer signalBuffer={activeSignalBuffer} /> : signalFallback}</GlassPanel>
            <GlassPanel title="Spike Train (Adamatzky 2022)" icon={Activity} className="flex-1 min-h-0">{signalContractBound ? <SpikeTrainAnalyzer signalBuffer={activeSignalBuffer} patterns={[]} /> : signalFallback}</GlassPanel>
            <GlassPanel title="Causality (Fukasawa 2024)" icon={Radio} className="flex-1 min-h-0"><TruthState mode={evidenceMode}>No verified causality-analysis contract is bound; synthetic transfer-entropy flows are disabled.</TruthState></GlassPanel>
          </div>
          <div className="col-span-3 flex flex-col gap-2 min-h-0 overflow-hidden">
            <GlassPanel title="Signal Fingerprint" icon={Radio} className="flex-1 min-h-0"><TruthState mode="unavailable">No fresh, provenance-bearing fingerprint contract is bound. Registry identity and transport state are insufficient.</TruthState></GlassPanel>
            <GlassPanel title="NLM Pattern Recognition" icon={Brain} className="flex-1 min-h-0"><div className="space-y-2"><NlmEngineStatus />{evidenceMode === "imported" ? <TruthState mode="imported">Imported evidence is locally replayed only; no NLM inference was requested.</TruthState> : <NlmEvidencePanel deviceId={selectedDeviceId} mode={evidenceMode} />}</div></GlassPanel>
            <GlassPanel title="Event Log" icon={Activity} className="flex-1 min-h-0">{evidenceMode === "imported" ? <VerifiedEventLog events={activeEvents} mode={evidenceMode} /> : evidenceMode === "live" ? <VerifiedEventLog events={[]} mode="live" /> : <TruthState mode={evidenceMode}>Synthetic event generation is disabled. Only separately validated or labeled imported events appear here.</TruthState>}</GlassPanel>
          </div>
        </div>
        {importError ? <div className="absolute bottom-3 left-3 z-50 rounded border border-red-500/40 bg-black/90 px-3 py-2 text-xs text-red-300">Import rejected: {importError}</div> : null}
      </div>
    </div>
  )
}
