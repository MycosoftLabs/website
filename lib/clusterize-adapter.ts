/**
 * Clusterize.js TypeScript Adapter
 * Type definitions and utility functions for virtual scrolling
 */

// Clusterize.js class interface
export interface ClusterizeInstance {
  /** Update the list with new rows */
  update: (rows: string[]) => void
  /** Refresh the cluster to recalculate visible items */
  refresh: (force?: boolean) => void
  /** Clear all rows */
  clear: () => void
  /** Get the number of rows in the cluster */
  getRowsAmount: () => number
  /** Get the current scroll progress (0-100) */
  getScrollProgress: () => number
  /** Destroy the instance and clean up */
  destroy: (clean?: boolean) => void
  /** Append rows to the end */
  append: (rows: string[]) => void
  /** Prepend rows to the beginning */
  prepend: (rows: string[]) => void
}

export interface ClusterizeOptions {
  /** ID of the scroll container element */
  scrollId?: string
  /** ID of the content element */
  contentId?: string
  /** Scroll container element */
  scrollElem?: HTMLElement
  /** Content element */
  contentElem?: HTMLElement
  /** Array of HTML strings for each row */
  rows?: string[]
  /** Number of rows in each block (default: 50) */
  rows_in_block?: number
  /** Number of blocks in a cluster (default: 4) */
  blocks_in_cluster?: number
  /** Show a message when there's no data */
  show_no_data_row?: boolean
  /** Text to show when there's no data */
  no_data_text?: string
  /** CSS class for no data message */
  no_data_class?: string
  /** HTML tag for rows (default: 'div') */
  tag?: string
  /** Keep odd/even parity for CSS styling */
  keep_parity?: boolean
  /** Callback functions */
  callbacks?: {
    /** Called before cluster changes */
    clusterWillChange?: () => void
    /** Called after cluster changes */
    clusterChanged?: () => void
    /** Called during scrolling with progress 0-100 */
    scrollingProgress?: (progress: number) => void
  }
}

// Declare the Clusterize module
declare module 'clusterize.js' {
  export default class Clusterize implements ClusterizeInstance {
    constructor(options: ClusterizeOptions)
    update(rows: string[]): void
    refresh(force?: boolean): void
    clear(): void
    getRowsAmount(): number
    getScrollProgress(): number
    destroy(clean?: boolean): void
    append(rows: string[]): void
    prepend(rows: string[]): void
  }
}

/**
 * Helper function to create a table row HTML string
 */
export function createTableRow(cells: (string | number | null | undefined)[], className?: string): string {
  const cellsHtml = cells
    .map((cell) => `<td class="px-4 py-2 whitespace-nowrap">${cell ?? ''}</td>`)
    .join('')
  return `<tr class="${className || 'border-b hover:bg-muted/50'}">${cellsHtml}</tr>`
}

/**
 * Helper function to create a list item HTML string
 */
export function createListItem(content: string, className?: string): string {
  return `<div class="${className || 'px-4 py-2 border-b hover:bg-muted/50'}">${content}</div>`
}

/**
 * Helper to escape HTML for safe rendering
 */
export function escapeHtml(text: string): string {
  const div = typeof document !== 'undefined' ? document.createElement('div') : null
  if (div) {
    div.textContent = text
    return div.innerHTML
  }
  // Fallback for SSR
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

/**
 * Calculate optimal rows per block based on row height and container height
 */
export function calculateOptimalBlockSize(
  containerHeight: number,
  estimatedRowHeight: number = 40
): number {
  const visibleRows = Math.ceil(containerHeight / estimatedRowHeight)
  // Return 2-3x the visible rows for smooth scrolling
  return Math.max(50, visibleRows * 3)
}

/**
 * Format large numbers for display (e.g., 12500 -> "12.5K")
 */
export function formatLargeNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M'
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K'
  }
  return num.toString()
}

/**
 * Generate row statistics for debugging/monitoring
 */
export interface VirtualScrollStats {
  totalRows: number
  visibleRows: number
  scrollProgress: number
  estimatedRenderSavings: number
}

export function getVirtualScrollStats(
  instance: ClusterizeInstance,
  rowsPerBlock: number = 50
): VirtualScrollStats {
  const totalRows = instance.getRowsAmount()
  const progress = instance.getScrollProgress()
  const visibleRows = rowsPerBlock * 4 // blocks_in_cluster default
  const savings = totalRows > 0 ? Math.round((1 - visibleRows / totalRows) * 100) : 0
  
  return {
    totalRows,
    visibleRows: Math.min(visibleRows, totalRows),
    scrollProgress: progress,
    estimatedRenderSavings: Math.max(0, savings),
  }
}
