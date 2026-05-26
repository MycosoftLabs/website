"use client"

/**
 * Fly-To Country/Region Quick Navigation Buttons
 *
 * Row of flag emoji buttons that fly the map to preset country/region views.
 * Each target carries geography metadata so Viewport Intelligence shows the
 * correct country/macro label instantly (not a random county from center geocode).
 */

import { cn } from "@/lib/utils"
import {
  CREP_COLLAPSE_FLYTO_EVENT,
  setViewportGeographyOverride,
} from "@/lib/crep/fly-to-panels"
import type { ViewportGeographyLod } from "@/lib/crep/viewport-place"
import { useEffect, useState } from "react"
import { Globe2 } from "lucide-react"

interface FlyToTarget {
  id: string
  emoji: string
  label: string
  center: [number, number] // [lng, lat]
  zoom: number
  /** Primary headline for viewport intelligence at this zoom. */
  geographyLabel: string
  /** Optional macro region (North America, Europe, …). */
  macroLabel?: string
  geographyLod?: ViewportGeographyLod
  subheadline?: string
}

const FLY_TO_TARGETS: FlyToTarget[] = [
  {
    id: "us",
    emoji: "🇺🇸",
    label: "United States",
    center: [-98.5, 39.8],
    zoom: 3,
    geographyLabel: "North America",
    macroLabel: "North America",
    geographyLod: "macro",
    subheadline: "United States · Canada · Mexico · USMCA",
  },
  {
    id: "ca",
    emoji: "🇨🇦",
    label: "Canada",
    center: [-106.3, 56.1],
    zoom: 3.5,
    geographyLabel: "North America",
    macroLabel: "North America",
    geographyLod: "macro",
    subheadline: "Canada · United States · Mexico · USMCA",
  },
  {
    id: "mx",
    emoji: "🇲🇽",
    label: "Mexico",
    center: [-102.5, 23.6],
    zoom: 5,
    geographyLabel: "Mexico",
    macroLabel: "North America",
    geographyLod: "country",
    subheadline: "North America · USMCA",
  },
  {
    id: "eu",
    emoji: "🇪🇺",
    label: "Europe",
    center: [10, 50],
    zoom: 4,
    geographyLabel: "Europe",
    macroLabel: "Europe",
    geographyLod: "macro",
    subheadline: "European Union · United Kingdom",
  },
  {
    id: "cn",
    emoji: "🇨🇳",
    label: "China",
    center: [104.1, 35.8],
    zoom: 4,
    geographyLabel: "China",
    geographyLod: "country",
  },
  {
    id: "in",
    emoji: "🇮🇳",
    label: "India",
    center: [78.9, 20.5],
    zoom: 4.5,
    geographyLabel: "India",
    geographyLod: "country",
  },
  {
    id: "jp",
    emoji: "🇯🇵",
    label: "Japan",
    center: [138.2, 36.2],
    zoom: 5.5,
    geographyLabel: "Japan",
    geographyLod: "country",
  },
  {
    id: "au",
    emoji: "🇦🇺",
    label: "Australia",
    center: [133.7, -25.2],
    zoom: 4,
    geographyLabel: "Australia",
    macroLabel: "Oceania",
    geographyLod: "country",
    subheadline: "Oceania",
  },
  {
    id: "br",
    emoji: "🇧🇷",
    label: "Brazil",
    center: [-51.9, -14.2],
    zoom: 4,
    geographyLabel: "Brazil",
    macroLabel: "South America",
    geographyLod: "country",
    subheadline: "South America",
  },
  {
    id: "global",
    emoji: "🌍",
    label: "Global",
    center: [0, 20],
    zoom: 2,
    geographyLabel: "Global",
    geographyLod: "global",
  },
]

interface FlyToButtonsProps {
  onFlyTo: (center: [number, number], zoom: number) => void
  className?: string
  compact?: boolean
}

export function FlyToButtons({ onFlyTo, className, compact = false }: FlyToButtonsProps) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const onCollapse = () => setOpen(false)
    window.addEventListener(CREP_COLLAPSE_FLYTO_EVENT, onCollapse)
    return () => window.removeEventListener(CREP_COLLAPSE_FLYTO_EVENT, onCollapse)
  }, [])

  return (
    <div className={cn("flex flex-col items-end gap-1", className)}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className={cn(
          "flex items-center justify-center rounded-lg border border-cyan-500/40 bg-black/55 text-cyan-200 shadow-lg backdrop-blur-sm transition-all hover:border-cyan-300 hover:bg-cyan-500/15",
          compact ? "h-8 w-8" : "h-9 w-9",
          open && "border-cyan-300 bg-cyan-500/20 text-cyan-100",
        )}
        title={open ? "Hide country fly-to buttons" : "Show country fly-to buttons"}
        aria-label={open ? "Hide country fly-to buttons" : "Show country fly-to buttons"}
        aria-expanded={open}
      >
        <Globe2 className={compact ? "h-4 w-4" : "h-5 w-5"} />
      </button>
      {open && (
        <div className="flex max-w-[320px] flex-wrap justify-end gap-1 rounded-lg border border-cyan-500/25 bg-black/70 p-1.5 shadow-xl backdrop-blur-md">
          {FLY_TO_TARGETS.map((target) => (
            <button
              key={target.id}
              onClick={() => {
                setViewportGeographyOverride({
                  headline: target.geographyLabel,
                  subheadline: target.subheadline,
                  geographyLod: target.geographyLod,
                })
                onFlyTo(target.center, target.zoom)
                setOpen(false)
              }}
              className={cn(
                "rounded-lg border border-gray-700/50 hover:border-cyan-500/50 hover:bg-cyan-500/10 transition-all",
                compact ? "p-1 text-sm" : "p-1.5 text-base"
              )}
              title={`Fly to ${target.label}`}
              aria-label={`Fly to ${target.label}`}
            >
              {target.emoji}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export { FLY_TO_TARGETS }
export type { FlyToTarget }
