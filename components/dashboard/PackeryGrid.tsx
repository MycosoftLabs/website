"use client"

import {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
  ReactNode,
  Children,
  cloneElement,
  isValidElement,
} from "react"
import { cn } from "@/lib/utils"

/**
 * PackeryGrid - Draggable grid layout component using CSS Grid + HTML5 Drag API
 * Saves and restores layout order via sessionStorage
 * No external dependencies beyond React
 * Created: February 9, 2026
 */

interface PackeryGridProps {
  /** Grid children - each child is wrapped in a draggable grid item */
  children: ReactNode
  /** Minimum column width in pixels */
  columnWidth?: number
  /** Gap between grid items in pixels */
  gutter?: number
  /** sessionStorage key for persisting layout order */
  storageKey?: string
  /** Optional CSS class for the grid container */
  className?: string
}

interface DragState {
  draggedIndex: number | null
  overIndex: number | null
}

const STORAGE_PREFIX = "packery-grid-order-"

export function PackeryGrid({
  children,
  columnWidth = 300,
  gutter = 16,
  storageKey = "default",
  className,
}: PackeryGridProps) {
  const childArray = useMemo(() => Children.toArray(children), [children])
  const childCount = childArray.length

  // Item order (indices into childArray)
  const [order, setOrder] = useState<number[]>(() => {
    return Array.from({ length: childCount }, (_, i) => i)
  })

  const [drag, setDrag] = useState<DragState>({ draggedIndex: null, overIndex: null })

  // Restore order from sessionStorage on mount
  useEffect(() => {
    if (typeof window === "undefined") return
    try {
      const saved = sessionStorage.getItem(`${STORAGE_PREFIX}${storageKey}`)
      if (saved) {
        const parsed: number[] = JSON.parse(saved)
        // Validate: must have same length and valid indices
        if (
          Array.isArray(parsed) &&
          parsed.length === childCount &&
          parsed.every((idx) => typeof idx === "number" && idx >= 0 && idx < childCount)
        ) {
          setOrder(parsed)
        }
      }
    } catch {
      // Ignore parse errors
    }
  }, [storageKey, childCount])

  // Persist order to sessionStorage
  const persistOrder = useCallback(
    (newOrder: number[]) => {
      if (typeof window === "undefined") return
      try {
        sessionStorage.setItem(`${STORAGE_PREFIX}${storageKey}`, JSON.stringify(newOrder))
      } catch {
        // sessionStorage full or unavailable
      }
    },
    [storageKey]
  )

  // Reset order when child count changes
  useEffect(() => {
    if (order.length !== childCount) {
      const newOrder = Array.from({ length: childCount }, (_, i) => i)
      setOrder(newOrder)
      persistOrder(newOrder)
    }
  }, [childCount, order.length, persistOrder])

  // Drag handlers
  const handleDragStart = useCallback((e: React.DragEvent, positionIndex: number) => {
    setDrag((prev) => ({ ...prev, draggedIndex: positionIndex }))
    e.dataTransfer.effectAllowed = "move"
    e.dataTransfer.setData("text/plain", String(positionIndex))
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = "0.4"
    }
  }, [])

  const handleDragEnd = useCallback((e: React.DragEvent) => {
    setDrag({ draggedIndex: null, overIndex: null })
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = "1"
    }
  }, [])

  const handleDragOver = useCallback(
    (e: React.DragEvent, positionIndex: number) => {
      e.preventDefault()
      e.dataTransfer.dropEffect = "move"
      if (positionIndex !== drag.draggedIndex) {
        setDrag((prev) => ({ ...prev, overIndex: positionIndex }))
      }
    },
    [drag.draggedIndex]
  )

  const handleDragLeave = useCallback(() => {
    setDrag((prev) => ({ ...prev, overIndex: null }))
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent, targetPosition: number) => {
      e.preventDefault()
      const sourcePosition = drag.draggedIndex
      if (sourcePosition === null || sourcePosition === targetPosition) return

      setOrder((prev) => {
        const newOrder = [...prev]
        const [moved] = newOrder.splice(sourcePosition, 1)
        newOrder.splice(targetPosition, 0, moved)
        persistOrder(newOrder)
        return newOrder
      })

      setDrag({ draggedIndex: null, overIndex: null })
    },
    [drag.draggedIndex, persistOrder]
  )

  return (
    <div
      className={cn("w-full", className)}
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(auto-fill, minmax(${columnWidth}px, 1fr))`,
        gap: `${gutter}px`,
      }}
    >
      {order.map((childIndex, positionIndex) => {
        const child = childArray[childIndex]
        if (!child) return null

        const isDragging = drag.draggedIndex === positionIndex
        const isDragOver = drag.overIndex === positionIndex

        return (
          <div
            key={`grid-item-${childIndex}`}
            className={cn(
              "relative rounded-lg border border-border bg-card transition-all duration-150",
              isDragging && "opacity-40 ring-2 ring-primary",
              isDragOver && "ring-2 ring-primary/50 scale-[1.02]"
            )}
            draggable
            onDragStart={(e) => handleDragStart(e, positionIndex)}
            onDragEnd={handleDragEnd}
            onDragOver={(e) => handleDragOver(e, positionIndex)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, positionIndex)}
          >
            {/* Drag handle */}
            <div
              className="absolute top-2 left-2 z-10 cursor-grab active:cursor-grabbing p-1 rounded hover:bg-muted transition-colors"
              title="Drag to reorder"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 14 14"
                fill="none"
                className="text-muted-foreground"
              >
                <circle cx="4" cy="3" r="1.2" fill="currentColor" />
                <circle cx="10" cy="3" r="1.2" fill="currentColor" />
                <circle cx="4" cy="7" r="1.2" fill="currentColor" />
                <circle cx="10" cy="7" r="1.2" fill="currentColor" />
                <circle cx="4" cy="11" r="1.2" fill="currentColor" />
                <circle cx="10" cy="11" r="1.2" fill="currentColor" />
              </svg>
            </div>

            {/* Child content */}
            <div className="pt-2">{child}</div>
          </div>
        )
      })}
    </div>
  )
}

export type { PackeryGridProps }
