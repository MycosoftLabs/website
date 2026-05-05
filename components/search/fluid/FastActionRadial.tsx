"use client"

import { useMemo, useState, useCallback } from "react"
import { createPortal } from "react-dom"
import { Button } from "@/components/ui/button"
import { LayoutGrid, X } from "lucide-react"
import { cn } from "@/lib/utils"
import type { WidgetType } from "@/lib/search/widget-registry"
import { WIDGET_REGISTRY } from "@/lib/search/widget-registry"

const DEFAULT_RADIAL: WidgetType[] = [
  "species",
  "weather",
  "news",
  "cameras",
  "devices",
  "earth",
  "events",
  "answers",
  "chemistry",
  "genetics",
  "research",
  "location",
]

/**
 * Always surface these first — matrix + lab + ops. Long `secondaryWidgets` can list 10+ types;
 * without pinning, `mergeRankedWidgets(..., 16)` never reaches DEFAULT_RADIAL and **news** (and others) vanish from the radial.
 */
const FAB_PINNED: WidgetType[] = [
  "species",
  "chemistry",
  "genetics",
  "news",
  "weather",
  "cameras",
  "devices",
]

function mergeRankedWidgets(ranked: WidgetType[], max = 16): WidgetType[] {
  const seen = new Set<WidgetType>()
  const out: WidgetType[] = []
  for (const t of FAB_PINNED) {
    if (!t || seen.has(t)) continue
    if (!WIDGET_REGISTRY[t]) continue
    seen.add(t)
    out.push(t)
  }
  for (const t of ranked) {
    if (!t || seen.has(t)) continue
    if (!WIDGET_REGISTRY[t]) continue
    seen.add(t)
    out.push(t)
  }
  for (const t of DEFAULT_RADIAL) {
    if (out.length >= max) break
    if (seen.has(t)) continue
    if (!WIDGET_REGISTRY[t]) continue
    seen.add(t)
    out.push(t)
  }
  return out.slice(0, max)
}

export interface FastActionRadialProps {
  rankedWidgets: WidgetType[]
  onOpenWidget: (type: WidgetType) => void
  className?: string
}

/**
 * Single FAB bottom-right; expands radial of widget shortcuts ranked by intent secondaryWidgets.
 */
export function FastActionRadial({ rankedWidgets, onOpenWidget, className }: FastActionRadialProps) {
  const [open, setOpen] = useState(false)
  /** 16 slots: intent `secondaryWidgets` can list 10+ types; truncating at 12 hid chemistry/genetics on compound queries (E2E matrix). */
  const slots = useMemo(() => mergeRankedWidgets(rankedWidgets, 16), [rankedWidgets])

  const pick = useCallback(
    (t: WidgetType) => {
      onOpenWidget(t)
      setOpen(false)
    },
    [onOpenWidget],
  )

  /** Tighter circle when many slots so buttons stay inside the radial hit area (overflow-safe). */
  const radius = slots.length > 12 ? 102 : slots.length > 8 ? 118 : 130
  const step = (2 * Math.PI) / Math.max(slots.length, 1)

  const shell = (
    <div
      className={cn(
        // Portal to `body` escapes `overflow-hidden` + transform ancestors (framer-motion) that
        // break `fixed` hit-testing; z-stacking above consciousness / panel chrome (May 03 2026).
        "pointer-events-none fixed z-[9999] flex flex-col items-end gap-2",
        "bottom-[max(1rem,env(safe-area-inset-bottom,0px))] right-3 sm:bottom-5 sm:right-5 lg:right-6",
        className,
      )}
      aria-label="Widget quick actions"
    >
      {open && (
        <div
          data-testid="fast-action-radial-layer"
          className="pointer-events-auto relative h-[300px] w-[300px] sm:h-[320px] sm:w-[320px]"
        >
          {slots.map((type, i) => {
            const angle = -Math.PI / 2 + i * step
            const x = Math.cos(angle) * radius
            const y = Math.sin(angle) * radius
            const meta = WIDGET_REGISTRY[type]
            const label = meta?.label ?? type
            return (
              <Button
                key={type}
                type="button"
                variant="secondary"
                size="icon"
                data-testid={`fast-action-${type}`}
                title={label}
                className="absolute h-11 w-11 min-h-[44px] min-w-[44px] rounded-full border bg-card/95 text-base shadow-lg touch-manipulation"
                style={{
                  left: `calc(50% + ${x}px)`,
                  top: `calc(50% + ${y}px)`,
                  transform: "translate(-50%, -50%)",
                }}
                onClick={() => pick(type)}
              >
                <span className="sr-only">{label}</span>
                <span aria-hidden className="text-lg leading-none">
                  {iconGlyph(type)}
                </span>
              </Button>
            )
          })}
        </div>
      )}
      <Button
        type="button"
        size="icon"
        data-testid="fast-action-fab"
        variant="default"
        className={cn(
          "pointer-events-auto h-12 w-12 min-h-[48px] min-w-[48px] rounded-full shadow-xl border border-primary/30 bg-primary text-primary-foreground touch-manipulation",
          open && "ring-2 ring-primary/40",
        )}
        title={open ? "Close widget picker" : "Add widget"}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        {open ? <X className="h-5 w-5" /> : <LayoutGrid className="h-5 w-5" />}
      </Button>
    </div>
  )

  if (typeof document === "undefined") return null
  return createPortal(shell, document.body)
}

function iconGlyph(type: WidgetType): string {
  const g: Partial<Record<WidgetType, string>> = {
    species: "🔬",
    chemistry: "⚗️",
    genetics: "🧬",
    research: "📄",
    answers: "💬",
    media: "🎬",
    location: "📍",
    news: "📰",
    crep: "✈️",
    earth: "🌍",
    traffic: "🚦",
    food: "🍽️",
    flights: "✈️",
    stocks: "📈",
    sports: "🏀",
    people: "👤",
    code: "💻",
    shopping: "🛒",
    recipe: "📖",
    events: "⚡",
    aircraft: "✈️",
    vessels: "🚢",
    satellites: "🛰️",
    weather: "🌦️",
    emissions: "🏭",
    infrastructure: "🏗️",
    devices: "📡",
    space_weather: "☀️",
    cameras: "📹",
    embedding_atlas: "🔮",
    fallback: "📦",
  }
  return g[type] ?? "◆"
}
