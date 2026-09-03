"use client"

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react"
import { ArrowDown, ArrowUp, GripVertical, LayoutDashboard, RotateCcw, X } from "lucide-react"
import {
  COMMAND_LAYOUT_STORAGE_KEY,
  DEFAULT_COMMAND_WIDGET_LAYOUT,
  moveCommandWidget,
  parseCommandLayout,
  reorderCommandWidgets,
  serializeCommandLayout,
  setCommandWidgetSize,
  type CommandWidgetLayoutItem,
  type CommandWidgetSize,
} from "@/lib/fusarium/command-control/layout"
import styles from "./command-control.module.css"

interface WidgetDefinition {
  id: string
  label: string
  content: ReactNode
}

interface PackeryItemLike {
  rect?: { x?: number; y?: number }
}

interface PackeryLike {
  bindDraggabillyEvents: (instance: DraggabillyLike) => void
  destroy: () => void
  getItem: (element: HTMLElement) => PackeryItemLike | undefined
  getItemElements: () => HTMLElement[]
  layout: () => void
  reloadItems: () => void
  unbindDraggabillyEvents?: (instance: DraggabillyLike) => void
}

interface DraggabillyLike {
  destroy: () => void
  on: (eventName: string, listener: () => void) => void
}

type PackeryConstructor = new (element: HTMLElement, options: Record<string, unknown>) => PackeryLike
type DraggabillyConstructor = new (
  element: HTMLElement,
  options: Record<string, unknown>,
) => DraggabillyLike

type EngineState = "loading" | "ready" | "fallback" | "single-column"

function visualOrder(instance: PackeryLike): string[] {
  return instance
    .getItemElements()
    .map((element) => {
      const rect = instance.getItem(element)?.rect
      return {
        id: element.dataset.ccWidgetId ?? "",
        x: rect?.x ?? element.getBoundingClientRect().x,
        y: rect?.y ?? element.getBoundingClientRect().y,
      }
    })
    .filter((item) => item.id)
    .sort((left, right) => (Math.abs(left.y - right.y) > 20 ? left.y - right.y : left.x - right.x))
    .map((item) => item.id)
}

