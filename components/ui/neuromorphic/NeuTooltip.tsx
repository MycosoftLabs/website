"use client"

/**
 * Neuromorphic Tooltip component
 * Accessible tooltip on hover/focus.
 * Date: Feb 18, 2026
 */

import { cloneElement, isValidElement, type ReactNode } from "react"

export interface NeuTooltipProps {
  content: string
  children: ReactNode
  id?: string
  position?: "top" | "bottom" | "left" | "right"
}

export function NeuTooltip({
  content,
  children,
  id,
  position = "top",
}: NeuTooltipProps) {
  const tooltipId = id ?? `tooltip-${Math.random().toString(36).slice(2, 9)}`
  const positionClass =
    position === "top"
      ? "bottom-full left-1/2 -translate-x-1/2 mb-2"
      : position === "bottom"
        ? "top-full left-1/2 -translate-x-1/2 mt-2"
        : position === "left"
          ? "right-full top-1/2 -translate-y-1/2 mr-2"
          : "left-full top-1/2 -translate-y-1/2 ml-2"

  const arrowClass =
    position === "top"
      ? "absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-800"
      : position === "bottom"
        ? "absolute bottom-full left-1/2 -translate-x-1/2 border-4 border-transparent border-b-gray-800"
        : position === "left"
          ? "absolute left-full top-1/2 -translate-y-1/2 border-4 border-transparent border-l-gray-800"
          : "absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-gray-800"

  const trigger = isValidElement(children)
    ? cloneElement(children as React.ReactElement<{ "aria-describedby"?: string }>, {
        "aria-describedby": tooltipId,
      })
    : <span aria-describedby={tooltipId}>{children}</span>

  return (
    <div className="relative neu-tooltip-container">
      {trigger}
      <div
        id={tooltipId}
        role="tooltip"
        className={`neu-tooltip absolute ${positionClass} px-3 py-1.5 rounded-lg text-xs font-medium text-white bg-gray-800 whitespace-nowrap pointer-events-none z-10`}
      >
        {content}
        <div className={`${arrowClass}`} />
      </div>
    </div>
  )
}
