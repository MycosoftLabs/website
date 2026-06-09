"use client"

/**
 * Globe/Map Projection Toggle
 *
 * Two-button toggle that switches between globe (3D sphere) and
 * flat Mercator projection. Mirrors OpenGridWorks' ref_17/ref_18 buttons.
 *
 * Globe projection shows earth curvature when zoomed out and naturally
 * transitions to flat 2D when zoomed in past ~zoom 6.
 */

import { Globe, Map as MapIcon } from "lucide-react"
import { cn } from "@/lib/utils"

export type ProjectionMode = "globe" | "mercator"

interface GlobeToggleProps {
  mode: ProjectionMode
  onChange: (mode: ProjectionMode) => void
  className?: string
  globeDisabled?: boolean
}

export function GlobeToggle({ mode, onChange, className, globeDisabled = false }: GlobeToggleProps) {
  return (
    <div className={cn("flex gap-1", className)}>
      <button
        onClick={() => onChange("mercator")}
        className={cn(
          "p-2 rounded-lg border transition-all",
          mode === "mercator"
            ? "bg-cyan-500/20 border-cyan-500/50 text-cyan-400"
            : "bg-black/40 border-gray-700/50 text-gray-500 hover:text-gray-300 hover:border-gray-600"
        )}
        title="Map projection"
        aria-label="Map projection"
      >
        <MapIcon className="w-4 h-4" />
      </button>
      <button
        onClick={() => {
          if (!globeDisabled) onChange("globe")
        }}
        disabled={globeDisabled}
        aria-disabled={globeDisabled}
        className={cn(
          "p-2 rounded-lg border transition-all",
          globeDisabled
            ? "cursor-not-allowed border-gray-800/60 bg-black/25 text-gray-700 opacity-45"
            : mode === "globe"
            ? "bg-cyan-500/20 border-cyan-500/50 text-cyan-400"
            : "bg-black/40 border-gray-700/50 text-gray-500 hover:text-gray-300 hover:border-gray-600"
        )}
        title={globeDisabled ? "Globe projection is disabled for this viewport" : "Globe projection"}
        aria-label="Globe projection"
      >
        <Globe className="w-4 h-4" />
      </button>
    </div>
  )
}
