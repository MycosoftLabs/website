"use client"

/**
 * BaseModeSwitcher — 3-way toggle between REAL_EARTH / TOPOGRAPHY / BATHYMETRY
 *
 * Per the v2 plan §5 Phase 2 non-negotiables, Bathymetry mode is DISTINCT
 * from Real Earth — it's not a "turn the globe into glass" toggle. In
 * Bathymetry mode the terrain is coloured by depth (blue ramp) and the
 * ocean surface is hidden. In Real Earth mode the ocean is rendered as
 * an opaque surface and imagery/satellite data is the visible terrain.
 * Topography mode shows hillshade + contours for land relief inspection.
 */

import { Globe2, Mountain, Waves } from "lucide-react"
import { cn } from "@/lib/utils"
import type { BaseMode } from "./hooks/useCesiumViewer"

interface BaseModeSwitcherProps {
  mode: BaseMode
  onChange: (mode: BaseMode) => void
  className?: string
}

const MODES: Array<{ id: BaseMode; label: string; short: string; icon: React.ComponentType<{ className?: string }> }> = [
  { id: "REAL_EARTH", label: "Real Earth — imagery + opaque ocean", short: "REAL", icon: Globe2 },
  { id: "TOPOGRAPHY", label: "Topography — hillshade + contours", short: "TOPO", icon: Mountain },
  { id: "BATHYMETRY", label: "Bathymetry — seafloor relief + depth ramp", short: "BATHY", icon: Waves },
]

export function BaseModeSwitcher({ mode, onChange, className }: BaseModeSwitcherProps) {
  return (
    <div className={cn("inline-flex rounded-lg border border-cyan-500/30 bg-black/50 backdrop-blur-md p-0.5", className)} role="radiogroup" aria-label="Earth base mode">
      {MODES.map((m) => {
        const active = m.id === mode
        const Icon = m.icon
        return (
          <button
            key={m.id}
            role="radio"
            aria-checked={active}
            title={m.label}
            onClick={() => onChange(m.id)}
            className={cn(
              "relative flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[10px] font-mono tracking-wider uppercase transition-all",
              active
                ? "bg-cyan-500/20 text-cyan-200 shadow-[inset_0_0_8px_rgba(34,211,238,0.3)]"
                : "text-cyan-400/60 hover:text-cyan-300 hover:bg-cyan-500/10",
            )}
          >
            <Icon className="w-3 h-3 shrink-0" />
            <span>{m.short}</span>
          </button>
        )
      })}
    </div>
  )
}
