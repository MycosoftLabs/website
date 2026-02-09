"use client"

import { useState, useMemo, useCallback, useRef, useEffect } from "react"
import { cn } from "@/lib/utils"

/**
 * PerspectiveTable - Real-time analytic table component
 * Features: sorting, filtering, row selection, CSV export, summary row
 * No external dependencies beyond React
 * Created: February 9, 2026
 */

interface PerspectiveColumnDef {
  /** Key into the data object */
  key: string
  /** Display label for the column header */
  label: string
  /** Column width in pixels (flex otherwise) */
  width?: number
  /** Whether this column is numeric (enables sum in summary) */
  numeric?: boolean
  /** Whether this column is filterable */
  filterable?: boolean
}

type SortDir = "asc" | "desc" | null

interface SortState {
  key: string | null
  direction: SortDir
}

interface PerspectiveTableProps {
  /** Array of data objects */
  data: Record<string, unknown>[]
  /** Column definitions */
  columns: PerspectiveColumnDef[]
  /** Title displayed above the table */
  title: string
  /** Optional CSS class */
  className?: string
  /** Max height for the table body */
  maxHeight?: number
}

export function PerspectiveTable({
  data,
  columns,
  title,
  className,
  maxHeight = 500,
}: PerspectiveTableProps) {
  const [sort, setSort] = useState<SortState>({ key: null, direction: null })
  const [filters, setFilters] = useState<Record<string, string>>({})
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set())
  const [lastDataLength, setLastDataLength] = useState(data.length)
  const [showRefreshIndicator, setShowRefreshIndicator] = useState(false)
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout>>()

  // Detect data changes for refresh indicator
  useEffect(() => {
    if (data.length !== lastDataLength) {
      setLastDataLength(data.length)
      setShowRefreshIndicator(true)
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current)
      refreshTimerRef.current = setTimeout(() => setShowRefreshIndicator(false), 2000)
    }
    return () => {
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current)
    }
  }, [data.length, lastDataLength])

  // Filter data
  const filteredData = useMemo(() => {
    const activeFilters = Object.entries(filters).filter(([, v]) => v.trim() !== "")
    if (activeFilters.length === 0) return data

    return data.filter((row) =>
      activeFilters.every(([key, filterVal]) => {
        const cellVal = row[key]
        if (cellVal == null) return false
        return String(cellVal).toLowerCase().includes(filterVal.toLowerCase())
      })
    )
  }, [data, filters])

  // Sort filtered data
  const sortedData = useMemo(() => {
    if (!sort.key || !sort.direction) return filteredData

    const key = sort.key
    const dir = sort.direction === "asc" ? 1 : -1

    return [...filteredData].sort((a, b) => {
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
  }, [filteredData, sort.key, sort.direction])

  // Summary row
  const summary = useMemo(() => {
    const result: Record<string, string> = {}
    for (const col of columns) {
      if (col.numeric) {
        const sum = sortedData.reduce((acc, row) => {
          const val = row[col.key]
          return acc + (typeof val === "number" ? val : 0)
        }, 0)
        result[col.key] = sum.toLocaleString(undefined, { maximumFractionDigits: 2 })
      } else {
        result[col.key] = ""
      }
    }
    return result
  }, [sortedData, columns])

  // Sort toggle
  const handleSort = useCallback((key: string) => {
    setSort((prev) => {
      if (prev.key !== key) return { key, direction: "asc" }
      if (prev.direction === "asc") return { key, direction: "desc" }
      return { key: null, direction: null }
    })
  }, [])

  // Filter change
  const handleFilterChange = useCallback((key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }))
  }, [])

  // Row selection
  const toggleRow = useCallback((index: number) => {
    setSelectedRows((prev) => {
      const next = new Set(prev)
      if (next.has(index)) {
        next.delete(index)
      } else {
        next.add(index)
      }
      return next
    })
  }, [])

  const toggleAll = useCallback(() => {
    if (selectedRows.size === sortedData.length) {
      setSelectedRows(new Set())
    } else {
      setSelectedRows(new Set(sortedData.map((_, i) => i)))
    }
  }, [selectedRows.size, sortedData.length])

  // CSV export
  const exportCSV = useCallback(() => {
    const rowsToExport =
      selectedRows.size > 0
        ? sortedData.filter((_, i) => selectedRows.has(i))
        : sortedData

    const headerLine = columns.map((c) => `"${c.label}"`).join(",")
    const dataLines = rowsToExport.map((row) =>
      columns
        .map((col) => {
          const val = row[col.key]
          if (val == null) return ""
          const str = String(val).replace(/"/g, '""')
          return `"${str}"`
        })
        .join(",")
    )

    const csv = [headerLine, ...dataLines].join("\n")
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `${title.replace(/\s+/g, "_").toLowerCase()}_export.csv`
    link.click()
    URL.revokeObjectURL(url)
  }, [sortedData, columns, selectedRows, title])

  // Sort indicator
  function sortIndicator(key: string) {
    if (sort.key !== key) return " \u2195"
    return sort.direction === "asc" ? " \u2191" : " \u2193"
  }

  const allSelected = sortedData.length > 0 && selectedRows.size === sortedData.length

  return (
    <div className={cn("flex flex-col border border-border rounded-lg overflow-hidden bg-background", className)}>
      {/* Toolbar */}
      <div className="flex items-center justify-between px-3 py-2 bg-muted/40 border-b border-border">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          {showRefreshIndicator && (
            <span className="inline-flex items-center gap-1 text-xs text-green-600 dark:text-green-400 animate-pulse">
              <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
              Updated
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>
            {sortedData.length.toLocaleString()} rows
            {selectedRows.size > 0 && ` (${selectedRows.size} selected)`}
          </span>
          <button
            onClick={exportCSV}
            className="px-2 py-1 rounded border border-border hover:bg-muted transition-colors text-foreground"
          >
            Export CSV
          </button>
        </div>
      </div>

      {/* Header row */}
      <div className="flex bg-muted/60 border-b border-border text-xs font-medium text-muted-foreground select-none">
        {/* Select all checkbox */}
        <div className="flex items-center justify-center w-10 flex-shrink-0 border-r border-border/50">
          <input
            type="checkbox"
            checked={allSelected}
            onChange={toggleAll}
            className="h-3.5 w-3.5 rounded border-border"
            aria-label="Select all rows"
          />
        </div>
        {columns.map((col) => (
          <div
            key={col.key}
            className="flex flex-col"
            style={{ width: col.width ? `${col.width}px` : undefined, flex: col.width ? "none" : 1 }}
          >
            <div
              className="px-3 py-2 cursor-pointer hover:bg-muted transition-colors truncate"
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
            {col.filterable !== false && (
              <input
                type="text"
                placeholder="Filter..."
                value={filters[col.key] || ""}
                onChange={(e) => handleFilterChange(col.key, e.target.value)}
                className="px-3 py-1 text-xs bg-background border-t border-border/50 outline-none focus:bg-muted/30 placeholder:text-muted-foreground/50"
              />
            )}
          </div>
        ))}
      </div>

      {/* Data rows */}
      <div className="overflow-auto" style={{ maxHeight: `${maxHeight}px` }}>
        {sortedData.length === 0 ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">
            No data available
          </div>
        ) : (
          sortedData.map((row, rowIndex) => {
            const isSelected = selectedRows.has(rowIndex)
            return (
              <div
                key={rowIndex}
                className={cn(
                  "flex items-center border-b border-border/50 text-sm transition-colors",
                  rowIndex % 2 === 0 ? "bg-background" : "bg-muted/20",
                  isSelected && "bg-primary/10"
                )}
                style={{ minHeight: "36px" }}
              >
                <div className="flex items-center justify-center w-10 flex-shrink-0 border-r border-border/50">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleRow(rowIndex)}
                    className="h-3.5 w-3.5 rounded border-border"
                    aria-label={`Select row ${rowIndex + 1}`}
                  />
                </div>
                {columns.map((col) => (
                  <div
                    key={col.key}
                    className={cn("px-3 py-1.5 truncate", col.numeric && "text-right tabular-nums")}
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
          })
        )}
      </div>

      {/* Summary row */}
      {sortedData.length > 0 && (
        <div className="flex items-center border-t border-border bg-muted/40 text-xs font-medium text-muted-foreground">
          <div className="flex items-center justify-center w-10 flex-shrink-0 border-r border-border/50 py-2">
            <span className="text-[10px]">&Sigma;</span>
          </div>
          {columns.map((col) => (
            <div
              key={col.key}
              className={cn("px-3 py-2 truncate", col.numeric && "text-right tabular-nums font-mono")}
              style={{
                width: col.width ? `${col.width}px` : undefined,
                flex: col.width ? "none" : 1,
              }}
            >
              {col.numeric ? summary[col.key] : col.key === columns[0]?.key ? `Count: ${sortedData.length}` : ""}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export type { PerspectiveColumnDef, PerspectiveTableProps }