export function CommandOperationalLayout({ widgets }: { widgets: WidgetDefinition[] }) {
  const gridRef = useRef<HTMLDivElement>(null)
  const packeryRef = useRef<PackeryLike | null>(null)
  const draggiesRef = useRef<DraggabillyLike[]>([])
  const [layout, setLayout] = useState<CommandWidgetLayoutItem[]>(() =>
    DEFAULT_COMMAND_WIDGET_LAYOUT.map((item) => ({ ...item })),
  )
  const [storageReady, setStorageReady] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [isNarrow, setIsNarrow] = useState(false)
  const [engineState, setEngineState] = useState<EngineState>("loading")
  const [announcement, setAnnouncement] = useState("Supporting layout controls ready.")
  const widgetById = useMemo(() => new Map(widgets.map((widget) => [widget.id, widget])), [widgets])
  const visibleLayout = useMemo(
    () => layout.filter((item) => widgetById.has(item.id)),
    [layout, widgetById],
  )
  const layoutKey = visibleLayout.map((item) => `${item.id}:${item.size}`).join("|")

  const destroyDraggies = useCallback(() => {
    for (const draggie of draggiesRef.current) {
      try {
        packeryRef.current?.unbindDraggabillyEvents?.(draggie)
        draggie.destroy()
      } catch {
        // Keyboard move and size controls remain available.
      }
    }
    draggiesRef.current = []
  }, [])

  useEffect(() => {
    const query = window.matchMedia("(max-width: 760px)")
    const sync = () => {
      setIsNarrow(query.matches)
      if (query.matches) setEditMode(false)
    }
    sync()
    query.addEventListener("change", sync)
    return () => query.removeEventListener("change", sync)
  }, [])

  useEffect(() => {
    try {
      setLayout(parseCommandLayout(window.localStorage.getItem(COMMAND_LAYOUT_STORAGE_KEY)))
    } catch {
      setLayout(DEFAULT_COMMAND_WIDGET_LAYOUT.map((item) => ({ ...item })))
    } finally {
      setStorageReady(true)
    }
  }, [])

  useEffect(() => {
    if (!storageReady) return
    try {
      window.localStorage.setItem(COMMAND_LAYOUT_STORAGE_KEY, serializeCommandLayout(layout))
    } catch {
      setAnnouncement("Layout changed for this session; browser storage is unavailable.")
    }
  }, [layout, storageReady])

  useEffect(() => {
    const container = gridRef.current
    if (!container) return
    if (isNarrow) {
      setEngineState("single-column")
      return
    }

    let cancelled = false
    let instance: PackeryLike | null = null
    let observer: ResizeObserver | null = null
    setEngineState("loading")
    void Promise.all([import("packery"), import("draggabilly")])
      .then(([packeryModule, draggabillyModule]) => {
        if (cancelled) return
        const Packery = (packeryModule.default ?? packeryModule) as unknown as PackeryConstructor
        const Draggabilly = (draggabillyModule.default ?? draggabillyModule) as unknown as DraggabillyConstructor
        instance = new Packery(container, {
          itemSelector: "[data-cc-widget-id]",
          gutter: 10,
          percentPosition: true,
          horizontalOrder: true,
          transitionDuration: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : "0.16s",
        })
        packeryRef.current = instance
        instance.reloadItems()
        instance.layout()

        if (editMode) {
          for (const element of instance.getItemElements()) {
            const draggie = new Draggabilly(element, { handle: "[data-cc-drag-handle]" })
            instance.bindDraggabillyEvents(draggie)
            draggie.on("dragEnd", () => {
              if (!instance) return
              setLayout((current) => reorderCommandWidgets(current, visualOrder(instance!)))
              const id = element.dataset.ccWidgetId ?? "panel"
              setAnnouncement(`${widgetById.get(id)?.label ?? "Panel"} moved and collision-free packing updated.`)
            })
            draggiesRef.current.push(draggie)
          }
        }

        observer = new ResizeObserver(() => requestAnimationFrame(() => instance?.layout()))
        observer.observe(container)
        setEngineState("ready")
      })
      .catch(() => {
        if (!cancelled) setEngineState("fallback")
      })

    return () => {
      cancelled = true
      observer?.disconnect()
      destroyDraggies()
      try {
        instance?.destroy()
      } catch {
        // Ordered CSS grid fallback remains usable.
      }
      if (packeryRef.current === instance) packeryRef.current = null
    }
  }, [destroyDraggies, editMode, isNarrow, layoutKey, widgetById])

  const move = (id: string, direction: -1 | 1) => {
    setLayout((current) => moveCommandWidget(current, id, direction))
    setAnnouncement(`${widgetById.get(id)?.label ?? "Panel"} moved ${direction < 0 ? "earlier" : "later"}.`)
  }

  const resize = (id: string, size: CommandWidgetSize) => {
    setLayout((current) => setCommandWidgetSize(current, id, size))
    setAnnouncement(`${widgetById.get(id)?.label ?? "Panel"} set to ${size}.`)
  }

  const reset = () => {
    setLayout(DEFAULT_COMMAND_WIDGET_LAYOUT.map((item) => ({ ...item })))
    try {
      window.localStorage.removeItem(COMMAND_LAYOUT_STORAGE_KEY)
    } catch {
      // In-memory reset still succeeds.
    }
    setAnnouncement("Supporting layout reset to the Command & Control default.")
  }

  const engineLabel =
    engineState === "ready"
      ? "collision-free packing ready"
      : engineState === "single-column"
        ? "read-only single-column safety layout"
        : engineState === "fallback"
          ? "ordered grid fallback"
          : "preparing layout"

  return (
    <section className={styles.layoutRegion} aria-labelledby="cc-supporting-heading">
      <header className={styles.layoutToolbar}>
        <div>
          <span className={styles.eyebrow}>Supporting evidence</span>
          <h2 id="cc-supporting-heading">Coordination record</h2>
          <p>{engineLabel}. Browser-local layout only; mission context and the review workbench stay fixed.</p>
        </div>
        <div className={styles.toolbarActions}>
          {editMode ? (
            <button type="button" className={styles.quietButton} onClick={reset}>
              <RotateCcw aria-hidden="true" /> Reset
            </button>
          ) : null}
          <button
            type="button"
            className={editMode ? styles.activeButton : styles.quietButton}
            onClick={() => setEditMode((value) => !value)}
            disabled={isNarrow}
            aria-pressed={editMode}
            title={isNarrow ? "Layout editing is disabled in the narrow read-only view." : undefined}
          >
            {editMode ? <X aria-hidden="true" /> : <LayoutDashboard aria-hidden="true" />}
            {editMode ? "Finish layout" : "Edit layout"}
          </button>
        </div>
      </header>

      <p className={styles.srOnly} aria-live="polite">{announcement}</p>
      <div
        ref={gridRef}
        className={`${styles.widgetGrid} ${engineState === "ready" ? styles.widgetGridPacked : ""}`}
        data-editing={editMode ? "true" : "false"}
      >
        {visibleLayout.map((item, index) => {
          const widget = widgetById.get(item.id)
          if (!widget) return null
          return (
            <article
              key={item.id}
              className={`${styles.widget} ${styles[`widget_${item.size}`] ?? ""}`}
              data-cc-widget-id={item.id}
            >
              <header className={styles.widgetHeader}>
                <div className={styles.widgetTitle}>
                  {editMode ? (
                    <button
                      type="button"
                      className={styles.dragHandle}
                      data-cc-drag-handle
                      aria-label={`Drag ${widget.label}`}
                      title="Drag to reorder"
                    >
                      <GripVertical aria-hidden="true" />
                    </button>
                  ) : null}
                  <h3>{widget.label}</h3>
                </div>
                {editMode ? (
                  <div className={styles.widgetControls}>
                    <button
                      type="button"
                      onClick={() => move(item.id, -1)}
                      disabled={index === 0}
                      aria-label={`Move ${widget.label} earlier`}
                    >
                      <ArrowUp aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      onClick={() => move(item.id, 1)}
                      disabled={index === visibleLayout.length - 1}
                      aria-label={`Move ${widget.label} later`}
                    >
                      <ArrowDown aria-hidden="true" />
                    </button>
                    <label>
                      <span className={styles.srOnly}>Size {widget.label}</span>
                      <select
                        value={item.size}
                        onChange={(event) => resize(item.id, event.target.value as CommandWidgetSize)}
                        aria-label={`Size ${widget.label}`}
                      >
                        <option value="compact">Compact</option>
                        <option value="wide">Wide</option>
                        <option value="tall">Tall</option>
                      </select>
                    </label>
                  </div>
                ) : null}
              </header>
              <div className={styles.widgetBody}>{widget.content}</div>
            </article>
          )
        })}
      </div>
    </section>
  )
}
