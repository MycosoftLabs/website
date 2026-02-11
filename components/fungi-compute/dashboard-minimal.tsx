/**
 * Minimal Dashboard for Debugging
 */

"use client"

import { useState } from "react"
import { Brain } from "lucide-react"
import { GlassPanel } from "./glass-panel"
import { STFTSpectrogram } from "./stft-spectrogram"
import { SpikeTrainAnalyzer } from "./spike-train-analyzer"
import { CausalityGraph } from "./causality-graph"

export function FungiComputeDashboardMinimal() {
  return (
    <div className="relative w-full h-full overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-[#0a0e1a] via-[#0d1321] to-[#08090d]" />
      
      <div className="relative h-full flex flex-col p-2 gap-2 overflow-hidden">
        <header className="flex-none flex items-center justify-center px-4 py-2 rounded-2xl backdrop-blur-2xl bg-black/40 border border-cyan-500/20">
          <div className="flex items-center gap-3">
            <Brain className="h-5 w-5 text-cyan-400" />
            <h1 className="text-lg font-bold text-cyan-400">FUNGI COMPUTE - SCIENTIFIC</h1>
          </div>
        </header>
        
        <div className="flex-1 grid grid-cols-3 gap-2 min-h-0 overflow-hidden">
          <GlassPanel title="STFT Spectrogram" className="min-h-0">
            <STFTSpectrogram />
          </GlassPanel>
          
          <GlassPanel title="Spike Train" className="min-h-0">
            <SpikeTrainAnalyzer />
          </GlassPanel>
          
          <GlassPanel title="Causality" className="min-h-0">
            <CausalityGraph />
          </GlassPanel>
        </div>
      </div>
    </div>
  )
}
