"use client"

/**
 * Layers Widget — OpenGridWorks-style thumbnail grid for toggling map layers
 *
 * Three categories:
 *   POINTS: Data Ctrs, Substations, Gas Infra, MycoBrain Devices, Species, Events
 *   LINES:  TX Lines, Gas Lines, Fiber, Submarine Cables, Flight Paths, Ship Routes
 *   AREAS:  Earth-2 Weather, Spore Risk, Aurora, GIBS Imagery
 */

import { useState } from "react"
import {
  Server, Radio, Fuel, Radar, TreePine, AlertTriangle,
  Zap, Wind as WindIcon, Cable, Waves, Plane, Ship,
  Cloud, Bug, Sparkles, Satellite, X
} from "lucide-react"
import { cn } from "@/lib/utils"

export interface LayerToggle {
  id: string
  label: string
  icon: React.ReactNode
  category: "points" | "lines" | "areas" | "tracks"
  enabled: boolean
  beta?: boolean
}

interface LayersWidgetProps {
  layers: LayerToggle[]
  onToggle: (id: string) => void
  onClose: () => void
  isOpen: boolean
}

export const DEFAULT_INFRA_LAYERS: LayerToggle[] = [
  // POINTS
  { id: "datacenters", label: "Data Ctrs", icon: <Server className="w-4 h-4" />, category: "points", enabled: false, beta: true },
  { id: "substations", label: "Substations", icon: <Radio className="w-4 h-4" />, category: "points", enabled: false },
  { id: "gasInfra", label: "Gas Infra", icon: <Fuel className="w-4 h-4" />, category: "points", enabled: false },
  { id: "mycobrain", label: "MycoBrain", icon: <Radar className="w-4 h-4" />, category: "points", enabled: true },
  { id: "species", label: "Species", icon: <TreePine className="w-4 h-4" />, category: "points", enabled: true },
  { id: "events", label: "Events", icon: <AlertTriangle className="w-4 h-4" />, category: "points", enabled: true },

  // LINES
  { id: "txLines", label: "TX Lines", icon: <Zap className="w-4 h-4" />, category: "lines", enabled: false },
  { id: "gasLines", label: "Gas Lines", icon: <WindIcon className="w-4 h-4" />, category: "lines", enabled: false },
  { id: "fiber", label: "Fiber", icon: <Cable className="w-4 h-4" />, category: "lines", enabled: false },
  { id: "submarineCables", label: "Sub Cables", icon: <Waves className="w-4 h-4" />, category: "lines", enabled: false },
  { id: "flightPaths", label: "Flights", icon: <Plane className="w-4 h-4" />, category: "lines", enabled: false },
  { id: "shipRoutes", label: "Ships", icon: <Ship className="w-4 h-4" />, category: "lines", enabled: false },

  // AREAS
  { id: "earth2Weather", label: "Weather", icon: <Cloud className="w-4 h-4" />, category: "areas", enabled: false },
  { id: "sporeRisk", label: "Spore Risk", icon: <Bug className="w-4 h-4" />, category: "areas", enabled: false },
  { id: "aurora", label: "Aurora", icon: <Sparkles className="w-4 h-4" />, category: "areas", enabled: false },
  { id: "gibsImagery", label: "GIBS", icon: <Satellite className="w-4 h-4" />, category: "areas", enabled: false },
]

const CATEGORY_LABELS: Record<string, string> = {
  points: "POINTS",
  lines: "LINES",
  areas: "AREAS",
}

export function LayersWidget({ layers, onToggle, onClose, isOpen }: LayersWidgetProps) {
  if (!isOpen) return null

  const categories = ["points", "lines", "areas"] as const

  return (
    <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-40 bg-[#0a1628]/95 backdrop-blur-md border border-gray-600/40 rounded-xl shadow-2xl p-3 min-w-[340px]">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Layers</span>
        <button onClick={onClose} className="p-1 rounded hover:bg-gray-700/50 text-gray-500">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {categories.map((cat) => {
        const catLayers = layers.filter((l) => l.category === cat)
        if (catLayers.length === 0) return null

        return (
          <div key={cat} className="mb-2">
            <div className="text-[8px] font-bold text-gray-600 uppercase tracking-widest mb-1">
              {CATEGORY_LABELS[cat]}
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {catLayers.map((layer) => (
                <button
                  key={layer.id}
                  onClick={() => onToggle(layer.id)}
                  className={cn(
                    "flex flex-col items-center gap-1 px-2 py-2 rounded-lg border transition-all text-center",
                    layer.enabled
                      ? "bg-cyan-500/15 border-cyan-500/40 text-cyan-400"
                      : "bg-black/30 border-gray-700/40 text-gray-500 hover:border-gray-600 hover:text-gray-400"
                  )}
                >
                  {layer.icon}
                  <span className="text-[8px] font-medium leading-tight">
                    {layer.label}
                    {layer.beta && (
                      <span className="ml-0.5 text-[6px] text-amber-400 uppercase">β</span>
                    )}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
