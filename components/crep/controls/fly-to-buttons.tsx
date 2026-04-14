"use client"

/**
 * Fly-To Country/Region Quick Navigation Buttons
 *
 * Row of flag emoji buttons that fly the map to preset country/region views.
 * Matches OpenGridWorks' ref_19 through ref_31 buttons.
 */

import { cn } from "@/lib/utils"

interface FlyToTarget {
  id: string
  emoji: string
  label: string
  center: [number, number] // [lng, lat]
  zoom: number
}

const FLY_TO_TARGETS: FlyToTarget[] = [
  { id: "us", emoji: "🇺🇸", label: "United States", center: [-98.5, 39.8], zoom: 4 },
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
  return (
    <div className={cn("flex gap-1 flex-wrap", className)}>
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
  )
}

export { FLY_TO_TARGETS }
export type { FlyToTarget }
