"use client"

import { useEffect, useRef, useState, useCallback, useMemo } from "react"
import { cn } from "@/lib/utils"

// TypeScript interface for Clusterize options
interface ClusterizeOptions {
  scrollId: string
  contentId: string
  rows?: string[]
  rows_in_block?: number
  blocks_in_cluster?: number
  show_no_data_row?: boolean
  no_data_text?: string
  no_data_class?: string
  tag?: string
  keep_parity?: boolean
  callbacks?: {
    clusterWillChange?: () => void
    clusterChanged?: () => void
    scrollingProgress?: (progress: number) => void
  }
}

// Dynamic import for Clusterize (client-side only)
let ClusterizeJS: any = null

interface VirtualTableProps<T> {
  /** Array of data items to display */
  data: T[]
  /** Function to render each row - must return an HTML string */
  renderRow: (item: T, index: number) => string
  /** Optional className for the scroll container */
  className?: string
  /** Optional className for the content area */
  contentClassName?: string
  /** Height of the scroll container */
  height?: string | number
  /** Show loading state */
  loading?: boolean
  /** Text to show when no data */
  emptyText?: string
  /** Number of rows per block (default: 50) */
  rowsPerBlock?: number
  /** Callback when scrolling progress changes */
  onScrollProgress?: (progress: number) => void
  /** Callback when visible cluster changes */
  onClusterChange?: () => void
}

/**
 * VirtualTable - Efficiently renders large datasets using Clusterize.js
 * Only renders visible rows, dramatically improving performance for 10,000+ items
 * 
 * @example
 * <VirtualTable
 *   data={speciesList}
 *   renderRow={(species, i) => `<tr><td>${species.name}</td><td>${species.genus}</td></tr>`}
 *   height={400}
 * />
 */
