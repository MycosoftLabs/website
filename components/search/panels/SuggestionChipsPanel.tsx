/**
 * SuggestionChipsPanel — follow-up queries (MYCA + search history) — May 03 2026
 */

"use client"

import { useMemo } from "react"
import { useMYCAContext } from "@/hooks/use-myca-context"
import { useSearchContext } from "../SearchContextProvider"
import { cn } from "@/lib/utils"
import { Sparkles } from "lucide-react"

export function SuggestionChipsPanel() {
  const { suggestions } = useMYCAContext({ enabled: true })
  const { executeSearchAction, query } = useSearchContext()

  const chips = useMemo(() => {
    const out: string[] = []
    const seen = new Set<string>()
    const push = (s: string) => {
      const t = s?.trim()
      if (!t || t.length < 2) return
      const k = t.toLowerCase()
      if (seen.has(k)) return
      seen.add(k)
      out.push(t)
    }
    for (const q of suggestions.queries || []) push(q)
    if (query?.trim()) push(`${query.trim()} near me`)
    return out.slice(0, 12)
  }, [suggestions.queries, query])

  if (chips.length === 0) return null

  return (
    <div className="border-t border-white/10 pt-3 mt-2" data-testid="suggestion-chips-panel">
      <h4 className="flex items-center gap-1.5 text-[10px] font-semibold text-white/40 uppercase tracking-wider mb-2">
        <Sparkles className="w-3 h-3" />
        Try next
      </h4>
      <div className="flex flex-wrap gap-2">
        {chips.map((label) => (
          <button
            key={label}
            type="button"
            className={cn(
              "min-h-[44px] rounded-full border border-white/10 bg-white/5 px-3 py-2 text-base text-foreground/90",
              "hover:bg-white/10 active:scale-[0.99] touch-manipulation text-left max-w-full",
            )}
            onClick={() => executeSearchAction({ type: "search", query: label })}
          >
            <span className="line-clamp-2">{label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
