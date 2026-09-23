"use client"

import { useState } from "react"
import { BookOpen, FileText, LayoutDashboard } from "lucide-react"
import { FormSpaceDocsSection } from "@/components/formspace/FormSpaceDocsSection"
import type { FormSpacePanelMode, FormSpacePanelSections } from "@/lib/formspace-paper"
import { cn } from "@/lib/utils"

export interface FormSpaceDocsPanelProps {
  sections: FormSpacePanelSections
  className?: string
  /** Compact chrome for dense presentations. */
  compact?: boolean
}

const PANEL_MODES: Array<{
  id: FormSpacePanelMode
  label: string
  icon: typeof LayoutDashboard
}> = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "abstract", label: "Abstract", icon: FileText },
  { id: "description", label: "Description", icon: BookOpen },
]

/**
 * Modular FormSpace documentation panel.
 * Icon segmented control switches one focused section at a time —
 * no accordion, no “compress”, no infinite-scroll dump of the paper.
 */
export function FormSpaceDocsPanel({
  sections,
  className,
  compact = false,
}: FormSpaceDocsPanelProps) {
  const [activeMode, setActiveMode] = useState<FormSpacePanelMode>("overview")
  const activeMeta = PANEL_MODES.find((mode) => mode.id === activeMode) ?? PANEL_MODES[0]

  return (
    <aside
      aria-label="FormSpace documentation"
      className={cn("flex h-full min-h-0 flex-col gap-3", className)}
    >
      <div className={cn("flex items-center gap-2", compact ? "px-0" : "px-1")}>
        <BookOpen className="h-4 w-4 shrink-0 text-black/60 dark:text-white/70" aria-hidden />
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-black/50 dark:text-white/60">
            Paper context
          </p>
          <p className="truncate text-sm text-black/70 dark:text-white/80">{activeMeta.label}</p>
        </div>
      </div>

      <nav
        aria-label="Paper section switcher"
        role="tablist"
        className="flex w-full shrink-0 items-center gap-1 rounded-xl border border-black/10 bg-black/[0.03] p-1 dark:border-white/15 dark:bg-white/[0.04]"
      >
        {PANEL_MODES.map((mode) => {
          const isActive = activeMode === mode.id
          const Icon = mode.icon
          return (
            <button
              key={mode.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-controls={`formspace-panel-${mode.id}`}
              id={`formspace-tab-${mode.id}`}
              aria-label={mode.label}
              title={mode.label}
              onClick={() => setActiveMode(mode.id)}
              className={cn(
                "flex min-h-[44px] min-w-[44px] flex-1 touch-manipulation flex-col items-center justify-center gap-0.5 rounded-lg px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider transition-all sm:flex-row sm:gap-2 sm:text-xs",
                isActive
                  ? "bg-black text-white shadow-sm dark:bg-white dark:text-black"
                  : "text-black/50 hover:bg-black/5 hover:text-black/80 dark:text-white/55 dark:hover:bg-white/10 dark:hover:text-white",
              )}
            >
              <Icon className="h-4 w-4 shrink-0" aria-hidden />
              <span className="leading-none">{mode.label}</span>
            </button>
          )
        })}
      </nav>

      <div
        role="tabpanel"
        id={`formspace-panel-${activeMode}`}
        aria-labelledby={`formspace-tab-${activeMode}`}
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain rounded-xl border border-black/10 bg-white/30 px-4 py-3 dark:border-white/15 dark:bg-black/25"
      >
        <FormSpaceDocsSection
          id={`formspace-section-${activeMode}`}
          title={activeMeta.label}
          markdown={sections[activeMode]}
        />
      </div>
    </aside>
  )
}
