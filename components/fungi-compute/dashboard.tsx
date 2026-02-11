/**
 * Fungi Compute Dashboard
 * 
 * Main dashboard component orchestrating all FCI visualization panels.
 * Optimized for single-screen viewing with advanced glass morphism.
 */

"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import { Brain, Maximize2, Minimize2, Activity, Waves, Grid3X3, Zap, Radio, ArrowLeft } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  useFCIDevices, 
  useSignalStream, 
  usePatternHistory,
  useSignalFingerprint,
  DetectedPattern,
  FCIEvent,
} from "@/lib/fungi-compute"

import { DeviceSelector } from "./device-selector"
import { ConnectionStatus } from "./connection-status"
import { Oscilloscope } from "./oscilloscope"
import { SpectrumAnalyzer } from "./spectrum-analyzer"
import { SignalFingerprint } from "./signal-fingerprint"
import { EventMempool } from "./event-mempool"
import { SDRFilterPanel } from "./sdr-filter-panel"
import { PatternTimeline } from "./pattern-timeline"
import { NLMPanel } from "./nlm-panel"
import { StimulationPanel } from "./stimulation-panel"
import { GlassPanel } from "./glass-panel"
import { ControlPanel } from "./control-panel"
import { TimelineControl } from "./timeline-control"
import { STFTSpectrogram } from "./stft-spectrogram"
import { SpikeTrainAnalyzer } from "./spike-train-analyzer"
import { CausalityGraph } from "./causality-graph"

