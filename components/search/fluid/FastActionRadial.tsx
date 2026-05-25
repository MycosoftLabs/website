"use client"

import { useEffect, useMemo, useRef, useState, useCallback, type CSSProperties } from "react"
import { createPortal } from "react-dom"
import {
  Activity,
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  CloudSun,
  Code2,
  Construction,
  Dna,
  Factory,
  FileText,
  Film,
  Flame,
  FlaskConical,
  Globe2,
  HelpCircle,
  Leaf,
  LineChart,
  LayoutGrid,
  MapPin,
  MessageCircle,
  Microscope,
  Mountain,
  Network,
  Newspaper,
  Plane,
  Radio,
  Route,
  Satellite,
  ShieldAlert,
  Ship,
  ShoppingCart,
  Sun,
  TrafficCone,
  Trophy,
  User,
  Utensils,
  Video,
  Waves,
  Wind,
  X,
  Zap,
  type LucideIcon,
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { WidgetType } from "@/lib/search/widget-registry"
import { WIDGET_REGISTRY, WIDGET_TYPE_IDS } from "@/lib/search/widget-registry"

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
 * Always surface these first: matrix, lab, and ops. Long `secondaryWidgets` can list 10+ types;
 * without pinning, `mergeRankedWidgets(..., 16)` never reaches DEFAULT_RADIAL and **news** (and others) vanish from the radial.
 */
const FAB_PINNED: WidgetType[] = [
  "species",
  "chemistry",
  "genetics",
  "news",
  "earth",
  "vessels",
  "satellites",
  "space_assets",
  "biosecurity",
  "emissions",
  "infrastructure",
  "aircraft",
  "power_grid",
  "transport",
  "marine",
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
  for (const t of WIDGET_TYPE_IDS) {
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
  const iconSize = isMobileViewport ? 43 : 46
  const iconHalf = iconSize / 2
  const minIconSpacing = isMobileViewport ? 45 : 54
  const radiusFromSpacing = (slots.length * minIconSpacing) / (2 * Math.PI)
  const radius = Math.ceil(Math.max(isMobileViewport ? 96 : 118, radiusFromSpacing))
  const step = (2 * Math.PI) / Math.max(slots.length, 1)
  const wheelCenterRight = isMobileViewport ? 34 : 49
  const wheelCenterBottom = isMobileViewport ? 88 : 45
  const wheelDiameter = radius * 2 + iconSize

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
      <div
        data-testid="fast-action-radial-layer"
        data-fast-action-wheel="true"
        data-open={open ? "true" : "false"}
        aria-hidden={!open}
        className={cn(
          "search-fab-wheel-layer fixed transition-opacity duration-150",
          open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0",
        )}
        style={{
          height: `${wheelDiameter}px`,
          width: `${wheelDiameter}px`,
        }}
        onPointerDown={open ? beginSpin : undefined}
        onPointerMove={open ? moveSpin : undefined}
        onPointerCancel={open ? endSpin : undefined}
        onPointerUp={open ? endSpin : undefined}
      >
        {slots.map((type, i) => {
          const angle = -Math.PI / 2 + i * step + wheelAngle
          const x = Math.cos(angle) * radius
          const y = Math.sin(angle) * radius
          const meta = WIDGET_REGISTRY[type]
          const label = meta?.label ?? type
          const isActive = activeWidgetTypes?.has(type) ?? false
          const color = WIDGET_ICON_COLORS[type] ?? "#94a3b8"
          return (
            <div
              key={type}
              data-testid={`fast-action-${type}`}
              data-fast-action-wheel="true"
              data-active={isActive ? "true" : "false"}
              title={label}
              className="petri-codepen-button-demo petri-codepen-button-demo-reset search-fab-petri-icon pointer-events-auto fixed"
              style={{
                "--search-widget-icon-color": color,
                "--search-widget-icon-glow": color,
                right: `${wheelCenterRight - x - iconHalf}px`,
                bottom: `${wheelCenterBottom - y - iconHalf}px`,
              } as CSSProperties}
            >
              <div className="button-wrap">
                <button
                  type="button"
                  className="touch-manipulation"
                  tabIndex={open ? 0 : -1}
                  onPointerDown={(event) => {
                    if (!open) return
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
                    <span aria-hidden className="search-fab-glyph">
                      <WidgetGlyph type={type} />
                    </span>
                  </span>
                </button>
                <div className="button-shadow" />
              </div>
            </div>
          )
        })}
      </div>
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

const WIDGET_ICON_COMPONENTS: Record<WidgetType, LucideIcon> = {
  species: Microscope,
  chemistry: FlaskConical,
  genetics: Dna,
  research: FileText,
  answers: MessageCircle,
  media: Film,
  location: MapPin,
  news: Newspaper,
  crep: Globe2,
  earth: Globe2,
  traffic: TrafficCone,
  food: Utensils,
  flights: Plane,
  stocks: LineChart,
  sports: Trophy,
  people: User,
  code: Code2,
  shopping: ShoppingCart,
  recipe: BookOpen,
  events: Zap,
  aircraft: Plane,
  vessels: Ship,
  satellites: Satellite,
  weather: CloudSun,
  emissions: Factory,
  infrastructure: Construction,
  devices: Radio,
  space_weather: Sun,
  cameras: Video,
  embedding_atlas: Network,
  risk: AlertTriangle,
  power_grid: Zap,
  supply_chain: Route,
  biosecurity: ShieldAlert,
  conservation: Leaf,
  geology: Mountain,
  hydrology: Waves,
  wildfire: Flame,
  air_quality: Wind,
  space_assets: Satellite,
  marine: Waves,
  transport: Route,
  source_health: CheckCircle2,
  qa_trace: Activity,
  fallback: HelpCircle,
}

const WIDGET_ICON_COLORS: Record<WidgetType, string> = {
  species: "#22c55e",
  chemistry: "#a855f7",
  genetics: "#38bdf8",
  research: "#f97316",
  answers: "#8b5cf6",
  media: "#ec4899",
  location: "#f43f5e",
  news: "#60a5fa",
  crep: "#14b8a6",
  earth: "#10b981",
  traffic: "#f59e0b",
  food: "#fb7185",
  flights: "#38bdf8",
  stocks: "#84cc16",
  sports: "#f97316",
  people: "#e879f9",
  code: "#22d3ee",
  shopping: "#f472b6",
  recipe: "#fbbf24",
  events: "#facc15",
  aircraft: "#60a5fa",
  vessels: "#06b6d4",
  satellites: "#818cf8",
  weather: "#38bdf8",
  emissions: "#f97316",
  infrastructure: "#f59e0b",
  devices: "#22c55e",
  space_weather: "#facc15",
  cameras: "#c084fc",
  embedding_atlas: "#a78bfa",
  risk: "#ef4444",
  power_grid: "#facc15",
  supply_chain: "#fb923c",
  biosecurity: "#22c55e",
  conservation: "#4ade80",
  geology: "#d97706",
  hydrology: "#38bdf8",
  wildfire: "#f97316",
  air_quality: "#67e8f9",
  space_assets: "#818cf8",
  marine: "#06b6d4",
  transport: "#60a5fa",
  source_health: "#10b981",
  qa_trace: "#94a3b8",
  fallback: "#94a3b8",
}

function WidgetGlyph({ type }: { type: WidgetType }) {
  const Icon = WIDGET_ICON_COMPONENTS[type] ?? HelpCircle
  return <Icon className="h-4 w-4" strokeWidth={2.35} />
}
