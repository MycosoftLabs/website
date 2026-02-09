"use client"

import { useState, useMemo, useCallback, useRef, useEffect } from "react"
import { cn } from "@/lib/utils"

/**
 * VirtualizedTable - CSS-based virtualized table for large datasets
 * Renders only visible rows based on scroll position for high performance
 * No external dependencies beyond React
 * Created: February 9, 2026
 */

interface ColumnDefinition {
  key: string
  label: string
  width?: number
}

type SortDirection = "asc" | "desc" | null

interface SortState {
  key: string | null
  direction: SortDirection
}

interface VirtualizedTableProps<T extends Record<string, unknown>> {
  /** Column definitions */
  columns: ColumnDefinition[]
  /** Array of data objects */
  data: T[]
  /** Height of each row in pixels */
  rowHeight?: number
  /** Max height of the table viewport in pixels */
  maxHeight?: number
  /** Optional CSS class for the container */
  className?: string
}

export function VirtualizedTable<T extends Record<string, unknown>>({
  columns,
  data,
  rowHeight = 40,
  maxHeight = 600,
  className,
}: VirtualizedTableProps<T>) {
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const [scrollTop, setScrollTop] = useState(0)
  const [sort, setSort] = useState<SortState>({ key: null, direction: null })

  // Sort data
  const sortedData = useMemo(() => {
    if (!sort.key || !sort.direction) return data

    const key = sort.key
    const dir = sort.direction === "asc" ? 1 : -1

    return [...data].sort((a, b) => {
      const aVal = a[key]
      const bVal = b[key]

      if (aVal == null && bVal == null) return 0
      if (aVal == null) return 1
      if (bVal == null) return -1

      if (typeof aVal === "number" && typeof bVal === "number") {
        return (aVal - bVal) * dir
      }

      return String(aVal).localeCompare(String(bVal)) * dir
    })
  }, [data, sort.key, sort.direction])

  // Calculate visible rows
  const totalHeight = sortedData.length * rowHeight
  const visibleCount = Math.ceil(maxHeight / rowHeight) + 2 // buffer rows
  const startIndex = Math.max(0, Math.floor(scrollTop / rowHeight) - 1)
  const endIndex = Math.min(sortedData.length, startIndex + visibleCount)
  const visibleRows = sortedData.slice(startIndex, endIndex)
  const offsetY = startIndex * rowHeight

  // Handle scroll
  const handleScroll = useCallback(() => {
    if (scrollContainerRef.current) {
      setScrollTop(scrollContainerRef.current.scrollTop)
    }
  }, [])

  useEffect(() => {
    const container = scrollContainerRef.current
    if (!container) return
    container.addEventListener("scroll", handleScroll, { passive: true })
    return () => container.removeEventListener("scroll", handleScroll)
  }, [handleScroll])

  // Handle sort toggle
  const handleSort = useCallback((key: string) => {
    setSort((prev) => {
      if (prev.key !== key) return { key, direction: "asc" }
      if (prev.direction === "asc") return { key, direction: "desc" }
      return { key: null, direction: null }
    })
  }, [])

  // Sort indicator
  function sortIndicator(key: string) {
    if (sort.key !== key) return " \u2195"
    return sort.direction === "asc" ? " \u2191" : " \u2193"
  }

  return (
    <div className={cn("flex flex-col border border-border rounded-lg overflow-hidden bg-background", className)}>
      {/* Row count indicator */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-muted/40 border-b border-border text-xs text-muted-foreground">
        <span>{sortedData.length.toLocaleString()} rows</span>
        {sort.key && (
          <span>
            Sorted by {columns.find((c) => c.key === sort.key)?.label || sort.key}{" "}
            {sort.direction === "asc" ? "ascending" : "descending"}
          </span>
        )}
      </div>

      {/* Header */}
      <div className="flex bg-muted/60 border-b border-border text-xs font-medium text-muted-foreground select-none">
        {columns.map((col) => (
          <div
            key={col.key}
            className="px-3 py-2 cursor-pointer hover:bg-muted transition-colors truncate"
            style={{ width: col.width ? `${col.width}px` : undefined, flex: col.width ? "none" : 1 }}
            onClick={() => handleSort(col.key)}
            role="columnheader"
            aria-sort={
              sort.key === col.key
                ? sort.direction === "asc"
                  ? "ascending"
                  : "descending"
                : "none"
            }
          >
            {col.label}
            {sortIndicator(col.key)}
          </div>
        ))}
      </div>

      {/* Scrollable body */}
      <div
        ref={scrollContainerRef}
        className="overflow-auto"
        style={{ maxHeight: `${maxHeight}px` }}
      >
        {/* Total height spacer */}
        <div style={{ height: `${totalHeight}px`, position: "relative" }}>
          {/* Visible rows positioned absolutely */}
          <div style={{ position: "absolute", top: `${offsetY}px`, left: 0, right: 0 }}>
            {visibleRows.map((row, i) => {
              const actualIndex = startIndex + i
              return (
                <div
                  key={actualIndex}
                  className={cn(
                    "flex items-center border-b border-border/50 text-sm",
                    actualIndex % 2 === 0 ? "bg-background" : "bg-muted/20"
                  )}
                  style={{ height: `${rowHeight}px` }}
                >
                  {columns.map((col) => (
                    <div
                      key={col.key}
                      className="px-3 truncate"
                      style={{
                        width: col.width ? `${col.width}px` : undefined,
                        flex: col.width ? "none" : 1,
                      }}
                      title={String(row[col.key] ?? "")}
                    >
                      {row[col.key] != null ? String(row[col.key]) : ""}
                    </div>
                  ))}
                </div>
              )
            })}
          </div>
        </div>

        {/* Empty state */}
        {sortedData.length === 0 && (
          <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">
            No data available
          </div>
        )}
      </div>
    </div>
  )
}

export type { ColumnDefinition, VirtualizedTableProps }
