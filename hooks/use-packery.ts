"use client"

/**
 * usePackery Hook - Dynamic masonry layout with Packery + Draggabilly
 * Updated: February 12, 2026
 * 
 * Provides gapless, responsive grid layouts that automatically
 * pack widgets to fill available space. Supports:
 * - Multi-column packing
 * - User drag-to-reorder
 * - User resize (via CSS classes)
 * - Dynamic reflow when widgets change size
 */

import { useEffect, useRef, useCallback, useState } from "react"

// Packery and Draggabilly require browser environment
let Packery: any = null
let Draggabilly: any = null

if (typeof window !== "undefined") {
  Packery = require("packery")
  // Draggabilly for drag-to-reorder functionality
  try {
    Draggabilly = require("draggabilly")
  } catch {
    console.warn("[usePackery] Draggabilly not installed, drag disabled")
  }
}

export interface WidgetSize {
  id: string
  width: 1 | 2  // 1 = single column, 2 = double column
  height: 1 | 2 | 3  // 1 = small, 2 = medium, 3 = large
}

interface UsePackeryOptions {
  /** Base column width in pixels */
  columnWidth?: number
  /** Horizontal space between items */
  gutter?: number
  /** Fit width to container (centers grid) */
  fitWidth?: boolean
  /** Use percentage positioning for responsive layouts */
  percentPosition?: boolean
  /** Item selector within container */
  itemSelector?: string
  /** Horizontal layout direction */
  horizontalOrder?: boolean
  /** Transition duration for relayout */
  transitionDuration?: string
  /** Enable drag-to-reorder */
  draggable?: boolean
  /** Drag handle selector (element within item) */
  dragHandle?: string
  /** Callback when item is dragged */
  onDragStart?: (itemElem: HTMLElement) => void
  /** Callback when drag ends */
  onDragEnd?: (itemElem: HTMLElement) => void
  /** Callback when layout changes (for persisting order) */
  onLayoutComplete?: (itemElems: HTMLElement[]) => void
}

interface UsePackeryReturn {
  /** Ref to attach to grid container */
  containerRef: React.RefObject<HTMLDivElement>
  /** Manual layout trigger - call after adding/removing/resizing items */
  layout: () => void
  /** Reload all items and re-layout */
  reloadItems: () => void
  /** Append new items (after DOM update) */
  appended: (elements: HTMLElement[]) => void
  /** Remove items */
  remove: (elements: HTMLElement[]) => void
  /** Fit item to specific position */
  fit: (element: HTMLElement, x?: number, y?: number) => void
  /** Is Packery initialized */
  isReady: boolean
  /** Destroy Packery instance */
  destroy: () => void
  /** Get current item order (for persisting) */
  getItemOrder: () => string[]
  /** Enable/disable dragging for an item */
  setDraggable: (element: HTMLElement, enabled: boolean) => void
  /** Update widget size class and trigger relayout */
  updateWidgetSize: (element: HTMLElement, width: 1 | 2, height?: 1 | 2 | 3) => void
  /** Packery instance ref for advanced usage */
  packeryInstance: React.RefObject<any>
}