export function FungiComputeDashboard() {
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)

  // Fetch devices
  const { devices, loading: devicesLoading } = useFCIDevices()

  // Signal streaming
  const handlePattern = useCallback((pattern: DetectedPattern) => {
    console.log("[FungiCompute] Pattern detected:", pattern)
  }, [])

  const handleEvent = useCallback((event: FCIEvent) => {
    console.log("[FungiCompute] Event received:", event)
  }, [])

  const {
    status: connectionStatus,
    isConnected,
    signalBuffer,
    spectrum,
    patterns: livePatterns,
    events: liveEvents,
    setSDRConfig,
    applyPreset,
    sendStimulation,
  } = useSignalStream({
    deviceId: selectedDeviceId,
    enabled: !!selectedDeviceId,
    onPattern: handlePattern,
    onEvent: handleEvent,
  })

  // Pattern history
  const { patterns: historicalPatterns } = usePatternHistory(selectedDeviceId)

  // Signal fingerprint
  const { fingerprint } = useSignalFingerprint(selectedDeviceId)

  // Select first device only once on initial load
  const deviceSelectedRef = useRef(false)
  useEffect(() => {
    if (!deviceSelectedRef.current && devices.length > 0 && !devicesLoading) {
      deviceSelectedRef.current = true
      setSelectedDeviceId(devices[0].id)
    }
  }, [devices, devicesLoading])

  const selectedDevice = devices.find(d => d.id === selectedDeviceId)

  // Fullscreen handling
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen()
    } else {
      document.exitFullscreen()
    }
  }, [])

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener("fullscreenchange", handler)
    return () => document.removeEventListener("fullscreenchange", handler)
  }, [])

  return (
    <div className="relative w-full h-full overflow-hidden">
      {/* Advanced background with depth */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#0a0e1a] via-[#0d1321] to-[#08090d]" />
      
      {/* Animated glow orbs */}
      <div className="absolute inset-0 overflow-hidden opacity-40 pointer-events-none">
        <div className="absolute top-1/4 -left-24 w-96 h-96 bg-cyan-500/30 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-1/3 right-0 w-80 h-80 bg-emerald-500/25 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: "1.5s" }} />
        <div className="absolute top-2/3 left-1/3 w-64 h-64 bg-purple-500/20 rounded-full blur-[80px] animate-pulse" style={{ animationDelay: "3s" }} />
      </div>

      {/* Scanline overlay */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(6,182,212,0.1) 2px, rgba(6,182,212,0.1) 4px)",
        }}
      />

      <div className="relative h-full flex flex-col p-2 gap-2 overflow-hidden">
        {/* Compact Glass Header */}
        <header className="flex-none flex items-center justify-between px-4 py-2 rounded-2xl backdrop-blur-2xl bg-black/40 border border-cyan-500/20 shadow-[0_8px_32px_0_rgba(6,182,212,0.15),inset_0_1px_0_0_rgba(255,255,255,0.05)]">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-400 to-emerald-400 rounded-xl blur-md opacity-60" />
              <div className="relative h-9 w-9 rounded-xl bg-gradient-to-br from-cyan-500 to-emerald-500 flex items-center justify-center shadow-lg">
                <Brain className="h-5 w-5 text-white" />
              </div>
            </div>
            <div>
              <h1 className="text-lg font-bold bg-gradient-to-r from-cyan-400 via-emerald-400 to-cyan-400 bg-clip-text text-transparent leading-none">
                FUNGI COMPUTE
              </h1>
              <p className="text-[10px] text-cyan-400/50 font-mono mt-0.5">Bio-Electric Interface v1.0</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link href="/natureos">
              <Button variant="ghost" size="sm" className="h-8 px-2 text-cyan-400 hover:bg-cyan-500/20 hover:text-cyan-300">
                <ArrowLeft className="h-4 w-4 mr-1" />
                NatureOS
              </Button>
            </Link>
            
            <ConnectionStatus status={connectionStatus} />
            
            {selectedDevice && (
              <Badge 
                variant="outline" 
                className="border-cyan-500/30 text-cyan-400 bg-cyan-500/10 backdrop-blur-sm text-xs px-2 py-0.5 shadow-[0_0_10px_rgba(6,182,212,0.3)]"
              >
                <Activity className="h-3 w-3 mr-1" />
                {selectedDevice.sampleRate} Hz
              </Badge>
            )}

            <DeviceSelector
              devices={devices}
              selectedId={selectedDeviceId}
              onSelect={setSelectedDeviceId}
              loading={devicesLoading}
            />

            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-cyan-400 hover:bg-cyan-500/20 hover:text-cyan-300 transition-all"
              onClick={toggleFullscreen}
            >
              {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </Button>
          </div>
        </header>

        {/* Scientific Research Grid Layout */}
        <div className="flex-1 grid grid-cols-12 gap-2 min-h-0 overflow-hidden">
          {/* Left Column: Oscilloscope + STFT Spectrogram */}
          <div className="col-span-5 flex flex-col gap-2 min-h-0 overflow-hidden">
            <GlassPanel title="Oscilloscope (µV Scale)" icon={Activity} className="flex-[2] min-h-0">
              <Oscilloscope />
            </GlassPanel>
            
            <GlassPanel title="STFT Spectrogram (Buffi 2025)" icon={Grid3X3} className="flex-[2] min-h-0">
              <STFTSpectrogram />
            </GlassPanel>
          </div>

          {/* Middle Column: Spectrum + Spike Train + Causality */}
          <div className="col-span-4 flex flex-col gap-2 min-h-0 overflow-hidden">
            <GlassPanel title="Spectrum Analyzer" icon={Grid3X3} className="flex-1 min-h-0">
              <SpectrumAnalyzer />
            </GlassPanel>
            
            <GlassPanel title="Spike Train (Adamatzky 2022)" icon={Activity} className="flex-1 min-h-0">
              <SpikeTrainAnalyzer />
            </GlassPanel>
            
            <GlassPanel title="Causality (Fukasawa 2024)" icon={Radio} className="flex-1 min-h-0">
              <CausalityGraph />
            </GlassPanel>
          </div>

          {/* Right Column: Analysis & Status */}
          <div className="col-span-3 flex flex-col gap-2 min-h-0 overflow-hidden">
            <GlassPanel title="Signal Fingerprint" icon={Radio} className="flex-1 min-h-0">
              <SignalFingerprint fingerprint={fingerprint} deviceId={selectedDeviceId} />
            </GlassPanel>
            
            <GlassPanel title="NLM Pattern Recognition" icon={Brain} className="flex-1 min-h-0">
              <NLMPanel deviceId={selectedDeviceId} patterns={livePatterns} />
            </GlassPanel>
            
            <GlassPanel title="Event Log" icon={Activity} className="flex-1 min-h-0">
              <EventMempool events={liveEvents} patterns={livePatterns} />
            </GlassPanel>
          </div>
        </div>
        
        {/* Floating Panels */}
        <ControlPanel deviceId={selectedDeviceId} />
        <TimelineControl 
          patterns={[...livePatterns, ...historicalPatterns]} 
          onSnapshot={() => console.log("Snapshot taken")}
        />
      </div>
    </div>
  )
}
