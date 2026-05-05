"use client"

import { cn } from "@/lib/utils"
import type { CSSProperties, ReactNode } from "react"

export interface MagneticGridProps {
  /** Number of logical columns (1–4 from breakpoints) */
  columns: number
  /** Gap in px between cells */
  gutter?: number
  className?: string
  children: ReactNode
}

/**
 * Dense CSS grid for fluid search widgets — top-packed, minimal gaps.
 * Replaces Packery for predictable layout + `grid-auto-flow: dense` backfill.
 */
export function MagneticGrid({ columns, gutter = 12, className, children }: MagneticGridProps) {
  const safeCols = Math.max(1, Math.min(12, columns))
  return (
    <div
      className={cn("w-full", className)}
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${safeCols}, minmax(0, 1fr))`,
        gridAutoFlow: "dense",
        gridAutoRows: "minmax(min-content, auto)",
        gap: `${gutter}px`,
        alignContent: "start",
      }}
    >
      {children}
    </div>
  )
}

export function magneticGridItemStyle(opts: {
  columns: number
  widthSpan: 1 | 2
  heightSpan: 1 | 2 | 3
}): CSSProperties {
  const { columns, widthSpan, heightSpan } = opts
  const span = Math.min(widthSpan, Math.max(1, columns))
  return {
    gridColumn: `span ${span} / span ${span}`,
    gridRow: `span ${heightSpan} / span ${heightSpan}`,
    minWidth: 0,
  }
}