export function usePackery(options: UsePackeryOptions = {}): UsePackeryReturn {
  const containerRef = useRef<HTMLDivElement>(null)
  const packeryRef = useRef<any>(null)
  const draggiesRef = useRef<Map<HTMLElement, any>>(new Map())
  const [isReady, setIsReady] = useState(false)

  const {
    columnWidth = 340,
    gutter = 12,
    fitWidth = false,
    percentPosition = true,
    itemSelector = ".packery-widget",
    horizontalOrder = true,
    transitionDuration = "0.3s",
    draggable = true,
    dragHandle = ".widget-drag-handle",
    onDragStart,
    onDragEnd,
    onLayoutComplete,
  } = options

  // Initialize Packery with Draggabilly
  useEffect(() => {
    if (typeof window === "undefined" || !Packery || !containerRef.current) return

    // Small delay to ensure DOM is ready
    const timeoutId = setTimeout(() => {
      if (!containerRef.current) return
      
      try {
        // Create Packery instance
        packeryRef.current = new Packery(containerRef.current, {
          itemSelector,
          columnWidth,
          gutter,
          fitWidth,
          percentPosition,
          horizontalOrder,
          transitionDuration,
        })

        // Setup Draggabilly for each item
        if (draggable && Draggabilly) {
          const items = packeryRef.current.getItemElements()
          items.forEach((itemElem: HTMLElement) => {
            makeDraggable(itemElem)
          })
        }

        // Listen for layout complete
        if (onLayoutComplete) {
          packeryRef.current.on("layoutComplete", (items: any[]) => {
            const elems = items.map((item: any) => item.element)
            onLayoutComplete(elems)
          })
        }

        setIsReady(true)
      } catch (err) {
        console.error("[usePackery] Initialization error:", err)
      }
    }, 100)

    return () => {
      clearTimeout(timeoutId)
      // Cleanup Draggabilly instances
      draggiesRef.current.forEach((draggie) => {
        try { draggie.destroy() } catch {}
      })
      draggiesRef.current.clear()
      
      if (packeryRef.current) {
        try {
          packeryRef.current.destroy()
        } catch {
          // Ignore destroy errors
        }
        packeryRef.current = null
        setIsReady(false)
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [columnWidth, gutter, fitWidth, percentPosition, itemSelector, horizontalOrder, transitionDuration])

  // Make an item draggable
  const makeDraggable = useCallback((itemElem: HTMLElement) => {
    if (!Draggabilly || !packeryRef.current) return
    if (draggiesRef.current.has(itemElem)) return // Already draggable

    try {
      const draggie = new Draggabilly(itemElem, {
        handle: dragHandle,
      })
      
      // Bind Packery to Draggabilly events
      packeryRef.current.bindDraggabillyEvents(draggie)
      
      // Custom event handlers
      draggie.on("dragStart", () => {
        itemElem.style.zIndex = "100"
        itemElem.classList.add("is-dragging")
        onDragStart?.(itemElem)
      })
      
      draggie.on("dragEnd", () => {
        itemElem.style.zIndex = ""
        itemElem.classList.remove("is-dragging")
        onDragEnd?.(itemElem)
      })
      
      draggiesRef.current.set(itemElem, draggie)
    } catch (err) {
      console.warn("[usePackery] Failed to make item draggable:", err)
    }
  }, [dragHandle, onDragStart, onDragEnd])

  // Layout function
  const layout = useCallback(() => {
    if (packeryRef.current) {
      packeryRef.current.layout()
    }
  }, [])

  // Reload all items and re-initialize draggables
  const reloadItems = useCallback(() => {
    if (!packeryRef.current) return
    
    packeryRef.current.reloadItems()
    
    // Setup Draggabilly for any new items
    if (draggable && Draggabilly) {
      const items = packeryRef.current.getItemElements()
      items.forEach((itemElem: HTMLElement) => {
        if (!draggiesRef.current.has(itemElem)) {
          makeDraggable(itemElem)
        }
      })
    }
    
    packeryRef.current.layout()
  }, [draggable, makeDraggable])

  // Append items
  const appended = useCallback((elements: HTMLElement[]) => {
    if (!packeryRef.current || elements.length === 0) return
    
    packeryRef.current.appended(elements)
    
    // Make new items draggable
    if (draggable && Draggabilly) {
      elements.forEach((elem) => makeDraggable(elem))
    }
  }, [draggable, makeDraggable])

  // Remove items
  const remove = useCallback((elements: HTMLElement[]) => {
    if (!packeryRef.current || elements.length === 0) return
    
    // Cleanup Draggabilly instances
    elements.forEach((elem) => {
      const draggie = draggiesRef.current.get(elem)
      if (draggie) {
        try { draggie.destroy() } catch {}
        draggiesRef.current.delete(elem)
      }
    })
    
    packeryRef.current.remove(elements)
    packeryRef.current.layout()
  }, [])

  // Fit item to position
  const fit = useCallback((element: HTMLElement, x?: number, y?: number) => {
    if (packeryRef.current) {
      packeryRef.current.fit(element, x, y)
    }
  }, [])

  // Destroy instance
  const destroy = useCallback(() => {
    // Cleanup Draggabilly instances
    draggiesRef.current.forEach((draggie) => {
      try { draggie.destroy() } catch {}
    })
    draggiesRef.current.clear()
    
    if (packeryRef.current) {
      packeryRef.current.destroy()
      packeryRef.current = null
      setIsReady(false)
    }
  }, [])

  // Get current item order (for persisting)
  const getItemOrder = useCallback((): string[] => {
    if (!packeryRef.current) return []
    
    const items = packeryRef.current.getItemElements()
    return items.map((elem: HTMLElement) => elem.dataset.widgetId || elem.id || "")
  }, [])

  // Enable/disable dragging for an item
  const setDraggable = useCallback((element: HTMLElement, enabled: boolean) => {
    const draggie = draggiesRef.current.get(element)
    if (draggie) {
      if (enabled) {
        draggie.enable()
      } else {
        draggie.disable()
      }
    } else if (enabled && Draggabilly) {
      makeDraggable(element)
    }
  }, [makeDraggable])

  // Update widget size and trigger relayout
  const updateWidgetSize = useCallback((element: HTMLElement, width: 1 | 2, height?: 1 | 2 | 3) => {
    // Remove existing size classes
    element.classList.remove(
      "widget-w-1", "widget-w-2",
      "widget-h-1", "widget-h-2", "widget-h-3"
    )
    
    // Add new size classes
    element.classList.add(`widget-w-${width}`)
    if (height) {
      element.classList.add(`widget-h-${height}`)
    }
    
    // Trigger relayout
    if (packeryRef.current) {
      // Small delay to allow CSS to apply
      requestAnimationFrame(() => {
        packeryRef.current.layout()
      })
    }
  }, [])

  // Re-layout when container size changes
  useEffect(() => {
    if (!containerRef.current || !isReady) return

    const resizeObserver = new ResizeObserver(() => {
      // Debounce layout on resize
      requestAnimationFrame(() => {
        layout()
      })
    })

    resizeObserver.observe(containerRef.current)

    return () => {
      resizeObserver.disconnect()
    }
  }, [isReady, layout])

  return {
    containerRef,
    layout,
    reloadItems,
    appended,
    remove,
    fit,
    isReady,
    destroy,
    getItemOrder,
    setDraggable,
    updateWidgetSize,
    packeryInstance: packeryRef,
  }
}

export type { UsePackeryOptions, UsePackeryReturn }
