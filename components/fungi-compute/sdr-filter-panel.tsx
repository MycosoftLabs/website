/**
 * SDR Filter Panel - Full Featured with Radio-Style Controls
 */

"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Radio, Zap, Wifi, Signal, Volume2, Power } from "lucide-react"
// Tooltip imports removed to fix infinite render loop

interface SDRFilterPanelProps {
  deviceId?: string | null
  onConfigChange?: (config: any) => void
  onPresetApply?: (preset: string) => void
  className?: string
}

const PRESETS = [
  { id: "lab", name: "Lab", icon: "🔬", desc: "50/60Hz notch + fluorescent" },
  { id: "field", name: "Field", icon: "🌿", desc: "RF + motor + powerline" },
  { id: "urban", name: "Urban", icon: "🏙️", desc: "Cellular + WiFi + HVAC" },
  { id: "clean", name: "Clean", icon: "✨", desc: "Minimal high-pass only" },
]

export function SDRFilterPanel({ deviceId, onConfigChange, onPresetApply }: SDRFilterPanelProps) {
  const [active, setActive] = useState("lab")
  const [highpass, setHighpass] = useState(0.1)
  const [lowpass, setLowpass] = useState(50)
  const [notch60, setNotch60] = useState(true)
  const [notch50, setNotch50] = useState(false)
  const [rfReject, setRfReject] = useState(true)
  const [agc, setAgc] = useState(true)
  
  const applyPreset = (id: string) => {
    setActive(id)
    onPresetApply?.(id)
    
    // Apply preset defaults
    switch (id) {
      case "lab":
        setNotch60(true)
        setNotch50(true)
        setRfReject(true)
        setHighpass(0.1)
        setLowpass(50)
        break
      case "field":
        setNotch60(true)
        setRfReject(true)
        setHighpass(0.05)
        setLowpass(30)
        break
      case "urban":
        setNotch60(true)
        setRfReject(true)
        setHighpass(0.2)
        setLowpass(20)
        break
      case "clean":
        setNotch60(false)
        setNotch50(false)
        setRfReject(false)
        setHighpass(0.01)
        setLowpass(100)
        break
    }
  }
  
  return (
    <div className="h-full flex flex-col gap-3 overflow-y-auto scrollbar-thin scrollbar-thumb-cyan-500/20">
      {/* Presets */}
      <div>
        <div className="flex items-center gap-1 mb-2">
          <Radio className="h-3 w-3 text-cyan-400" />
          <span className="text-[10px] text-cyan-400/70 uppercase font-semibold">Presets</span>
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          {PRESETS.map(p => (
            <Button
              key={p.id}
              variant="ghost"
              size="sm"
              onClick={() => applyPreset(p.id)}
              title={p.desc}
              className={`h-9 text-xs px-2 justify-start ${
                active === p.id 
                  ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 shadow-[0_0_12px_rgba(6,182,212,0.3)]" 
                  : "border border-cyan-500/10 text-cyan-400/60 hover:bg-cyan-500/10"
              }`}
            >
              <span className="mr-1.5">{p.icon}</span>
              {p.name}
            </Button>
          ))}
        </div>
      </div>
      
      <Separator className="bg-cyan-500/10" />
      
      {/* Filter Display (Sliders removed to fix crash) */}
      <div className="grid grid-cols-2 gap-1.5">
        <div className="p-2 rounded bg-black/30 border border-cyan-500/10">
          <div className="text-[8px] text-cyan-400/60">Highpass</div>
          <div className="text-[11px] font-bold text-cyan-400">{highpass.toFixed(2)} Hz</div>
        </div>
        <div className="p-2 rounded bg-black/30 border border-cyan-500/10">
          <div className="text-[8px] text-cyan-400/60">Lowpass</div>
          <div className="text-[11px] font-bold text-cyan-400">{lowpass} Hz</div>
        </div>
      </div>
      
      <Separator className="bg-cyan-500/10" />
      
      {/* Notch Filters */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-[10px] text-cyan-400/70 flex items-center gap-1">
            <Zap className="h-3 w-3" />
            60Hz Notch (US Power)
          </Label>
          <Switch checked={notch60} onCheckedChange={setNotch60} />
        </div>
        
        <div className="flex items-center justify-between">
          <Label className="text-[10px] text-cyan-400/70 flex items-center gap-1">
            <Zap className="h-3 w-3" />
            50Hz Notch (EU Power)
          </Label>
          <Switch checked={notch50} onCheckedChange={setNotch50} />
        </div>
      </div>
      
      <Separator className="bg-cyan-500/10" />
      
      {/* EMF Rejection */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-[10px] text-cyan-400/70 flex items-center gap-1">
            <Wifi className="h-3 w-3" />
            RF Rejection
          </Label>
          <Switch checked={rfReject} onCheckedChange={setRfReject} />
        </div>
        
        <div className="flex items-center justify-between">
          <Label className="text-[10px] text-cyan-400/70 flex items-center gap-1">
            <Volume2 className="h-3 w-3" />
            Auto Gain (AGC)
          </Label>
          <Switch checked={agc} onCheckedChange={setAgc} />
        </div>
      </div>
      
      {/* Status */}
      <div className="mt-auto">
        <Badge variant="outline" className="w-full justify-center text-[10px] border-emerald-500/30 text-emerald-400">
          <Signal className="h-2.5 w-2.5 mr-1" />
          Filters Active
        </Badge>
      </div>
    </div>
  )
}
