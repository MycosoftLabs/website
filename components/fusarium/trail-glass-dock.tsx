"use client"

import type { ReactNode } from "react"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { GlassChip } from "@/components/ui/glass-button"

export const TRAIL_GLASS_PANEL =
  "rounded-2xl border border-white/10 bg-white/5 p-3 text-sm text-zinc-200 shadow-[0_8px_32px_rgba(0,0,0,0.28)] backdrop-blur-xl"

interface DockSectionProps {
  id: string
  title: string
  peek: string
  open: boolean
  onToggle: () => void
  children: ReactNode
}

export function TrailGlassSection({ id, title, peek, open, onToggle, children }: DockSectionProps) {
  return (
    <Collapsible open={open} onOpenChange={() => onToggle()}>
      <section className={`${TRAIL_GLASS_PANEL} mb-2`} data-section={id}>
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="flex min-h-[44px] w-full items-center justify-between gap-2 text-left"
            aria-expanded={open}
          >
            <div className="min-w-0">
              <GlassChip className="pointer-events-none scale-90 origin-left">{title}</GlassChip>
              {!open ? <p className="mt-1 truncate text-xs text-zinc-400">{peek}</p> : null}
            </div>
            <GlassChip className="pointer-events-none shrink-0">
              {open ? "Collapse" : "Expand"}
            </GlassChip>
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="mt-3 space-y-2 text-xs leading-relaxed text-zinc-300">{children}</div>
        </CollapsibleContent>
      </section>
    </Collapsible>
  )
}
