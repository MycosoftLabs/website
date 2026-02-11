/**
 * Stimulation Panel Component - Ultra Compact
 */

"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Zap, Play, Square } from "lucide-react"

interface StimulationPanelProps {
  deviceId?: string | null
  onSend?: (command: any) => void
  disabled?: boolean
  className?: string
}

export function StimulationPanel({ deviceId, onSend, disabled = false }: StimulationPanelProps) {
  const [isActive, setIsActive] = useState(false)
  const [freq, setFreq] = useState(1.0)
  const [amp, setAmp] = useState(10)
  
  const toggle = () => {
    const newState = !isActive
    setIsActive(newState)
    if (newState) {
      onSend?.({ waveform: "sine", frequency: freq, amplitude: amp })
    }
  }
  
  return (
    <div className="h-full flex flex-col justify-center gap-2">
      <div className="flex items-center justify-between">
        <Label className="text-[10px] text-cyan-400/70 uppercase font-semibold flex items-center gap-1">
          <Zap className="h-3 w-3" />
          Stimulus
        </Label>
        <Switch checked={isActive} onCheckedChange={toggle} disabled={disabled || !deviceId} />
      </div>
      
      {isActive && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[9px] text-cyan-400/50">Freq</span>
            <span className="text-[9px] text-cyan-400 font-mono">{freq.toFixed(1)} Hz</span>
          </div>
          <Slider
            value={[freq]}
            onValueChange={([v]) => setFreq(v)}
            min={0.1}
            max={50}
            step={0.1}
            className="h-1"
            disabled={disabled}
          />
          
          <div className="flex items-center justify-between">
            <span className="text-[9px] text-cyan-400/50">Amp</span>
            <span className="text-[9px] text-cyan-400 font-mono">{amp} µV</span>
          </div>
          <Slider
            value={[amp]}
            onValueChange={([v]) => setAmp(v)}
            min={1}
            max={100}
            step={1}
            className="h-1"
            disabled={disabled}
          />
        </div>
      )}
    </div>
  )
}
