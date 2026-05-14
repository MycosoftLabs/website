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

  const runSuggestedSearch = (label: string) => {
    executeSearchAction({ type: "search", query: label })
    if (typeof window !== "undefined") {
      window.history.pushState(null, "", `/search?q=${encodeURIComponent(label)}`)
      window.dispatchEvent(new CustomEvent("myca-search-action", { detail: { type: "search", query: label } }))
    }
  }

  return (
    <div className="border-t border-white/10 pt-3 mt-2" data-testid="suggestion-chips-panel">
      <h4 className="flex items-center gap-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
        <Sparkles className="w-3 h-3" />
        Try next
      </h4>
      <div className="natureos-glass-page flex flex-wrap gap-2 overflow-visible">
        {chips.map((label) => (
          <div key={label} className="petri-codepen-button-demo petri-codepen-button-demo-rect petri-codepen-button-demo-wide search-try-next-glass">
            <div className="button-wrap">
              <button
                type="button"
                onClick={() => runSuggestedSearch(label)}
                className={cn("touch-manipulation")}
              >
                <span>{label}</span>
              </button>
              <div className="button-shadow" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
