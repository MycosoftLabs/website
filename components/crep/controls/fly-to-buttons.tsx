"use client"

/**
 * Fly-To Country/Region Quick Navigation Buttons
 *
 * Row of flag emoji buttons that fly the map to preset country/region views.
 * Matches OpenGridWorks' ref_19 through ref_31 buttons.
 */

import { cn } from "@/lib/utils"
import { useState } from "react"
import { Globe2 } from "lucide-react"

interface FlyToTarget {
  id: string
  emoji: string
  label: string
  center: [number, number] // [lng, lat]
  zoom: number
}

const FLY_TO_TARGETS: FlyToTarget[] = [
  { id: "us", emoji: "🇺🇸", label: "United States", center: [-98.5, 39.8], zoom: 3 },
  { id: "ca", emoji: "🇨🇦", label: "Canada", center: [-106.3, 56.1], zoom: 3.5 },
  { id: "mx", emoji: "🇲🇽", label: "Mexico", center: [-102.5, 23.6], zoom: 5 },
  { id: "eu", emoji: "🇪🇺", label: "Europe", center: [10, 50], zoom: 4 },
  { id: "cn", emoji: "🇨🇳", label: "China", center: [104.1, 35.8], zoom: 4 },
  { id: "in", emoji: "🇮🇳", label: "India", center: [78.9, 20.5], zoom: 4.5 },
  { id: "jp", emoji: "🇯🇵", label: "Japan", center: [138.2, 36.2], zoom: 5.5 },
  { id: "au", emoji: "🇦🇺", label: "Australia", center: [133.7, -25.2], zoom: 4 },
  { id: "br", emoji: "🇧🇷", label: "Brazil", center: [-51.9, -14.2], zoom: 4 },
  { id: "global", emoji: "🌍", label: "Global", center: [0, 20], zoom: 2 },
]

interface FlyToButtonsProps {
  onFlyTo: (center: [number, number], zoom: number) => void
  className?: string
  compact?: boolean
}

export function FlyToButtons({ onFlyTo, className, compact = false }: FlyToButtonsProps) {
  const [open, setOpen] = useState(false)

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
              onClick={() => onFlyTo(target.center, target.zoom)}
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
