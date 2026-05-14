"use client"

import { useEffect, useMemo, useRef, useState, useCallback } from "react"
import { createPortal } from "react-dom"
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

function mergeRankedWidgets(ranked: WidgetType[], max = 28): WidgetType[] {
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
  activeWidgetTypes?: ReadonlySet<WidgetType>
  className?: string
}

/**
 * Single FAB bottom-right; expands radial of widget shortcuts ranked by intent secondaryWidgets.
 */
export function FastActionRadial({ rankedWidgets, onOpenWidget, activeWidgetTypes, className }: FastActionRadialProps) {
  const [open, setOpen] = useState(false)
  const [isMounted, setIsMounted] = useState(false)
  const [viewport, setViewport] = useState({ width: 1024, height: 768 })
  const [wheelAngle, setWheelAngle] = useState(0)
  const spinDrag = useRef<{ pointerId: number; startPointerAngle: number; startWheelAngle: number; moved: boolean } | null>(
    null,
  )
  const lastSpinMoved = useRef(false)
  const audioContextRef = useRef<AudioContext | null>(null)
  const lastFeedbackStepRef = useRef<number | null>(null)
  /** Thumb-wheel can scale beyond today's defaults as search grows more widget families. */
  const slots = useMemo(() => mergeRankedWidgets(rankedWidgets, 28), [rankedWidgets])

  useEffect(() => {
    setIsMounted(true)
    const syncViewport = () => setViewport({ width: window.innerWidth, height: window.innerHeight })
    syncViewport()
    window.addEventListener("resize", syncViewport)
    window.addEventListener("orientationchange", syncViewport)
    return () => {
      window.removeEventListener("resize", syncViewport)
      window.removeEventListener("orientationchange", syncViewport)
    }
  }, [])

  useEffect(() => {
    if (!open) return
    const dismissOutside = (event: PointerEvent) => {
      const target = event.target
      if (!(target instanceof Element)) return
      if (target.closest("[data-fast-action-wheel='true']")) return
      setOpen(false)
    }
    window.addEventListener("pointerdown", dismissOutside, true)
    return () => window.removeEventListener("pointerdown", dismissOutside, true)
  }, [open])

  const pick = useCallback(
    (t: WidgetType, event?: React.MouseEvent<HTMLButtonElement>) => {
      if (spinDrag.current?.moved) {
        event?.preventDefault()
        event?.stopPropagation()
        return
      }
      if (lastSpinMoved.current) {
        event?.preventDefault()
        event?.stopPropagation()
        return
      }
      onOpenWidget(t)
    },
    [onOpenWidget],
  )

  /** Hub-centered thumb-wheel: the FAB is the center; the visible upper-left arc is the tappable viewport. */
  const isMobileViewport = viewport.width < 640
  const radius = isMobileViewport ? (slots.length > 12 ? 108 : 96) : slots.length > 18 ? 138 : slots.length > 12 ? 126 : 112
  const step = (2 * Math.PI) / Math.max(slots.length, 1)
  const wheelCenterRight = isMobileViewport ? 34 : 49
  const wheelCenterBottom = isMobileViewport ? 88 : 45
  const iconHalf = 22

  const pointerAngle = useCallback(
    (event: React.PointerEvent<HTMLElement>) => {
      const centerX = window.innerWidth - wheelCenterRight
      const centerY = window.innerHeight - wheelCenterBottom
      return Math.atan2(event.clientY - centerY, event.clientX - centerX)
    },
    [wheelCenterBottom, wheelCenterRight],
  )

  const tickFeedback = useCallback((angle: number) => {
    if (typeof window === "undefined") return
    const stepIndex = Math.round(angle / Math.max(step, 0.001))
    if (lastFeedbackStepRef.current === stepIndex) return
    lastFeedbackStepRef.current = stepIndex
    try {
      navigator.vibrate?.(8)
    } catch {}
    try {
      const AudioCtor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!AudioCtor) return
      const ctx = audioContextRef.current ?? new AudioCtor()
      audioContextRef.current = ctx
      if (ctx.state === "suspended") void ctx.resume()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = "square"
      osc.frequency.value = 920
      gain.gain.setValueAtTime(0.0001, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.035, ctx.currentTime + 0.003)
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.028)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start()
      osc.stop(ctx.currentTime + 0.032)
    } catch {}
  }, [step])

  const beginSpin = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const target = event.target
      if (target instanceof Element && target.closest("[data-fast-action-hub-button='true']")) {
        return
      }
      lastSpinMoved.current = false
      lastFeedbackStepRef.current = Math.round(wheelAngle / Math.max(step, 0.001))
      event.currentTarget.setPointerCapture(event.pointerId)
      spinDrag.current = {
        pointerId: event.pointerId,
        startPointerAngle: pointerAngle(event),
        startWheelAngle: wheelAngle,
        moved: false,
      }
    },
    [pointerAngle, wheelAngle],
  )

  const moveSpin = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const drag = spinDrag.current
      if (!drag || drag.pointerId !== event.pointerId) return
      const next = drag.startWheelAngle + pointerAngle(event) - drag.startPointerAngle
      if (Math.abs(next - drag.startWheelAngle) > 0.015) drag.moved = true
      if (drag.moved) tickFeedback(next)
      setWheelAngle(next)
    },
    [pointerAngle, tickFeedback],
  )

  const endSpin = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (spinDrag.current?.pointerId === event.pointerId) {
      lastSpinMoved.current = spinDrag.current.moved
      spinDrag.current = null
    }
  }, [])

  const shell = (
    <div
      className={cn(
        // Portal to `body` escapes `overflow-hidden` + transform ancestors (framer-motion) that
        // break `fixed` hit-testing; z-stacking above consciousness / panel chrome (May 03 2026).
        "pointer-events-none fixed z-[9999] h-[3.15rem] w-[3.15rem]",
        "search-glass-floating natureos-glass-page",
        "bottom-[calc(max(1rem,env(safe-area-inset-bottom,0px))+3.1rem)] right-3 sm:bottom-5 sm:right-5 lg:right-6",
        className,
      )}
      aria-label="Widget quick actions"
    >
      {open && (
        <div
          data-testid="fast-action-radial-layer"
          data-fast-action-wheel="true"
          className="search-fab-wheel-layer pointer-events-auto fixed"
          onPointerDown={beginSpin}
          onPointerMove={moveSpin}
          onPointerCancel={endSpin}
          onPointerUp={endSpin}
        >
          {slots.map((type, i) => {
            const angle = -Math.PI / 2 + i * step + wheelAngle
            const x = Math.cos(angle) * radius
            const y = Math.sin(angle) * radius
            const meta = WIDGET_REGISTRY[type]
            const label = meta?.label ?? type
            const isActive = activeWidgetTypes?.has(type) ?? false
            return (
              <div
                key={type}
                data-testid={`fast-action-${type}`}
                data-fast-action-wheel="true"
                data-active={isActive ? "true" : "false"}
                title={label}
                className="petri-codepen-button-demo petri-codepen-button-demo-reset search-fab-petri-icon pointer-events-auto fixed"
                style={{
                  right: `${wheelCenterRight - x - iconHalf}px`,
                  bottom: `${wheelCenterBottom - y - iconHalf}px`,
                }}
              >
                <div className="button-wrap">
                  <button
                    type="button"
                    className="touch-manipulation"
                    onPointerDown={(event) => {
                      lastSpinMoved.current = false
                      event.preventDefault()
                      event.stopPropagation()
                      onOpenWidget(type)
                    }}
                    onClick={(event) => {
                      event.preventDefault()
                      event.stopPropagation()
                    }}
                  >
                    <span>
                      <span className="sr-only">{label}</span>
                      <span aria-hidden className="search-fab-glyph">{iconGlyph(type)}</span>
                    </span>
                  </button>
                  <div className="button-shadow" />
                </div>
              </div>
            )
          })}
        </div>
      )}
      <div
        data-testid="fast-action-fab"
        data-fast-action-wheel="true"
        title={open ? "Close widget picker" : "Add widget"}
        className={cn(
          "petri-codepen-button-demo petri-codepen-button-demo-reset search-fab-petri-main pointer-events-auto absolute bottom-0 right-0",
          open && "search-fab-petri-open",
        )}
        onPointerDown={open ? beginSpin : undefined}
        onPointerMove={open ? moveSpin : undefined}
        onPointerCancel={open ? endSpin : undefined}
        onPointerUp={open ? endSpin : undefined}
      >
        <div className="button-wrap">
          <button
            data-fast-action-hub-button="true"
            type="button"
            className="touch-manipulation"
            aria-expanded={open}
            onClick={(event) => {
              if (lastSpinMoved.current) {
                event.preventDefault()
                event.stopPropagation()
                lastSpinMoved.current = false
                return
              }
              setOpen((v) => !v)
            }}
          >
            <span>{open ? <X className="h-5 w-5" /> : <LayoutGrid className="h-5 w-5" />}</span>
          </button>
          <div className="button-shadow" />
        </div>
      </div>
    </div>
  )

  if (!isMounted || typeof document === "undefined") return null
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