export function VirtualTable<T>({
  data,
  renderRow,
  className,
  contentClassName,
  height = 400,
  loading = false,
  emptyText = "No data available",
  rowsPerBlock = 50,
  onScrollProgress,
  onClusterChange,
}: VirtualTableProps<T>) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLTableSectionElement>(null)
  const clusterizeRef = useRef<any>(null)
  const [isClient, setIsClient] = useState(false)
  const [initialized, setInitialized] = useState(false)

  // Generate unique IDs for Clusterize
  const ids = useMemo(() => ({
    scrollId: `virtual-scroll-${Math.random().toString(36).substr(2, 9)}`,
    contentId: `virtual-content-${Math.random().toString(36).substr(2, 9)}`,
  }), [])

  // Convert data to HTML rows
  const rows = useMemo(() => {
    return data.map((item, index) => renderRow(item, index))
  }, [data, renderRow])

  // Initialize Clusterize on client-side only
  useEffect(() => {
    setIsClient(true)
    
    // Dynamic import of Clusterize
    import('clusterize.js').then((module) => {
      ClusterizeJS = module.default || module
    }).catch(() => {
      console.warn('Clusterize.js not available, falling back to standard rendering')
    })
  }, [])

  // Initialize/update Clusterize instance
  useEffect(() => {
    if (!isClient || !ClusterizeJS || !scrollRef.current || !contentRef.current) return

    const options: ClusterizeOptions = {
      scrollId: ids.scrollId,
      contentId: ids.contentId,
      rows: rows,
      rows_in_block: rowsPerBlock,
      blocks_in_cluster: 4,
      show_no_data_row: true,
      no_data_text: `<tr><td colspan="100" class="text-center py-8 text-muted-foreground">${emptyText}</td></tr>`,
      tag: 'tr',
      keep_parity: true,
      callbacks: {
        clusterWillChange: () => {},
        clusterChanged: () => {
          onClusterChange?.()
        },
        scrollingProgress: (progress: number) => {
          onScrollProgress?.(progress)
        },
      },
    }

    if (clusterizeRef.current) {
      // Update existing instance
      clusterizeRef.current.update(rows)
    } else {
      // Create new instance
      clusterizeRef.current = new ClusterizeJS(options)
      setInitialized(true)
    }

    return () => {
      if (clusterizeRef.current) {
        clusterizeRef.current.destroy(true)
        clusterizeRef.current = null
      }
    }
  }, [isClient, rows, ids, rowsPerBlock, emptyText, onScrollProgress, onClusterChange])

  // Update rows when data changes
  useEffect(() => {
    if (clusterizeRef.current && initialized) {
      clusterizeRef.current.update(rows)
    }
  }, [rows, initialized])

  // Fallback rendering for SSR or when Clusterize isn't available
  if (!isClient) {
    return (
      <div className={cn("overflow-auto border rounded-lg", className)} style={{ height }}>
        <table className="w-full">
          <tbody className={contentClassName}>
            {data.slice(0, 50).map((item, index) => (
              <tr key={index} dangerouslySetInnerHTML={{ __html: renderRow(item, index).replace(/<\/?tr[^>]*>/g, '') }} />
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  return (
    <div className="relative">
      {loading && (
        <div className="absolute inset-0 bg-background/50 flex items-center justify-center z-10">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      )}
      <div
        id={ids.scrollId}
        ref={scrollRef}
        className={cn(
          "overflow-auto border rounded-lg bg-background",
          className
        )}
        style={{ height: typeof height === 'number' ? `${height}px` : height }}
      >
        <table className="w-full">
          <tbody
            id={ids.contentId}
            ref={contentRef}
            className={cn("divide-y divide-border", contentClassName)}
          >
            {/* Clusterize.js will populate this */}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// Simple virtual list for non-table content
interface VirtualListProps<T> {
  data: T[]
  renderItem: (item: T, index: number) => string
  className?: string
  height?: string | number
  emptyText?: string
  rowsPerBlock?: number
}

export function VirtualList<T>({
  data,
  renderItem,
  className,
  height = 400,
  emptyText = "No items",
  rowsPerBlock = 50,
}: VirtualListProps<T>) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const clusterizeRef = useRef<any>(null)
  const [isClient, setIsClient] = useState(false)

  const ids = useMemo(() => ({
    scrollId: `virtual-list-scroll-${Math.random().toString(36).substr(2, 9)}`,
    contentId: `virtual-list-content-${Math.random().toString(36).substr(2, 9)}`,
  }), [])

  const rows = useMemo(() => {
    return data.map((item, index) => renderItem(item, index))
  }, [data, renderItem])

  useEffect(() => {
    setIsClient(true)
    import('clusterize.js').then((module) => {
      ClusterizeJS = module.default || module
    }).catch(() => {})
  }, [])

  useEffect(() => {
    if (!isClient || !ClusterizeJS || !scrollRef.current || !contentRef.current) return

    if (clusterizeRef.current) {
      clusterizeRef.current.update(rows)
    } else {
      clusterizeRef.current = new ClusterizeJS({
        scrollId: ids.scrollId,
        contentId: ids.contentId,
        rows: rows,
        rows_in_block: rowsPerBlock,
        show_no_data_row: true,
        no_data_text: `<div class="text-center py-8 text-muted-foreground">${emptyText}</div>`,
        tag: 'div',
      })
    }

    return () => {
      if (clusterizeRef.current) {
        clusterizeRef.current.destroy(true)
        clusterizeRef.current = null
      }
    }
  }, [isClient, rows, ids, rowsPerBlock, emptyText])

  if (!isClient) {
    return (
      <div className={cn("overflow-auto border rounded-lg", className)} style={{ height }}>
        {data.slice(0, 50).map((item, index) => (
          <div key={index} dangerouslySetInnerHTML={{ __html: renderItem(item, index) }} />
        ))}
      </div>
    )
  }

  return (
    <div
      id={ids.scrollId}
      ref={scrollRef}
      className={cn("overflow-auto border rounded-lg", className)}
      style={{ height: typeof height === 'number' ? `${height}px` : height }}
    >
      <div id={ids.contentId} ref={contentRef} />
    </div>
  )
}

// Hook for using Clusterize with custom elements
export function useVirtualScroll<T>(
  data: T[],
  renderRow: (item: T, index: number) => string,
  options?: {
    rowsPerBlock?: number
    onScrollProgress?: (progress: number) => void
  }
) {
  const [scrollId] = useState(`vs-scroll-${Math.random().toString(36).substr(2, 9)}`)
  const [contentId] = useState(`vs-content-${Math.random().toString(36).substr(2, 9)}`)
  const clusterizeRef = useRef<any>(null)
  const [isReady, setIsReady] = useState(false)

  const rows = useMemo(() => data.map((item, i) => renderRow(item, i)), [data, renderRow])

  const initialize = useCallback(() => {
    if (!ClusterizeJS) {
      import('clusterize.js').then((module) => {
        ClusterizeJS = module.default || module
        initClusterize()
      })
    } else {
      initClusterize()
    }

    function initClusterize() {
      if (clusterizeRef.current) {
        clusterizeRef.current.update(rows)
      } else {
        clusterizeRef.current = new ClusterizeJS({
          scrollId,
          contentId,
          rows,
          rows_in_block: options?.rowsPerBlock || 50,
          callbacks: {
            scrollingProgress: options?.onScrollProgress,
          },
        })
        setIsReady(true)
      }
    }
  }, [rows, scrollId, contentId, options])

  const update = useCallback((newRows: string[]) => {
    if (clusterizeRef.current) {
      clusterizeRef.current.update(newRows)
    }
  }, [])

  const destroy = useCallback(() => {
    if (clusterizeRef.current) {
      clusterizeRef.current.destroy(true)
      clusterizeRef.current = null
      setIsReady(false)
    }
  }, [])

  const refresh = useCallback(() => {
    if (clusterizeRef.current) {
      clusterizeRef.current.refresh()
    }
  }, [])

  const clear = useCallback(() => {
    if (clusterizeRef.current) {
      clusterizeRef.current.clear()
    }
  }, [])

  useEffect(() => {
    return () => destroy()
  }, [destroy])

  return {
    scrollId,
    contentId,
    isReady,
    initialize,
    update,
    destroy,
    refresh,
    clear,
    rows,
  }
}
