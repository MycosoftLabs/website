"use client"

/**
 * Fly-To Mycosoft Projects — Apr 21, 2026
 *
 * Morgan: "make a fly to projects also project oyster, project goffs, ect".
 *
 * Quick-navigation strip for active Mycosoft projects. Clicking a chip
 * flies the map to the project's site (with site-appropriate zoom +
 * pitch) AND toggles the relevant CREP layers ON so the user lands on
 * a fully-painted view of that project's data.
 *
 * New projects get added to MYCOSOFT_PROJECTS below — the chip row
 * picks them up automatically.
 */

import { cn } from "@/lib/utils"

export interface MycosoftProject {
  /** Stable id used for DOM keys + analytics */
  id: string
  /** Brand code shown on chip (short) */
  code: string
  /** Full human-readable label for the tooltip */
  label: string
  /** One-line pitch for hover */
  pitch: string
  /** Map center [lng, lat] */
  center: [number, number]
  /** Target zoom */
  zoom: number
  /** Optional pitch for dramatic site arrival */
  pitch3d?: number
  /** Optional bearing rotation */
  bearing?: number
  /** CREP layer ids to auto-enable on fly-to */
  layersOn?: string[]
  /** Tailwind accent classes for the chip border + hover glow */
  accent: string
}

export const MYCOSOFT_PROJECTS: MycosoftProject[] = [
  {
    id: "project-oyster",
    code: "OYSTER",
    label: "Project Oyster — Tijuana Estuary",
    pitch: "MYCODAO + MYCOSOFT bivalve restoration over the Tijuana River Valley. H₂S hotspot + IBWC discharge + beach closures + Navy training waters + oyster sites.",
    // TJ Estuary mouth — between IB Pier and the international border
    center: [-117.12, 32.55],
    zoom: 12,
    pitch3d: 55,
    bearing: -18,
    layersOn: [
      // Apr 21, 2026 v2: chip now enables all 18 Oyster sub-layers
      "tijuanaEstuary", "projectOysterPerimeter", "projectOysterSites",
      "h2sHotspot", "tjRiverFlow", "tjBeachClosures",
      "tjNavyTraining", "tjEstuaryMonitors",
      "oysterCameras", "oysterBroadcast", "oysterCell",
      "oysterPower", "oysterNature", "oysterRails",
      "oysterCaves", "oysterGovernment", "oysterTourism",
      "oysterSensors", "oysterHeatmap",
    ],
    accent: "border-teal-500/50 hover:border-teal-400 hover:bg-teal-500/15 text-teal-200 hover:text-teal-100",
  },
  {
    id: "project-goffs",
    code: "GOFFS",
    label: "Project Goffs — Mojave National Preserve",
    pitch: "MYCOSOFT biz-dev vertical thesis site. Historic Route 66 community, east Mojave desert ecology adjacent to NPS MOJA — Joshua trees, desert tortoise, creosote, bighorn. Cameras, power, rails, caves, government, tourism, sensors + heatmap overlay.",
    // Goffs, CA — 34.9244°N, -115.0736°W (MYCOSOFT project anchor)
    center: [-115.074, 34.924],
    zoom: 10,
    pitch3d: 50,
    bearing: 12,
    layersOn: [
      // Apr 21, 2026 v2: chip now enables all 15 Goffs sub-layers
      "mojavePreserve", "mojaveGoffs", "mojaveWilderness",
      "mojaveClimate", "mojaveINat",
      "mojaveCameras", "mojaveBroadcast", "mojaveCell",
      "mojavePower", "mojaveRails", "mojaveCaves",
      "mojaveGovernment", "mojaveTourism", "mojaveSensors",
      "mojaveHeatmap",
    ],
    accent: "border-cyan-500/50 hover:border-cyan-400 hover:bg-cyan-500/15 text-cyan-200 hover:text-cyan-100",
  },
]

interface FlyToProjectsProps {
  /** Called with center+zoom+pitch+bearing when a project chip is clicked */
  onFlyTo: (target: { center: [number, number]; zoom: number; pitch?: number; bearing?: number }) => void
  /** Called with a list of layer ids to flip to enabled:true after the fly */
  onEnableLayers?: (layerIds: string[]) => void
  className?: string
  compact?: boolean
}

export function FlyToProjects({ onFlyTo, onEnableLayers, className, compact = false }: FlyToProjectsProps) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <div className="text-[9px] uppercase tracking-[0.15em] text-white/40 font-mono px-1">
        Projects
      </div>
      <div className="flex gap-1 flex-wrap">
        {MYCOSOFT_PROJECTS.map((p) => (
          <button
            key={p.id}
            onClick={() => {
              onFlyTo({ center: p.center, zoom: p.zoom, pitch: p.pitch3d, bearing: p.bearing })
              if (p.layersOn && p.layersOn.length && onEnableLayers) onEnableLayers(p.layersOn)
            }}
            className={cn(
              "rounded-lg border bg-black/40 backdrop-blur-sm transition-all font-mono tracking-wider",
              "active:scale-95",
              p.accent,
              compact ? "px-2 py-1 text-[10px]" : "px-3 py-1.5 text-[11px]",
            )}
            title={`${p.label} — ${p.pitch}`}
            aria-label={p.label}
          >
            {p.code}
          </button>
        ))}
      </div>
    </div>
  )
}
