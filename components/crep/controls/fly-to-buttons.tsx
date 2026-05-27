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
import type {
  JurisdictionEntry,
  ViewportGeographyLod,
  ViewportPlaceLike,
} from "@/lib/crep/viewport-place"
import { useEffect, useRef, useState } from "react"
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
  countryCode?: string
}

const FLY_TO_TARGETS: FlyToTarget[] = [
  {
    id: "us",
    emoji: "🇺🇸",
    label: "United States",
    center: [-98.6, 39.5],
    zoom: 4.75,
    geographyLabel: "United States",
    macroLabel: "North America",
    geographyLod: "country",
    subheadline: "North America",
    countryCode: "US",
  },
  {
    id: "ca",
    emoji: "🇨🇦",
    label: "Canada",
    center: [-106.3, 56.1],
    zoom: 3.5,
    geographyLabel: "Canada",
    macroLabel: "North America",
    geographyLod: "country",
    subheadline: "North America",
    countryCode: "CA",
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
    countryCode: "MX",
  },
  {
    id: "eu",
    emoji: "🇪🇺",
    label: "Europe",
    center: [10, 50],
    zoom: 4,
    geographyLabel: "European Union and United Kingdom",
    macroLabel: "Europe",
    geographyLod: "macro",
    subheadline: "Europe",
  },
  {
    id: "cn",
    emoji: "🇨🇳",
    label: "China",
    center: [104.1, 35.8],
    zoom: 4,
    geographyLabel: "China",
    geographyLod: "country",
    countryCode: "CN",
  },
  {
    id: "in",
    emoji: "🇮🇳",
    label: "India",
    center: [78.9, 20.5],
    zoom: 4.5,
    geographyLabel: "India",
    geographyLod: "country",
    countryCode: "IN",
  },
  {
    id: "jp",
    emoji: "🇯🇵",
    label: "Japan",
    center: [138.2, 36.2],
    zoom: 5.5,
    geographyLabel: "Japan",
    geographyLod: "country",
    countryCode: "JP",
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
    countryCode: "AU",
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
    countryCode: "BR",
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

function flyToPlace(target: FlyToTarget): ViewportPlaceLike | undefined {
  if (target.geographyLod === "global") return undefined
  return {
    country: target.geographyLabel,
    countryCode: target.countryCode,
    displayName: target.geographyLabel,
    lat: target.center[1],
    lng: target.center[0],
  }
}

function flyToJurisdictionStack(target: FlyToTarget): JurisdictionEntry[] | undefined {
  if (target.geographyLod === "global") return undefined
  if (target.id === "eu") {
    return [
      { level: "macro", name: "Europe" },
      { level: "union", name: "European Union" },
      { level: "country", name: "United Kingdom", code: "GB" },
    ]
  }
  if (target.geographyLod === "country") {
    return [{ level: "country", name: target.geographyLabel, code: target.countryCode }]
  }
  return [{ level: target.geographyLod ?? "macro", name: target.geographyLabel }]
}

interface FlyToButtonsProps {
  onFlyTo: (center: [number, number], zoom: number) => void
  className?: string
  compact?: boolean
}

export function FlyToButtons({ onFlyTo, className, compact = false }: FlyToButtonsProps) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const toggleButtonRef = useRef<HTMLButtonElement | null>(null)

  useEffect(() => {
    const onCollapse = () => setOpen(false)
    window.addEventListener(CREP_COLLAPSE_FLYTO_EVENT, onCollapse)
    return () => window.removeEventListener(CREP_COLLAPSE_FLYTO_EVENT, onCollapse)
  }, [])

  useEffect(() => {
    const button = toggleButtonRef.current
    if (!button) return

    const consume = (event: Event) => {
      event.preventDefault()
      event.stopPropagation()
      ;(event as any).stopImmediatePropagation?.()
    }
    const onPointerDown = (event: PointerEvent) => {
      if (!event.isPrimary) return
      if (event.pointerType === "mouse" && event.button !== 0) return
      consume(event)
      setOpen((value) => !value)
    }
    const onClick = (event: MouseEvent) => consume(event)

    button.addEventListener("pointerdown", onPointerDown, true)
    button.addEventListener("click", onClick, true)
    return () => {
      button.removeEventListener("pointerdown", onPointerDown, true)
      button.removeEventListener("click", onClick, true)
    }
  }, [])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const consume = (event: Event) => {
      event.preventDefault()
      event.stopPropagation()
      ;(event as any).stopImmediatePropagation?.()
    }
    const activateTarget = (targetId: string) => {
      const target = FLY_TO_TARGETS.find((item) => item.id === targetId)
      if (!target) return
      setViewportGeographyOverride({
        headline: target.geographyLabel,
        subheadline: target.subheadline,
        geographyLod: target.geographyLod,
        place: flyToPlace(target),
        jurisdictionStack: flyToJurisdictionStack(target),
      })
      onFlyTo(target.center, target.zoom)
      setOpen(false)
    }
    const onPointerDown = (event: PointerEvent) => {
      if (!event.isPrimary) return
      if (event.pointerType === "mouse" && event.button !== 0) return
      const button = (event.target as HTMLElement | null)?.closest?.("[data-crep-fly-to-target]") as HTMLElement | null
      const targetId = button?.dataset?.crepFlyToTarget
      if (!targetId) return
      consume(event)
      activateTarget(targetId)
    }
    const onClick = (event: MouseEvent) => {
      const button = (event.target as HTMLElement | null)?.closest?.("[data-crep-fly-to-target]") as HTMLElement | null
      if (button) consume(event)
    }

    container.addEventListener("pointerdown", onPointerDown, true)
    container.addEventListener("click", onClick, true)
    return () => {
      container.removeEventListener("pointerdown", onPointerDown, true)
      container.removeEventListener("click", onClick, true)
    }
  }, [onFlyTo])

  return (
    <div ref={containerRef} className={cn("flex flex-col items-end gap-1", className)}>
      <button
        ref={toggleButtonRef}
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
              data-crep-fly-to-target={target.id}
              onClick={() => {
                setViewportGeographyOverride({
                  headline: target.geographyLabel,
                  subheadline: target.subheadline,
                  geographyLod: target.geographyLod,
                  place: flyToPlace(target),
                  jurisdictionStack: flyToJurisdictionStack(target),
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
