"use client"

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react"
import {
  Check,
  ChevronDown,
  ChevronUp,
  GripVertical,
  LayoutDashboard,
  RotateCcw,
} from "lucide-react"
import {
  DEFAULT_OVERVIEW_WIDGET_LAYOUT,
  OVERVIEW_WIDGET_SIZES,
  moveOverviewWidget,
  reorderOverviewWidgets,
  setOverviewWidgetSize,
  type OverviewWidgetLayoutItem,
  type OverviewWidgetSize,
} from "@/lib/fusarium/overview/layout"
import { browserLocalOverviewLayoutAdapter } from "@/lib/fusarium/overview/layout-storage"
import styles from "./overview.module.css"

interface OverviewWidgetDefinition {
  id: string
  label: string
  content: ReactNode
}

interface OperationalLayoutProps {
  widgets: OverviewWidgetDefinition[]
}

interface PackeryLike {
  bindDraggabillyEvents: (instance: DraggabillyLike) => void
  destroy: () => void
  getItemElements: () => HTMLElement[]
  layout: () => void
  reloadItems: () => void
  unbindDraggabillyEvents?: (instance: DraggabillyLike) => void
}

interface DraggabillyLike {
  destroy: () => void
  on: (eventName: string, listener: (...args: unknown[]) => void) => void
}

type PackeryConstructor = new (
  element: HTMLElement,
  options: Record<string, unknown>,
) => PackeryLike

type DraggabillyConstructor = new (
  element: HTMLElement,
  options: Record<string, unknown>,
) => DraggabillyLike

type LayoutEngineStatus = "loading" | "ready" | "fallback" | "single-column"

function sameOrder(left: readonly OverviewWidgetLayoutItem[], right: readonly OverviewWidgetLayoutItem[]) {
  return left.length === right.length && left.every((item, index) => item.id === right[index]?.id && item.size === right[index]?.size)
}

function pointerPoint(args: unknown[]): { x: number; y: number } | null {
  for (const value of args) {
    if (!value || typeof value !== "object") continue
    const candidate = value as { clientX?: unknown; clientY?: unknown; pageX?: unknown; pageY?: unknown }
    if (typeof candidate.clientX === "number" && typeof candidate.clientY === "number") {
      return { x: candidate.clientX, y: candidate.clientY }
    }
    if (typeof candidate.pageX === "number" && typeof candidate.pageY === "number") {
      return { x: candidate.pageX - window.scrollX, y: candidate.pageY - window.scrollY }
    }
  }
  return null
}

function distanceToRect(point: { x: number; y: number }, rect: DOMRect): number {
  const xDistance = Math.max(rect.left - point.x, 0, point.x - rect.right)
  const yDistance = Math.max(rect.top - point.y, 0, point.y - rect.bottom)
  return Math.hypot(xDistance, yDistance)
}

