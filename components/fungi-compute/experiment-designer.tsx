/**
 * Experiment Designer - Plan Multi-Electrode Studies
 * 
 * Tool for scientists to design fungal electrophysiology experiments
 * with proper electrode placement, stimulus scheduling, and data export.
 */

"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { 
  Plus, 
  Trash2, 
  Download, 
  Play, 
  FlaskConical,
  Clock,
  MapPin,
  Zap
} from "lucide-react"

interface Electrode {
  id: string
  x: number
  y: number
  type: 'measurement' | 'reference'
}

interface Stimulus {
  id: string
  day: number
  type: 'nutrient' | 'biocide' | 'mechanical' | 'light' | 'chemical'
  name: string
  location: string
}

export function ExperimentDesigner() {
  const [electrodes, setElectrodes] = useState<Electrode[]>([
    { id: 'CH0', x: 50, y: 50, type: 'measurement' },
    { id: 'REF', x: 50, y: 50, type: 'reference' }
  ])
  const [stimuli, setStimuli] = useState<Stimulus[]>([])
  const [species, setSpecies] = useState("fusarium_oxysporum")
  const [duration, setDuration] = useState(7) // days
  
  const addElectrode = () => {
    const newId = `CH${electrodes.filter(e => e.type === 'measurement').length}`
    setElectrodes([...electrodes, {
      id: newId,
      x: 50 + Math.random() * 40 - 20,
      y: 50 + Math.random() * 40 - 20,
      type: 'measurement'
    }])
  }
  
  const addStimulus = () => {
    setStimuli([...stimuli, {
      id: Math.random().toString(36),
      day: 3,
      type: 'nutrient',
      name: 'Wood bait',
      location: 'CH1'
    }])
  }
  
  const exportProtocol = () => {
    const protocol = {
      experiment: {
        species,
        duration_days: duration,
        electrodes: electrodes.length,
        stimuli: stimuli.length
      },
      electrode_placement: electrodes,
      stimulus_schedule: stimuli,
      expected_outcomes: [
        "Colonization detected via STFT at 3-4 days",
        "1.5+ Hz frequency emergence",
        "PSD increase >1000% vs control"
      ]
    }
    
    const blob = new Blob([JSON.stringify(protocol, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `experiment_protocol_${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }
  
  return (
    <div className="h-full flex flex-col gap-3 p-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-cyan-400">Experiment Designer</h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={exportProtocol}
          className="h-7 text-xs text-cyan-400"
        >
          <Download className="h-3 w-3 mr-1" />
          Export Protocol
        </Button>
      </div>
      
      {/* Settings */}
      <div className="space-y-2">
        <div>
          <Label className="text-[10px] text-cyan-400/70">Species</Label>
          <Select value={species} onValueChange={setSpecies}>
            <SelectTrigger className="h-8 text-xs bg-black/40 border-cyan-500/20 text-cyan-400">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-black/90 border-cyan-500/30">
              <SelectItem value="fusarium_oxysporum">F. oxysporum</SelectItem>
              <SelectItem value="schizophyllum_commune">S. commune</SelectItem>
              <SelectItem value="pleurotus_djamor">P. djamor</SelectItem>
              <SelectItem value="pholiota_brunnescens">P. brunnescens</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div>
          <Label className="text-[10px] text-cyan-400/70">Duration (days)</Label>
          <Input
            type="number"
            value={duration}
            onChange={(e) => setDuration(parseInt(e.target.value) || 7)}
            className="h-8 text-xs bg-black/40 border-cyan-500/20 text-cyan-400"
          />
        </div>
      </div>
      
      {/* Electrode Placement */}
      <div className="flex-1 min-h-0">
        <div className="flex items-center justify-between mb-1">
          <Label className="text-[10px] text-cyan-400/70">Electrodes ({electrodes.length})</Label>
          <Button
            variant="ghost"
            size="sm"
            onClick={addElectrode}
            className="h-6 px-2 text-xs text-cyan-400"
          >
            <Plus className="h-3 w-3 mr-1" />
            Add
          </Button>
        </div>
        <div className="h-32 rounded-lg border border-cyan-500/20 bg-black/40 relative">
          {/* Agar plate visual */}
          <div className="absolute inset-2 rounded-full border-2 border-dashed border-cyan-500/20" />
          
          {/* Electrodes */}
          {electrodes.map((electrode) => (
            <div
              key={electrode.id}
              className="absolute w-4 h-4 -ml-2 -mt-2 rounded-full border-2 cursor-move"
              style={{
                left: `${electrode.x}%`,
                top: `${electrode.y}%`,
                borderColor: electrode.type === 'reference' ? '#f59e0b' : '#06b6d4',
                backgroundColor: electrode.type === 'reference' ? '#f59e0b40' : '#06b6d440'
              }}
              title={electrode.id}
            >
              <span className="absolute -bottom-4 left-1/2 -translate-x-1/2 text-[8px] text-cyan-400 font-mono whitespace-nowrap">
                {electrode.id}
              </span>
            </div>
          ))}
        </div>
      </div>
      
      {/* Stimulus Schedule */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <Label className="text-[10px] text-cyan-400/70">Stimuli ({stimuli.length})</Label>
          <Button
            variant="ghost"
            size="sm"
            onClick={addStimulus}
            className="h-6 px-2 text-xs text-cyan-400"
          >
            <Plus className="h-3 w-3 mr-1" />
            Add
          </Button>
        </div>
        <ScrollArea className="h-24">
          <div className="space-y-1">
            {stimuli.map((stim, i) => (
              <div
                key={stim.id}
                className="p-1.5 rounded bg-black/40 border border-cyan-500/10 flex items-center gap-2"
              >
                <Clock className="h-3 w-3 text-cyan-400 flex-none" />
                <span className="text-[10px] text-cyan-400 flex-1">
                  Day {stim.day}: {stim.name}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setStimuli(stimuli.filter(s => s.id !== stim.id))}
                  className="h-5 w-5 text-red-400"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>
      
      {/* Expected Outcomes */}
      <div className="text-[9px] text-cyan-400/60 space-y-0.5">
        <div>✓ STFT colonization signature at day 3-4</div>
        <div>✓ Transfer entropy from bait → other electrodes</div>
        <div>✓ Species-specific spike patterns</div>
      </div>
    </div>
  )
}
