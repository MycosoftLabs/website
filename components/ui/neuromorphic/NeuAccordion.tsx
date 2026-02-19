"use client"

/**
 * Neuromorphic Accordion component
 * Expandable sections with keyboard support.
 * Date: Feb 18, 2026
 */

import { useState, type ReactNode } from "react"
import { ChevronDown } from "lucide-react"

export interface NeuAccordionItem {
  title: string
  body: ReactNode
}

export interface NeuAccordionProps {
  items: NeuAccordionItem[]
  openIndices?: Record<number, boolean>
  onToggle?: (index: number) => void
  defaultOpenIndex?: number
  className?: string
}

export function NeuAccordion({
  items,
  openIndices: controlledOpen,
  onToggle,
  defaultOpenIndex = 0,
  className = "",
}: NeuAccordionProps) {
  const [internalOpen, setInternalOpen] = useState<Record<number, boolean>>(() => {
    const init: Record<number, boolean> = {}
    items.forEach((_, i) => {
      init[i] = i === defaultOpenIndex
    })
    return init
  })

  const openState = controlledOpen ?? internalOpen
  const handleToggle = (i: number) => {
    if (onToggle) {
      onToggle(i)
    } else {
      setInternalOpen((prev) => ({ ...prev, [i]: !prev[i] }))
    }
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {items.map((item, i) => (
        <div key={i} className="rounded-xl overflow-hidden neu-flat">
          <button
            type="button"
            className="neu-focus w-full px-5 py-4 text-left flex items-center justify-between"
            aria-expanded={!!openState[i]}
            aria-controls={`accordion-panel-${i}`}
            onClick={() => handleToggle(i)}
          >
            <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
              {item.title}
            </span>
            <ChevronDown
              className={`w-[18px] h-[18px] text-gray-500 transition-transform duration-300 ${openState[i] ? "rotate-180" : ""}`}
              aria-hidden
            />
          </button>
          <div
            id={`accordion-panel-${i}`}
            className="neu-accordion-panel px-5 transition-all duration-300"
            style={{
              maxHeight: openState[i] ? "200px" : "0",
              overflow: "hidden",
            }}
          >
            <div className="text-sm text-gray-500 dark:text-gray-400 pb-4">
              {item.body}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