export function OperationalLayout({ widgets }: OperationalLayoutProps) {
  const gridRef = useRef<HTMLDivElement>(null)
  const packeryRef = useRef<PackeryLike | null>(null)
  const draggabillyConstructorRef = useRef<DraggabillyConstructor | null>(null)
  const draggiesRef = useRef<DraggabillyLike[]>([])
  const dragOriginRef = useRef<{
    source: { x: number; y: number }
    targets: { id: string; rect: DOMRect }[]
  } | null>(null)
  const layoutRef = useRef<OverviewWidgetLayoutItem[]>([])
  const widgetLabelsRef = useRef<Map<string, string>>(new Map())
  const [layout, setLayout] = useState<OverviewWidgetLayoutItem[]>(() =>
    DEFAULT_OVERVIEW_WIDGET_LAYOUT.map((item) => ({ ...item })),
  )
  const [storageReady, setStorageReady] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [isNarrow, setIsNarrow] = useState(false)
  const [isPacked, setIsPacked] = useState(false)
  const [engineStatus, setEngineStatus] = useState<LayoutEngineStatus>("loading")
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [announcement, setAnnouncement] = useState("Layout controls ready.")

  const widgetKey = useMemo(() => widgets.map((widget) => widget.id).join("|"), [widgets])
  const widgetIds = useMemo(() => new Set(widgets.map((widget) => widget.id)), [widgetKey])
  const widgetById = new Map(widgets.map((widget) => [widget.id, widget]))
  widgetLabelsRef.current = new Map(widgets.map((widget) => [widget.id, widget.label]))
  layoutRef.current = layout
  const orderedLayout = useMemo(
    () => layout.filter((item) => widgetIds.has(item.id)),
    [layout, widgetIds],
  )
  const orderedKey = useMemo(
    () => orderedLayout.map((item) => `${item.id}:${item.size}`).join("|"),
    [orderedLayout],
  )

  const destroyDraggies = useCallback(() => {
    for (const draggie of draggiesRef.current) {
      try {
        packeryRef.current?.unbindDraggabillyEvents?.(draggie)
        draggie.destroy()
      } catch {
        // The layout remains usable through the explicit move and size controls.
      }
    }
    draggiesRef.current = []
  }, [])

  useEffect(() => {
    const media = window.matchMedia("(max-width: 760px)")
    const sync = () => {
      setIsNarrow(media.matches)
      if (media.matches) setEditMode(false)
    }
    sync()
    media.addEventListener("change", sync)
    return () => media.removeEventListener("change", sync)
  }, [])

  useEffect(() => {
    let active = true
    void browserLocalOverviewLayoutAdapter.load().then((savedLayout) => {
      if (!active) return
      setLayout(savedLayout)
      setStorageReady(true)
    })
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (!storageReady) return
    void browserLocalOverviewLayoutAdapter.save(layout)
  }, [layout, storageReady])

  useEffect(() => {
    if (isNarrow) {
      setIsPacked(false)
      setEngineStatus("single-column")
      return
    }

    const container = gridRef.current
    if (!container) return

    let cancelled = false
    let instance: PackeryLike | null = null
    let observer: ResizeObserver | null = null
    let layoutFrame = 0

    setEngineStatus("loading")

    void Promise.all([import("packery"), import("draggabilly")])
      .then(([packeryModule, draggabillyModule]) => {
        if (cancelled) return

        const Packery = (packeryModule.default ?? packeryModule) as unknown as PackeryConstructor
        const Draggabilly = (draggabillyModule.default ?? draggabillyModule) as unknown as DraggabillyConstructor
        draggabillyConstructorRef.current = Draggabilly

        instance = new Packery(container, {
          itemSelector: `.${styles.dashboardWidget}`,
          columnWidth: `.${styles.dashboardSizer}`,
          gutter: 12,
          percentPosition: true,
          horizontalOrder: false,
          transitionDuration: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "0ms" : "180ms",
        })
        packeryRef.current = instance

        observer = new ResizeObserver(() => {
          window.cancelAnimationFrame(layoutFrame)
          layoutFrame = window.requestAnimationFrame(() => instance?.layout())
        })
        for (const element of instance.getItemElements()) observer.observe(element)

        instance.reloadItems()
        instance.layout()
        setIsPacked(true)
        setEngineStatus("ready")
      })
      .catch(() => {
        if (cancelled) return
        setIsPacked(false)
        setEngineStatus("fallback")
      })

    return () => {
      cancelled = true
      window.cancelAnimationFrame(layoutFrame)
      observer?.disconnect()
      destroyDraggies()
      instance?.destroy()
      if (packeryRef.current === instance) packeryRef.current = null
      draggabillyConstructorRef.current = null
    }
  }, [destroyDraggies, isNarrow, widgetKey])

  useEffect(() => {
    const instance = packeryRef.current
    const Draggabilly = draggabillyConstructorRef.current
    destroyDraggies()

    if (!editMode || isNarrow || !isPacked || !instance || !Draggabilly) return

    for (const element of instance.getItemElements()) {
      const widgetId = element.dataset.overviewWidgetId
      const draggie = new Draggabilly(element, { handle: "[data-overview-drag-handle]" })
      instance.bindDraggabillyEvents(draggie)
      draggie.on("dragStart", (...args) => {
        element.dataset.dragging = "true"
        const pointer = pointerPoint(args)
        const sourceRect = element.getBoundingClientRect()
        dragOriginRef.current = {
          source: pointer ?? { x: sourceRect.x + sourceRect.width / 2, y: sourceRect.y + 16 },
          targets: instance
            .getItemElements()
            .filter((candidate) => candidate !== element)
            .map((candidate) => {
              return {
                id: candidate.dataset.overviewWidgetId ?? "",
                rect: candidate.getBoundingClientRect(),
              }
            })
            .filter((candidate) => candidate.id),
        }
        setDraggingId(widgetId ?? null)
        setAnnouncement(`Moving ${widgetLabelsRef.current.get(widgetId ?? "") ?? "widget"}. Other widgets show the snap position.`)
      })
      draggie.on("dragEnd", (...args) => {
        const origin = dragOriginRef.current
        const rect = element.getBoundingClientRect()
        const drop = pointerPoint(args) ?? { x: rect.x + rect.width / 2, y: rect.y + 16 }
        const movedDistance = origin ? Math.hypot(drop.x - origin.source.x, drop.y - origin.source.y) : 0
        const target = origin?.targets.reduce<{ id: string; distance: number } | null>((nearest, candidate) => {
          const distance = distanceToRect(drop, candidate.rect)
          return !nearest || distance < nearest.distance ? { id: candidate.id, distance } : nearest
        }, null)
        const currentIds = layoutRef.current.map((item) => item.id)
        const sourceIndex = widgetId ? currentIds.indexOf(widgetId) : -1
        const targetIndex = target ? currentIds.indexOf(target.id) : -1

        if (movedDistance >= 40 && sourceIndex >= 0 && targetIndex >= 0 && widgetId && target) {
          const targetId = target.id
          window.requestAnimationFrame(() => {
            setLayout((current) => {
              const nextIds = current.map((item) => item.id)
              const currentSourceIndex = nextIds.indexOf(widgetId)
              const currentTargetIndex = nextIds.indexOf(targetId)
              if (currentSourceIndex < 0 || currentTargetIndex < 0) return current
              nextIds.splice(currentSourceIndex, 1)
              nextIds.splice(currentTargetIndex, 0, widgetId)
              const next = reorderOverviewWidgets(current, nextIds)
              return sameOrder(current, next) ? current : next
            })
            setAnnouncement(
              `${widgetLabelsRef.current.get(widgetId) ?? "Widget"} snapped relative to ${widgetLabelsRef.current.get(targetId) ?? "the selected widget"}. Layout saved in this browser.`,
            )
          })
        }
        dragOriginRef.current = null
        setDraggingId(null)
        delete element.dataset.dragging
      })
      draggiesRef.current.push(draggie)
    }

    return destroyDraggies
  }, [destroyDraggies, editMode, isNarrow, isPacked, orderedKey])

  useEffect(() => {
    const instance = packeryRef.current
    if (!instance) return
    const frame = window.requestAnimationFrame(() => {
      instance.reloadItems()
      instance.layout()
    })
    return () => window.cancelAnimationFrame(frame)
  }, [orderedKey])

  const moveWidget = (id: string, direction: -1 | 1) => {
    setLayout((current) => moveOverviewWidget(current, id, direction))
    const label = widgetById.get(id)?.label ?? "Widget"
    setAnnouncement(`${label} moved ${direction < 0 ? "earlier" : "later"}. Layout saved in this browser.`)
  }

  const sizeWidget = (id: string, size: OverviewWidgetSize) => {
    setLayout((current) => setOverviewWidgetSize(current, id, size))
    const label = widgetById.get(id)?.label ?? "Widget"
    setAnnouncement(`${label} set to ${size}. Layout saved in this browser.`)
  }

  const resetLayout = () => {
    if (isNarrow) return
    const defaults = DEFAULT_OVERVIEW_WIDGET_LAYOUT.map((item) => ({ ...item }))
    setLayout(defaults)
    void browserLocalOverviewLayoutAdapter.reset()
    setAnnouncement("Overview widget order and sizes reset to the operational default.")
  }

  return (
    <div className={styles.layoutRegion}>
      <div className={styles.layoutToolbar} aria-label="Overview layout controls">
        <div className={styles.layoutToolbarLabel}>
          <LayoutDashboard size={17} aria-hidden="true" />
          <span>
            <strong>Operator layout</strong>
            <small>
              {isNarrow
                ? "Stable single-column order on narrow screens"
                : engineStatus === "fallback"
                  ? "Packed pointer layout unavailable; explicit controls remain active"
                  : engineStatus === "loading"
                    ? "Preparing the packed local layout"
                    : "Packed locally in this browser only"}
            </small>
          </span>
        </div>
        <div className={styles.layoutToolbarActions}>
          <button
            type="button"
            className={styles.layoutButton}
            aria-pressed={editMode}
            disabled={isNarrow}
            title={isNarrow ? "Layout editing is disabled in the narrow single-column view." : undefined}
            onClick={() => {
              setEditMode((current) => !current)
              setAnnouncement(editMode ? "Layout editing closed." : "Layout editing enabled. Drag handles and keyboard controls are now visible.")
            }}
          >
            {editMode ? <Check size={14} aria-hidden="true" /> : <GripVertical size={14} aria-hidden="true" />}
            {editMode ? "Done editing" : "Edit layout"}
          </button>
          <button
            type="button"
            className={styles.layoutButton}
            disabled={isNarrow}
            title={isNarrow ? "Layout reset is disabled in the narrow read-only view." : undefined}
            onClick={resetLayout}
          >
            <RotateCcw size={14} aria-hidden="true" />
            Reset layout
          </button>
        </div>
      </div>

      {editMode ? (
        <p className={styles.layoutInstruction}>
          Drag only by a grip, or use Move earlier / Move later. Sizes snap to compact, wide, or tall; cards never overlap.
        </p>
      ) : null}
      <p className={styles.srOnly} aria-live="polite">{announcement}</p>

      <div
        ref={gridRef}
        className={`${styles.dashboardGrid} ${isPacked ? styles.dashboardGridPacked : ""}`}
        data-layout-engine={engineStatus}
      >
        <div className={styles.dashboardSizer} aria-hidden="true" />
        {orderedLayout.map((item, index) => {
          const widget = widgetById.get(item.id)
          if (!widget) return null
          const canMoveEarlier = index > 0
          const canMoveLater = index < orderedLayout.length - 1

          return (
            <article
              key={item.id}
              className={styles.dashboardWidget}
              data-overview-widget-id={item.id}
              data-size={item.size}
            >
              {editMode && !isNarrow ? (
                <div className={styles.widgetEditBar}>
                  <span
                    className={styles.widgetDragHandle}
                    data-overview-drag-handle
                    aria-hidden="true"
                    title="Drag to a new snapped position"
                  >
                    <GripVertical size={15} aria-hidden="true" />
                    <span>Drag</span>
                  </span>
                  <span className={styles.widgetOrder}>{index + 1}/{orderedLayout.length}</span>
                  <div className={styles.widgetMoveControls} role="group" aria-label={`Move ${widget.label}`}>
                    <button
                      type="button"
                      disabled={!canMoveEarlier}
                      aria-label={`Move ${widget.label} earlier`}
                      title="Move earlier"
                      onClick={() => moveWidget(item.id, -1)}
                    >
                      <ChevronUp size={14} aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      disabled={!canMoveLater}
                      aria-label={`Move ${widget.label} later`}
                      title="Move later"
                      onClick={() => moveWidget(item.id, 1)}
                    >
                      <ChevronDown size={14} aria-hidden="true" />
                    </button>
                  </div>
                  <div className={styles.widgetSizeControls} role="group" aria-label={`Size ${widget.label}`}>
                    {OVERVIEW_WIDGET_SIZES.map((size) => (
                      <button
                        key={size}
                        type="button"
                        aria-pressed={item.size === size}
                        aria-label={`Set ${widget.label} to ${size}`}
                        title={`Set ${size} size`}
                        onClick={() => sizeWidget(item.id, size)}
                      >
                        {size.charAt(0).toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
              <div className={styles.dashboardWidgetContent}>{widget.content}</div>
            </article>
          )
        })}
        {draggingId ? <div className={styles.placementGhost} aria-hidden="true">Release to snap</div> : null}
      </div>
    </div>
  )
}

export type { OverviewWidgetDefinition }
